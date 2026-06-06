import { defineConfig, devices } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Load apps/web/.env.local (and .env) into process.env so the Playwright
 * *runner* can see the same Supabase config the Next dev server auto-loads.
 * Gated suites (e2e/authenticated.spec.ts) use this to decide whether to run
 * against a live Supabase or skip with a clear annotation. We parse by hand to
 * avoid pulling in a dotenv dependency.
 */
function loadEnv(file: string): void {
  const path = resolve(__dirname, file);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnv(".env.local");
loadEnv(".env");

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  // When E2E_BASE_URL points at an already-running deployment (e.g. a Vercel
  // preview during UAT), don't spin up a local server — just test that URL.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `next dev -p ${PORT}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        stdout: "pipe",
        stderr: "pipe",
      },
});
