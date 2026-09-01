import type { RealtimeChannel, Session, User } from '@supabase/supabase-js';
import type { Trip, TripRole } from '../types/travel';
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

export async function signOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

// ---------- Trips ----------

// Strip the local-only role marker before storing the trip document
function tripDocument(trip: Trip): Omit<Trip, 'myRole'> {
  const { myRole: _myRole, ...doc } = trip;
  return doc;
}

export async function fetchMyTrips(): Promise<Trip[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('trip_members')
    .select('role, trips ( id, data, updated_at )');
  if (error) throw error;
  const rows = (data || []) as unknown as { role: TripRole; trips: { data: Trip } | null }[];
  return rows
    .filter(r => r.trips?.data)
    .map(r => ({ ...(r.trips!.data), myRole: r.role }));
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

  const { error: memberError } = await supabase
    .from('trip_members')
    .upsert({ trip_id: trip.id, user_id: uid, role: 'admin' });
  if (memberError) throw memberError;
}

export async function upsertTripCloud(trip: Trip): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('trips')
    .update({ data: tripDocument(trip) })
    .eq('id', trip.id);
  if (error) throw error;
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
        const next = (payload.new as { data?: Trip })?.data;
        if (next) onRemoteChange(next);
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

export async function createInvite(tripId: string, role: TripRole): Promise<string> {
  if (!supabase) throw new Error('Cloud disabled');
  const code = randomCode();
  const { error } = await supabase
    .from('trip_invites')
    .insert({ code, trip_id: tripId, role });
  if (error) throw error;
  return code;
}

export async function joinTripByCode(code: string): Promise<string> {
  if (!supabase) throw new Error('Cloud disabled');
  const { data, error } = await supabase.rpc('join_trip', { p_code: normalizeInviteCode(code) });
  if (error) throw error;
  return data as string;
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
