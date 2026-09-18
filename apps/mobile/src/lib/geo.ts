import { isTauri } from "@tauri-apps/api/core";

/**
 * Resolves the device's current coordinates. On iOS/Android this goes
 * through the Tauri geolocation plugin (which needs the location
 * permission entries in src-tauri/gen/{apple,android} once those targets
 * are initialized — see apps/mobile/README.md). In the desktop dev build
 * it falls back to the webview's own navigator.geolocation.
 */
export async function getCurrentCoords(): Promise<{ lat: number; lng: number }> {
	if (isTauri()) {
		const { getCurrentPosition, checkPermissions, requestPermissions } = await import(
			"@tauri-apps/plugin-geolocation"
		);
		const permission = await checkPermissions();
		if (permission.location !== "granted") {
			const requested = await requestPermissions(["location"]);
			if (requested.location !== "granted") {
				throw new Error("Location permission was denied");
			}
		}
		const position = await getCurrentPosition();
		return { lat: position.coords.latitude, lng: position.coords.longitude };
	}

	return new Promise((resolve, reject) => {
		if (!("geolocation" in navigator)) {
			reject(new Error("Geolocation is not available"));
			return;
		}
		navigator.geolocation.getCurrentPosition(
			(pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
			(err) => reject(err),
		);
	});
}

/**
 * Best-effort capability check, so the dashboard can honestly show "Open
 * for business" instead of "I'm here" when there's no way to get a live
 * position — not a guarantee (permission can still be denied at prompt
 * time), just what drives the button's label. getCurrentCoords() is what
 * actually enforces permission.
 */
export async function hasLocationService(): Promise<boolean> {
	if (isTauri()) {
		const { checkPermissions } = await import("@tauri-apps/plugin-geolocation");
		const permission = await checkPermissions();
		return permission.location !== "denied";
	}
	if (!("geolocation" in navigator)) return false;
	if (!navigator.permissions?.query) return true;
	try {
		const status = await navigator.permissions.query({ name: "geolocation" });
		return status.state !== "denied";
	} catch {
		return true;
	}
}
