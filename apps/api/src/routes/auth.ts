import { randomBytes } from "node:crypto";
import { zValidator } from "@hono/zod-validator";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@little-food-truck/shared";
import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { db } from "../db/client.js";
import { customerProfiles, passwordResetTokens, truckProfiles, users } from "../db/schema.js";
import { clearSessionCookies, setSessionCookies, withAuth } from "../lib/auth.js";
import { createApp } from "../lib/context.js";
import { emailEnabled, sendPasswordResetEmail } from "../lib/email.js";
import { env, isProduction } from "../lib/env.js";
import { rateLimit } from "../lib/rate-limit.js";
import { createSessionClient, supabaseAdmin } from "../lib/supabase.js";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// Credential-guessing and mass-account-creation protection — see
// lib/rate-limit.ts for what this does and doesn't cover.
const signInLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
const signUpLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5 });
const forgotPasswordLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5 });

export const authRoute = createApp()
  .use(withAuth)
  .post("/sign-up", signUpLimiter, zValidator("json", signUpSchema), async (c) => {
    const input = c.req.valid("json");

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, input.email));
    if (existing) {
      throw new HTTPException(409, { message: "Email is already in use" });
    }

    // Supabase Auth owns credential storage from here — our own `users` row
    // (below) only carries the app-specific fields (role, displayName,
    // avatarUrl). `role` also goes into app_metadata so it's readable
    // straight off the access token in withAuth, without a DB round trip
    // on every request.
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      app_metadata: { role: input.role },
      user_metadata: { displayName: input.displayName },
    });
    if (error || !data.user) {
      throw new HTTPException(400, { message: error?.message ?? "Could not create account" });
    }
    const userId = data.user.id;

    await db.insert(users).values({
      id: userId,
      email: input.email,
      role: input.role,
      displayName: input.displayName,
    });

    if (input.role === "truck") {
      // Self-signed-up trucks own their account from the start — there's no
      // admin-issued claim step to go through (see routes/claim.ts and the
      // truckProfiles.claimedAt comment in db/schema.ts), so this is
      // "claimed" immediately rather than left null like an admin-added
      // placeholder would be.
      await db.insert(truckProfiles).values({ userId, name: input.displayName, claimedAt: new Date() });
    } else {
      await db.insert(customerProfiles).values({ userId });
    }

    // A fresh, throwaway client — see createSessionClient()'s own comment
    // for why this must never be the shared supabaseAdmin singleton.
    const { data: signInData, error: signInError } = await createSessionClient().auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });
    if (signInError || !signInData.session) {
      throw new HTTPException(500, { message: "Account created, but sign-in failed" });
    }
    setSessionCookies(c, signInData.session.access_token, signInData.session.refresh_token);

    return c.json(
      { id: userId, email: input.email, role: input.role, displayName: input.displayName },
      201,
    );
  })
  .post("/sign-in", signInLimiter, zValidator("json", signInSchema), async (c) => {
    const input = c.req.valid("json");

    // A fresh, throwaway client — see createSessionClient()'s own comment
    // for why this must never be the shared supabaseAdmin singleton.
    const { data, error } = await createSessionClient().auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });
    if (error || !data.session || !data.user) {
      throw new HTTPException(401, { message: "Invalid email or password" });
    }

    const [user] = await db.select().from(users).where(eq(users.id, data.user.id));
    if (!user) {
      throw new HTTPException(401, { message: "Invalid email or password" });
    }

    setSessionCookies(c, data.session.access_token, data.session.refresh_token);

    return c.json({
      id: user.id,
      email: user.email,
      role: user.role,
      displayName: user.displayName,
    });
  })
  .post("/sign-out", async (c) => {
    clearSessionCookies(c);
    return c.json({ ok: true });
  })
  .post("/forgot-password", forgotPasswordLimiter, zValidator("json", forgotPasswordSchema), async (c) => {
    const { email } = c.req.valid("json");
    const [user] = await db.select().from(users).where(eq(users.email, email));

    // Always respond the same way whether or not the email exists, so this
    // endpoint can't be used to enumerate registered accounts.
    if (!user) return c.json({ ok: true });

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await db.insert(passwordResetTokens).values({ token, userId: user.id, expiresAt });

    const resetUrl = `${env.WEB_ORIGIN}/reset-password?token=${token}`;

    if (emailEnabled) {
      try {
        await sendPasswordResetEmail(email, resetUrl);
        return c.json({ ok: true });
      } catch (err) {
        // Logged server-side only — the response stays identical to the
        // success case either way (see the enumeration-protection comment
        // above), so an outage doesn't also become a way to probe which
        // emails are registered. In production that's the end of it (see
        // the no-transport branch below for why). Outside production, fall
        // through to the dev convenience fallback so a stopped/unstarted
        // MailDev never blocks local testing.
        console.error(`[auth] failed to send password reset email to ${email}`, err);
        if (isProduction) return c.json({ ok: true });
      }
    } else if (isProduction) {
      // No email service is configured, and this is production: returning
      // or logging a live reset token here would be a straight
      // account-takeover path (anyone can call this endpoint with any
      // registered email and get a working reset link back). Set
      // RESEND_API_KEY (see lib/email.ts) before this ever runs with
      // NODE_ENV=production — until then, production silently can't
      // complete this flow, which is the safe failure mode.
      console.error(
        `[auth] forgot-password requested for ${email}, but no email service is configured — see the comment in routes/auth.ts`,
      );
      return c.json({ ok: true });
    }

    // Dev/test fallback: either MailDev isn't configured, or sending to it
    // just failed (e.g. it isn't running). Return the reset link directly
    // instead of emailing it, so this flow still works end-to-end.
    console.log(`[dev] password reset link for ${email}: ${resetUrl}`);
    return c.json({ ok: true, resetUrl });
  })
  .post("/reset-password", zValidator("json", resetPasswordSchema), async (c) => {
    const { token, password } = c.req.valid("json");
    const [row] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));

    if (!row || row.usedAt || row.expiresAt < new Date()) {
      throw new HTTPException(400, { message: "This reset link is invalid or has expired" });
    }

    // The actual password mutation goes through Supabase's admin API now —
    // this route no longer touches password storage directly.
    const { error } = await supabaseAdmin.auth.admin.updateUserById(row.userId, { password });
    if (error) {
      throw new HTTPException(500, { message: "Could not reset password" });
    }
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.token, token));

    return c.json({ ok: true });
  });
