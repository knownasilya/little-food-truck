import { createApp } from "../lib/context.js";
import { env } from "../lib/env.js";
import { escapeHtml } from "../lib/html.js";
import { getTruck } from "../lib/trucks.js";

const webOrigin = env.WEB_ORIGIN;

// Serves the truck share links behind the "Share" button on /trucks/[id] in
// both clients. This lives on the API — the one part of this stack that's a
// real running server — rather than the web app (adapter-static, no runtime
// server) specifically so it's always current: a truck created five minutes
// ago gets a real preview immediately, no rebuild required. See the README
// note on making this same-origin with the web app in production via a
// reverse-proxy rewrite for /t/*.
export const shareRoute = createApp().get("/t/:id", async (c) => {
  const truck = await getTruck(c.req.param("id"));
  if (!truck) return c.text("Truck not found", 404);

  const requestOrigin = new URL(c.req.url).origin;
  const appUrl = `${webOrigin}/trucks/${truck.id}`;
  const shareUrl = `${requestOrigin}/t/${truck.id}`;
  const title = `${truck.name} — Little Food Truck`;
  const description =
    truck.description || `${truck.name} — ${truck.cuisine} food truck on Little Food Truck.`;
  // truck.photoUrl is always a full URL when set (validated as such on the
  // way in — see truckProfileSchema) — it's either a Supabase Storage
  // public URL or whatever a truck owner typed into the cover-photo field
  // directly, never a path relative to this API. The static logo fallback
  // lives in the web app, so that one needs the web app's own origin.
  const imageUrl = truck.photoUrl ?? `${webOrigin}/images/logo-icon.png`;

  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${safeTitle}</title>
<meta name="description" content="${safeDescription}">
<meta property="og:type" content="website">
<meta property="og:url" content="${escapeHtml(shareUrl)}">
<meta property="og:title" content="${safeTitle}">
<meta property="og:description" content="${safeDescription}">
<meta property="og:image" content="${escapeHtml(imageUrl)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${safeTitle}">
<meta name="twitter:description" content="${safeDescription}">
<meta name="twitter:image" content="${escapeHtml(imageUrl)}">
<meta http-equiv="refresh" content="0; url=${escapeHtml(appUrl)}">
</head>
<body style="font-family: system-ui, sans-serif; display: flex; min-height: 100vh; align-items: center; justify-content: center; text-align: center; color: #57534e; background: #fafaf9;">
<p>Taking you to ${safeTitle}…<br><a href="${escapeHtml(appUrl)}" style="color: #ea580c;">Click here if you're not redirected.</a></p>
</body>
</html>`;

  return c.html(html);
});
