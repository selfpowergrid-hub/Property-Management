-- ============================================================================
-- Nyumba360 / LogiQ Estates Pro — 0019 Public listings marketplace (VAC-02/03)
-- A narrow, DB-enforced public window over the data companies explicitly flag
-- as `listed`. All functions are SECURITY DEFINER (run as owner, bypassing RLS)
-- but hard-filter to listed + vacant units and return only safe columns, so the
-- anon role can read listings and submit an inquiry WITHOUT any access to the
-- rest of the (RLS-protected) schema. No other table is exposed.
-- ============================================================================

-- ── Marketplace list (with optional filters) ───────────────────────────────
create or replace function public.list_public_listings(
  p_county   text default null,
  p_type     text default null,
  p_max_rent numeric default null
)
returns table (
  unit_id             uuid,
  unit_number         text,
  unit_type           text,
  monthly_rent        numeric,
  listing_description text,
  property_name       text,
  county              text,
  property_type       public.property_type,
  company_name        text,
  company_phone       text,
  company_email       text,
  company_logo_path   text,
  photo_path          text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    u.id,
    u.unit_number,
    u.type,
    u.monthly_rent,
    u.listing_description,
    p.name,
    p.county,
    p.type,
    o.name,
    o.phone,
    o.email,
    o.logo_path,
    (
      select d.path from public.documents d
       where d.owner_type = 'property' and d.owner_id = p.id and d.bucket = 'property-photos'
       order by d.created_at desc limit 1
    )
  from public.units u
  join public.properties p on p.id = u.property_id
  join public.organisations o on o.id = u.org_id
  where u.listed = true
    and u.status = 'vacant'
    and (p_county is null or p.county ilike '%' || p_county || '%')
    and (p_type is null or p.type::text = p_type)
    and (p_max_rent is null or u.monthly_rent <= p_max_rent)
  order by u.monthly_rent asc;
$$;

-- ── Single listing detail ───────────────────────────────────────────────────
create or replace function public.get_public_listing(p_unit uuid)
returns table (
  unit_id             uuid,
  unit_number         text,
  unit_type           text,
  monthly_rent        numeric,
  listing_description text,
  property_name       text,
  county              text,
  property_type       public.property_type,
  company_name        text,
  company_phone       text,
  company_email       text,
  company_logo_path   text,
  photo_path          text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    u.id, u.unit_number, u.type, u.monthly_rent, u.listing_description,
    p.name, p.county, p.type, o.name, o.phone, o.email, o.logo_path,
    (
      select d.path from public.documents d
       where d.owner_type = 'property' and d.owner_id = p.id and d.bucket = 'property-photos'
       order by d.created_at desc limit 1
    )
  from public.units u
  join public.properties p on p.id = u.property_id
  join public.organisations o on o.id = u.org_id
  where u.id = p_unit and u.listed = true and u.status = 'vacant';
$$;

-- ── Photos for a listed unit's property (paths only; app signs them) ────────
create or replace function public.get_listing_photos(p_unit uuid)
returns table (bucket text, path text)
language sql
stable
security definer
set search_path = public
as $$
  select d.bucket, d.path
    from public.documents d
    join public.units u on u.property_id = d.owner_id
   where u.id = p_unit
     and u.listed = true
     and d.owner_type = 'property'
     and d.bucket = 'property-photos'
   order by d.created_at desc;
$$;

-- ── Public inquiry submission ───────────────────────────────────────────────
-- Derives org_id from the listed unit (client cannot spoof it) and inserts a
-- lead. anon can create inquiries this way but cannot read them.
create or replace function public.submit_public_inquiry(
  p_unit    uuid,
  p_name    text,
  p_phone   text,
  p_move_in date default null,
  p_message text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  select u.org_id into v_org
    from public.units u
   where u.id = p_unit and u.listed = true and u.status = 'vacant';
  if v_org is null then
    raise exception 'Listing not found';
  end if;
  if length(coalesce(trim(p_name), '')) < 2 or length(coalesce(trim(p_phone), '')) < 7 then
    raise exception 'Name and phone are required';
  end if;

  insert into public.inquiries (org_id, unit_id, name, phone, preferred_move_in, message)
  values (v_org, p_unit, trim(p_name), trim(p_phone), p_move_in, nullif(trim(p_message), ''));
end;
$$;

-- Expose only these functions to anonymous (and logged-in) visitors.
grant execute on function public.list_public_listings(text, text, numeric) to anon, authenticated;
grant execute on function public.get_public_listing(uuid) to anon, authenticated;
grant execute on function public.get_listing_photos(uuid) to anon, authenticated;
grant execute on function public.submit_public_inquiry(uuid, text, text, date, text) to anon, authenticated;
