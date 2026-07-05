-- Run this once in Supabase SQL Editor for the admin Clients tab.
-- This is safe to run on an existing project that already has profiles and private.is_admin().

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'client_status'
  ) then
    create type public.client_status as enum (
      'quotation_sent',
      'active',
      'completed',
      'on_hold',
      'lost'
    );
  end if;
end
$$;

create table if not exists public.clients (
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

create index if not exists clients_registered_date_idx
on public.clients(registered_date desc);

create index if not exists clients_status_idx
on public.clients(status);

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

alter table public.clients enable row level security;

drop policy if exists "Admins can read clients" on public.clients;
create policy "Admins can read clients"
on public.clients
for select
to authenticated
using (private.is_admin());

drop policy if exists "Admins can insert clients" on public.clients;
create policy "Admins can insert clients"
on public.clients
for insert
to authenticated
with check (private.is_admin());

drop policy if exists "Admins can update clients" on public.clients;
create policy "Admins can update clients"
on public.clients
for update
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "Admins can delete clients" on public.clients;
create policy "Admins can delete clients"
on public.clients
for delete
to authenticated
using (private.is_admin());
