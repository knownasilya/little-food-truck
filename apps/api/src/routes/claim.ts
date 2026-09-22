import { zValidator } from "@hono/zod-validator";
import { claimRequestInputSchema, finishClaimSchema, type CuisineType } from "@little-food-truck/shared";
import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { db } from "../db/client.js";
import { truckClaimRequests, truckProfiles, users } from "../db/schema.js";
import { setSessionCookies } from "../lib/auth.js";
import { createApp } from "../lib/context.js";
import { newId } from "../lib/id.js";
import { rateLimit } from "../lib/rate-limit.js";
import { createSessionClient, supabaseAdmin } from "../lib/supabase.js";
import { saveClaimDocument } from "../lib/uploads.js";

// How long an approved request's "set your password" link stays valid —
// shorter than the initial claimToken's 14 days (routes/admin.ts) since by
// this point a real person is expected to act on an email they were just
// sent, not a link an admin is holding onto to share later.
const SET_PASSWORD_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Same shape of protection as auth.ts's signUpLimiter — both endpoints here
// are public and unauthenticated.
const claimLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10 });

const claimRequestFormSchema = claimRequestInputSchema.extend({
  proofDocument: z.instanceof(File),
});

async function findClaimableTruck(token: string) {
  const [truck] = await db
    .select({
      userId: truckProfiles.userId,
      name: truckProfiles.name,
      cuisine: truckProfiles.cuisine,
      claimedAt: truckProfiles.claimedAt,
      claimTokenExpiresAt: truckProfiles.claimTokenExpiresAt,
    })
    .from(truckProfiles)
    .where(eq(truckProfiles.claimToken, token));

  if (!truck || truck.claimedAt) return null;
  if (!truck.claimTokenExpiresAt || truck.claimTokenExpiresAt < new Date()) return null;
  return truck;
}

async function findFinishableRequest(token: string) {
  const [row] = await db
    .select({
      id: truckClaimRequests.id,
      truckId: truckClaimRequests.truckId,
      truckName: truckProfiles.name,
      requesterEmail: truckClaimRequests.requesterEmail,
      status: truckClaimRequests.status,
      setPasswordTokenExpiresAt: truckClaimRequests.setPasswordTokenExpiresAt,
      truckClaimedAt: truckProfiles.claimedAt,
    })
    .from(truckClaimRequests)
    .innerJoin(truckProfiles, eq(truckProfiles.userId, truckClaimRequests.truckId))
    .where(eq(truckClaimRequests.setPasswordToken, token));

  if (!row || row.status !== "approved" || row.truckClaimedAt) return null;
  if (!row.setPasswordTokenExpiresAt || row.setPasswordTokenExpiresAt < new Date()) return null;
  return row;
}

// Public, unauthenticated — the owner-facing half of the claim flow. An
// admin creates the truck + initial link (routes/admin.ts); this route
// lets whoever holds that link submit a request, and — once an admin
// approves it — actually set a password. Never mounted behind
// withAuth/requireAuth: by design, whoever's using this hasn't signed in.
export const claimRoute = createApp()
  .get("/:token", async (c) => {
    const truck = await findClaimableTruck(c.req.param("token"));
    if (!truck) {
      throw new HTTPException(404, { message: "This claim link is invalid, expired, or already used" });
    }
    return c.json({ truckName: truck.name, cuisine: truck.cuisine as CuisineType });
  })
  .post("/:token", claimLimiter, zValidator("form", claimRequestFormSchema), async (c) => {
    const token = c.req.param("token");
    const input = c.req.valid("form");
    const truck = await findClaimableTruck(token);
    if (!truck) {
      throw new HTTPException(404, { message: "This claim link is invalid, expired, or already used" });
    }

    const proofDocumentPath = await saveClaimDocument(input.proofDocument);

    await db.insert(truckClaimRequests).values({
      id: newId(),
      truckId: truck.userId,
      requesterName: input.name,
      requesterEmail: input.email,
      requesterPhone: input.phone || null,
      message: input.message,
      proofDocumentPath,
    });

    return c.json({ ok: true }, 201);
  })
  .get("/finish/:token", async (c) => {
    const request = await findFinishableRequest(c.req.param("token"));
    if (!request) {
      throw new HTTPException(404, { message: "This link is invalid, expired, or already used" });
    }
    return c.json({ truckName: request.truckName, email: request.requesterEmail });
  })
  .post("/finish/:token", claimLimiter, zValidator("json", finishClaimSchema), async (c) => {
    const token = c.req.param("token");
    const input = c.req.valid("json");
    const request = await findFinishableRequest(token);
    if (!request) {
      throw new HTTPException(404, { message: "This link is invalid, expired, or already used" });
    }

    // Swaps the placeholder credentials for the real, now-verified owner's
    // — same account/user id throughout, so anything already attached to
    // it carries over untouched.
    const { error } = await supabaseAdmin.auth.admin.updateUserById(request.truckId, {
      email: request.requesterEmail,
      password: input.password,
      email_confirm: true,
    });
    if (error) {
      throw new HTTPException(400, { message: error.message || "Could not finish claiming this truck" });
    }

    await db.update(users).set({ email: request.requesterEmail }).where(eq(users.id, request.truckId));
    await db
      .update(truckProfiles)
      .set({ claimedAt: new Date(), claimToken: null, claimTokenExpiresAt: null, claimEmail: null })
      .where(eq(truckProfiles.userId, request.truckId));
    await db
      .update(truckClaimRequests)
      .set({ setPasswordToken: null, setPasswordTokenExpiresAt: null })
      .where(eq(truckClaimRequests.id, request.id));
    // Any other request for the same truck (e.g. an impostor who also
    // grabbed the shared link) is moot now that it's been claimed.
    await db
      .update(truckClaimRequests)
      .set({ status: "denied", decidedAt: new Date() })
      .where(and(eq(truckClaimRequests.truckId, request.truckId), eq(truckClaimRequests.status, "pending")));

    // A fresh, throwaway client — see createSessionClient()'s own comment
    // for why this must never be the shared supabaseAdmin singleton.
    const { data: signInData, error: signInError } = await createSessionClient().auth.signInWithPassword({
      email: request.requesterEmail,
      password: input.password,
    });
    if (signInError || !signInData.session) {
      // The claim itself succeeded — this only affects whether they land
      // signed in immediately vs. having to use "sign in" with the
      // credentials they just set.
      return c.json({ ok: true, signedIn: false });
    }
    setSessionCookies(c, signInData.session.access_token, signInData.session.refresh_token);
    return c.json({ ok: true, signedIn: true });
  });
