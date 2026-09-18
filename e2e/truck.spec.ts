import { expect, test, type Page } from "@playwright/test";
import { TEST_LAT, TEST_LNG, TEST_PASSWORD, uniqueEmail, uniqueName } from "./helpers";

// The five most important things a truck owner needs to be able to do:
// create an account, set up their profile, go open with a real location,
// add a menu item, and post an update. Run as one serial flow (shared page)
// since each step builds on the previous one's state, same as customer.spec.ts.
test.describe.configure({ mode: "serial" });

test.describe("Truck owner: core flows", () => {
  let page: Page;

  const email = uniqueEmail("truck-owner");
  const initialName = uniqueName("Test Rolling Kitchen");
  const updatedName = uniqueName("Test Rolling Kitchen Updated");

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({ latitude: TEST_LAT, longitude: TEST_LNG });
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("1. signs up as a truck owner", async () => {
    await page.goto("/sign-up");
    await page.getByRole("button", { name: "I run a food truck" }).click();
    await page.getByPlaceholder("Truck name").fill(initialName);
    await page.getByPlaceholder("Email").fill(email);
    await page.getByPlaceholder("Password (min 8 characters)").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("2. updates the truck profile", async () => {
    const nameInput = page.getByLabel("Truck name");
    await expect(nameInput).toHaveValue(initialName);
    await nameInput.fill(updatedName);
    await page.getByLabel("Description").fill("Tacos, tortas, and horchata from a converted bus.");
    await page.getByLabel("Cuisine").selectOption("mexican");
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.getByRole("button", { name: "Save profile" })).toBeEnabled();

    // Reload to confirm the update actually persisted server-side, not just
    // in the form's local state.
    await page.reload();
    await expect(page.getByLabel("Truck name")).toHaveValue(updatedName);
  });

  test("3. goes open with a real location", async () => {
    await page.getByRole("button", { name: "I'm here — open for business" }).click();
    await expect(page.getByText(/Currently open/)).toBeVisible();
  });

  test("4. adds a menu item", async () => {
    await page.getByPlaceholder("Item name").fill("Al Pastor Taco");
    await page.getByPlaceholder("$8.00").fill("$4.50");
    await page.getByPlaceholder("Description (optional)").fill("Pineapple, cilantro, onion.");
    await page.getByRole("button", { name: "Add item" }).click();

    await expect(page.getByText("Al Pastor Taco")).toBeVisible();
    await expect(page.getByText("$4.50")).toBeVisible();
  });

  test("5. posts an update", async () => {
    await page
      .getByPlaceholder("Selling out fast! Now taking last orders…")
      .fill("Parked at 5th & Congress until 2pm today!");
    await page.getByRole("button", { name: "Post update" }).click();

    await expect(page.getByText("Parked at 5th & Congress until 2pm today!")).toBeVisible();
  });
});
