import type { UserRole } from "@little-food-truck/shared";
import { eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import { verify } from "hono/jwt";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import type { AppEnv } from "./context.js";
import { env, isProduction } from "./env.js";
import { createSessionClient } from "./supabase.js";

export const SESSION_COOKIE = "lft_session";
export const REFRESH_COOKIE = "lft_refresh";
// Cookie lifetime for the refresh token, which is what actually determines
// how long a signed-in session lasts — the access token itself is
// short-lived (Supabase's default is 1 hour) and gets silently refreshed
// by withAuth below, so this doesn't mean "re-verify every 30 days."
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

function roleFromPayload(payload: Record<string, unknown>): UserRole | null {
  const appMetadata = payload.app_metadata as { role?: string } | undefined;
  return (appMetadata?.role as UserRole | undefined) ?? null;
}

// sameSite: "Lax" assumes the web app and API share a registrable domain in
// production (e.g. app.example.com + api.example.com — the same topology
// the README's share-link reverse-proxy note already recommends). If they
// end up on genuinely different domains instead, the browser won't send
// this cookie on the web app's cross-site fetch() calls at all, and sign-in
// will silently appear to do nothing — that's a deployment-topology choice
// to get right, not something a cookie flag alone can paper over.
export function setSessionCookies(
  c: Parameters<typeof setCookie>[0],
  accessToken: string,
  refreshToken: string,
) {
  const opts = {
    httpOnly: true,
    sameSite: "Lax" as const,
    secure: isProduction,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
  setCookie(c, SESSION_COOKIE, accessToken, opts);
  setCookie(c, REFRESH_COOKIE, refreshToken, opts);
}

export function clearSessionCookies(c: Parameters<typeof deleteCookie>[0]) {
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
  deleteCookie(c, REFRESH_COOKIE, { path: "/" });
}

// Populates c.var.userId / c.var.role from the session cookie, if present —
// verifying it as a Supabase-issued access token (HS256, signed with the
// project's JWT secret; our app role lives in its app_metadata claim, set
// at sign-up — see routes/auth.ts). If the access token has expired but a
// refresh-token cookie is present, transparently refreshes the session via
// Supabase and re-issues both cookies, so a signed-in user doesn't get
// logged out just because an hour passed. Does not itself reject
// unauthenticated requests — pair with requireAuth().
export const withAuth = createMiddleware<AppEnv>(async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE);
  if (token) {
    try {
      const payload = await verify(token, env.SUPABASE_JWT_SECRET, "HS256");
      c.set("userId", String(payload.sub));
      c.set("role", roleFromPayload(payload));
      return next();
    } catch {
      // Expired or otherwise invalid — fall through to the refresh attempt.
    }
  }

  const refreshToken = getCookie(c, REFRESH_COOKIE);
  if (refreshToken) {
    // A fresh, throwaway client — see createSessionClient()'s own comment
    // for why this must never be the shared supabaseAdmin singleton.
    const { data, error } = await createSessionClient().auth.refreshSession({
      refresh_token: refreshToken,
    });
    if (!error && data.session && data.user) {
      setSessionCookies(c, data.session.access_token, data.session.refresh_token);
      c.set("userId", data.user.id);
      c.set("role", (data.user.app_metadata as { role?: string } | undefined)?.role as UserRole ?? null);
      return next();
    }
  }

  c.set("userId", null);
  c.set("role", null);
  return next();
});

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  if (!c.var.userId) {
    throw new HTTPException(401, { message: "Sign in required" });
  }
  return next();
});

export function requireRole(role: UserRole) {
  return createMiddleware<AppEnv>(async (c, next) => {
    if (!c.var.userId) {
      throw new HTTPException(401, { message: "Sign in required" });
    }
    if (c.var.role !== role) {
      throw new HTTPException(403, { message: `Requires ${role} account` });
    }
    return next();
  });
}

// isAdmin is orthogonal to role (truck/customer — see the users.isAdmin
// column comment in db/schema.ts), and there's no self-serve way to become
// one, so it isn't worth threading through the JWT the way role is — a
// plain DB lookup here is simpler and this route group sees far less
// traffic than the customer/truck-facing ones.
export const requireAdmin = createMiddleware<AppEnv>(async (c, next) => {
  if (!c.var.userId) {
    throw new HTTPException(401, { message: "Sign in required" });
  }
  const [user] = await db
    .select({ isAdmin: users.isAdmin })
    .from(users)
    .where(eq(users.id, c.var.userId));
  if (!user?.isAdmin) {
    throw new HTTPException(403, { message: "Admin access required" });
  }
  return next();
});
