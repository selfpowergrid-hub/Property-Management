-- =============================================================
-- Nyumba360 — consolidated setup for the Supabase SQL Editor
-- Paste this whole file and Run. Idempotent-ish: run ONCE on a
-- fresh project (the seed will error on a second run).
-- =============================================================


-- >>>>>>>>>> supabase/migrations/20260604000001_enums.sql
-- ============================================================================
-- Nyumba360 — 0001 Enums
-- Enumerated domains referenced across the schema (PRD §6, §9.3, §11).
-- ============================================================================

-- Roles (PRD §6.1 AUTH-02, §8 permissions matrix)
create type public.user_role as enum (
  'landlord',
  'manager',
  'caretaker',
  'accountant',
  'tenant'
);

-- Subscription plans & status (PRD §11)
create type public.subscription_plan as enum (
  'starter',
  'growth',
  'pro',
  'enterprise'
);

create type public.subscription_status as enum (
  'trialing',
  'active',
  'past_due',
  'canceled'
);

-- Property & unit (PRD §6.2)
create type public.property_type as enum (
  'residential',
  'commercial',
  'mixed'
);

create type public.unit_status as enum (
  'occupied',
  'vacant',
  'under_maintenance',
  'reserved'
);

-- Lease (PRD §6.3)
create type public.lease_status as enum (
  'pending',
  'active',
  'expired',
  'terminated'
);

-- Billing (PRD §6.4)
create type public.invoice_status as enum (
  'unpaid',
  'partial',
  'paid',
  'overdue'
);

create type public.payment_method as enum (
  'mpesa_paybill',
  'bank_transfer',
  'cash'
);

-- Maintenance (PRD §6.6)
create type public.maintenance_status as enum (
  'new',
  'assigned',
  'in_progress',
  'resolved',
  'closed'
);

create type public.maintenance_priority as enum (
  'low',
  'medium',
  'urgent'
);

-- Expenses (PRD §6.7 EXP-01)
create type public.expense_category as enum (
  'repairs',
  'utilities',
  'insurance',
  'agent_fees',
  'other'
);

-- SMS delivery (PRD §6.9, §10 SMS Reliability)
create type public.sms_status as enum (
  'queued',
  'sent',
  'delivered',
  'failed'
);

-- Invitation lifecycle (PRD §6.1 AUTH-04)
create type public.invitation_status as enum (
  'pending',
  'accepted',
  'revoked',
  'expired'
);


-- >>>>>>>>>> supabase/migrations/20260604000002_tables.sql
-- ============================================================================
-- Nyumba360 — 0002 Tables
-- Core schema (PRD §9.3). Every tenant-scoped table carries `org_id` to back
-- the multi-tenancy + RLS model (PRD §9.2). RLS itself is enabled in 0006.
-- ============================================================================

