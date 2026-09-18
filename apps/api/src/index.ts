import "dotenv/config";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { HTTPException } from "hono/http-exception";
import { sql as dbClient, closeDb } from "./db/client.js";
import { adminRoute } from "./routes/admin.js";
import { authRoute } from "./routes/auth.js";
import { meRoute } from "./routes/me.js";
import { shareRoute } from "./routes/share.js";
import { trucksRoute } from "./routes/trucks.js";
import { env, isProduction } from "./lib/env.js";
import { getVapidPublicKey } from "./lib/push.js";
import { ensureUploadsBucket } from "./lib/uploads.js";

// The web SPA runs at WEB_ORIGIN. Tauri runs the same SPA, but from a
// different origin per platform/mode: the Vite dev server's own port in
// `tauri dev` (desktop), and the tauri://localhost / http://tauri.localhost
// custom-protocol origins for built desktop and mobile apps.
const allowedOrigins = [
  env.WEB_ORIGIN,
  "http://localhost:1420",
  "tauri://localhost",
  "http://tauri.localhost",
];

const app = new Hono()
  .use(logger())
  .use(secureHeaders())
  .use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    }),
  )
  // Defense in depth beyond the 5MB check in lib/uploads.ts, which only
  // runs after the whole body has already been read into memory — this
  // rejects an oversized request before that happens. Sized a bit above
  // the actual 5MB image cap to leave room for multipart boundaries/headers.
  .use(bodyLimit({ maxSize: 6 * 1024 * 1024 }))
  .onError((err, c) => {
    // HTTPException's own getResponse() defaults to a plain-text body, but
    // every client-side error handler in this codebase does
    // `await res.json()` expecting `{ message }` — that silently fails and
    // falls back to a hardcoded generic string, discarding whatever the
    // server actually said. Returning JSON here instead makes every
    // HTTPException's real message actually reach the client.
    if (err instanceof HTTPException) return c.json({ message: err.message }, err.status);
    console.error(err);
    return c.json({ message: "Internal server error" }, 500);
  })
  .get("/health", async (c) => {
    try {
      await dbClient`select 1`;
      return c.json({ ok: true });
    } catch (err) {
      console.error("health check: database unreachable", err);
      return c.json({ ok: false, reason: "database unreachable" }, 503);
    }
  })
  .get("/api/push/vapid-key", (c) => c.json({ publicKey: getVapidPublicKey() }))
  .route("/", shareRoute)
  .route("/api/auth", authRoute)
  .route("/api/trucks", trucksRoute)
  .route("/api/me", meRoute)
  .route("/api/admin", adminRoute);

export type AppType = typeof app;

// This server also serves the built web app (apps/web/build, copied into
// ./public by the Dockerfile) — one Cloud Run service instead of a second
// one just for static files, and same-origin means no cross-origin cookie
// gotcha for the session cookie. Registered after every API route above so
// those always win; only two paths can fall through to here: a real static
// asset (found on disk, served as-is — immutable cache headers for
// SvelteKit's hashed _app/immutable/* build output, so browsers never
// re-fetch an unchanged file) or anything else (an SPA route with no file
// on disk, e.g. /browse or /trucks/abc123 — falls through to 200.html, the
// adapter-static SPA fallback, and the client-side router takes over). Not
// mounted in local dev: nothing's ever built into ./public there, and the
// Vite dev server on :5173 serves the app instead.
if (isProduction) {
  app
    .use(
      "*",
      serveStatic({
        root: "./public",
        onFound: (path, c) => {
          if (path.includes("/_app/immutable/")) {
            c.header("Cache-Control", "public, max-age=31536000, immutable");
          }
        },
      }),
    )
    .use("*", serveStatic({ root: "./public", path: "200.html" }));
}

// Avatars, truck/menu/post photos all go straight to Supabase Storage now
// (see lib/uploads.ts) — this makes sure the bucket exists before the first
// upload request, without needing a separate manual setup step.
await ensureUploadsBucket();

const server = serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`little-food-truck api listening on http://localhost:${info.port}`);
});

// Lets in-flight requests finish and closes the Postgres connection pool
// before the process actually exits — without this, a rolling deploy or
// container restart (which sends SIGTERM) can cut connections mid-query and
// leaves the pool's sockets open until Postgres times them out on its own,
// which adds up fast across repeated deploys.
async function shutdown(signal: string) {
  console.log(`${signal} received, shutting down...`);
  server.close(async (err) => {
    if (err) console.error("error while closing server", err);
    await closeDb();
    process.exit(err ? 1 : 0);
  });
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
