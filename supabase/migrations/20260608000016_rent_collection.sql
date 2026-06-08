-- ============================================================================
-- Nyumba360 — 0016 Rent collection completeness (PRD §6.4)
-- PAY-02: store the org M-Pesa Paybill number (account reference = unit number
--   is derived, not stored). PAY-06: flag a payment as late at allocation time
--   using the org's configurable grace period. The allocate_payment() trigger
--   from 0010 is replaced to set payments.is_late while it does FIFO allocation.
-- ============================================================================

alter table public.organisations
  add column if not exists mpesa_paybill_number text;

alter table public.payments
  add column if not exists is_late boolean not null default false;

-- Replace the allocation trigger function: same FIFO behaviour, but it now
-- records whether the payment cleared an already-overdue invoice (oldest
-- outstanding, vs payment_date + the org grace period).
create or replace function public.allocate_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lease     uuid;
  v_remaining numeric;
  v_apply     numeric;
  v_grace     smallint;
  v_oldest    date;     -- due_date of the oldest outstanding invoice
  inv         public.invoices;
begin
  -- Resolve the lease from the payment, or from a directly-targeted invoice.
  v_lease := new.lease_id;
  if v_lease is null and new.invoice_id is not null then
    select lease_id into v_lease from public.invoices where id = new.invoice_id;
  end if;

  -- Stamp receipt number and backfill lease_id on the payment row.
  update public.payments
     set receipt_number = coalesce(receipt_number, public.next_receipt_number(new.org_id)),
         lease_id       = coalesce(lease_id, v_lease)
   where id = new.id;

  if v_lease is not null then
    -- PAY-06: late if the oldest outstanding invoice was already past its
    -- grace window on the payment date.
    select o.grace_days into v_grace
      from public.organisations o where o.id = new.org_id;

    select min(due_date) into v_oldest
      from public.invoices
     where lease_id = v_lease and amount_paid < amount;

    if v_oldest is not null and (v_oldest + coalesce(v_grace, 0)) < new.payment_date then
      update public.payments set is_late = true where id = new.id;
    end if;

    -- FIFO allocation across outstanding invoices (oldest first).
    v_remaining := new.amount;
    for inv in
      select *
        from public.invoices
       where lease_id = v_lease
         and amount_paid < amount
       order by due_date asc, period_month asc
    loop
      exit when v_remaining <= 0;
      v_apply := least(v_remaining, inv.amount - inv.amount_paid);
      update public.invoices
         set amount_paid = amount_paid + v_apply
       where id = inv.id;
      perform public.refresh_invoice_status(inv.id);
      v_remaining := v_remaining - v_apply;
    end loop;
  end if;

  return null; -- AFTER trigger
end;
$$;
