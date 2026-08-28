-- TravelSync cloud schema — run this once in the Supabase SQL Editor.
-- Tables: trips (whole trip stored as JSONB), trip_members (roles), trip_invites (join codes).

create table if not exists public.trips (
  id text primary key,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.trip_members (
  trip_id text not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','member','viewer')),
  created_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);

create table if not exists public.trip_invites (
  code text primary key,
  trip_id text not null references public.trips(id) on delete cascade,
  role text not null check (role in ('admin','member','viewer')),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.trip_invites enable row level security;

-- Helper to check membership without RLS recursion
create or replace function public.member_role(p_trip_id text)
returns text
language sql stable security definer
set search_path = public
as $$
  select role from trip_members where trip_id = p_trip_id and user_id = auth.uid();
$$;

-- trips: members read; admins+members write; admins delete; owners create
drop policy if exists trips_select on public.trips;
create policy trips_select on public.trips
  for select using (public.member_role(id) is not null);

drop policy if exists trips_insert on public.trips;
create policy trips_insert on public.trips
  for insert with check (owner_id = auth.uid());

drop policy if exists trips_update on public.trips;
create policy trips_update on public.trips
  for update using (public.member_role(id) in ('admin','member'));

drop policy if exists trips_delete on public.trips;
create policy trips_delete on public.trips
  for delete using (public.member_role(id) = 'admin');

-- trip_members: members can see the roster; admins manage it;
-- the owner may insert their own admin row right after creating the trip
drop policy if exists members_select on public.trip_members;
create policy members_select on public.trip_members
  for select using (public.member_role(trip_id) is not null);

drop policy if exists members_insert on public.trip_members;
create policy members_insert on public.trip_members
  for insert with check (
    public.member_role(trip_id) = 'admin'
    or (
      user_id = auth.uid() and role = 'admin'
      and exists (select 1 from public.trips t where t.id = trip_id and t.owner_id = auth.uid())
    )
  );

drop policy if exists members_delete on public.trip_members;
create policy members_delete on public.trip_members
  for delete using (public.member_role(trip_id) = 'admin' or user_id = auth.uid());

-- trip_invites: only admins create/see codes; joining goes through the RPC below
drop policy if exists invites_select on public.trip_invites;
create policy invites_select on public.trip_invites
  for select using (public.member_role(trip_id) = 'admin');

drop policy if exists invites_insert on public.trip_invites;
create policy invites_insert on public.trip_invites
  for insert with check (public.member_role(trip_id) = 'admin');

drop policy if exists invites_delete on public.trip_invites;
create policy invites_delete on public.trip_invites
  for delete using (public.member_role(trip_id) = 'admin');

-- Join a trip with an invite code (bypasses RLS via security definer,
-- but only grants the role stored on the invite; never downgrades an admin)
create or replace function public.join_trip(p_code text)
returns text
language plpgsql security definer
set search_path = public
as $$
declare
  v_trip text;
  v_role text;
begin
  select trip_id, role into v_trip, v_role from trip_invites where code = p_code;
  if v_trip is null then
    raise exception 'INVALID_INVITE';
  end if;
  insert into trip_members (trip_id, user_id, role)
  values (v_trip, auth.uid(), v_role)
  on conflict (trip_id, user_id)
  do update set role = excluded.role
  where trip_members.role is distinct from 'admin';
  return v_trip;
end;
$$;

grant execute on function public.join_trip(text) to authenticated;

-- Keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trips_touch on public.trips;
create trigger trips_touch before update on public.trips
  for each row execute function public.touch_updated_at();

-- Enable realtime change events on trips
do $$
begin
  alter publication supabase_realtime add table public.trips;
exception when duplicate_object then
  null;
end;
$$;
