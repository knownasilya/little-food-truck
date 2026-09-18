import { client } from "./api";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
	const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
	const rawData = atob(base64);
	const output = new Uint8Array(rawData.length);
	for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
	return output;
}

export function isPushSupported(): boolean {
	return typeof navigator !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

export async function getPushSubscription(): Promise<PushSubscription | null> {
	if (!isPushSupported()) return null;
	const reg = await navigator.serviceWorker.getRegistration("/sw.js");
	if (!reg) return null;
	return reg.pushManager.getSubscription();
}

export async function subscribeToPush(): Promise<void> {
	if (!isPushSupported()) throw new Error("Push notifications aren't supported in this browser.");

	const permission = await Notification.requestPermission();
	if (permission !== "granted") throw new Error("Notification permission was denied.");

	const reg = await navigator.serviceWorker.register("/sw.js");
	await navigator.serviceWorker.ready;

	const keyRes = await client.api.push["vapid-key"].$get();
	const { publicKey } = await keyRes.json();
	if (!publicKey) throw new Error("Push notifications aren't configured on the server yet.");

	const sub = await reg.pushManager.subscribe({
		userVisibleOnly: true,
		applicationServerKey: urlBase64ToUint8Array(publicKey)
	});

	const json = sub.toJSON();
	if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
		throw new Error("Could not read the new push subscription.");
	}

	await client.api.me["push-subscription"].$post({
		json: { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } }
	});
}

export async function unsubscribeFromPush(): Promise<void> {
	const sub = await getPushSubscription();
	if (!sub) return;
	await client.api.me["push-subscription"].$delete({ json: { endpoint: sub.endpoint } });
	await sub.unsubscribe();
}