-- Organisations: the top-level multi-tenant unit (a landlord account). PRD §15.1.
create table public.organisations (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  plan                public.subscription_plan not null default 'starter',
  subscription_status public.subscription_status not null default 'trialing',
  county              text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Users: profile rows mirroring auth.users (PRD §9.3). `org_id`/`role` are the
-- source of truth the access-token hook copies into the JWT (0004).
-- `org_id` is nullable: a freshly self-registered landlord exists before their
-- organisation is created.
create table public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  org_id      uuid references public.organisations(id) on delete cascade,
  email       text,
  phone       text,
  full_name   text,
  role        public.user_role,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Properties (PRD §6.2 PROP-01)
create table public.properties (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organisations(id) on delete cascade,
  name        text not null,
  address     text,
  county      text,
  type        public.property_type not null default 'residential',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Units (PRD §6.2 PROP-02/03, §6.3 TEN-07)
create table public.units (
  id                      uuid primary key default gen_random_uuid(),
  org_id                  uuid not null references public.organisations(id) on delete cascade,
  property_id             uuid not null references public.properties(id) on delete cascade,
  unit_number             text not null,
  floor                   text,
  type                    text,
  size_sqft               numeric(10, 2),
  monthly_rent            numeric(12, 2) not null default 0,
  status                  public.unit_status not null default 'vacant',
  allow_multiple_tenants  boolean not null default false,
  -- Listing fields (PRD §6.5 VAC-02)
  listed                  boolean not null default false,
  listing_description     text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (property_id, unit_number)
);

-- Tenants: the renter party profile (distinct from a tenant *login* user). PRD §6.3 TEN-01.
create table public.tenants (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references public.organisations(id) on delete cascade,
  -- Optional link to the tenant's portal login (PRD §6.1 AUTH-05).
  user_id             uuid references public.users(id) on delete set null,
  full_name           text not null,
  phone               text,
  email               text,
  national_id         text,
  emergency_contact   text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Leases (PRD §6.3 TEN-02)
create table public.leases (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organisations(id) on delete cascade,
  unit_id         uuid not null references public.units(id) on delete restrict,
  tenant_id       uuid not null references public.tenants(id) on delete restrict,
  start_date      date not null,
  end_date        date,
  rent_amount     numeric(12, 2) not null,
  deposit         numeric(12, 2) not null default 0,
  payment_due_day smallint not null default 1 check (payment_due_day between 1 and 28),
  status          public.lease_status not null default 'active',
  -- Move-out tracking (PRD §6.3 TEN-05)
  notice_date     date,
  vacate_date     date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Invoices: monthly rent charges (PRD §6.3 TEN-03, §6.4). Auto-generation trigger = Phase 2.
create table public.invoices (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organisations(id) on delete cascade,
  lease_id      uuid not null references public.leases(id) on delete cascade,
  amount        numeric(12, 2) not null,
  amount_paid   numeric(12, 2) not null default 0,
  due_date      date not null,
  period_month  date not null, -- first day of the month the invoice covers
  status        public.invoice_status not null default 'unpaid',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (lease_id, period_month)
);

-- Payments (PRD §6.4 PAY-01/02/04/08). FIFO allocation trigger = Phase 2.
create table public.payments (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organisations(id) on delete cascade,
  lease_id        uuid references public.leases(id) on delete set null,
  invoice_id      uuid references public.invoices(id) on delete set null,
  amount          numeric(12, 2) not null,
  payment_date    date not null default current_date,
  method          public.payment_method not null,
  mpesa_code      text,
  bank_ref        text,
  payer_name      text,
  receipt_number  text,
  recorded_by     uuid references public.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (org_id, receipt_number)
);

-- Maintenance requests (PRD §6.6)
create table public.maintenance_requests (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references public.organisations(id) on delete cascade,
  unit_id           uuid not null references public.units(id) on delete cascade,
  tenant_id         uuid references public.tenants(id) on delete set null,
  category          text not null,
  description       text,
  status            public.maintenance_status not null default 'new',
  priority          public.maintenance_priority not null default 'medium',
  assigned_to       uuid references public.users(id) on delete set null,
  resolution_notes  text,
  cost              numeric(12, 2),
  resolved_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Expenses (PRD §6.7)
create table public.expenses (
  id                      uuid primary key default gen_random_uuid(),
  org_id                  uuid not null references public.organisations(id) on delete cascade,
  property_id             uuid not null references public.properties(id) on delete cascade,
  unit_id                 uuid references public.units(id) on delete set null,
  maintenance_request_id  uuid references public.maintenance_requests(id) on delete set null,
  category                public.expense_category not null default 'other',
  amount                  numeric(12, 2) not null,
  date                    date not null default current_date,
  description             text,
  receipt_url             text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- SMS logs (PRD §6.9, §10 SMS Reliability). Transport wired in Phase 3.
create table public.sms_logs (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organisations(id) on delete cascade,
  recipient_phone text not null,
  message         text not null,
  status          public.sms_status not null default 'queued',
  at_message_id   text,
  error           text,
  retry_count     smallint not null default 0,
  sent_at         timestamptz,
  created_at      timestamptz not null default now()
);

-- User invitations (PRD §6.1 AUTH-04)
create table public.user_invitations (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organisations(id) on delete cascade,
  email       text not null,
  role        public.user_role not null,
  invited_by  uuid references public.users(id) on delete set null,
  token       text not null unique,
  status      public.invitation_status not null default 'pending',
  expires_at  timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at  timestamptz not null default now()
);


-- >>>>>>>>>> supabase/migrations/20260604000003_indexes.sql
-- ============================================================================
-- Nyumba360 — 0003 Indexes
-- Query optimisation per NFR §10: indexes on org_id, lease_id, and invoice
-- due_date, plus the foreign keys most reports/dashboards filter on.
-- ============================================================================

-- org_id on every tenant-scoped table (RLS predicate + per-org dashboards)
create index idx_users_org_id                on public.users (org_id);
create index idx_properties_org_id           on public.properties (org_id);
create index idx_units_org_id                on public.units (org_id);
create index idx_tenants_org_id              on public.tenants (org_id);
create index idx_leases_org_id               on public.leases (org_id);
create index idx_invoices_org_id             on public.invoices (org_id);
create index idx_payments_org_id             on public.payments (org_id);
create index idx_maintenance_org_id          on public.maintenance_requests (org_id);
create index idx_expenses_org_id             on public.expenses (org_id);
create index idx_sms_logs_org_id             on public.sms_logs (org_id);
create index idx_invitations_org_id          on public.user_invitations (org_id);

-- Foreign-key / hot-path indexes
create index idx_units_property_id           on public.units (property_id);
create index idx_units_status                on public.units (status);
create index idx_tenants_user_id             on public.tenants (user_id);
create index idx_leases_unit_id              on public.leases (unit_id);
create index idx_leases_tenant_id            on public.leases (tenant_id);
create index idx_leases_status               on public.leases (status);
create index idx_invoices_lease_id           on public.invoices (lease_id);
create index idx_invoices_due_date           on public.invoices (due_date);
create index idx_invoices_status             on public.invoices (status);
create index idx_payments_invoice_id         on public.payments (invoice_id);
create index idx_payments_lease_id           on public.payments (lease_id);
create index idx_maintenance_unit_id         on public.maintenance_requests (unit_id);
create index idx_maintenance_assigned_to     on public.maintenance_requests (assigned_to);
create index idx_maintenance_status          on public.maintenance_requests (status);
create index idx_expenses_property_id        on public.expenses (property_id);
create index idx_invitations_token           on public.user_invitations (token);


-- >>>>>>>>>> supabase/migrations/20260604000004_functions.sql
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
create or replace function auth.custom_access_token_hook(event jsonb)
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
grant execute on function auth.custom_access_token_hook(jsonb) to supabase_auth_admin;
grant select on public.users to supabase_auth_admin;
revoke execute on function auth.custom_access_token_hook(jsonb) from authenticated, anon, public;

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


-- >>>>>>>>>> supabase/migrations/20260604000005_triggers.sql
-- ============================================================================
-- Nyumba360 — 0005 Triggers
-- Wires the shared functions from 0004 onto the tables.
--
-- NOTE: business-logic triggers are intentionally deferred to Phase 2:
--   * invoice auto-generation on the due day            (TEN-03)
--   * FIFO payment allocation to oldest invoice          (PAY-03)
--   * receipt_number generation                          (PAY-04)
--   * invoice status / outstanding-balance recompute      (PAY-05)
--   * maintenance cost -> expense on closure              (EXP-03)
-- ============================================================================

-- New auth user -> profile row
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at maintenance on every mutable table
create trigger set_updated_at before update on public.organisations
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.users
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.properties
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.units
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.tenants
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.leases
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.invoices
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.payments
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.maintenance_requests
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.expenses
  for each row execute function public.set_updated_at();


-- >>>>>>>>>> supabase/migrations/20260604000006_rls.sql
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


-- >>>>>>>>>> supabase/migrations/20260604000007_security.sql
-- ============================================================================
-- Nyumba360 — 0007 Privilege-escalation guard
-- The access-token hook derives the JWT `org_id`/`user_role` claims from
-- public.users. RLS lets a user update their own profile row, so without this
-- guard a tenant could set their own role/org_id and escalate on next token
-- refresh. Block changes to those columns unless the caller is the service role
-- (onboarding + invite acceptance run through the service-role admin client).
-- ============================================================================

create or replace function public.guard_user_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.role is distinct from old.role) or (new.org_id is distinct from old.org_id) then
    if coalesce(auth.role(), '') <> 'service_role' then
      raise exception 'Changing role or org_id is not permitted';
    end if;
  end if;
  return new;
end;
$$;

create trigger guard_user_privileged_columns
  before update on public.users
  for each row execute function public.guard_user_privileged_columns();


-- >>>>>>>>>> supabase/seed.sql (demo data + 6 users)
-- ============================================================================
-- Nyumba360 — local seed data (runs on `supabase db reset`)
-- Two organisations so cross-org RLS isolation can be verified, the five role
-- users from the PRD personas (§4), and a small property/lease/invoice set.
--
-- All demo users share the password:  Password123!
--   landlord@demo.test    (landlord,   Org A)
--   manager@demo.test     (manager,    Org A)
--   caretaker@demo.test   (caretaker,  Org A)
--   accountant@demo.test  (accountant, Org A)
--   tenant@demo.test      (tenant,     Org A — linked to unit A1)
--   landlord-b@demo.test  (landlord,   Org B — isolation control)
-- ============================================================================

-- Helper: create an auth user (+ email identity) so password login works
-- locally. The on_auth_user_created trigger mirrors it into public.users,
-- reading org_id/role from raw_app_meta_data.
create or replace function public._seed_user(
  p_id uuid, p_email text, p_org uuid, p_role text, p_full_name text, p_phone text
) returns void language plpgsql as $$
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new
  ) values (
    '00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated',
    p_email, extensions.crypt('Password123!', extensions.gen_salt('bf')), now(),
    jsonb_build_object('provider', 'email', 'providers', array['email'],
                       'org_id', p_org::text, 'user_role', p_role),
    jsonb_build_object('full_name', p_full_name, 'phone', p_phone),
    now(), now(), '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider, created_at, updated_at, last_sign_in_at
  ) values (
    gen_random_uuid(), p_id, p_id::text,
    jsonb_build_object('sub', p_id::text, 'email', p_email),
    'email', now(), now(), now()
  );
end;
$$;

-- ── Organisations ──────────────────────────────────────────────────────────
insert into public.organisations (id, name, plan, subscription_status, county) values
  ('a1000000-0000-0000-0000-000000000001', 'Mwangi Holdings',     'growth',  'active',   'Nairobi'),
  ('b1000000-0000-0000-0000-000000000002', 'Coastline Properties','starter', 'trialing', 'Mombasa');

-- ── Users (5 roles in Org A + 1 landlord in Org B) ──────────────────────────
select public._seed_user('a1000000-0000-0000-0000-0000000000a1', 'landlord@demo.test',   'a1000000-0000-0000-0000-000000000001', 'landlord',   'John Mwangi',    '+254700000001');
select public._seed_user('a1000000-0000-0000-0000-0000000000a2', 'manager@demo.test',    'a1000000-0000-0000-0000-000000000001', 'manager',    'Grace Ochieng',  '+254700000002');
select public._seed_user('a1000000-0000-0000-0000-0000000000a3', 'caretaker@demo.test',  'a1000000-0000-0000-0000-000000000001', 'caretaker',  'David Kamau',    '+254700000003');
select public._seed_user('a1000000-0000-0000-0000-0000000000a4', 'accountant@demo.test', 'a1000000-0000-0000-0000-000000000001', 'accountant', 'Atieno Otieno',  '+254700000004');
select public._seed_user('a1000000-0000-0000-0000-0000000000a5', 'tenant@demo.test',     'a1000000-0000-0000-0000-000000000001', 'tenant',     'Kevin Kariuki',  '+254700000005');
select public._seed_user('b1000000-0000-0000-0000-0000000000b1', 'landlord-b@demo.test', 'b1000000-0000-0000-0000-000000000002', 'landlord',   'Salma Bakari',   '+254700000006');

-- ── Org A: property, units, tenant, lease, invoice, maintenance ─────────────
insert into public.properties (id, org_id, name, address, county, type) values
  ('a1000000-0000-0000-0000-0000000000f1', 'a1000000-0000-0000-0000-000000000001',
   'Greenview Apartments', 'Ngong Road', 'Nairobi', 'residential');

insert into public.units (id, org_id, property_id, unit_number, floor, type, size_sqft, monthly_rent, status, listed, listing_description) values
  ('a1000000-0000-0000-0000-00000000d001', 'a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-0000000000f1', 'A1', '1', '2-bedroom', 750, 25000, 'occupied', false, null),
  ('a1000000-0000-0000-0000-00000000d002', 'a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-0000000000f1', 'A2', '1', '1-bedroom', 500, 18000, 'vacant',   false, null),
  ('a1000000-0000-0000-0000-00000000d003', 'a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-0000000000f1', 'A3', '2', 'studio',    350, 12000, 'vacant',   true,  'Bright studio, close to CBD matatu stage.');

insert into public.tenants (id, org_id, user_id, full_name, phone, email, national_id, emergency_contact) values
  ('a1000000-0000-0000-0000-00000000e001', 'a1000000-0000-0000-0000-000000000001',
   'a1000000-0000-0000-0000-0000000000a5', 'Kevin Kariuki', '+254700000005', 'tenant@demo.test', '12345678', '+254700000099');

insert into public.leases (id, org_id, unit_id, tenant_id, start_date, end_date, rent_amount, deposit, payment_due_day, status) values
  ('a1000000-0000-0000-0000-00000000c001', 'a1000000-0000-0000-0000-000000000001',
   'a1000000-0000-0000-0000-00000000d001', 'a1000000-0000-0000-0000-00000000e001',
   date_trunc('month', current_date)::date, null, 25000, 25000, 5, 'active');

insert into public.invoices (id, org_id, lease_id, amount, amount_paid, due_date, period_month, status) values
  ('a1000000-0000-0000-0000-00000000b001', 'a1000000-0000-0000-0000-000000000001',
   'a1000000-0000-0000-0000-00000000c001', 25000, 0,
   (date_trunc('month', current_date) + interval '4 days')::date,
   date_trunc('month', current_date)::date, 'unpaid');

insert into public.maintenance_requests (id, org_id, unit_id, tenant_id, category, description, status, priority, assigned_to) values
  ('a1000000-0000-0000-0000-00000000aa01', 'a1000000-0000-0000-0000-000000000001',
   'a1000000-0000-0000-0000-00000000d001', 'a1000000-0000-0000-0000-00000000e001',
   'Plumbing', 'Kitchen tap is leaking.', 'assigned', 'medium', 'a1000000-0000-0000-0000-0000000000a3');

-- ── Org B: a property/unit that Org A users must never be able to see ───────
insert into public.properties (id, org_id, name, address, county, type) values
  ('b1000000-0000-0000-0000-0000000000f1', 'b1000000-0000-0000-0000-000000000002',
   'Bahari Plaza', 'Nyali', 'Mombasa', 'commercial');

insert into public.units (id, org_id, property_id, unit_number, type, size_sqft, monthly_rent, status) values
  ('b1000000-0000-0000-0000-00000000d001', 'b1000000-0000-0000-0000-000000000002',
   'b1000000-0000-0000-0000-0000000000f1', 'Shop 1', 'retail', 900, 60000, 'occupied');

drop function public._seed_user(uuid, text, uuid, text, text, text);
