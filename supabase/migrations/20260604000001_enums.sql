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
