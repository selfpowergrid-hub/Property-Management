-- ============================================================================
-- Nyumba360 — 0008 Read tenancy claims from app_metadata
-- We always write org_id/user_role into the user's app_metadata (seed,
-- onboarding, invite acceptance), and app_metadata is included in every JWT.
-- Reading the claims from there means RLS works WITHOUT enabling the Custom
-- Access Token Hook in the dashboard. We still fall back to the top-level
-- claims the hook would set, so either configuration works.
-- ============================================================================

create or replace function public.auth_org_id()
returns uuid
language sql
stable
as $$
  select nullif(
    coalesce(
      current_setting('request.jwt.claims', true)::jsonb #>> '{app_metadata,org_id}',
      current_setting('request.jwt.claims', true)::jsonb ->> 'org_id'
    ),
    ''
  )::uuid;
$$;

create or replace function public.auth_role()
returns text
language sql
stable
as $$
  select coalesce(
    current_setting('request.jwt.claims', true)::jsonb #>> '{app_metadata,user_role}',
    current_setting('request.jwt.claims', true)::jsonb ->> 'user_role'
  );
$$;
