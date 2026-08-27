import type { Trip } from '../types/travel';
import { initialTrips } from '../data/defaultTrips';

const TRIPS_STORAGE_KEY = 'travelsync_trips_v1';
const ACTIVE_TRIP_KEY = 'travelsync_active_trip_id_v1';

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
        return parsed;
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
