create table if not exists public.admin_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.admin_settings enable row level security;

drop policy if exists "admin_settings_admin_only" on public.admin_settings;
create policy "admin_settings_admin_only"
on public.admin_settings for all
using (public.is_admin())
with check (public.is_admin());
