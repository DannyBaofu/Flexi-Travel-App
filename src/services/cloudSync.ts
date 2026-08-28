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

export async function sendOtp(email: string): Promise<void> {
  if (!supabase) throw new Error('Cloud disabled');
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true }
  });
  if (error) throw error;
}

export async function verifyOtp(email: string, code: string): Promise<void> {
  if (!supabase) throw new Error('Cloud disabled');
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
  if (error) throw error;
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

function randomCode(length = 8): string {
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
  const { data, error } = await supabase.rpc('join_trip', { p_code: code });
  if (error) throw error;
  return data as string;
}

// ---------- Invite URL helpers ----------

export function buildInviteUrl(code: string): string {
  return `${window.location.origin}${window.location.pathname}#join=${code}`;
}

export function parseJoinCodeFromUrl(): string | null {
  const hash = window.location.hash;
  if (!hash.includes('#join=')) return null;
  const code = hash.split('#join=')[1];
  return code ? code.trim() : null;
}

export function clearJoinHash(): void {
  window.history.replaceState(null, '', window.location.pathname);
}
