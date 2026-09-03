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

-- Which traveller on the trip's roster this account is. Null on memberships
-- made before seats existed; the app asks those people to pick once.
alter table public.trip_members
  add column if not exists traveler_id text;

-- One seat, one holder — enforced here rather than in the app, so two people
-- tapping the same name at the same moment cannot both win. Partial, so the
-- many rows with no seat yet do not collide with each other.
create unique index if not exists trip_members_seat_unique
  on public.trip_members (trip_id, traveler_id)
  where traveler_id is not null;

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

-- Owner lookup that ignores RLS, for the same reason as member_role above:
-- a sub-select on trips inside a policy is filtered by trips' own policies, so
-- the owner of a brand new trip cannot see it until they are already a member.
create or replace function public.trip_owner(p_trip_id text)
returns uuid
language sql stable security definer
set search_path = public
as $$
  select owner_id from trips where id = p_trip_id;
$$;

-- trips: members read; admins+members write; admins delete; owners create
-- The owner is always allowed through: their membership row is written a moment
-- after the trip itself, and until it lands they would otherwise be locked out
-- of the trip they just made.
drop policy if exists trips_select on public.trips;
create policy trips_select on public.trips
  for select using (public.member_role(id) is not null or owner_id = auth.uid());

drop policy if exists trips_insert on public.trips;
create policy trips_insert on public.trips
  for insert with check (owner_id = auth.uid());

drop policy if exists trips_update on public.trips;
create policy trips_update on public.trips
  for update using (public.member_role(id) in ('admin','member') or owner_id = auth.uid());

drop policy if exists trips_delete on public.trips;
create policy trips_delete on public.trips
  for delete using (public.member_role(id) = 'admin' or owner_id = auth.uid());

-- trip_members: members can see the roster; admins manage it;
-- the owner may insert their own admin row right after creating the trip
drop policy if exists members_select on public.trip_members;
create policy members_select on public.trip_members
  for select using (
    public.member_role(trip_id) is not null
    or public.trip_owner(trip_id) = auth.uid()
  );

drop policy if exists members_insert on public.trip_members;
create policy members_insert on public.trip_members
  for insert with check (
    public.member_role(trip_id) = 'admin'
    or (
      user_id = auth.uid() and role = 'admin'
      and public.trip_owner(trip_id) = auth.uid()
    )
  );

-- The client writes this row with an upsert, which takes the ON CONFLICT DO
-- UPDATE path whenever the row is already there; without an update policy that
-- path fails instead of being the no-op it reads as.
drop policy if exists members_update on public.trip_members;
create policy members_update on public.trip_members
  for update using (
    public.member_role(trip_id) = 'admin'
    or public.trip_owner(trip_id) = auth.uid()
  ) with check (
    public.member_role(trip_id) = 'admin'
    or public.trip_owner(trip_id) = auth.uid()
  );

drop policy if exists members_delete on public.trip_members;
create policy members_delete on public.trip_members
  for delete using (public.member_role(trip_id) = 'admin' or user_id = auth.uid());

-- trip_invites: only admins hand out links. The link no longer carries a role
-- — it opens the door, and the seat you claim behind it decides what you may
-- do. Joining goes through claim_seat further down.
drop policy if exists invites_select on public.trip_invites;
create policy invites_select on public.trip_invites
  for select using (
    public.member_role(trip_id) = 'admin' or created_by = auth.uid()
  );

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

-- ---------------------------------------------------------------------------
-- Seats
--
-- The roster lives in the trip document (trips.data->'travelers') because the
-- budget tab needs it there. Who holds each seat, and what they may do, lives
-- here in trip_members where a member cannot rewrite it.
-- ---------------------------------------------------------------------------

-- The name list behind an invite code, for someone who holds the code but has
-- no membership yet — otherwise they could never see which name to pick. This
-- deliberately reveals the trip title and the travellers' names to anyone
-- holding the code: the code is the secret, and the roster is the door.
create or replace function public.invite_roster(p_code text)
returns table (
  t_id text,
  t_title text,
  seat_id text,
  seat_name text,
  seat_color text,
  seat_role text,
  is_claimed boolean,
  is_mine boolean
)
language sql stable security definer
set search_path = public
as $$
  select
    t.id,
    coalesce(t.data->>'title', ''),
    tv.seat->>'id',
    coalesce(tv.seat->>'name', ''),
    coalesce(tv.seat->>'avatarColor', ''),
    case when tv.seat->>'role' = 'viewer' then 'viewer' else 'member' end,
    m.user_id is not null,
    coalesce(m.user_id = auth.uid(), false)
  from trip_invites i
  join trips t on t.id = i.trip_id
  left join lateral jsonb_array_elements(coalesce(t.data->'travelers', '[]'::jsonb))
       with ordinality as tv(seat, ord) on true
  left join trip_members m on m.trip_id = t.id and m.traveler_id = tv.seat->>'id'
  where i.code = p_code
  order by tv.ord;
$$;

