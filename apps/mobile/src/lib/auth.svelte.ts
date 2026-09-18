import type {
	AccountUpdateInput,
	DefaultLocationInput,
	ForgotPasswordInput,
	ResetPasswordInput,
	SignInInput,
	SignUpInput,
	WatchLocationInput,
} from "@little-food-truck/shared";
import { client } from "./api";

type TruckProfile = {
	userId: string;
	name: string;
	description: string;
	cuisine: string;
	photoUrl: string | null;
	isOpen: boolean;
	lat: number | null;
	lng: number | null;
	locationUpdatedAt: string | null;
	waitMinutes: number | null;
	viewCount: number;
	verified: boolean;
	defaultLocationLabel: string | null;
	defaultLat: number | null;
	defaultLng: number | null;
	timezone: string;
	website: string | null;
	phone: string | null;
};

type CustomerProfile = {
	userId: string;
	timezone: string;
};

export type Session = {
	id: string;
	email: string;
	role: "truck" | "customer";
	displayName: string;
	avatarUrl: string | null;
	isAdmin: boolean;
	truckProfile?: TruckProfile | null;
	customerProfile?: CustomerProfile | null;
};

let session = $state<Session | null>(null);
let loading = $state(true);
let initialized = false;

export function getAuth() {
	return {
		get session() {
			return session;
		},
		get loading() {
			return loading;
		},
	};
}

export async function loadSession(): Promise<void> {
	loading = true;
	try {
		const res = await client.api.me.$get();
		session = res.ok ? ((await res.json()) as Session) : null;
	} catch {
		// A network-level failure (API unreachable) is treated the same as
		// "not signed in" rather than left to reject — ensureSessionLoaded()
		// calls this fire-and-forget (no .catch of its own), so an unhandled
		// rejection here would otherwise surface as an uncaught error instead
		// of just falling back to the signed-out state, which is correct
		// either way when there's no session to find.
		session = null;
	} finally {
		loading = false;
		initialized = true;
	}
}

export function ensureSessionLoaded(): void {
	if (!initialized) void loadSession();
}

export async function signUp(input: SignUpInput): Promise<void> {
	const res = await client.api.auth["sign-up"].$post({ json: input });
	if (!res.ok) {
		const body = await res.json().catch(() => null);
		throw new Error(
			(body && "message" in body && String(body.message)) || "Sign up failed",
		);
	}
	await loadSession();
}

export async function signIn(input: SignInInput): Promise<void> {
	const res = await client.api.auth["sign-in"].$post({ json: input });
	if (!res.ok) {
		const body = await res.json().catch(() => null);
		throw new Error(
			(body && "message" in body && String(body.message)) ||
				"Invalid email or password",
		);
	}
	await loadSession();
}

export async function signOut(): Promise<void> {
	await client.api.auth["sign-out"].$post();
	session = null;
}

export async function addWatchLocation(input: WatchLocationInput): Promise<void> {
	const res = await client.api.me["watch-locations"].$post({ json: input });
	if (!res.ok) {
		const body = await res.json().catch(() => null);
		throw new Error(
			(body && "message" in body && String(body.message)) || "Could not save that location",
		);
	}
}

export async function deleteWatchLocation(id: string): Promise<void> {
	await client.api.me["watch-locations"][":id"].$delete({ param: { id } });
}

export async function updateAccount(input: AccountUpdateInput): Promise<void> {
	const res = await client.api.me.account.$patch({ json: input });
	if (res.ok) await loadSession();
}

export async function uploadAvatar(file: File): Promise<void> {
	const res = await client.api.me.avatar.$post({ form: { photo: file } });
	if (res.ok) await loadSession();
}

export async function uploadTruckCoverPhoto(file: File): Promise<void> {
	const res = await client.api.me["truck-profile"].photo.$post({ form: { photo: file } });
	if (res.ok) await loadSession();
}

export async function setDefaultLocation(input: DefaultLocationInput): Promise<void> {
	const res = await client.api.me["truck-profile"]["default-location"].$post({ json: input });
	if (!res.ok) {
		const body = await res.json().catch(() => null);
		throw new Error(
			(body && "message" in body && String(body.message)) || "Could not save that location",
		);
	}
	await loadSession();
}

export async function clearDefaultLocation(): Promise<void> {
	const res = await client.api.me["truck-profile"]["default-location"].$delete();
	if (!res.ok) {
		const body = await res.json().catch(() => null);
		throw new Error(
			(body && "message" in body && String(body.message)) || "Could not clear that location",
		);
	}
	await loadSession();
}

/** Returns the dev-mode reset link when the API includes one (no email service configured yet — see apps/api/src/routes/auth.ts). */
export async function forgotPassword(input: ForgotPasswordInput): Promise<string | null> {
	const res = await client.api.auth["forgot-password"].$post({ json: input });
	if (!res.ok) throw new Error("Something went wrong. Try again.");
	const body = (await res.json()) as { ok: true; resetUrl?: string };
	return body.resetUrl ?? null;
}

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
	const res = await client.api.auth["reset-password"].$post({ json: input });
	if (!res.ok) {
		const body = await res.json().catch(() => null);
		throw new Error(
			(body && "message" in body && String(body.message)) || "Could not reset password",
		);
	}
}
