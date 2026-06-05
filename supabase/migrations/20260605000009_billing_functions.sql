-- ============================================================================
-- Nyumba360 — 0009 Billing functions
-- Implements the billing primitives Phase 1 deferred: receipt numbering
-- (PAY-04), monthly invoice generation (TEN-03), and invoice status /
-- outstanding recompute with a configurable grace period (PAY-05, PAY-06).
-- ============================================================================

-- Configurable late-payment grace period per organisation (PAY-06).
alter table public.organisations
  add column if not exists grace_days smallint not null default 3;

-- Per-org monotonic receipt counter.
create table if not exists public.receipt_counters (
  org_id  uuid primary key references public.organisations(id) on delete cascade,
  last_no bigint not null default 0
);

-- Next receipt number for an org, e.g. "NYU-000001". SECURITY DEFINER so it
-- works inside the payment trigger regardless of the caller's role.
create or replace function public.next_receipt_number(p_org uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_no bigint;
begin
  insert into public.receipt_counters (org_id, last_no)
  values (p_org, 1)
  on conflict (org_id)
    do update set last_no = public.receipt_counters.last_no + 1
  returning last_no into v_no;

  return 'NYU-' || lpad(v_no::text, 6, '0');
end;
$$;

-- Recompute one invoice's status from amount_paid, due_date and grace.
-- Precedence: paid > overdue (past due+grace, still owing) > partial > unpaid.
create or replace function public.refresh_invoice_status(p_invoice uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_amount   numeric;
  v_paid     numeric;
  v_due      date;
  v_grace    smallint;
begin
  select i.amount, i.amount_paid, i.due_date, o.grace_days
    into v_amount, v_paid, v_due, v_grace
    from public.invoices i
    join public.organisations o on o.id = i.org_id
   where i.id = p_invoice;
  if not found then
    return;
  end if;

  update public.invoices
     set status = case
       when v_paid >= v_amount then 'paid'::public.invoice_status
       when (v_due + coalesce(v_grace, 0)) < current_date then 'overdue'::public.invoice_status
       when v_paid > 0 then 'partial'::public.invoice_status
       else 'unpaid'::public.invoice_status
     end
   where id = p_invoice;
end;
$$;

-- Generate the first invoice for a freshly activated lease (TEN-03).
create or replace function public.generate_first_invoice(p_lease uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  l        public.leases;
  v_period date;
  v_due    date;
begin
  select * into l from public.leases where id = p_lease;
  if not found or l.status <> 'active' then
    return;
  end if;

  v_period := date_trunc('month', l.start_date)::date;
  v_due := (v_period + (l.payment_due_day - 1))::date;

  insert into public.invoices (org_id, lease_id, amount, due_date, period_month, status)
  values (l.org_id, l.id, l.rent_amount, v_due, v_period, 'unpaid')
  on conflict (lease_id, period_month) do nothing;
end;
$$;

-- Generate invoices for every active lease whose due day falls on p_as_of and
-- which has no invoice yet for that month. Idempotent (unique lease_id+period).
-- Returns the number of invoices created. Driven daily by pg_cron (0011).
create or replace function public.generate_due_invoices(p_as_of date default current_date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count  integer := 0;
  l        public.leases;
  v_period date := date_trunc('month', p_as_of)::date;
  v_due    date;
begin
  for l in
    select *
      from public.leases
     where status = 'active'
       and start_date <= p_as_of
       and (end_date is null or end_date >= v_period)
       and payment_due_day = extract(day from p_as_of)::int
  loop
    v_due := (v_period + (l.payment_due_day - 1))::date;

    insert into public.invoices (org_id, lease_id, amount, due_date, period_month, status)
    values (l.org_id, l.id, l.rent_amount, v_due, v_period, 'unpaid')
    on conflict (lease_id, period_month) do nothing;

    if found then
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;
