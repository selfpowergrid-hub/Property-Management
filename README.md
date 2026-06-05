# Nyumba360

Multi-tenant **property & rent management SaaS** for the Kenyan market.
This repository contains the **Phase 1 foundation** (PRD §12, Weeks 1–3): the
monorepo, the full Supabase data model with per-organisation Row-Level Security,
authentication with role claims and an invite flow, a role-aware Next.js app
shell for all five roles, and an Expo mobile skeleton.

> Modules built in later phases: rent collection & receipting, maintenance,
> vacancies, expenses, reports, Africa's Talking SMS, the full mobile app, and
> PDF generation. See `Nyumba360_PRD_v1.0.md`.

## Stack

| Layer | Tech |
|-------|------|
| Web | Next.js 14 (App Router), Tailwind, hand-rolled shadcn-style UI |
| Mobile | Expo SDK 51 (React Native) — Phase 1 login stub |
| Backend | Supabase (Postgres + RLS + Auth) |
| Monorepo | pnpm workspaces + Turborepo |

```
apps/
  web/        Next.js web app (staff dashboard + tenant portal)
  mobile/     Expo app skeleton
packages/
  shared/     roles, permissions matrix, navigation, enums, KES formatting, zod schemas
  supabase/   generated-style DB types + a framework-agnostic client factory
  tsconfig/   shared TS presets
supabase/
  migrations/ enums → tables → indexes → functions → triggers → RLS
  seed.sql    two orgs, five role users, sample data
```

## Prerequisites

- Node 20+, **pnpm 9**
- **Docker Desktop** (for the local Supabase stack) — or a hosted Supabase project
- Supabase CLI (`supabase`)

## Getting started

```bash
pnpm install

# 1. Start the local Supabase stack (needs Docker). This applies all
#    migrations and runs seed.sql automatically.
pnpm db:start          # supabase start
pnpm db:reset          # re-apply migrations + seed at any time

# 2. Configure the web app env from the values `supabase start` prints.
cp .env.example apps/web/.env.local
#   set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
#   and SUPABASE_SERVICE_ROLE_KEY

# 3. Run the web app
pnpm --filter @nyumba360/web dev   # http://localhost:3000
```

### Demo logins (after `db:reset`)

All demo users share the password **`Password123!`**.

| Email | Role | Org |
|-------|------|-----|
| landlord@demo.test | Landlord | Mwangi Holdings |
| manager@demo.test | Manager | Mwangi Holdings |
| caretaker@demo.test | Caretaker | Mwangi Holdings |
| accountant@demo.test | Accountant | Mwangi Holdings |
| tenant@demo.test | Tenant | Mwangi Holdings |
| landlord-b@demo.test | Landlord | Coastline Properties (isolation control) |

A brand-new landlord who signs up at `/signup` is taken through `/onboarding`
to create their organisation.

## Connecting to a hosted Supabase project

```bash
supabase link --project-ref <your-ref>
supabase db push                # apply migrations to the remote project
# Enable the access-token hook: Dashboard → Authentication → Hooks →
#   "Customize Access Token (JWT) Claims" → select public... actually
#   auth.custom_access_token_hook (already declared in config.toml for local).
supabase gen types typescript --linked > packages/supabase/src/types.ts
```

## Multi-tenancy & security (PRD §9.2)

- Every tenant-scoped table has `org_id`; RLS filters every query by the
  `org_id` JWT claim. The claim is injected by the **Custom Access Token Hook**
  (`auth.custom_access_token_hook`) from the user's profile row.
- The role-specific claim is `user_role` (not `role`, which PostgREST reserves).
- Strict policies encode the PRD §8 permissions matrix. Provisioning that RLS
  intentionally forbids (create org, accept invite, auto-create tenant) runs in
  server actions via the **service-role** client.

## Useful scripts

```bash
pnpm typecheck     # tsc across all packages/apps
pnpm lint          # eslint / next lint
pnpm build         # turbo build
pnpm db:reset      # reset local DB + reseed
```

## Verifying RLS isolation

After `pnpm db:reset`, sign in as `landlord@demo.test` and confirm you see
**Greenview Apartments** but never **Bahari Plaza** (Org B). Sign in as
`tenant@demo.test` and confirm the portal shows only Kevin's lease/balance.
