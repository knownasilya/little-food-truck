import type { AppType } from "@little-food-truck/api";
import { hc } from "hono/client";

export const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8787";
const baseUrl = apiBaseUrl;

// Typed RPC client — route params/bodies/responses are inferred straight
// from the Hono API's route definitions, no separate client SDK to maintain.
// Path segments mirror the server's route tree, e.g. client.api.trucks.$get().
export const client = hc<AppType>(baseUrl, {
	init: { credentials: "include" }
});

// Uploaded images (avatars, truck/menu/post photos) come back as paths
// relative to the API (e.g. "/uploads/avatars/x.png"), not the app's own
// origin, so they need the API's base URL prepended to load correctly.
export function resolveUploadUrl(path: string | null | undefined): string | undefined {
	if (!path) return undefined;
	if (/^https?:\/\//.test(path)) return path;
	return `${baseUrl}${path}`;
}
