-- ============================================================================
-- Nyumba360 — 0011 Scheduled invoicing (pg_cron)
-- Daily: generate due invoices (TEN-03) and sweep overdue statuses (PAY-06).
-- If `create extension pg_cron` is denied on the hosted project, enable pg_cron
-- once via Dashboard → Database → Extensions, then re-run this migration.
-- ============================================================================

create extension if not exists pg_cron;

-- Re-scheduling with the same job name is not idempotent, so unschedule first.
select cron.unschedule('nyumba-generate-invoices')
  where exists (select 1 from cron.job where jobname = 'nyumba-generate-invoices');
select cron.unschedule('nyumba-refresh-overdue')
  where exists (select 1 from cron.job where jobname = 'nyumba-refresh-overdue');

-- 06:00 UTC daily — create the day's due invoices.
select cron.schedule(
  'nyumba-generate-invoices',
  '0 6 * * *',
  $job$ select public.generate_due_invoices(); $job$
);

-- 06:15 UTC daily — flag invoices past their grace period as overdue.
select cron.schedule(
  'nyumba-refresh-overdue',
  '15 6 * * *',
  $job$
    update public.invoices i
       set status = 'overdue'
      from public.organisations o
     where o.id = i.org_id
       and i.amount_paid < i.amount
       and (i.due_date + coalesce(o.grace_days, 0)) < current_date
       and i.status <> 'overdue';
  $job$
);
