-- ============================================================================
-- Nyumba360 — 0007 Privilege-escalation guard
-- The access-token hook derives the JWT `org_id`/`user_role` claims from
-- public.users. RLS lets a user update their own profile row, so without this
-- guard a tenant could set their own role/org_id and escalate on next token
-- refresh. Block changes to those columns unless the caller is the service role
-- (onboarding + invite acceptance run through the service-role admin client).
-- ============================================================================

create or replace function public.guard_user_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.role is distinct from old.role) or (new.org_id is distinct from old.org_id) then
    if coalesce(auth.role(), '') <> 'service_role' then
      raise exception 'Changing role or org_id is not permitted';
    end if;
  end if;
  return new;
end;
$$;

create trigger guard_user_privileged_columns
  before update on public.users
  for each row execute function public.guard_user_privileged_columns();
