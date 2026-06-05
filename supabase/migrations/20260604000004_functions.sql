-- ============================================================================
-- Nyumba360 — 0004 Functions
-- Auth/JWT plumbing for multi-tenancy (PRD §9.2) plus shared trigger functions.
-- RLS policies in 0006 depend on the auth_* helpers defined here.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Custom Access Token Hook
-- Runs on every token issue and copies the user's org_id + role from the
-- profile row into the JWT claims. RLS then reads these claims. We deliberately
-- use the claim name `user_role` (NOT `role`, which PostgREST reserves for the
-- Postgres role the request runs as).
-- ----------------------------------------------------------------------------
-- Defined in `public` (not `auth`): hosted Supabase's `postgres` role cannot
-- create objects in the `auth` schema, and a public-schema hook is the
-- officially supported pattern. The Auth Hook is pointed at this function.
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims    jsonb;
  v_org_id  uuid;
  v_role    public.user_role;
begin
  select org_id, role
    into v_org_id, v_role
    from public.users
   where id = (event ->> 'user_id')::uuid;

  claims := coalesce(event -> 'claims', '{}'::jsonb);

  if v_org_id is not null then
    claims := jsonb_set(claims, '{org_id}', to_jsonb(v_org_id::text));
  end if;

  if v_role is not null then
    claims := jsonb_set(claims, '{user_role}', to_jsonb(v_role::text));
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- The auth admin role executes the hook and must read profiles.
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
grant select on public.users to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;

-- ----------------------------------------------------------------------------
-- JWT claim helpers used by RLS policies (0006)
-- ----------------------------------------------------------------------------
create or replace function public.auth_org_id()
returns uuid
language sql
stable
as $$
  select nullif(
    current_setting('request.jwt.claims', true)::jsonb ->> 'org_id',
    ''
  )::uuid;
$$;

create or replace function public.auth_role()
returns text
language sql
stable
as $$
  select current_setting('request.jwt.claims', true)::jsonb ->> 'user_role';
$$;

-- Any non-tenant role within the org (PRD §8 — staff see org-wide data).
create or replace function public.is_staff()
returns boolean
language sql
stable
as $$
  select public.auth_role() in ('landlord', 'manager', 'caretaker', 'accountant');
$$;

-- ----------------------------------------------------------------------------
-- Shared trigger functions
-- ----------------------------------------------------------------------------

-- Keep updated_at fresh on any UPDATE (attached in 0005).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Mirror new auth.users into public.users. org_id/role are read from
-- raw_app_meta_data when present (invited staff & auto-created tenants,
-- AUTH-04/05); a self-registering landlord has neither yet and fills them in
-- via the "create organisation" server action.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, org_id, email, phone, full_name, role)
  values (
    new.id,
    nullif(new.raw_app_meta_data ->> 'org_id', '')::uuid,
    new.email,
    coalesce(new.phone, new.raw_user_meta_data ->> 'phone'),
    new.raw_user_meta_data ->> 'full_name',
    nullif(new.raw_app_meta_data ->> 'user_role', '')::public.user_role
  );
  return new;
end;
$$;
