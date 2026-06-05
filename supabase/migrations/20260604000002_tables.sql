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
