-- Public no-login sync for /tracker.
-- Option 1: any visitor with the app can read/write this shared tracker state.

create table if not exists public.tracker_state (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tracker_state enable row level security;

drop policy if exists "Public tracker state read" on public.tracker_state;
create policy "Public tracker state read"
  on public.tracker_state
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Public tracker state insert" on public.tracker_state;
create policy "Public tracker state insert"
  on public.tracker_state
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Public tracker state update" on public.tracker_state;
create policy "Public tracker state update"
  on public.tracker_state
  for update
  to anon, authenticated
  using (true)
  with check (true);

create or replace function public.touch_tracker_state_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_tracker_state_updated_at on public.tracker_state;
create trigger touch_tracker_state_updated_at
  before update on public.tracker_state
  for each row
  execute function public.touch_tracker_state_updated_at();
