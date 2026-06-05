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
