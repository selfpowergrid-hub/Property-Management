-- ============================================================================
-- Nyumba360 — 0014 Push tokens (Expo push notifications, PRD §7.2)
-- Stores each user's Expo push token. Users manage their own rows; the server
-- reads them via the service-role client when sending, so no cross-user select
-- policy is needed.
-- ============================================================================

create table public.push_tokens (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organisations(id) on delete cascade,
  user_id     uuid not null references public.users(id) on delete cascade,
  token       text not null unique,
  platform    text,
  created_at  timestamptz not null default now()
);

create index idx_push_tokens_user on public.push_tokens (user_id);
create index idx_push_tokens_org  on public.push_tokens (org_id);

alter table public.push_tokens enable row level security;

-- A user sees and manages only their own tokens.
create policy push_tokens_select on public.push_tokens
  for select to authenticated
  using (user_id = auth.uid());

create policy push_tokens_insert on public.push_tokens
  for insert to authenticated
  with check (user_id = auth.uid() and org_id = public.auth_org_id());

create policy push_tokens_delete on public.push_tokens
  for delete to authenticated
  using (user_id = auth.uid());
