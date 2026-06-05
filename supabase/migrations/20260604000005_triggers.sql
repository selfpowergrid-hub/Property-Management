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
