import type { APIRequestContext } from "@playwright/test";

const API_URL = "http://localhost:8787";

// Unique per test run so repeated runs never collide with previous data
// (Supabase Auth emails are unique) or with each other, since tests aren't
// parallelized within a file but the two spec files could still overlap.
const runId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${runId}@example.com`;
}

export function uniqueName(prefix: string): string {
  return `${prefix} ${runId}`;
}

export const TEST_PASSWORD = "password123!";

// Somewhere in downtown Austin — matches the seed data's demo customer
// "Home" watch location, so lat/lng math stays plausible if this is ever
// cross-checked against seeded fixtures.
export const TEST_LAT = 30.2672;
export const TEST_LNG = -97.7431;

/**
 * Creates a truck account directly through the API (not the UI) and opens
 * it at a fixed location. Used as fast, isolated setup for customer-flow
 * specs that need a real truck to browse/favorite/review — the truck
 * sign-up/profile/location flows themselves are covered by truck.spec.ts,
 * so re-driving them through the UI here would just be slow duplication.
 */
export async function createOpenTruckViaApi(
  request: APIRequestContext,
  namePrefix: string,
): Promise<{ id: string; name: string }> {
  const email = uniqueEmail(namePrefix.toLowerCase().replace(/\s+/g, "-"));
  const name = uniqueName(namePrefix);

  const signUpRes = await request.post(`${API_URL}/api/auth/sign-up`, {
    data: { email, password: TEST_PASSWORD, role: "truck", displayName: name },
  });
  if (!signUpRes.ok()) {
    throw new Error(`Truck sign-up setup failed: ${signUpRes.status()} ${await signUpRes.text()}`);
  }
  const { id } = (await signUpRes.json()) as { id: string };

  const profileRes = await request.patch(`${API_URL}/api/me/truck-profile`, {
    data: { name, description: "E2E test fixture truck", cuisine: "mexican" },
  });
  if (!profileRes.ok()) {
    throw new Error(`Truck profile setup failed: ${profileRes.status()} ${await profileRes.text()}`);
  }

  const locationRes = await request.post(`${API_URL}/api/me/location`, {
    data: { lat: TEST_LAT, lng: TEST_LNG, isOpen: true },
  });
  if (!locationRes.ok()) {
    throw new Error(`Truck location setup failed: ${locationRes.status()} ${await locationRes.text()}`);
  }

  // The request context that created this truck is now signed in as it;
  // callers use a separate context/page for the customer under test, so
  // this session being left signed-in doesn't leak into the actual test.
  return { id, name };
}

/**
 * Creates an unclaimed truck listing directly through the admin API (not
 * the UI) — same account shape claim.spec.ts drives through the admin
 * page, just faster/isolated for specs that only need an unclaimed
 * fixture truck to exist, not the claim flow itself. Depends on the seeded
 * admin@example.com account, same as claim.spec.ts.
 */
export async function createUnclaimedTruckViaApi(
  request: APIRequestContext,
  namePrefix: string,
): Promise<{ id: string; name: string }> {
  const name = uniqueName(namePrefix);

  const signInRes = await request.post(`${API_URL}/api/auth/sign-in`, {
    data: { email: "admin@example.com", password: "password123" },
  });
  if (!signInRes.ok()) {
    throw new Error(`Admin sign-in setup failed: ${signInRes.status()} ${await signInRes.text()}`);
  }

  const createRes = await request.post(`${API_URL}/api/admin/trucks`, {
    data: { name, description: "E2E unclaimed test fixture truck", cuisine: "mexican" },
  });
  if (!createRes.ok()) {
    throw new Error(`Unclaimed truck setup failed: ${createRes.status()} ${await createRes.text()}`);
  }
  const { id } = (await createRes.json()) as { id: string };

  return { id, name };
}
