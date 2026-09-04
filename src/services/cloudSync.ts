import type { RealtimeChannel, Session, User } from '@supabase/supabase-js';
import type { Trip, Traveler, TripRole, TripSeat, SeatClaim } from '../types/travel';
import { mergeRemoteTrip } from './mergeTrip';
import { supabase, isCloudEnabled } from './supabase';

export { isCloudEnabled };

// ---------- Auth ----------

export async function getSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthChange(cb: (user: User | null) => void): () => void {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    cb(session?.user ?? null);
  });
  return () => data.subscription.unsubscribe();
}

// ---------- Credentials ----------

// Friends sign in with a short ID and password the organiser hands out in
// person. Supabase identifies users by email, so the ID is mapped onto a fixed
// internal domain. Nothing is ever posted to that domain: the Supabase project
// must have "Confirm email" turned off, which signUpWithId checks for.
const ID_DOMAIN = 'travellor.app';
const ID_PATTERN = /^[a-z0-9][a-z0-9._-]{2,19}$/;

export const MIN_PASSWORD_LENGTH = 6;

// Thrown when the project still has email confirmation enabled, which would
// leave the account stranded because the internal domain receives no mail.
export const CONFIRM_EMAIL_ON = 'CONFIRM_EMAIL_ON';

export function normalizeId(id: string): string {
  return id.trim().toLowerCase();
}

export function isValidId(id: string): boolean {
  return ID_PATTERN.test(normalizeId(id));
}

export function idToEmail(id: string): string {
  return `${normalizeId(id)}@${ID_DOMAIN}`;
}

// Turn the stored email back into the ID the friend actually typed.
export function emailToId(email: string | null | undefined): string {
  if (!email) return '';
  const suffix = `@${ID_DOMAIN}`;
  return email.endsWith(suffix) ? email.slice(0, -suffix.length) : email;
}

export async function signInWithId(id: string, password: string): Promise<void> {
  if (!supabase) throw new Error('Cloud disabled');
  const { error } = await supabase.auth.signInWithPassword({
    email: idToEmail(id),
    password
  });
  if (error) throw error;
}

export async function signUpWithId(id: string, password: string): Promise<void> {
  if (!supabase) throw new Error('Cloud disabled');
  const { data, error } = await supabase.auth.signUp({
    email: idToEmail(id),
    password
  });
  if (error) throw error;
  // With confirmation off the account is signed in straight away. If no session
  // comes back the project is still waiting on an email that can never arrive.
  if (!data.session) throw new Error(CONFIRM_EMAIL_ON);
}

/**
 * A guest needs an account only so the server can tell one person from
 * another — not so they can remember a password. Anonymous sign-in gives them
 * one without a keystroke, which is what makes "tap your name" the whole
 * join flow.
 *
 * Returns false if the project has anonymous sign-ins switched off, in which
 * case the caller falls back to asking for an ID and password. The seat picker
 * is the same either way; only the step before it changes.
 */
export async function signInAnonymously(): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.warn('Anonymous sign-in unavailable:', error.message);
    return false;
  }
  return true;
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

// ---------- Trips ----------

// Strip the local-only role marker before storing the trip document
function tripDocument(trip: Trip): Omit<Trip, 'myRole' | 'myTravelerId'> {
  const { myRole: _myRole, myTravelerId: _myTravelerId, ...doc } = trip;
  return doc;
}

/**
 * The `updated_at` this browser last saw for each trip, used as a compare-and-set
 * token on write.
 *
 * The whole trip is one JSON document, so a plain UPDATE writes everything —
 * including the parts of the document this browser fetched *before* someone
 * else's change landed. Two people editing different things a minute apart
 * would each push a complete document and the second would erase the first,
 * with both of them "in sync" and neither warned.
 */
const serverVersions = new Map<string, string>();

export function rememberServerVersion(tripId: string, updatedAt?: string | null): void {
  if (updatedAt) serverVersions.set(tripId, updatedAt);
}

async function readTripRow(tripId: string): Promise<{ trip: Trip; updatedAt: string } | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('trips')
    .select('data, updated_at')
    .eq('id', tripId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.data) return null;
  return { trip: data.data as Trip, updatedAt: data.updated_at as string };
}

