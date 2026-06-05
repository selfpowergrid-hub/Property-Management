-- ============================================================================
-- Nyumba360 — 0013 Operations (maintenance photos, inquiries)
-- Adds the maintenance-photos bucket, lets documents attach to maintenance
-- requests, and introduces the prospective-tenant inquiries table (VAC-03).
-- ============================================================================

-- Maintenance photo bucket (MNT-01).
insert into storage.buckets (id, name, public)
values ('maintenance-photos', 'maintenance-photos', false)
on conflict (id) do nothing;

-- Allow documents to belong to a maintenance request.
alter table public.documents drop constraint if exists documents_owner_type_check;
alter table public.documents
  add constraint documents_owner_type_check
  check (owner_type in ('property', 'unit', 'lease', 'maintenance'));

-- Recreate storage.objects policies to also cover the new bucket.
drop policy if exists nyumba_objects_select on storage.objects;
drop policy if exists nyumba_objects_insert on storage.objects;
drop policy if exists nyumba_objects_delete on storage.objects;

create policy nyumba_objects_select on storage.objects
  for select to authenticated
  using (
    bucket_id in ('property-photos', 'lease-documents', 'payment-receipts', 'maintenance-photos')
    and (storage.foldername(name))[1] = public.auth_org_id()::text
  );

create policy nyumba_objects_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('property-photos', 'lease-documents', 'payment-receipts', 'maintenance-photos')
    and (storage.foldername(name))[1] = public.auth_org_id()::text
    -- tenants may attach photos to their own maintenance requests
    and (
      public.auth_role() in ('landlord', 'manager')
      or (public.auth_role() = 'tenant' and bucket_id = 'maintenance-photos')
    )
  );

create policy nyumba_objects_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('property-photos', 'lease-documents', 'payment-receipts', 'maintenance-photos')
    and (storage.foldername(name))[1] = public.auth_org_id()::text
    and public.auth_role() in ('landlord', 'manager')
  );

-- ---------------------------------------------------------------------------
-- Prospective-tenant inquiries (VAC-03). Kept internal (staff-captured); a
-- public submission page is PRD open question #1.
-- ---------------------------------------------------------------------------
create table public.inquiries (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references public.organisations(id) on delete cascade,
  unit_id           uuid references public.units(id) on delete set null,
  name              text not null,
  phone             text not null,
  preferred_move_in date,
  message           text,
  created_at        timestamptz not null default now()
);

create index idx_inquiries_org  on public.inquiries (org_id);
create index idx_inquiries_unit on public.inquiries (unit_id);

alter table public.inquiries enable row level security;

create policy inquiries_select on public.inquiries
  for select to authenticated
  using (public.is_staff() and org_id = public.auth_org_id());

create policy inquiries_write on public.inquiries
  for all to authenticated
  using (org_id = public.auth_org_id() and public.auth_role() in ('landlord', 'manager'))
  with check (org_id = public.auth_org_id() and public.auth_role() in ('landlord', 'manager'));
