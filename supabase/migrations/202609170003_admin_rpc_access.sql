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
    where lower(trim(email)) = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
  );
$$;

grant execute on function public.is_admin() to authenticated;
