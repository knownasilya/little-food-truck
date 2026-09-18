import type { AppType } from "@little-food-truck/api";
import { hc } from "hono/client";

// Empty string (the production build default — see apps/api/Dockerfile's
// VITE_API_URL build arg) means "same origin as the page": the API now
// serves this app itself, so there's nothing to prepend. Only local dev
// (where VITE_API_URL is unset entirely, not just empty) needs an explicit
// cross-origin fallback, since the Vite dev server and the API dev server
// run on different ports.
export const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8787";
const baseUrl = apiBaseUrl;

// Typed RPC client — route params/bodies/responses are inferred straight
// from the Hono API's route definitions, no separate client SDK to maintain.
// Path segments mirror the server's route tree, e.g. client.api.trucks.$get().
// hc() needs a non-empty base to build correct relative paths (an empty
// string produces a leading "//", which browsers parse as protocol-relative
// to a host named after the next path segment) — "/" gets the same
// same-origin behavior without that bug.
export const client = hc<AppType>(baseUrl || "/", {
	init: { credentials: "include" }
});

// Uploaded images (avatars, truck/menu/post photos) come back as paths
// relative to the API (e.g. "/uploads/avatars/x.png"). Same-origin
// (baseUrl === "") needs no prefix at all — prepending "" is a no-op anyway,
// but this stays explicit rather than relying on that.
export function resolveUploadUrl(path: string | null | undefined): string | undefined {
	if (!path) return undefined;
	if (/^https?:\/\//.test(path)) return path;
	return baseUrl ? `${baseUrl}${path}` : path;
}