export async function fetchMyTrips(): Promise<Trip[]> {
  if (!supabase) return [];
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return [];

  // Filtered to this account's own membership row, deliberately. The
  // members_select policy lets any member read the whole roster — the seat
  // picker needs that — and its USING clause never looks at the row's
  // user_id, so an unfiltered read returns one row per *member*: the same
  // trip several times over, each copy carrying somebody else's role.
  let { data, error } = await supabase
    .from('trip_members')
    .select('role, traveler_id, trips ( id, data, updated_at )')
    .eq('user_id', uid);

  if (error) {
    // No seat column yet: this project has not run the latest schema.sql.
    // Trips still load; the app simply does not know who is who until it does.
    const fallback = await supabase
      .from('trip_members')
      .select('role, trips ( id, data, updated_at )')
      .eq('user_id', uid);
    if (fallback.error) throw error;
    data = fallback.data as typeof data;
  }

  const rows = (data || []) as unknown as {
    role: TripRole;
    traveler_id: string | null;
    trips: { id: string; data: Trip; updated_at: string } | null;
  }[];
  return rows
    .filter(r => r.trips?.data)
    .map(r => {
      rememberServerVersion(r.trips!.id, r.trips!.updated_at);
      return {
        ...r.trips!.data,
        myRole: r.role,
        myTravelerId: r.traveler_id ?? undefined
      };
    });
}

export async function createTripCloud(trip: Trip): Promise<void> {
  if (!supabase) return;
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error('Not signed in');

  const { error } = await supabase
    .from('trips')
    .insert({ id: trip.id, owner_id: uid, data: tripDocument(trip) });
  if (error && error.code !== '23505') throw error; // 23505 = already exists

  // The creator holds a seat like everyone else, so the budget tab knows who
  // they are and their name cannot be claimed by somebody opening the link.
  const ownerSeat = (trip.travelers || []).find(tv => tv.isOwner) ?? (trip.travelers || [])[0];

  const { error: memberError } = await supabase
    .from('trip_members')
    .upsert({
      trip_id: trip.id,
      user_id: uid,
      role: 'admin',
      traveler_id: ownerSeat?.id ?? null
    });

  if (memberError) {
    // Same reason as fetchMyTrips: the database may predate seats. Creating
    // the trip still has to work, or nothing else can.
    const fallback = await supabase
      .from('trip_members')
      .upsert({ trip_id: trip.id, user_id: uid, role: 'admin' });
    if (fallback.error) throw memberError;
  }

  const created = await readTripRow(trip.id);
  rememberServerVersion(trip.id, created?.updatedAt);
}

/**
 * Why a compare-and-set write matched no rows.
 *
 * PostgREST answers zero rows and no error for two very different things: a
 * row that moved between our read and our write, and a row the server refused
 * to let us write — an UPDATE filtered out by a row-level security policy is
 * reported exactly like a lost race. Retrying is right for the first and
 * pointless for the second, so they have to be told apart.
 *
 * The trips_touch trigger bumps updated_at on every accepted write, so a
 * timestamp that has not moved is proof that nothing landed. Compared as
 * strings on purpose: two spellings of the same instant then read as 'raced',
 * which retries once and succeeds, rather than as 'refused', which gives up.
 */
export function failedWriteReason(expected: string, current: string): 'raced' | 'refused' {
  return current === expected ? 'refused' : 'raced';
}

/**
 * Write the trip, but only over the version this browser last saw.
 *
 * On a clash the server copy is fetched, our work is merged onto it and the
 * write is retried once. Returns whatever now stands on the server, which the
 * caller should adopt — after a merge it is not the trip that went in.
 *
 * Throws WRITE_FORBIDDEN when the server would not take the write at all,
 * which is not a clash and must never be retried, and SYNC_CONFLICT only
 * after losing two genuine races in a row.
 */
