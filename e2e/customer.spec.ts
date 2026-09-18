import { expect, request as pwRequest, test, type Page } from "@playwright/test";
import {
  createOpenTruckViaApi,
  TEST_LAT,
  TEST_LNG,
  TEST_PASSWORD,
  uniqueEmail,
  uniqueName,
} from "./helpers";

// The five most important things a customer needs to be able to do: create
// an account, find a truck, favorite it, review it, and set up a proximity
// notification. Run as one serial flow (shared page) rather than five
// independent tests, since each step's UI state depends on the previous one
// — that's also closer to how a real customer actually uses the app in one
// sitting.
test.describe.configure({ mode: "serial" });

test.describe("Customer: core flows", () => {
  let truck: { id: string; name: string };
  let page: Page;

  const email = uniqueEmail("customer");
  const name = uniqueName("Test Customer");

  test.beforeAll(async ({ browser }) => {
    // Fixture truck, created directly via the API so this spec doesn't
    // depend on seed data or on truck.spec.ts having run first — the truck
    // sign-up/profile/location UI flows are covered by truck.spec.ts
    // itself, so re-driving them here would just be slow duplication.
    const apiContext = await pwRequest.newContext();
    truck = await createOpenTruckViaApi(apiContext, "Test Taco Truck");
    await apiContext.dispose();

    const context = await browser.newContext();
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({ latitude: TEST_LAT, longitude: TEST_LNG });
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("1. signs up as a customer", async () => {
    await page.goto("/sign-up");
    // Role defaults to "customer" — no toggle click needed.
    await page.getByPlaceholder("Your name").fill(name);
    await page.getByPlaceholder("Email").fill(email);
    await page.getByPlaceholder("Password (min 8 characters)").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/browse/);
  });

  test("2. finds the truck via search and opens its detail page", async () => {
    await page.goto("/browse");
    const search = page.getByPlaceholder("Search trucks…");
    await search.fill(truck.name);
    await search.press("Tab"); // blur triggers the search's onchange handler

    const truckLink = page.locator(`a[href="/trucks/${truck.id}"]`);
    await expect(truckLink).toBeVisible();
    await truckLink.click();

    await expect(page).toHaveURL(`/trucks/${truck.id}`);
    await expect(page.getByRole("heading", { name: truck.name, level: 1 })).toBeVisible();
  });

  test("3. favorites the truck", async () => {
    const favoriteButton = page.getByRole("button", { name: "Add to favorites" });
    await favoriteButton.click();
    await expect(page.getByRole("button", { name: "Favorited" })).toBeVisible();
  });

  test("4. leaves a review", async () => {
    await page.getByRole("button", { name: "Reviews" }).click();
    await page.getByPlaceholder("Share your experience…").fill("Great tacos, fast service!");
    await page.getByRole("button", { name: "Post review" }).click();

    await expect(page.getByText("Great tacos, fast service!")).toBeVisible();
    await expect(page.getByText(name, { exact: true })).toBeVisible();
  });

  test("5. adds a watch location for proximity notifications", async () => {
    await page.goto("/account");

    await page.getByPlaceholder("Label (e.g. Home, Work)").fill("Home");
    const locateButton = page.getByRole("button", { name: "Use my current location" });
    await locateButton.click();
    await expect(page.getByRole("button", { name: /Location set/ })).toBeVisible();

    await page.getByRole("button", { name: "Add location" }).click();

    const savedLocation = page.getByText("Home", { exact: true }).first();
    await expect(savedLocation).toBeVisible();
    await expect(page.getByText(/mi radius/)).toBeVisible();
  });
});
