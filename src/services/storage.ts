import type { Trip, TripRole } from '../types/travel';
import { resolveKitty } from './kitty';

const TRIPS_STORAGE_KEY = 'travelsync_trips_v1';
const ACTIVE_TRIP_KEY = 'travelsync_active_trip_id_v1';
const SAMPLE_PURGE_KEY = 'travelsync_sample_purged_v1';

// The app used to ship with a demo Bangkok itinerary (fake travellers, fake
// expenses) seeded into every new browser. That sample is gone, but copies of
// it still sit in the localStorage of anyone who opened the app before now.
// Drop those once, guarded by a flag so a trip the user genuinely creates
// later is never touched.
const SAMPLE_TRIP_ID = 'bkk-2026-trip';
const SAMPLE_CLONE_PREFIX = 'trip-bkk-';

function purgeSeededSample(trips: Trip[]): Trip[] {
  try {
    if (localStorage.getItem(SAMPLE_PURGE_KEY)) return trips;
  } catch {
    return trips; // storage unavailable — leave data alone
  }

  const cleaned = trips.filter(
    trip => trip.id !== SAMPLE_TRIP_ID && !trip.id.startsWith(SAMPLE_CLONE_PREFIX)
  );

  try {
    localStorage.setItem(SAMPLE_PURGE_KEY, '1');
    if (cleaned.length !== trips.length) {
      localStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(cleaned));
    }
  } catch { /* ignore */ }

  return cleaned;
}

// Trips saved before the shared pot existed have no `kitty`. Give them the
// default (switched off) on read so every code path downstream can rely on the
// field being there.
function backfillKitty(trips: Trip[]): Trip[] {
  return trips.map(trip => {
    // Packing lists and taxi cards were removed from the app; trips saved
    // while they existed still carry the arrays, so shed them here rather
    // than letting dead data ride along in every cloud push and export.
    const { checklist: _checklist, taxiCards: _taxiCards, ...rest } =
      trip as Trip & { checklist?: unknown; taxiCards?: unknown };
    const cleaned = rest as Trip;
    return cleaned.kitty ? cleaned : { ...cleaned, kitty: resolveKitty(cleaned) };
  });
}

// Travellers saved before seats existed have no `role`. The trip's owner is
// its admin; everyone else defaults to the role the house rule assumes —
// member, which adds and edits but does not delete.
function backfillTravelerRoles(trips: Trip[]): Trip[] {
  return trips.map(trip => {
    const travelers = trip.travelers || [];
    if (travelers.every(tv => tv.role)) return trip;
    return {
      ...trip,
      travelers: travelers.map(tv =>
        tv.role ? tv : { ...tv, role: (tv.isOwner ? 'admin' : 'member') as TripRole }
      )
    };
  });
}

export const storageService = {
  // Returns whatever the user actually has. An empty list is a valid state —
  // the app shows a "create your first trip" screen rather than inventing data.
  getTrips(): Trip[] {
    try {
      const stored = localStorage.getItem(TRIPS_STORAGE_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return [];
      return backfillTravelerRoles(backfillKitty(purgeSeededSample(parsed)));
    } catch (e) {
      console.error('Error loading trips from storage:', e);
      return [];
    }
  },

  saveTrips(trips: Trip[]) {
    try {
      localStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(trips));
    } catch (e) {
      console.error('Error saving trips to storage:', e);
    }
  },

  getActiveTripId(): string {
    try {
      const activeId = localStorage.getItem(ACTIVE_TRIP_KEY);
      const trips = this.getTrips();
      if (activeId && trips.some(t => t.id === activeId)) {
        return activeId;
      }
      return trips[0]?.id || '';
    } catch {
      return '';
    }
  },

  setActiveTripId(id: string) {
    try {
      localStorage.setItem(ACTIVE_TRIP_KEY, id);
    } catch { /* ignore */ }
  },

  saveTrip(updatedTrip: Trip): Trip[] {
    const trips = this.getTrips();
    const existingIndex = trips.findIndex(t => t.id === updatedTrip.id);
    let newTrips: Trip[];

    updatedTrip.updatedAt = new Date().toISOString();

    if (existingIndex >= 0) {
      newTrips = [...trips];
      newTrips[existingIndex] = updatedTrip;
    } else {
      newTrips = [updatedTrip, ...trips];
    }
    this.saveTrips(newTrips);
    return newTrips;
  },

  deleteTrip(tripId: string): Trip[] {
    const remaining = this.getTrips().filter(t => t.id !== tripId);
    this.saveTrips(remaining);

    if (this.getActiveTripId() === tripId) {
      this.setActiveTripId(remaining[0]?.id || '');
    }
    return remaining;
  }
};
