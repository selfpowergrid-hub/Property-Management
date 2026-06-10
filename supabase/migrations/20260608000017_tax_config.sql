-- ============================================================================
-- Nyumba360 — 0017 Rental tax configuration (Phase A — MRI)
-- Stores each org's KRA tax profile so the app can compute Monthly Rental
-- Income (MRI) tax and produce a filing-ready worksheet. Rates/thresholds are
-- columns (not constants) because they change with each Finance Act — defaults
-- reflect the position as at 2026 (MRI 7.5%, residential annual 288k–15M).
-- payments.wht_amount records tax already withheld by an appointed agent so the
-- worksheet can credit it. The app computes estimates only; it does not file.
-- ============================================================================

alter table public.organisations
  add column if not exists kra_pin            text,
  add column if not exists mri_rate           numeric(5, 4) not null default 0.0750,
  add column if not exists mri_threshold_min  numeric(14, 2) not null default 288000,
  add column if not exists mri_threshold_max  numeric(14, 2) not null default 15000000,
  add column if not exists vat_registered     boolean not null default false,
  add column if not exists vat_rate           numeric(5, 4) not null default 0.1600;

alter table public.payments
  add column if not exists wht_amount numeric(12, 2) not null default 0;
