-- Run this in Supabase SQL Editor after creating the project.
-- Replace this email with the fixed admin login email before running.
create schema if not exists private;

create type public.user_role as enum ('admin', 'staff');
create type public.work_status as enum ('pending', 'in_progress', 'completed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.user_role not null default 'staff',
  created_at timestamptz not null default now()
);

create table public.work_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  work_date date not null default current_date,
  client_name text not null,
  task text not null,
  hours numeric(5, 2) not null check (hours > 0),
  status public.work_status not null default 'in_progress',
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index work_entries_user_id_idx on public.work_entries(user_id);
create index work_entries_work_date_idx on public.work_entries(work_date desc);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    case
      when lower(new.email) = lower('pateldevendra123@gmail.com') then 'admin'::public.user_role
      else 'staff'::public.user_role
    end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger work_entries_set_updated_at
before update on public.work_entries
for each row execute function public.set_updated_at();

create or replace function private.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.work_entries enable row level security;

create policy "Users can read own profile and admins can read all profiles"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id or private.is_admin());

create policy "Users can create own staff profile"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id and role = 'staff');

create policy "Users can update own profile name"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id and role = 'staff');

create policy "Users can read own work and admins can read all work"
on public.work_entries
for select
to authenticated
using ((select auth.uid()) = user_id or private.is_admin());

create policy "Staff can insert own work"
on public.work_entries
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update own work and admins can update all work"
on public.work_entries
for update
to authenticated
using ((select auth.uid()) = user_id or private.is_admin())
with check ((select auth.uid()) = user_id or private.is_admin());

create policy "Admins can delete work"
on public.work_entries
for delete
to authenticated
using (private.is_admin());