grant execute on function public.invite_roster(text) to authenticated;

-- Take a named seat. This is the whole join flow: picking your name is what
-- puts you on the trip and decides what you may do.
--
-- Two ways in, because two people need it: somebody arriving on an invite link
-- who is not on the trip yet, and somebody already on it who has no seat —
-- every membership made before seats existed, and anyone who picked the wrong
-- name and wants to swap. The second has no code to offer and needs none.
drop function if exists public.claim_seat(text, text);

create or replace function public.claim_seat(
  p_trip_id text,
  p_traveler_id text,
  p_code text default null
)
returns text
language plpgsql security definer
set search_path = public
as $$
declare
  v_trip text := p_trip_id;
  v_seat jsonb;
  v_role text;
  v_holder uuid;
  v_existing text;
begin
  if auth.uid() is null then
    raise exception 'NOT_SIGNED_IN';
  end if;

  v_existing := public.member_role(v_trip);

  if v_existing is null then
    if p_code is null or not exists (
      select 1 from trip_invites i where i.code = p_code and i.trip_id = v_trip
    ) then
      raise exception 'INVALID_INVITE';
    end if;
  end if;

  select tv.seat into v_seat
  from trips t
  cross join lateral jsonb_array_elements(coalesce(t.data->'travelers', '[]'::jsonb)) as tv(seat)
  where t.id = v_trip and tv.seat->>'id' = p_traveler_id;

  if v_seat is null then
    raise exception 'UNKNOWN_SEAT';
  end if;

  -- Somebody already on the trip keeps the role they were given: changing
  -- which name you are is not a way to change what you may do, or a viewer
  -- could swap onto a free seat marked 'member' and quietly become one.
  --
  -- A newcomer takes the seat's role, clamped. It can never be admin: the trip
  -- document is member-writable, so a member could otherwise set a free seat
  -- to 'admin', open the invite in a second browser and promote themselves.
  -- Admin comes only from an existing admin, through set_seat_role.
  v_role := coalesce(
    v_existing,
    case when v_seat->>'role' = 'viewer' then 'viewer' else 'member' end
  );

  select m.user_id into v_holder
  from trip_members m
  where m.trip_id = v_trip and m.traveler_id = p_traveler_id;

  if v_holder is not null and v_holder <> auth.uid() then
    raise exception 'SEAT_TAKEN';
  end if;

  insert into trip_members (trip_id, user_id, role, traveler_id)
  values (v_trip, auth.uid(), v_role, p_traveler_id)
  on conflict (trip_id, user_id) do update
    set traveler_id = excluded.traveler_id,
        -- Re-picking a seat must never cost an admin their admin.
        role = case when trip_members.role = 'admin' then 'admin' else excluded.role end;

  return v_trip;
exception
  when unique_violation then
    raise exception 'SEAT_TAKEN';
end;
$$;

grant execute on function public.claim_seat(text, text, text) to authenticated;

-- Free a seat so someone can claim it again — the way back from a cleared
-- browser or a lost phone, and the way to remove somebody from the trip.
create or replace function public.release_seat(p_trip_id text, p_traveler_id text)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  -- Not `<> 'admin'`: member_role is NULL for a non-member, and NULL <> 'admin'
  -- is NULL rather than true, which would wave every stranger straight through.
  if public.member_role(p_trip_id) is distinct from 'admin' then
    raise exception 'NOT_ADMIN';
  end if;
  -- The owner's own seat is never released: it is the one guaranteed admin.
  delete from trip_members m
  where m.trip_id = p_trip_id
    and m.traveler_id = p_traveler_id
    and m.user_id is distinct from public.trip_owner(p_trip_id);
end;
$$;

grant execute on function public.release_seat(text, text) to authenticated;

-- Change what someone may do. Admin is only ever granted here, by an admin.
create or replace function public.set_seat_role(p_trip_id text, p_traveler_id text, p_role text)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  -- Not `<> 'admin'`: member_role is NULL for a non-member, and NULL <> 'admin'
  -- is NULL rather than true, which would wave every stranger straight through.
  if public.member_role(p_trip_id) is distinct from 'admin' then
    raise exception 'NOT_ADMIN';
  end if;
  if p_role not in ('admin', 'member', 'viewer') then
    raise exception 'BAD_ROLE';
  end if;
  -- The owner keeps admin whatever the roster says, so a trip cannot be left
  -- with nobody able to administer it.
  update trip_members m
     set role = p_role
   where m.trip_id = p_trip_id
     and m.traveler_id = p_traveler_id
     and m.user_id is distinct from public.trip_owner(p_trip_id);
end;
$$;

grant execute on function public.set_seat_role(text, text, text) to authenticated;

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

-- Any trip created before the owner-visibility fix has no membership row, so
-- its owner cannot read, write or share it. Give every owner theirs back.
insert into public.trip_members (trip_id, user_id, role)
select t.id, t.owner_id, 'admin' from public.trips t
on conflict (trip_id, user_id) do nothing;
