alter table public.encrypted_accounts
add column if not exists is_admin_managed boolean not null default false;

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (key, value)
values ('vault_enabled', 'false'::jsonb)
on conflict (key) do nothing;

drop policy if exists "encrypted_accounts_select_own" on public.encrypted_accounts;
create policy "encrypted_accounts_select_own"
on public.encrypted_accounts for select
using (auth.uid() = owner_id or is_admin_managed = true or public.is_admin());

drop policy if exists "encrypted_accounts_insert_own" on public.encrypted_accounts;
create policy "encrypted_accounts_insert_own"
on public.encrypted_accounts for insert
with check (auth.uid() = owner_id or public.is_admin());

drop policy if exists "encrypted_accounts_update_own" on public.encrypted_accounts;
create policy "encrypted_accounts_update_own"
on public.encrypted_accounts for update
using (auth.uid() = owner_id or public.is_admin())
with check (auth.uid() = owner_id or public.is_admin());

alter table public.app_settings enable row level security;

drop policy if exists "app_settings_select_all" on public.app_settings;
create policy "app_settings_select_all"
on public.app_settings for select
using (true);

drop policy if exists "app_settings_modify_admin" on public.app_settings;
create policy "app_settings_modify_admin"
on public.app_settings for all
using (public.is_admin())
with check (public.is_admin());

create index if not exists encrypted_accounts_admin_managed_idx
on public.encrypted_accounts(is_admin_managed, created_at_ms);
