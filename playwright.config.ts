import { defineConfig, devices } from "@playwright/test";

// E2E smoke tests for the web app's most important customer and truck
// flows. These need the local Supabase stack running (`supabase start`)
// plus a seeded DB (`pnpm db:seed`) — the truck spec seeds its own account
// via a fresh sign-up so it works from an empty DB too, but Supabase itself
// has to already be up (it's a stateful Docker stack, not something worth
// auto-starting per test run). See "End-to-end tests" in the README.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "pnpm --filter @little-food-truck/api dev",
      url: "http://localhost:8787/health",
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: "pnpm --filter @little-food-truck/web dev",
      url: "http://localhost:5173",
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
});
