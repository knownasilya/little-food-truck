import { expect, request as pwRequest, test } from "@playwright/test";
import { createOpenTruckViaApi, createUnclaimedTruckViaApi } from "./helpers";

// Catering requests should only be possible for a truck a real owner has
// actually claimed — an admin-added placeholder listing has nobody who'd
// ever see (let alone respond to) a request sent to it. Covers both the
// UI (no form shown, explanatory note instead) and the API directly
// (rejects the request even if someone bypasses the UI entirely).
test.describe("Catering requests", () => {
  test("can be sent for a claimed truck", async ({ page, request }) => {
    const truck = await createOpenTruckViaApi(request, "Test Catering Truck");

    await page.goto(`/trucks/${truck.id}`);
    await expect(page.getByRole("heading", { name: truck.name, level: 1 })).toBeVisible();

    await page.getByRole("button", { name: "Request catering" }).click();
    await page.getByPlaceholder("Your name").fill("Jamie Cook");
    await page.getByPlaceholder("Email").fill("jamie@example.com");
    await page.locator('input[type="date"]').fill("2027-06-01");
    await page.getByRole("button", { name: "Send request" }).click();

    await expect(page.getByText(/Request sent!/)).toBeVisible();
  });

  test("are not offered for an unclaimed truck", async ({ page, request }) => {
    const truck = await createUnclaimedTruckViaApi(request, "Test Unclaimed Catering Truck");

    await page.goto(`/trucks/${truck.id}`);
    await expect(page.getByRole("heading", { name: truck.name, level: 1 })).toBeVisible();

    await expect(page.getByRole("button", { name: "Request catering" })).not.toBeVisible();
    await expect(page.getByText(/hasn't been claimed by its owner yet/)).toBeVisible();
  });

  test("are rejected by the API even if requested directly", async () => {
    const apiContext = await pwRequest.newContext();
    const truck = await createUnclaimedTruckViaApi(apiContext, "Test Unclaimed API Truck");

    // A fresh, signed-out context — the admin session that created the
    // fixture above shouldn't be the one making this request.
    const anonContext = await pwRequest.newContext();
    const res = await anonContext.post(`http://localhost:8787/api/trucks/${truck.id}/catering-request`, {
      data: {
        name: "Jamie Cook",
        email: "jamie@example.com",
        eventDate: "2027-06-01",
      },
    });

    expect(res.status()).toBe(400);
    await apiContext.dispose();
    await anonContext.dispose();
  });
});
