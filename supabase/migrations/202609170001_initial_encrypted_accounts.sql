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

alter table public.encrypted_accounts enable row level security;

drop policy if exists "encrypted_accounts_select_own" on public.encrypted_accounts;
create policy "encrypted_accounts_select_own"
on public.encrypted_accounts for select
using (auth.uid() = owner_id);

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
using (auth.uid() = owner_id);

create index if not exists encrypted_accounts_owner_created_idx
on public.encrypted_accounts(owner_id, created_at_ms);
