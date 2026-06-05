-- ============================================================================
-- Nyumba360 — 0012 Storage + documents (PROP-05)
-- Private buckets for property photos, lease documents, and payment receipts.
-- Object paths are namespaced `{org_id}/...`; storage RLS enforces that the
-- leading folder matches the caller's org. A `documents` table tracks metadata.
-- ============================================================================

insert into storage.buckets (id, name, public)
values
  ('property-photos',  'property-photos',  false),
  ('lease-documents',  'lease-documents',  false),
  ('payment-receipts', 'payment-receipts', false)
on conflict (id) do nothing;

-- Document metadata, org-scoped.
create table if not exists public.documents (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organisations(id) on delete cascade,
  owner_type   text not null check (owner_type in ('property', 'unit', 'lease')),
  owner_id     uuid not null,
  bucket       text not null,
  path         text not null,
  name         text not null,
  content_type text,
  uploaded_by  uuid references public.users(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists idx_documents_org   on public.documents (org_id);
create index if not exists idx_documents_owner on public.documents (owner_type, owner_id);

alter table public.documents enable row level security;

-- Staff see all org documents; a tenant sees only documents attached to their
-- own lease (tenant logins arrive in Phase 3, but the policy is correct now).
create policy documents_select on public.documents
  for select to authenticated
  using (
    (public.is_staff() and org_id = public.auth_org_id())
    or (owner_type = 'lease'
        and owner_id in (select id from public.leases where tenant_id = public.auth_tenant_id()))
  );

create policy documents_write on public.documents
  for all to authenticated
  using (org_id = public.auth_org_id() and public.auth_role() in ('landlord', 'manager'))
  with check (org_id = public.auth_org_id() and public.auth_role() in ('landlord', 'manager'));

-- ---------------------------------------------------------------------------
-- storage.objects policies — first path segment must equal the caller's org.
-- ---------------------------------------------------------------------------
create policy nyumba_objects_select on storage.objects
  for select to authenticated
  using (
    bucket_id in ('property-photos', 'lease-documents', 'payment-receipts')
    and (storage.foldername(name))[1] = public.auth_org_id()::text
  );

create policy nyumba_objects_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('property-photos', 'lease-documents', 'payment-receipts')
    and (storage.foldername(name))[1] = public.auth_org_id()::text
    and public.auth_role() in ('landlord', 'manager')
  );

create policy nyumba_objects_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('property-photos', 'lease-documents', 'payment-receipts')
    and (storage.foldername(name))[1] = public.auth_org_id()::text
    and public.auth_role() in ('landlord', 'manager')
  );
