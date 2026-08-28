import type { Trip } from '../types/travel';
import { initialTrips } from '../data/defaultTrips';

const TRIPS_STORAGE_KEY = 'travelsync_trips_v1';
const ACTIVE_TRIP_KEY = 'travelsync_active_trip_id_v1';

// Backfill transport suggestions from the bundled default trips into
// stored trips that predate the transportToNext field. Only fills gaps —
// user-edited activities keep whatever they already have.
function backfillTransportSuggestions(trips: Trip[]): Trip[] {
  return trips.map(trip => {
    const defaultTrip = initialTrips.find(d => d.id === trip.id);
    if (!defaultTrip) return trip;

    const defaults = new Map<string, NonNullable<Trip['days'][number]['activities'][number]['transportToNext']>>();
    defaultTrip.days.forEach(day =>
      day.activities.forEach(act => {
        if (act.transportToNext) defaults.set(act.id, act.transportToNext);
      })
    );
    if (defaults.size === 0) return trip;

    return {
      ...trip,
      days: trip.days.map(day => ({
        ...day,
        activities: day.activities.map(act =>
          !act.transportToNext && defaults.has(act.id)
            ? { ...act, transportToNext: defaults.get(act.id) }
            : act
        )
      }))
    };
  });
}

export const storageService = {
  getTrips(): Trip[] {
    try {
      const stored = localStorage.getItem(TRIPS_STORAGE_KEY);
      if (!stored) {
        this.saveTrips(initialTrips);
        return initialTrips;
      }
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return backfillTransportSuggestions(parsed);
      }
      this.saveTrips(initialTrips);
      return initialTrips;
    } catch (e) {
      console.error('Error loading trips from storage:', e);
      return initialTrips;
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
    const activeId = localStorage.getItem(ACTIVE_TRIP_KEY);
    const trips = this.getTrips();
    if (activeId && trips.some(t => t.id === activeId)) {
      return activeId;
    }
    return trips[0]?.id || '';
  },

  setActiveTripId(id: string) {
    localStorage.setItem(ACTIVE_TRIP_KEY, id);
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
    const trips = this.getTrips();
    const filtered = trips.filter(t => t.id !== tripId);
    const finalTrips = filtered.length > 0 ? filtered : initialTrips;
    this.saveTrips(finalTrips);
    
    if (this.getActiveTripId() === tripId) {
      this.setActiveTripId(finalTrips[0].id);
    }
    return finalTrips;
  }
};
