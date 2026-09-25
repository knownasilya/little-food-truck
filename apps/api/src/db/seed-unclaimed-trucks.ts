import { randomBytes } from "node:crypto";
import { type CuisineType, usStateCode } from "@little-food-truck/shared";
import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { truckProfiles, users } from "./schema.js";
import { env } from "../lib/env.js";
import { supabaseAdmin } from "../lib/supabase.js";

// Every region seed script already formats `city` as "City, ST" (that's
// what ends up in the description's "Usually found around ..." sentence
// too) — parsed here instead of asking each of the 25 region files to also
// pass a redundant explicit `state` field. Falls back to null rather than
// throwing on an unexpected format, since a missing state filter option is
// much cheaper to notice/fix than a seed run aborting partway through.
function parseStateFromCity(city: string): string | null {
  const match = /,\s*([A-Za-z]{2})$/.exec(city);
  const code = match?.[1]?.toUpperCase();
  return code && usStateCode.safeParse(code).success ? code : null;
}

// Shared by every region's real-truck seed script (seed-sc-ga-trucks.ts,
// seed-fl-nc-trucks.ts, ...) — adds each truck as an unclaimed listing,
// same shape POST /api/admin/trucks produces (see routes/admin.ts): a
// full, login-locked placeholder account, plus a claim link the real owner
// can use to submit a claim request (see routes/claim.ts). Each caller is
// responsible for its own researched truck list and city coordinates —
// see this function's doc comment below for what it expects.
const CLAIM_TOKEN_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export type UnclaimedTruckSeed = {
  name: string;
  /** Display label only, e.g. "Charleston, SC" — used in the description/logs, not looked up anywhere. */
  city: string;
  /** Well-known city-center coordinates, not a specific truck's real location — see the module comment above the call site for why. */
  lat: number;
  lng: number;
  cuisine: CuisineType;
  description: string;
  website?: string;
  phone?: string;
};

/**
 * Idempotent and resumable: each truck's placeholder email is deterministic
 * from its name, so a re-run skips trucks that are already fully seeded,
 * *completes* ones left orphaned by a prior partial failure (auth user +
 * `users` row created, but the `truck_profiles` insert failed — e.g. from
 * running before a schema push finished), and one truck's own failure
 * doesn't stop the rest of the batch from being attempted. Never throws;
 * callers should exit non-zero themselves if `failed > 0` matters to them.
 */
export async function seedUnclaimedTrucks(
  trucks: UnclaimedTruckSeed[],
): Promise<{ created: number; skipped: number; failed: number }> {
  // Printed unconditionally, before anything else — dotenv (and
  // dotenv-cli, for the :prod variant of these scripts) never overrides a
  // variable that's already set in the environment, so if DATABASE_URL
  // leaked into this shell session from something earlier, `.env.production`
  // silently wouldn't take effect and this would quietly run against the
  // wrong database. Check this line matches where you expect before
  // trusting the "already seeded" skips below.
  console.log(`Connecting to: ${new URL(env.DATABASE_URL).host}\n`);

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const truck of trucks) {
    const slug = truck.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const email = `unclaimed-${slug}@trucks.invalid`;

    try {
      const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));

      let userId: string;
      if (existingUser) {
        const [existingProfile] = await db
          .select({ userId: truckProfiles.userId })
          .from(truckProfiles)
          .where(eq(truckProfiles.userId, existingUser.id));
        if (existingProfile) {
          console.log(`${truck.name} (${truck.city}): already seeded, skipping`);
          skipped++;
          continue;
        }
        console.log(`${truck.name} (${truck.city}): account exists but profile is missing, completing it`);
        userId = existingUser.id;
      } else {
        const placeholderPassword = randomBytes(24).toString("hex");
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: placeholderPassword,
          email_confirm: true,
          app_metadata: { role: "truck" },
          user_metadata: { displayName: truck.name },
        });
        if (error || !data.user) {
          throw new Error(`Could not create auth user: ${error?.message}`);
        }
        userId = data.user.id;
        await db.insert(users).values({ id: userId, email, role: "truck", displayName: truck.name });
      }

      const claimToken = randomBytes(32).toString("hex");
      await db.insert(truckProfiles).values({
        userId,
        name: truck.name,
        description: `${truck.description} Usually found around ${truck.city}.`,
        cuisine: truck.cuisine,
        lat: truck.lat,
        lng: truck.lng,
        website: truck.website ?? null,
        phone: truck.phone ?? null,
        state: parseStateFromCity(truck.city),
        claimToken,
        claimTokenExpiresAt: new Date(Date.now() + CLAIM_TOKEN_TTL_MS),
      });

      console.log(`${truck.name} (${truck.city}): ${env.WEB_ORIGIN}/claim?token=${claimToken}`);
      created++;
    } catch (err) {
      console.error(`${truck.name} (${truck.city}): FAILED — ${err instanceof Error ? err.message : err}`);
      failed++;
    }
  }

  console.log(`\n${created} created, ${skipped} already existed, ${failed} failed (of ${trucks.length}).`);
  return { created, skipped, failed };
}
