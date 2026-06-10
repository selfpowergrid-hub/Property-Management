-- ============================================================================
-- Nyumba360 — 0018 Company profile + logo (multi-company registration)
-- Enriches the organisation (each company is its own RLS tenant) with the
-- registration details captured at sign-up, and adds a public `org-logos`
-- bucket for the company logo. Data stays org-isolated by RLS; only the logo
-- IMAGE is public (served by URL like any SaaS logo) — no business data is.
-- ============================================================================

alter table public.organisations
  add column if not exists logo_path           text,
  add column if not exists registration_number text,
  add column if not exists phone               text,
  add column if not exists email               text,
  add column if not exists address             text,
  add column if not exists postal_address      text;

-- Public bucket so the logo renders everywhere without signing each request.
insert into storage.buckets (id, name, public)
values ('org-logos', 'org-logos', true)
on conflict (id) do nothing;

-- Recreate the org-scoped object policies to also cover org-logos. Reads of the
-- logo go through the public endpoint (no RLS); writes still require the caller
-- to be a landlord/manager writing into their own org folder.
drop policy if exists nyumba_objects_select on storage.objects;
drop policy if exists nyumba_objects_insert on storage.objects;
drop policy if exists nyumba_objects_delete on storage.objects;

create policy nyumba_objects_select on storage.objects
  for select to authenticated
  using (
    bucket_id in ('property-photos', 'lease-documents', 'payment-receipts', 'maintenance-photos', 'org-logos')
    and (storage.foldername(name))[1] = public.auth_org_id()::text
  );

create policy nyumba_objects_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('property-photos', 'lease-documents', 'payment-receipts', 'maintenance-photos', 'org-logos')
    and (storage.foldername(name))[1] = public.auth_org_id()::text
    and public.auth_role() in ('landlord', 'manager')
  );

create policy nyumba_objects_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('property-photos', 'lease-documents', 'payment-receipts', 'maintenance-photos', 'org-logos')
    and (storage.foldername(name))[1] = public.auth_org_id()::text
    and public.auth_role() in ('landlord', 'manager')
  );