export async function upsertTripCloud(trip: Trip): Promise<Trip> {
  if (!supabase) return trip;
  const client = supabase;

  let expected = serverVersions.get(trip.id);
  if (!expected) {
    // First write this session: learn the current version before overwriting,
    // otherwise the very first save of every session is an unguarded clobber.
    const current = await readTripRow(trip.id);
    if (!current) throw new Error('TRIP_NOT_ON_SERVER');
    expected = current.updatedAt;
  }

  let candidate = trip;

  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, error } = await client
      .from('trips')
      .update({ data: tripDocument(candidate) })
      .eq('id', trip.id)
      .eq('updated_at', expected)
      .select('updated_at');
    if (error) throw error;

    if (data && data.length > 0) {
      rememberServerVersion(trip.id, data[0].updated_at as string);
      return candidate;
    }

    // Nothing matched: either someone wrote between our read and our write,
    // or this account may read the trip but not write it.
    const current = await readTripRow(trip.id);
    if (!current) throw new Error('TRIP_NOT_ON_SERVER');
    if (failedWriteReason(expected, current.updatedAt) === 'refused') {
      throw new Error('WRITE_FORBIDDEN');
    }
    candidate = mergeRemoteTrip(candidate, { ...current.trip, myRole: trip.myRole });
    expected = current.updatedAt;
  }

  throw new Error('SYNC_CONFLICT');
}

export async function deleteTripCloud(tripId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('trips').delete().eq('id', tripId);
  if (error) throw error;
}

