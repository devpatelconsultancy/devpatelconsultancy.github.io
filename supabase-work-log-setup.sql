-- Run this in Supabase SQL Editor after creating the project.
-- Replace this email with the fixed admin login email before running.
create schema if not exists private;

create type public.user_role as enum ('admin', 'staff');
create type public.work_status as enum ('pending', 'in_progress', 'completed');
create type public.client_status as enum (
  'quotation_sent',
  'active',
  'completed',
  'on_hold',
  'lost'
);

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
  hours numeric(5, 2) not null check (hours >= 0),
  status public.work_status not null default 'in_progress',
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  work text not null,
  registered_date date not null default current_date,
  quotation text not null,
  status public.client_status not null default 'quotation_sent',
  remarks text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.remark_history (
  id uuid primary key default gen_random_uuid(),
  work_entry_id uuid not null references public.work_entries(id) on delete cascade,
  editor_user_id uuid references public.profiles(id) on delete set null,
  old_remarks text,
  new_remarks text,
  changed_at timestamptz not null default now()
);

create index work_entries_user_id_idx on public.work_entries(user_id);
create index work_entries_work_date_idx on public.work_entries(work_date desc);
create index clients_registered_date_idx on public.clients(registered_date desc);
create index clients_status_idx on public.clients(status);
create index remark_history_work_entry_id_idx on public.remark_history(work_entry_id);
create index remark_history_changed_at_idx on public.remark_history(changed_at desc);

-- If you created the table earlier with hours > 0, run these two lines once.
alter table public.work_entries drop constraint if exists work_entries_hours_check;
alter table public.work_entries add constraint work_entries_hours_check check (hours >= 0);

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

create trigger clients_set_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

create or replace function public.record_remark_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.remarks is distinct from new.remarks then
    insert into public.remark_history (
      work_entry_id,
      editor_user_id,
      old_remarks,
      new_remarks
    )
    values (
      old.id,
      (select auth.uid()),
      old.remarks,
      new.remarks
    );
  end if;

  return new;
end;
$$;

drop trigger if exists work_entries_record_remark_history on public.work_entries;
create trigger work_entries_record_remark_history
after update of remarks on public.work_entries
for each row execute function public.record_remark_history();

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
alter table public.clients enable row level security;
alter table public.remark_history enable row level security;

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

-- Reset work-entry policies in case an older permissive policy exists in Supabase.
do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'work_entries'
  loop
    execute format(
      'drop policy if exists %I on public.work_entries',
      existing_policy.policyname
    );
  end loop;
end;
$$;

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

create policy "Admins can read clients"
on public.clients
for select
to authenticated
using (private.is_admin());

create policy "Admins can insert clients"
on public.clients
for insert
to authenticated
with check (private.is_admin());

create policy "Admins can update clients"
on public.clients
for update
to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy "Admins can delete clients"
on public.clients
for delete
to authenticated
using (private.is_admin());

create policy "Admins can read remark history"
on public.remark_history
for select
to authenticated
using (private.is_admin());
