import { test, expect } from "./fixtures";

/**
 * Public auth surface — renders without a Supabase connection (the forms only
 * touch Supabase on submit), so this suite runs on a bare checkout and is the
 * baseline smoke signal for the deployment.
 */
test.describe("auth pages", () => {
  test("login page renders the sign-in form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  test("login links through to signup", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "Create an account" }).click();
    await expect(page).toHaveURL(/\/signup$/);
    await expect(
      page.getByRole("heading", { name: "Create your landlord account" }),
    ).toBeVisible();
  });

  test("signup page renders all required fields", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByLabel("Full name")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Create account" })).toBeVisible();
  });

  test("reset page renders the email form", async ({ page }) => {
    await page.goto("/reset");
    await expect(page.getByRole("heading", { name: "Reset password" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByRole("button", { name: "Send reset link" })).toBeVisible();
  });

  test("invited banner shows on /login?invited=1", async ({ page }) => {
    await page.goto("/login?invited=1");
    await expect(page.getByText("Your account is ready")).toBeVisible();
  });
});
