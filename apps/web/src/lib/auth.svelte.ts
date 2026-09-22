import type {
	AccountUpdateInput,
	ClaimInfo,
	ClaimRequestInput,
	DefaultLocationInput,
	FinishClaimInfo,
	FinishClaimInput,
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
		// calls this fire-and-forget (no .catch of its own), and during the
		// marketing homepage's SSR prerender (a real build-time Node fetch,
		// not a browser one) an unhandled rejection here crashes the whole
		// build instead of just rendering the signed-out version, which is
		// what should happen either way when there's no session to find.
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

/** Loads the truck name/cuisine a claim token points to, for the /claim page to show before asking for claim details. */
export async function getClaimInfo(token: string): Promise<ClaimInfo> {
	const res = await client.api.claim[":token"].$get({ param: { token } });
	if (!res.ok) {
		const body = await res.json().catch(() => null);
		throw new Error(
			(body && "message" in body && String(body.message)) ||
				"This claim link is invalid or expired",
		);
	}
	return res.json();
}

/** Submits a claim request (name/email/phone/message + a proof document) — doesn't sign anyone in; an admin has to approve it first. */
export async function submitClaimRequest(
	token: string,
	input: ClaimRequestInput & { proofDocument: File },
): Promise<void> {
	const res = await client.api.claim[":token"].$post({
		param: { token },
		form: {
			name: input.name,
			email: input.email,
			...(input.phone ? { phone: input.phone } : {}),
			message: input.message ?? "",
			proofDocument: input.proofDocument,
		},
	});
	if (!res.ok) {
		const body = await res.json().catch(() => null);
		throw new Error(
			(body && "message" in body && String(body.message)) || "Could not submit that claim request",
		);
	}
}

/** Loads the truck name/email an approved-claim "finish" token points to, for the /claim/finish page. */
export async function getFinishClaimInfo(token: string): Promise<FinishClaimInfo> {
	const res = await client.api.claim.finish[":token"].$get({ param: { token } });
	if (!res.ok) {
		const body = await res.json().catch(() => null);
		throw new Error(
			(body && "message" in body && String(body.message)) || "This link is invalid or expired",
		);
	}
	return res.json();
}

/** Sets the password for an approved claim request, finishing the claim and (if possible) signing the owner in. */
export async function finishClaim(token: string, input: FinishClaimInput): Promise<void> {
	const res = await client.api.claim.finish[":token"].$post({ param: { token }, json: input });
	if (!res.ok) {
		const body = await res.json().catch(() => null);
		throw new Error(
			(body && "message" in body && String(body.message)) || "Could not finish claiming this truck",
		);
	}
	await loadSession();
}
