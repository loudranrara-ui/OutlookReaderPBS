create table if not exists public.encrypted_accounts (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  client_id text not null,
  cipher_text text not null,
  iv text not null,
  salt text not null,
  created_at_ms bigint not null,
  updated_at_ms bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  email text primary key,
  created_at timestamptz not null default now()
);

create table if not exists public.inbox_logs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.encrypted_accounts(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  account_email text not null,
  message_id text not null,
  subject text not null,
  sender text not null,
  received_at timestamptz,
  is_read boolean not null default false,
  preview text not null default '',
  logged_at timestamptz not null default now(),
  unique(account_id, message_id)
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

alter table public.encrypted_accounts enable row level security;

drop policy if exists "encrypted_accounts_select_own" on public.encrypted_accounts;
create policy "encrypted_accounts_select_own"
on public.encrypted_accounts for select
using (auth.uid() = owner_id or public.is_admin());

drop policy if exists "encrypted_accounts_insert_own" on public.encrypted_accounts;
create policy "encrypted_accounts_insert_own"
on public.encrypted_accounts for insert
with check (auth.uid() = owner_id);

drop policy if exists "encrypted_accounts_update_own" on public.encrypted_accounts;
create policy "encrypted_accounts_update_own"
on public.encrypted_accounts for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "encrypted_accounts_delete_own" on public.encrypted_accounts;
create policy "encrypted_accounts_delete_own"
on public.encrypted_accounts for delete
using (auth.uid() = owner_id or public.is_admin());

alter table public.inbox_logs enable row level security;

drop policy if exists "inbox_logs_select_own_or_admin" on public.inbox_logs;
create policy "inbox_logs_select_own_or_admin"
on public.inbox_logs for select
using (auth.uid() = owner_id or public.is_admin());

drop policy if exists "inbox_logs_insert_own" on public.inbox_logs;
create policy "inbox_logs_insert_own"
on public.inbox_logs for insert
with check (auth.uid() = owner_id);

drop policy if exists "inbox_logs_update_own" on public.inbox_logs;
create policy "inbox_logs_update_own"
on public.inbox_logs for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "inbox_logs_delete_admin" on public.inbox_logs;
create policy "inbox_logs_delete_admin"
on public.inbox_logs for delete
using (public.is_admin());

create index if not exists encrypted_accounts_owner_created_idx
on public.encrypted_accounts(owner_id, created_at_ms);

create index if not exists inbox_logs_account_logged_idx
on public.inbox_logs(account_id, logged_at desc);

create index if not exists inbox_logs_owner_logged_idx
on public.inbox_logs(owner_id, logged_at desc);