// Live updates for one trip. Returns an unsubscribe function.
export function subscribeTrip(tripId: string, onRemoteChange: (trip: Trip) => void): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  const channel: RealtimeChannel = client
    .channel(`trip-${tripId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'trips', filter: `id=eq.${tripId}` },
      (payload) => {
        const row = payload.new as { data?: Trip; updated_at?: string };
        // Record the version we are being shown, so the next write compares
        // against it rather than against something already superseded.
        rememberServerVersion(tripId, row?.updated_at);
        if (row?.data) onRemoteChange(row.data);
      }
    )
    .subscribe();
  return () => {
    client.removeChannel(channel);
  };
}

// ---------- Invites ----------

// Alphabet excludes I, O, 0 and 1 so a code read off a screen can be typed back.
function randomCode(length = 6): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

/**
 * The trip's current invite code, or null if it has no live one.
 *
 * The share sheet reads this on open so the organiser is shown the link that
 * is actually out there. Without it the sheet always offered to make a new
 * one, which is how you end up rotating a link you only wanted to re-read.
 *
 * Admin-only by policy (invites_select), which is also who sees the button.
 */
export async function fetchInvite(tripId: string): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('trip_invites')
    .select('code, created_at')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false })
    .limit(1);
  // Not being able to read the current code is not worth blocking the sheet
  // over: the caller falls back to offering a new one, which is safe.
  if (error) {
    console.warn('Could not read the current invite:', error.message);
    return null;
  }
  return (data?.[0]?.code as string | undefined) ?? null;
}

/**
 * One link per trip, not one per role. The link opens the door; the seat
 * claimed behind it decides what the person may do.
 *
 * One link per trip *at a time*, too: this retires every code that came
 * before it. A link is forwarded on, screenshotted and pasted into group
 * chats, so an organiser needs a way to take one back — and before this, no
 * code could ever be revoked. Every one ever generated stayed a working door.
 *
 * The old code goes first on purpose. If the insert then fails the trip is
 * left with no invite, which is recoverable by pressing the button again;
 * the other order would leave the link you were trying to retire alive.
 */
export async function createInvite(tripId: string): Promise<string> {
  if (!supabase) throw new Error('Cloud disabled');

  const { error: revokeError } = await supabase
    .from('trip_invites')
    .delete()
    .eq('trip_id', tripId);
  if (revokeError) throw revokeError;

  const code = randomCode();
  const { error } = await supabase
    .from('trip_invites')
    .insert({ code, trip_id: tripId, role: 'member' });
  if (error) throw error;
  return code;
}

// ---------- Seats ----------

export interface InviteRoster {
  tripId: string;
  tripTitle: string;
  seats: TripSeat[];
}

interface RosterRow {
  t_id: string;
  t_title: string;
  seat_id: string | null;
  seat_name: string;
  seat_color: string;
  seat_role: TripRole;
  is_claimed: boolean;
  is_mine: boolean;
}

/**
 * The names behind an invite code, for somebody who holds the code but is not
 * on the trip yet. An empty `seats` means the organiser has not added anybody —
 * a real state with its own message, which is why the server returns the trip
 * row even when the roster is empty rather than nothing at all.
 */
export async function fetchInviteRoster(code: string): Promise<InviteRoster> {
  if (!supabase) throw new Error('Cloud disabled');
  const { data, error } = await supabase.rpc('invite_roster', {
    p_code: normalizeInviteCode(code)
  });
  if (error) throw error;

  const rows = (data || []) as RosterRow[];
  if (rows.length === 0) throw new Error('INVALID_INVITE');

  return {
    tripId: rows[0].t_id,
    tripTitle: rows[0].t_title,
    seats: rows
      .filter(r => r.seat_id)
      .map(r => ({
        travelerId: r.seat_id!,
        name: r.seat_name,
        avatarColor: r.seat_color,
        role: r.seat_role,
        claimed: r.is_claimed,
        mine: r.is_mine
      }))
  };
}

/**
 * Take a named seat. Returns the trip id now joined.
 *
 * `code` is only needed by somebody who is not on the trip yet; an existing
 * member picking their name late, or swapping it, has nothing to prove.
 */
export async function claimSeat(
  tripId: string,
  travelerId: string,
  code?: string
): Promise<string> {
  if (!supabase) throw new Error('Cloud disabled');
  const { data, error } = await supabase.rpc('claim_seat', {
    p_trip_id: tripId,
    p_traveler_id: travelerId,
    p_code: code ? normalizeInviteCode(code) : null
  });
  if (error) throw error;
  return data as string;
}

/**
 * The roster as the picker wants it, for a trip this browser is already on:
 * the names from the trip document, with who holds each one from the server.
 *
 * Pure so it can be tested without a network — the merge rule is the part
 * worth getting right. A claimed seat reports the role actually enforced on
 * the server, not the one the trip document merely intends.
 */
export function mergeSeats(travelers: Traveler[], claims: SeatClaim[]): TripSeat[] {
  return (travelers || []).map(tv => {
    const claim = claims.find(c => c.travelerId === tv.id);
    return {
      travelerId: tv.id,
      name: tv.name,
      avatarColor: tv.avatarColor,
      role: claim?.role ?? tv.role ?? 'member',
      claimed: Boolean(claim),
      mine: claim?.isMe ?? false
    };
  });
}

/** Who holds which seat on a trip this browser is already a member of. */
export async function fetchSeatClaims(tripId: string): Promise<SeatClaim[]> {
  if (!supabase) return [];
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  const { data, error } = await supabase
    .from('trip_members')
    .select('traveler_id, role, user_id')
    .eq('trip_id', tripId);
  if (error) {
    // Nobody holds a seat on a database that has no seats. An empty roster
    // reads as "not claimed yet", which is the truth of it.
    console.warn('Seat claims unavailable:', error.message);
    return [];
  }
  return (data || [])
    .filter(r => r.traveler_id)
    .map(r => ({
      travelerId: r.traveler_id as string,
      role: r.role as TripRole,
      isMe: r.user_id === uid
    }));
}

/** Admin only. Frees the seat so it can be claimed again. */
export async function releaseSeat(tripId: string, travelerId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.rpc('release_seat', {
    p_trip_id: tripId,
    p_traveler_id: travelerId
  });
  if (error) throw error;
}

/** Admin only. Changes what the seat's holder may do, right now. */
export async function setSeatRole(
  tripId: string,
  travelerId: string,
  role: TripRole
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.rpc('set_seat_role', {
    p_trip_id: tripId,
    p_traveler_id: travelerId,
    p_role: role
  });
  if (error) throw error;
}

// ---------- Invite URL helpers ----------

// Invite links are the short ones: https://host/j/AB3F7K, about 35 characters,
// small enough for a QR code and for any messaging app. Vercel rewrites every
// path to index.html, so /j/<code> loads the SPA and is read back here.
const JOIN_PATH_PATTERN = /^\/j\/([A-Za-z0-9]{4,16})\/?$/;

export function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase();
}

export function buildInviteUrl(code: string): string {
  return `${window.location.origin}/j/${code}`;
}

export function parseJoinCodeFromUrl(): string | null {
  const fromPath = JOIN_PATH_PATTERN.exec(window.location.pathname);
  if (fromPath) return normalizeInviteCode(fromPath[1]);

  // Older invites used a #join= hash; keep honouring links already sent out.
  const hash = window.location.hash;
  if (hash.includes('#join=')) {
    const code = hash.split('#join=')[1];
    return code ? normalizeInviteCode(code) : null;
  }
  return null;
}

export function clearJoinHash(): void {
  window.history.replaceState(null, '', '/');
}
