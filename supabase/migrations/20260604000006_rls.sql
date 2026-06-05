-- ============================================================================
-- Nyumba360 — 0006 Row-Level Security
-- Enforces complete per-organisation isolation (PRD §9.2) and encodes the
-- roles & permissions matrix (PRD §8). All bootstrap/provisioning writes
-- (create org, accept invite, auto-create tenant, send SMS) are performed by
-- server actions using the service_role key, which bypasses RLS — so the
-- policies below can stay strict.
-- ============================================================================

-- Resolve the tenants.id for the currently logged-in tenant portal user.
-- SECURITY DEFINER so it bypasses RLS on `tenants` and cannot recurse into the
-- policies that call it.
create or replace function public.auth_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.tenants where user_id = auth.uid() limit 1;
$$;

-- Enable RLS everywhere
alter table public.organisations       enable row level security;
alter table public.users               enable row level security;
alter table public.properties          enable row level security;
alter table public.units               enable row level security;
alter table public.tenants             enable row level security;
alter table public.leases              enable row level security;
alter table public.invoices            enable row level security;
alter table public.payments            enable row level security;
alter table public.maintenance_requests enable row level security;
alter table public.expenses            enable row level security;
alter table public.sms_logs            enable row level security;
alter table public.user_invitations    enable row level security;

-- ---------------------------------------------------------------------------
-- organisations
-- ---------------------------------------------------------------------------
create policy org_select on public.organisations
  for select to authenticated
  using (id = public.auth_org_id());

create policy org_update on public.organisations
  for update to authenticated
  using (id = public.auth_org_id() and public.auth_role() = 'landlord')
  with check (id = public.auth_org_id() and public.auth_role() = 'landlord');

-- ---------------------------------------------------------------------------
-- users (profiles)
-- ---------------------------------------------------------------------------
create policy users_select on public.users
  for select to authenticated
  using (
    id = auth.uid()
    or (public.is_staff() and org_id = public.auth_org_id())
  );

-- The access-token hook (0004) runs as supabase_auth_admin and must read
-- org_id/role from this table despite RLS being enabled.
create policy users_select_auth_admin on public.users
  for select to supabase_auth_admin
  using (true);

create policy users_update on public.users
  for update to authenticated
  using (
    id = auth.uid()
    or (public.auth_role() = 'landlord' and org_id = public.auth_org_id())
  )
  with check (
    id = auth.uid()
    or (public.auth_role() = 'landlord' and org_id = public.auth_org_id())
  );

-- ---------------------------------------------------------------------------
-- properties  (write: landlord, manager)
-- ---------------------------------------------------------------------------
create policy properties_select on public.properties
  for select to authenticated
  using (public.is_staff() and org_id = public.auth_org_id());

create policy properties_write on public.properties
  for all to authenticated
  using (org_id = public.auth_org_id() and public.auth_role() in ('landlord', 'manager'))
  with check (org_id = public.auth_org_id() and public.auth_role() in ('landlord', 'manager'));

-- ---------------------------------------------------------------------------
-- units  (write: landlord, manager; tenant sees own unit)
-- ---------------------------------------------------------------------------
create policy units_select_staff on public.units
  for select to authenticated
  using (public.is_staff() and org_id = public.auth_org_id());

create policy units_select_tenant on public.units
  for select to authenticated
  using (id in (select unit_id from public.leases where tenant_id = public.auth_tenant_id()));

create policy units_write on public.units
  for all to authenticated
  using (org_id = public.auth_org_id() and public.auth_role() in ('landlord', 'manager'))
  with check (org_id = public.auth_org_id() and public.auth_role() in ('landlord', 'manager'));

-- ---------------------------------------------------------------------------
-- tenants  (write: landlord, manager; tenant sees own profile)
-- ---------------------------------------------------------------------------
create policy tenants_select on public.tenants
  for select to authenticated
  using (
    (public.is_staff() and org_id = public.auth_org_id())
    or user_id = auth.uid()
  );

create policy tenants_write on public.tenants
  for all to authenticated
  using (org_id = public.auth_org_id() and public.auth_role() in ('landlord', 'manager'))
  with check (org_id = public.auth_org_id() and public.auth_role() in ('landlord', 'manager'));

-- ---------------------------------------------------------------------------
-- leases  (write: landlord, manager; tenant sees own)
-- ---------------------------------------------------------------------------
create policy leases_select on public.leases
  for select to authenticated
  using (
    (public.is_staff() and org_id = public.auth_org_id())
    or tenant_id = public.auth_tenant_id()
  );

create policy leases_write on public.leases
  for all to authenticated
  using (org_id = public.auth_org_id() and public.auth_role() in ('landlord', 'manager'))
  with check (org_id = public.auth_org_id() and public.auth_role() in ('landlord', 'manager'));

