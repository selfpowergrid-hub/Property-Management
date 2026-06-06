import { test as base, expect, type Page } from "@playwright/test";

/**
 * True when the runner has Supabase env (loaded from .env.local by
 * playwright.config.ts). Suites that need a live database gate on this and
 * skip — with a visible annotation — when it is absent, so the public-surface
 * smoke tests still run on a bare checkout.
 */
export const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

let reachable: boolean | undefined;

/**
 * Whether the configured Supabase is actually answering. Having env vars set
 * (e.g. a stale .env.local) doesn't mean the local stack is up — without this
 * probe the authenticated suite would fail red instead of skipping when Docker
 * isn't running. Result is cached for the run.
 */
export async function supabaseReachable(): Promise<boolean> {
  if (!supabaseConfigured) return false;
  if (reachable !== undefined) return reachable;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 8_000);
    const res = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: key },
      signal: ac.signal,
    });
    clearTimeout(timer);
    reachable = res.ok;
  } catch {
    reachable = false;
  }
  return reachable;
}

/** Demo accounts seeded by supabase/seed.sql — all share one password. */
export const DEMO_PASSWORD = process.env.E2E_DEMO_PASSWORD ?? "Password123!";
export const DEMO = {
  landlord: { email: "landlord@demo.test", password: DEMO_PASSWORD },
  manager: { email: "manager@demo.test", password: DEMO_PASSWORD },
  accountant: { email: "accountant@demo.test", password: DEMO_PASSWORD },
  caretaker: { email: "caretaker@demo.test", password: DEMO_PASSWORD },
  tenant: { email: "tenant@demo.test", password: DEMO_PASSWORD },
  landlordB: { email: "landlord-b@demo.test", password: DEMO_PASSWORD },
} as const;

/** Sign in through the real login form and wait for the post-login landing. */
export async function login(
  page: Page,
  creds: { email: string; password: string },
): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(creds.email);
  await page.getByLabel("Password", { exact: true }).fill(creds.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  // The action redirects to "/", which then routes to the role home
  // (/dashboard or /portal). Wait past the transient "/" hop so callers see
  // the settled landing route, not the in-flight redirect.
  await page.waitForURL(
    (url) => url.pathname !== "/login" && url.pathname !== "/",
    { timeout: 15_000 },
  );
}

export const test = base;
export { expect };
