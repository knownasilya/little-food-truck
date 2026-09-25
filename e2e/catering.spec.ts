import { expect, request as pwRequest, test, type Page } from "@playwright/test";
import {
  createOpenTruckViaApi,
  createUnclaimedTruckViaApi,
  signUpCustomerViaApi,
} from "./helpers";

// Catering requests need both a real owner behind the truck (claimed) and
// a real person behind the request (signed in) — an anonymous submission
// or one aimed at an admin-added placeholder listing would just vanish
// with nobody able to see or act on it. Covers the UI (form only appears
// when both conditions hold, explanatory prompts otherwise) and the API
// directly (rejects on either gate even if the UI is bypassed). Run as one
// serial flow, sharing a single truck-owner sign-up and a single customer
// sign-up across all five cases, same as the other specs — the sign-up
// endpoint is rate-limited, and this suite already sits close to that
// limit per run without adding more than it needs.
test.describe.configure({ mode: "serial" });

test.describe("Catering requests", () => {
  let page: Page;
  let claimedTruck: { id: string; name: string };
  let unclaimedTruck: { id: string; name: string };

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();

    const setupContext = await pwRequest.newContext();
    claimedTruck = await createOpenTruckViaApi(setupContext, "Test Catering Truck");
    unclaimedTruck = await createUnclaimedTruckViaApi(setupContext, "Test Unclaimed Catering Truck");
    await setupContext.dispose();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("1. prompts to sign in for a claimed truck when signed out", async () => {
    await page.goto(`/trucks/${claimedTruck.id}`);
    await expect(page.getByRole("heading", { name: claimedTruck.name, level: 1 })).toBeVisible();

    await expect(page.getByRole("button", { name: "Request catering" })).not.toBeVisible();
    await expect(page.getByText("Sign in to request catering.")).toBeVisible();
  });

  test("2. is not offered for an unclaimed truck", async () => {
    await page.goto(`/trucks/${unclaimedTruck.id}`);
    await expect(page.getByRole("heading", { name: unclaimedTruck.name, level: 1 })).toBeVisible();

    await expect(page.getByRole("button", { name: "Request catering" })).not.toBeVisible();
    await expect(page.getByText(/hasn't been claimed by its owner yet/)).toBeVisible();
  });

  test("3. can be sent for a claimed truck once signed in", async () => {
    // page.request shares page's browser context, so this sign-up leaves
    // the page itself signed in for the rest of this spec.
    await signUpCustomerViaApi(page.request, "Catering Customer");

    await page.goto(`/trucks/${claimedTruck.id}`);
    await page.getByRole("button", { name: "Request catering" }).click();
    await page.getByPlaceholder("Your name").fill("Jamie Cook");
    await page.getByPlaceholder("Email").fill("jamie@example.com");
    await page.locator('input[type="date"]').fill("2027-06-01");
    await page.getByRole("button", { name: "Send request" }).click();

    await expect(page.getByText(/Request sent!/)).toBeVisible();
  });

  test("4. is rejected by the API for an unclaimed truck, even signed in", async () => {
    // Reuses the customer session from test 3 — the page is signed in now.
    const res = await page.request.post(
      `http://localhost:8787/api/trucks/${unclaimedTruck.id}/catering-request`,
      { data: { name: "Jamie Cook", email: "jamie@example.com", eventDate: "2027-06-01" } },
    );
    expect(res.status()).toBe(400);
  });

  test("5. is rejected by the API when signed out, even for a claimed truck", async () => {
    const anonContext = await pwRequest.newContext();
    const res = await anonContext.post(
      `http://localhost:8787/api/trucks/${claimedTruck.id}/catering-request`,
      { data: { name: "Jamie Cook", email: "jamie@example.com", eventDate: "2027-06-01" } },
    );
    expect(res.status()).toBe(401);
    await anonContext.dispose();
  });
});
