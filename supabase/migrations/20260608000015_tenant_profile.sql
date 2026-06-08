-- ============================================================================
-- Nyumba360 — 0015 Tenant KYC profile (PRD §6.3 TEN-01)
-- Expands the tenant profile to capture a full tenancy KYC record. All columns
-- are nullable so existing tenants and the current create flow keep working;
-- the comprehensive form populates them going forward. RLS is row-level
-- (existing tenants_* policies in 0006), so no policy changes are needed.
-- ============================================================================

alter table public.tenants
  add column if not exists id_type                 text,        -- national_id | passport | alien_id | military_id
  add column if not exists date_of_birth           date,
  add column if not exists gender                   text,        -- male | female | other | undisclosed
  add column if not exists nationality              text default 'Kenyan',
  add column if not exists marital_status           text,        -- single | married | divorced | widowed
  add column if not exists kra_pin                  text,        -- KRA tax PIN (e.g. A012345678Z)
  add column if not exists occupation               text,
  add column if not exists employer                 text,
  add column if not exists alternate_phone          text,
  add column if not exists postal_address           text,
  add column if not exists physical_address         text,
  add column if not exists next_of_kin_name         text,
  add column if not exists next_of_kin_relationship text,
  add column if not exists next_of_kin_phone        text,
  add column if not exists notes                    text;
