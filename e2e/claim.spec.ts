import { expect, test, type Page } from "@playwright/test";
import { TEST_PASSWORD, uniqueEmail, uniqueName } from "./helpers";

// The claim flow's two admin-reviewed steps: an admin adds a listing for a
// truck that hasn't signed up itself, the real owner submits a claim
// request with proof of ownership, the admin approves it, and only then
// does the owner get to set a password and actually take the account over.
// Depends on the seeded admin@example.com account (see db/seed.ts) — unlike
// customer.spec.ts/truck.spec.ts, there's no self-serve way to become an
// admin, so this spec can't create its own from an empty DB.
test.describe.configure({ mode: "serial" });

test.describe("Truck claim flow: admin adds a listing, an owner claims it", () => {
  let adminPage: Page;
  let ownerPage: Page;

  const truckName = uniqueName("Test Claimable Truck");
  const ownerEmail = uniqueEmail("claim-owner");
  let claimUrl = "";
  let finishUrl = "";

  test.beforeAll(async ({ browser }) => {
    adminPage = await (await browser.newContext()).newPage();
    ownerPage = await (await browser.newContext()).newPage();
  });

  test.afterAll(async () => {
    await adminPage.close();
    await ownerPage.close();
  });

  test("1. admin signs in and adds an unclaimed truck", async () => {
    await adminPage.goto("/sign-in");
    await adminPage.getByPlaceholder("Email").fill("admin@example.com");
    await adminPage.getByPlaceholder("Password").fill("password123");
    await adminPage.getByRole("button", { name: "Sign in" }).click();
    await expect(adminPage).toHaveURL(/\/browse/);

    await adminPage.goto("/admin");
    await adminPage.getByRole("button", { name: "Add truck" }).click();
    await adminPage.getByPlaceholder("Truck name").fill(truckName);
    await adminPage.getByRole("combobox", { name: "Cuisine" }).selectOption("seafood");
    await adminPage.getByPlaceholder("City / area (optional)").fill("Charleston, SC");
    // Owner email left blank on purpose — leaving it set means the app
    // tries to actually send mail, and MailDev isn't part of this test
    // run's web servers (see playwright.config.ts), so the send would just
    // fail. Blank keeps the assertion below deterministic either way.
    await adminPage.getByRole("button", { name: "Add unclaimed truck" }).click();

    const banner = adminPage.getByText(/^Claim link:/);
    await expect(banner).toBeVisible();
    claimUrl = (await banner.textContent())!.replace("Claim link:", "").trim();
    expect(claimUrl).toContain("/claim?token=");
  });

  test("2. the real owner submits a claim request with proof of ownership", async () => {
    await ownerPage.goto(claimUrl);
    await expect(ownerPage.getByText(truckName)).toBeVisible();

    await ownerPage.getByPlaceholder("Your name").fill("Jamal Peterson");
    await ownerPage.getByPlaceholder("Your email").fill(ownerEmail);
    await ownerPage.getByPlaceholder("Phone (optional)").fill("8435550123");
    await ownerPage
      .getByPlaceholder(/Tell us about your truck/)
      .fill("I've run this truck out of Charleston since 2019.");
    await ownerPage.getByLabel(/Seller's permit or business license/).setInputFiles({
      name: "seller-permit.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\nfake permit doc for e2e test\n"),
    });
    await ownerPage.getByRole("button", { name: "Submit claim request" }).click();

    await expect(ownerPage.getByText(/Request submitted/)).toBeVisible();
  });

  test("3. admin approves the request", async () => {
    await adminPage.goto("/admin");
    await adminPage.getByRole("button", { name: /Claim requests/ }).click();

    // Scoped to this run's own request in case an earlier failed run left
    // another pending request behind — a fresh truck name per run keeps
    // this from ever ambiguously matching one of those.
    const requestItem = adminPage.locator("li", { hasText: truckName });
    await expect(requestItem).toBeVisible();
    await requestItem.getByRole("button", { name: "Approve" }).click();

    const banner = adminPage.getByText(/set-password link:/);
    await expect(banner).toBeVisible();
    finishUrl = (await banner.textContent())!.replace(/^.*set-password link:/, "").trim();
    expect(finishUrl).toContain("/claim/finish?token=");
  });

  test("4. the owner sets a password and lands on their dashboard", async () => {
    await ownerPage.goto(finishUrl);
    await expect(ownerPage.getByText(truckName)).toBeVisible();

    await ownerPage.getByPlaceholder("Password (min 8 characters)").fill(TEST_PASSWORD);
    await ownerPage.getByPlaceholder("Confirm password").fill(TEST_PASSWORD);
    await ownerPage.getByRole("button", { name: "Set password & claim truck" }).click();

    await expect(ownerPage).toHaveURL(/\/dashboard/);
    await expect(ownerPage.getByLabel("Truck name")).toHaveValue(truckName);
  });
});
