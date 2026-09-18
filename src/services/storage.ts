import type { Trip, TripRole } from '../types/travel';
import { resolveKitty } from './kitty';
import { emptyFlights } from './flights';
import { coordsFromMapsUrl } from './geo';
import { preferredTripId } from './tripOrder';

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

// One entry per trip id, first copy wins. Duplicates are always a bug
// further upstream, but they must not survive in storage: `saveTrip` replaces
// only the first match, so a second copy would linger as a stale twin of the
// same trip — two rows in the trip picker with one id between them, and React
// warning about the shared key — for as long as the browser kept it.
function dedupeById(trips: Trip[]): Trip[] {
  const seen = new Set<string>();
  const unique: Trip[] = [];
  for (const trip of trips) {
    if (seen.has(trip.id)) continue;
    seen.add(trip.id);
    unique.push(trip);
  }
  return unique;
}

// Trips saved before the shared pot existed have no `kitty`. Give them the
// default (switched off) on read so every code path downstream can rely on the
// field being there.
function backfillKitty(trips: Trip[]): Trip[] {
  return trips.map(trip => {
    // Packing lists, taxi cards and shareSettings were all removed from the
    // app; trips saved while they existed still carry them, so shed them here
    // rather than letting dead data ride along in every cloud push.
    // shareSettings was the odd one: three flags that were written on every
    // new trip and read by nothing, ever.
    const { checklist: _checklist, taxiCards: _taxiCards, shareSettings: _shareSettings, ...rest } =
      trip as Trip & { checklist?: unknown; taxiCards?: unknown; shareSettings?: unknown };
    const cleaned = rest as Trip;
    return cleaned.kitty ? cleaned : { ...cleaned, kitty: resolveKitty(cleaned) };
  });
}

// Trips saved before the draft list existed have no `ideas`. Give them an
// empty one on read so the tab and the merge can both rely on the field being
// an array rather than guarding for undefined in every place that touches it.
function backfillIdeas(trips: Trip[]): Trip[] {
  return trips.map(trip => (Array.isArray(trip.ideas) ? trip : { ...trip, ideas: [] }));
}

// Trips saved before the flight schedule existed have no `flights`. Give them
// the empty shape on read — two journeys with no legs — so the settings form
// and the card can both read `flights.outbound.legs` without guarding.
function backfillFlights(trips: Trip[]): Trip[] {
  return trips.map(trip =>
    trip.flights?.outbound && trip.flights?.inbound ? trip : { ...trip, flights: emptyFlights() }
  );
}

// Activities saved before `lat`/`lon` existed still know where they are: a
// place picked off the suggestion list wrote its pin into `googleMapsUrl` as
// `query=lat,lon`. Read it back so the map shows every stop that was ever
// picked, not just the ones added from now on. Typed-by-hand locations have
// no pin to recover and stay off the map.
function backfillActivityCoords(trips: Trip[]): Trip[] {
  return trips.map(trip => ({
    ...trip,
    days: (trip.days || []).map(day => ({
      ...day,
      activities: (day.activities || []).map(activity => {
        if (typeof activity.lat === 'number' && typeof activity.lon === 'number') return activity;
        const pin = coordsFromMapsUrl(activity.googleMapsUrl);
        return pin ? { ...activity, ...pin } : activity;
      })
    }))
  }));
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

// Trips saved before the role was written down have no `myRole`. Every one of
// them is a trip this browser made, imported, or owned outright — the cloud
// path has always stamped the membership role on arrival — so admin is what
// they have been rendering as all along, and this keeps it that way.
//
// The point of doing it here is what it lets `App` do: once a stored trip
// always carries a role, a *missing* role no longer means "mine". It means the
// trip reached us by some path that never established one, and the only safe
// reading of that is read-only.
function backfillMyRole(trips: Trip[]): Trip[] {
  return trips.map(trip => (trip.myRole ? trip : { ...trip, myRole: 'admin' as TripRole }));
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
      return backfillMyRole(
        backfillTravelerRoles(
          backfillActivityCoords(
            backfillFlights(backfillIdeas(backfillKitty(dedupeById(purgeSeededSample(parsed)))))
          )
        )
      );
    } catch (e) {
      console.error('Error loading trips from storage:', e);
      return [];
    }
  },

  saveTrips(trips: Trip[]) {
    try {
      localStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(dedupeById(trips)));
    } catch (e) {
      console.error('Error saving trips to storage:', e);
    }
  },

  getActiveTripId(): string {
    try {
      // Not simply whatever was open last. That restored a finished trip
      // forever, so coming back in March greeted you with November's
      // itinerary -- and its fallback was `trips[0]`, which is storage
      // order, meaning no order at all.
      return preferredTripId(this.getTrips(), localStorage.getItem(ACTIVE_TRIP_KEY));
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