-- ---------------------------------------------------------------------------
-- invoices  (write: landlord, manager, accountant; tenant sees own)
-- ---------------------------------------------------------------------------
create policy invoices_select on public.invoices
  for select to authenticated
  using (
    (public.is_staff() and org_id = public.auth_org_id())
    or lease_id in (select id from public.leases where tenant_id = public.auth_tenant_id())
  );

create policy invoices_write on public.invoices
  for all to authenticated
  using (org_id = public.auth_org_id() and public.auth_role() in ('landlord', 'manager', 'accountant'))
  with check (org_id = public.auth_org_id() and public.auth_role() in ('landlord', 'manager', 'accountant'));

-- ---------------------------------------------------------------------------
-- payments  (record: landlord, manager, caretaker, accountant;
--            view-all: landlord, manager, accountant; tenant sees own)
-- ---------------------------------------------------------------------------
create policy payments_select on public.payments
  for select to authenticated
  using (
    (org_id = public.auth_org_id() and public.auth_role() in ('landlord', 'manager', 'accountant'))
    or lease_id in (select id from public.leases where tenant_id = public.auth_tenant_id())
  );

create policy payments_insert on public.payments
  for insert to authenticated
  with check (
    org_id = public.auth_org_id()
    and public.auth_role() in ('landlord', 'manager', 'caretaker', 'accountant')
  );

create policy payments_modify on public.payments
  for update to authenticated
  using (org_id = public.auth_org_id() and public.auth_role() in ('landlord', 'manager', 'accountant'))
  with check (org_id = public.auth_org_id() and public.auth_role() in ('landlord', 'manager', 'accountant'));

create policy payments_delete on public.payments
  for delete to authenticated
  using (org_id = public.auth_org_id() and public.auth_role() in ('landlord', 'manager', 'accountant'));

-- ---------------------------------------------------------------------------
-- maintenance_requests
--   submit: tenant (own unit) or manager/landlord on behalf (MNT-07)
--   manage: landlord, manager; caretaker limited to assigned (MNT-05)
-- ---------------------------------------------------------------------------
create policy maintenance_select on public.maintenance_requests
  for select to authenticated
  using (
    (public.auth_role() in ('landlord', 'manager') and org_id = public.auth_org_id())
    or (public.auth_role() = 'caretaker' and assigned_to = auth.uid())
    or tenant_id = public.auth_tenant_id()
  );

create policy maintenance_insert on public.maintenance_requests
  for insert to authenticated
  with check (
    org_id = public.auth_org_id()
    and (
      public.auth_role() in ('landlord', 'manager')
      or (public.auth_role() = 'tenant' and tenant_id = public.auth_tenant_id())
    )
  );

create policy maintenance_update on public.maintenance_requests
  for update to authenticated
  using (
    (public.auth_role() in ('landlord', 'manager') and org_id = public.auth_org_id())
    or (public.auth_role() = 'caretaker' and assigned_to = auth.uid())
  )
  with check (org_id = public.auth_org_id());

create policy maintenance_delete on public.maintenance_requests
  for delete to authenticated
  using (public.auth_role() in ('landlord', 'manager') and org_id = public.auth_org_id());

-- ---------------------------------------------------------------------------
-- expenses  (landlord, manager, accountant)
-- ---------------------------------------------------------------------------
create policy expenses_select on public.expenses
  for select to authenticated
  using (org_id = public.auth_org_id() and public.auth_role() in ('landlord', 'manager', 'accountant'));

create policy expenses_write on public.expenses
  for all to authenticated
  using (org_id = public.auth_org_id() and public.auth_role() in ('landlord', 'manager', 'accountant'))
  with check (org_id = public.auth_org_id() and public.auth_role() in ('landlord', 'manager', 'accountant'));

-- ---------------------------------------------------------------------------
-- sms_logs  (staff read-only; writes via service_role SMS sender)
-- ---------------------------------------------------------------------------
create policy sms_logs_select on public.sms_logs
  for select to authenticated
  using (public.is_staff() and org_id = public.auth_org_id());

-- ---------------------------------------------------------------------------
-- user_invitations  (landlord only; acceptance handled by service_role)
-- ---------------------------------------------------------------------------
create policy invitations_select on public.user_invitations
  for select to authenticated
  using (public.auth_role() = 'landlord' and org_id = public.auth_org_id());

create policy invitations_insert on public.user_invitations
  for insert to authenticated
  with check (public.auth_role() = 'landlord' and org_id = public.auth_org_id());

create policy invitations_update on public.user_invitations
  for update to authenticated
  using (public.auth_role() = 'landlord' and org_id = public.auth_org_id())
  with check (public.auth_role() = 'landlord' and org_id = public.auth_org_id());
