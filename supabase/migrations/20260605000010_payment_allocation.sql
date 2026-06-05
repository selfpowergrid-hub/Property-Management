-- ============================================================================
-- Nyumba360 — 0010 Payment allocation
-- On payment insert: assign a receipt number (PAY-04), resolve the lease, and
-- FIFO-allocate the amount across the lease's outstanding invoices oldest-first
-- (PAY-03), updating amount_paid + status and carrying forward the balance
-- (PAY-05, partial PAY-08). SECURITY DEFINER so a caretaker (who may record
-- payments but not update invoices under RLS) still triggers correct allocation.
-- Overpayment beyond the outstanding total is left unallocated (treated as a
-- credit; explicit credit handling is a later enhancement).
-- ============================================================================

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

  -- FIFO allocation across outstanding invoices.
  if v_lease is not null then
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

create trigger allocate_payment_after_insert
  after insert on public.payments
  for each row execute function public.allocate_payment();
