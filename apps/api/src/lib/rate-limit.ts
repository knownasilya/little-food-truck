import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

type Bucket = { count: number; resetAt: number };

/**
 * Minimal in-memory fixed-window rate limiter, keyed by client IP — meant
 * for the auth endpoints (sign-in, sign-up, forgot-password), which are
 * otherwise wide open to brute-forcing. Good enough for a single-instance
 * deployment; it does NOT coordinate across replicas behind a load
 * balancer, so running more than one instance needs a shared store
 * (Redis, etc.) instead before this protection is real.
 *
 * Reads the client IP from X-Forwarded-For, which is only trustworthy when
 * the app sits behind a proxy that sets/overwrites that header itself
 * (true for Fly.io, Railway, Render, nginx, and virtually every real
 * deployment target) — if this API is ever exposed directly to the
 * internet with no proxy in front of it, a client could forge this header
 * to dodge the limit entirely.
 */
export function rateLimit(options: { windowMs: number; max: number; message?: string }) {
  const buckets = new Map<string, Bucket>();

  // Prevents the map from growing forever across long uptimes / many
  // distinct IPs — sweeps out anything whose window has already lapsed.
  const sweepInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, options.windowMs).unref();
  void sweepInterval;

  return createMiddleware(async (c, next) => {
    const key =
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
      c.req.header("x-real-ip") ??
      "unknown";
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }

    if (bucket.count >= options.max) {
      throw new HTTPException(429, {
        message: options.message ?? "Too many requests — try again shortly.",
      });
    }

    bucket.count++;
    return next();
  });
}
