import { test, expect, login, supabaseReachable, DEMO } from "./fixtures";

/**
 * Core authenticated flows. These need a live, reachable Supabase with seed.sql
 * applied (`pnpm db:reset`) plus apps/web/.env.local. When the stack isn't
 * configured or isn't answering (e.g. Docker not running), each test skips with
 * an annotation rather than failing red.
 */
test.describe("authenticated flows", () => {
  test.beforeEach(async () => {
    test.skip(
      !(await supabaseReachable()),
      "Supabase not reachable — set apps/web/.env.local and run `pnpm db:start && pnpm db:reset`.",
    );
  });

  test("unauthenticated access to a staff route redirects to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("staff login lands on the dashboard", async ({ page }) => {
    await login(page, DEMO.landlord);
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  test("tenant login lands in the portal, not the staff app", async ({ page }) => {
    await login(page, DEMO.tenant);
    await expect(page).toHaveURL(/\/portal/);

    // A tenant who forces a staff URL is bounced back into the portal.
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/portal/);
  });

  test("staff cannot enter the tenant portal", async ({ page }) => {
    await login(page, DEMO.landlord);
    await page.goto("/portal");
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("RLS isolation: Org A landlord sees only Org A properties", async ({ page }) => {
    await login(page, DEMO.landlord);
    await page.goto("/properties");
    // Greenview is Org A (seed); Bahari Plaza belongs to Org B and must not leak.
    await expect(page.getByText("Greenview Apartments")).toBeVisible();
    await expect(page.getByText("Bahari Plaza")).toHaveCount(0);
  });
});
