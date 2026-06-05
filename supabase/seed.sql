-- ============================================================================
-- Nyumba360 — local seed data (runs on `supabase db reset`)
-- Two organisations so cross-org RLS isolation can be verified, the five role
-- users from the PRD personas (§4), and a small property/lease/invoice set.
--
-- All demo users share the password:  Password123!
--   landlord@demo.test    (landlord,   Org A)
--   manager@demo.test     (manager,    Org A)
--   caretaker@demo.test   (caretaker,  Org A)
--   accountant@demo.test  (accountant, Org A)
--   tenant@demo.test      (tenant,     Org A — linked to unit A1)
--   landlord-b@demo.test  (landlord,   Org B — isolation control)
-- ============================================================================

-- Helper: create an auth user (+ email identity) so password login works
-- locally. The on_auth_user_created trigger mirrors it into public.users,
-- reading org_id/role from raw_app_meta_data.
create or replace function public._seed_user(
  p_id uuid, p_email text, p_org uuid, p_role text, p_full_name text, p_phone text
) returns void language plpgsql as $$
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new
  ) values (
    '00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated',
    p_email, extensions.crypt('Password123!', extensions.gen_salt('bf')), now(),
    jsonb_build_object('provider', 'email', 'providers', array['email'],
                       'org_id', p_org::text, 'user_role', p_role),
    jsonb_build_object('full_name', p_full_name, 'phone', p_phone),
    now(), now(), '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider, created_at, updated_at, last_sign_in_at
  ) values (
    gen_random_uuid(), p_id, p_id::text,
    jsonb_build_object('sub', p_id::text, 'email', p_email),
    'email', now(), now(), now()
  );
end;
$$;

-- ── Organisations ──────────────────────────────────────────────────────────
insert into public.organisations (id, name, plan, subscription_status, county) values
  ('a1000000-0000-0000-0000-000000000001', 'Mwangi Holdings',     'growth',  'active',   'Nairobi'),
  ('b1000000-0000-0000-0000-000000000002', 'Coastline Properties','starter', 'trialing', 'Mombasa');

-- ── Users (5 roles in Org A + 1 landlord in Org B) ──────────────────────────
select public._seed_user('a1000000-0000-0000-0000-0000000000a1', 'landlord@demo.test',   'a1000000-0000-0000-0000-000000000001', 'landlord',   'John Mwangi',    '+254700000001');
select public._seed_user('a1000000-0000-0000-0000-0000000000a2', 'manager@demo.test',    'a1000000-0000-0000-0000-000000000001', 'manager',    'Grace Ochieng',  '+254700000002');
select public._seed_user('a1000000-0000-0000-0000-0000000000a3', 'caretaker@demo.test',  'a1000000-0000-0000-0000-000000000001', 'caretaker',  'David Kamau',    '+254700000003');
select public._seed_user('a1000000-0000-0000-0000-0000000000a4', 'accountant@demo.test', 'a1000000-0000-0000-0000-000000000001', 'accountant', 'Atieno Otieno',  '+254700000004');
select public._seed_user('a1000000-0000-0000-0000-0000000000a5', 'tenant@demo.test',     'a1000000-0000-0000-0000-000000000001', 'tenant',     'Kevin Kariuki',  '+254700000005');
select public._seed_user('b1000000-0000-0000-0000-0000000000b1', 'landlord-b@demo.test', 'b1000000-0000-0000-0000-000000000002', 'landlord',   'Salma Bakari',   '+254700000006');

-- ── Org A: property, units, tenant, lease, invoice, maintenance ─────────────
insert into public.properties (id, org_id, name, address, county, type) values
  ('a1000000-0000-0000-0000-0000000000f1', 'a1000000-0000-0000-0000-000000000001',
   'Greenview Apartments', 'Ngong Road', 'Nairobi', 'residential');

insert into public.units (id, org_id, property_id, unit_number, floor, type, size_sqft, monthly_rent, status, listed, listing_description) values
  ('a1000000-0000-0000-0000-00000000d001', 'a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-0000000000f1', 'A1', '1', '2-bedroom', 750, 25000, 'occupied', false, null),
  ('a1000000-0000-0000-0000-00000000d002', 'a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-0000000000f1', 'A2', '1', '1-bedroom', 500, 18000, 'vacant',   false, null),
  ('a1000000-0000-0000-0000-00000000d003', 'a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-0000000000f1', 'A3', '2', 'studio',    350, 12000, 'vacant',   true,  'Bright studio, close to CBD matatu stage.');

insert into public.tenants (id, org_id, user_id, full_name, phone, email, national_id, emergency_contact) values
  ('a1000000-0000-0000-0000-00000000e001', 'a1000000-0000-0000-0000-000000000001',
   'a1000000-0000-0000-0000-0000000000a5', 'Kevin Kariuki', '+254700000005', 'tenant@demo.test', '12345678', '+254700000099');

insert into public.leases (id, org_id, unit_id, tenant_id, start_date, end_date, rent_amount, deposit, payment_due_day, status) values
  ('a1000000-0000-0000-0000-00000000c001', 'a1000000-0000-0000-0000-000000000001',
   'a1000000-0000-0000-0000-00000000d001', 'a1000000-0000-0000-0000-00000000e001',
   date_trunc('month', current_date)::date, null, 25000, 25000, 5, 'active');

insert into public.invoices (id, org_id, lease_id, amount, amount_paid, due_date, period_month, status) values
  ('a1000000-0000-0000-0000-00000000b001', 'a1000000-0000-0000-0000-000000000001',
   'a1000000-0000-0000-0000-00000000c001', 25000, 0,
   (date_trunc('month', current_date) + interval '4 days')::date,
   date_trunc('month', current_date)::date, 'unpaid');

insert into public.maintenance_requests (id, org_id, unit_id, tenant_id, category, description, status, priority, assigned_to) values
  ('a1000000-0000-0000-0000-00000000aa01', 'a1000000-0000-0000-0000-000000000001',
   'a1000000-0000-0000-0000-00000000d001', 'a1000000-0000-0000-0000-00000000e001',
   'Plumbing', 'Kitchen tap is leaking.', 'assigned', 'medium', 'a1000000-0000-0000-0000-0000000000a3');

-- ── Org B: a property/unit that Org A users must never be able to see ───────
insert into public.properties (id, org_id, name, address, county, type) values
  ('b1000000-0000-0000-0000-0000000000f1', 'b1000000-0000-0000-0000-000000000002',
   'Bahari Plaza', 'Nyali', 'Mombasa', 'commercial');

insert into public.units (id, org_id, property_id, unit_number, type, size_sqft, monthly_rent, status) values
  ('b1000000-0000-0000-0000-00000000d001', 'b1000000-0000-0000-0000-000000000002',
   'b1000000-0000-0000-0000-0000000000f1', 'Shop 1', 'retail', 900, 60000, 'occupied');

drop function public._seed_user(uuid, text, uuid, text, text, text);
