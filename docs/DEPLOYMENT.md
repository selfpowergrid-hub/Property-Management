# Nyumba360 — Production Deployment Runbook

Phase 5 (QA & Launch) operator guide. Covers provisioning Supabase, deploying
the web app to Vercel, building the Android app with EAS, and the post-deploy
checks for go-live.

> Audience: the engineer/operator launching a Nyumba360 instance. End-user
> (landlord/staff) instructions are in [ONBOARDING.md](./ONBOARDING.md).

---

## 0. Prerequisites

- Node 20+, **pnpm 9.15.9** (`corepack enable` then `corepack use pnpm@9.15.9`)
- A Supabase account, a Vercel account, an Expo (EAS) account
- Supabase CLI (`supabase`) and `eas-cli` (`npm i -g eas-cli`)
- M-Pesa Paybill credentials and an Africa's Talking account (for SMS) — per
  PRD §13.1, these come from the client during UAT

---

## 1. Supabase (database, auth, storage)

1. **Create the project** in the Supabase dashboard. Pick the region closest to
   users/server — for Kenya, EU (Frankfurt) or Mumbai are the lowest-latency
   standard regions. Note the region: the Vercel function region (§2) should
   match it to keep DB round-trips fast.

2. **Apply the schema.** From the repo root, linked to your project:
   ```bash
   supabase link --project-ref <your-ref>
   supabase db push          # applies supabase/migrations/* in order
   ```
   `db push` runs migrations only, not `seed.sql` (that is local demo data).

3. **Enable the access-token hook.** Dashboard → Authentication → Hooks →
   *Customize Access Token (JWT) Claims* → select `auth.custom_access_token_hook`.
   This injects the `org_id` / `user_role` claims that RLS depends on. Without
   it, signed-in users have no org claim and see nothing.

4. **Regenerate types** (if the schema changed since the last commit):
   ```bash
   supabase gen types typescript --linked > packages/supabase/src/types.ts
   ```

5. **Storage.** The `20260605000012_storage.sql` migration provisions the buckets
   (maintenance photos, expense receipts). Confirm they exist under Storage.

6. **Provision the first landlord** (admin seeding — see §5). Do this once the
   schema is live.

---

## 2. Web app on Vercel

The repo ships [apps/web/vercel.json](../apps/web/vercel.json) with the monorepo
build/install commands and a default function region (`fra1`).

1. **Import the repo** into Vercel. Set **Root Directory = `apps/web`**.
   `vercel.json` handles install/build from the workspace root via Turborepo.

2. **Set environment variables** (Project → Settings → Environment Variables),
   for Production and Preview:

   | Variable | Value | Notes |
   |----------|-------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` | public |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key | public |
   | `SUPABASE_SERVICE_ROLE_KEY` | service role key | **server-only, never expose** |
   | `AT_API_KEY` | Africa's Talking API key | SMS |
   | `AT_USERNAME` | AT username (`sandbox` for testing) | SMS |
   | `AT_SENDER_ID` | approved sender ID | SMS |

   (Full list mirrors `turbo.json` `globalEnv` and `.env.example`.)

3. **Adjust the region** if your Supabase project isn't in Frankfurt — edit
   `regions` in `apps/web/vercel.json` (e.g. `bom1` for Mumbai) so functions sit
   near the database.

4. **Deploy.** Pushes to `main` deploy production; PRs get preview URLs. The
   `Strict-Transport-Security` and other hardening headers are set in
   `next.config.mjs`.

---

## 3. Mobile app on EAS (Android-first)

Config: [apps/mobile/eas.json](../apps/mobile/eas.json). Profiles:

| Profile | Output | Use |
|---------|--------|-----|
| `development` | APK + dev client | local debugging |
| `preview` | APK, internal distribution | **UAT / client testing** |
| `production` | AAB, auto-incremented | Google Play |

```bash
cd apps/mobile
eas login
eas init                       # writes extra.eas.projectId into app.json (commit it)

pnpm build:preview             # APK for UAT — share the EAS build link
pnpm build:production          # AAB for the Play Store
pnpm submit:production         # upload to Play (internal track)
```

Notes:
- The pnpm monorepo is already EAS-ready (`.npmrc` `node-linker=hoisted` + the
  workspace-aware `metro.config.js`).
- Supabase URL/anon key are read from `app.json` → `expo.extra` (anon key is
  public and safe to ship). To move them to EAS secrets later, read via
  `expo-constants` from `extra` populated at build time.
- The `channel` fields enable EAS Update (OTA) once `expo-updates` is added;
  until then they only label builds — harmless.

---

## 4. Testing & QA gates

CI ([.github/workflows/ci.yml](../.github/workflows/ci.yml)) runs on every push/PR:
`typecheck` → `lint` → `build`, plus the Playwright E2E suite.

```bash
pnpm typecheck && pnpm lint && pnpm build      # quality gates
pnpm --filter @nyumba360/web test:e2e          # E2E (see apps/web/e2e)
```

- **Public smoke tests** (`e2e/auth-pages.spec.ts`) run with no database.
- **Authenticated flows** (`e2e/authenticated.spec.ts`) — login, role routing,
  and cross-org RLS isolation — run only when Supabase is reachable; otherwise
  they skip with an annotation. To run them:
  1. `apps/web/.env.local` with the Supabase URL + anon key
  2. seed data present (`pnpm db:reset` locally, or a staging project seeded
     with `supabase/seed.sql`)
- **Against a deployed preview** (UAT): point the runner at the URL —
  `E2E_BASE_URL=https://<preview>.vercel.app pnpm --filter @nyumba360/web test:e2e`.
- In CI, set repo secrets `E2E_SUPABASE_URL`, `E2E_SUPABASE_ANON_KEY`,
  `E2E_DEMO_PASSWORD` to enable the authenticated suite against staging.

---

## 5. Admin seeding (first landlord)

`scripts/seed-admin.mjs` provisions a real organisation + landlord login via the
Auth Admin API (works against hosted Supabase, unlike the local-only
`seed.sql`). Requires `SUPABASE_SERVICE_ROLE_KEY`.

```bash
SUPABASE_URL=https://<ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
pnpm seed:admin --org "Acme Properties" --county Nairobi \
  --email owner@acme.co.ke --name "Jane Acme" --plan growth
```

- Omit `--password` to auto-generate a strong one (printed once).
- Creates the org, a confirmed landlord auth user with `org_id`/`user_role`
  claims, and links the profile. The landlord signs in and changes the password,
  then onboards property data and invites staff — see
  [ONBOARDING.md](./ONBOARDING.md).

---

## 6. Post-deploy verification

1. Visit the production URL → `/login` renders.
2. Sign in as the seeded landlord → lands on `/dashboard`.
3. Create a property + unit, add a tenant + lease → invoice appears.
4. Record a payment → receipt PDF downloads.
5. **RLS isolation:** confirm a second org's landlord never sees org-one data.
6. Invite a staff user → accept-invite flow completes, role-scoped nav correct.
7. Tenant logs into the Android (preview) build → sees only their lease/balance,
   can submit a maintenance request, receives the push notification.
8. SMS: trigger a payment confirmation → delivered (or logged) via Africa's
   Talking.

---

## 7. Rollback

- **Web:** Vercel → Deployments → promote the previous deployment.
- **Mobile:** distribute the prior EAS build; or `eas update` once OTA is on.
- **Database:** migrations are forward-only. Take a Supabase backup before
  `db push`; restore from the dashboard's PITR/backup if a migration misbehaves.
