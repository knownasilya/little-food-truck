import { z } from "zod";

// Centralizes every env var the API reads, validated once at startup rather
// than scattered per-module checks with silently-different fallback
// behavior. Import this (directly or transitively) before touching
// process.env anywhere else — a misconfigured deployment should fail loudly
// at boot, not three requests in when someone hits the one code path that
// happens to need the missing var.
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8787),
  // No default: an unset WEB_ORIGIN silently falling back to localhost in a
  // real deployment would misconfigure CORS and the share-page/reset-email
  // redirect target without any obvious error — better to refuse to start.
  WEB_ORIGIN: z.string().url(),
  DATABASE_URL: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_JWT_SECRET: z.string().min(1),
  // Web Push is an optional feature (see lib/push.ts) — genuinely fine to
  // ship without it, so these stay optional rather than required.
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().default("mailto:admin@example.com"),
  // Password-reset email (see lib/email.ts). In development/test, email
  // always sends via local MailDev (SMTP_HOST/SMTP_PORT below) — no key
  // needed. In production, RESEND_API_KEY is required to send real mail;
  // without it, forgot-password safely no-ops (see routes/auth.ts).
  // RESEND_FROM_EMAIL defaults to Resend's own shared testing sender, which
  // works with any API key and no domain verification — swap it for an
  // address on a domain you've verified in Resend before this sends real
  // production mail.
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().email().default("onboarding@resend.dev"),
  // Local MailDev SMTP server (`pnpm --filter @little-food-truck/api run
  // maildev`) — only used outside production. Defaults match MailDev's own
  // defaults, so this never needs setting unless MailDev is reconfigured.
  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
});

function loadEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("✗ Invalid or missing environment variables:\n");
    for (const issue of result.error.issues) {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    console.error(
      "\nSee apps/api/.env.example for the full list and what each one is for.",
    );
    process.exit(1);
  }
  return result.data;
}

export const env = loadEnv();
export const isProduction = env.NODE_ENV === "production";

if (isProduction && !env.RESEND_API_KEY) {
  console.warn(
    "[startup] RESEND_API_KEY is not set — password reset can't send real email in production (see lib/email.ts).",
  );
}
