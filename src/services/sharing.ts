import LZString from 'lz-string';
import type { Trip, TripRole } from '../types/travel';

export interface SharePayload {
  version: number;
  trip: Trip;
  readOnly: boolean; // kept for backwards compatibility with v1 links
  role?: TripRole; // permission granted to whoever opens the link
  requiresPin: boolean;
  pinHash?: string;
  createdAt: string;
}

// Resolve the role a share link grants, tolerating old links without `role`.
export function resolveShareRole(payload: SharePayload): TripRole {
  if (payload.role === 'admin' || payload.role === 'member' || payload.role === 'viewer') {
    return payload.role;
  }
  return payload.readOnly ? 'viewer' : 'member';
}

export function hashPin(pin: string): string {
  // Simple deterministic client hash for passcode comparison
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return btoa(`pin_${hash}_salt_travelsync`);
}

export const sharingService = {
  /**
   * Generates a fully self-contained compressed URL that friends can open anywhere.
   */
  generateShareUrl(trip: Trip, options: { role: TripRole; pin?: string }): string {
    // Never embed the sharer's own role in the payload trip
    const { myRole: _myRole, ...tripSnapshot } = trip;
    const payload: SharePayload = {
      version: 2,
      trip: {
        ...tripSnapshot,
        updatedAt: new Date().toISOString()
      },
      readOnly: options.role === 'viewer',
      role: options.role,
      requiresPin: Boolean(options.pin && options.pin.trim().length > 0),
      pinHash: options.pin && options.pin.trim().length > 0 ? hashPin(options.pin.trim()) : undefined,
      createdAt: new Date().toISOString()
    };

    const serialized = JSON.stringify(payload);
    const compressed = LZString.compressToEncodedURIComponent(serialized);
    
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}#share=${compressed}`;
  },

  /**
   * Reads and parses a trip from URL hash if present.
   */
  parseShareFromUrl(): SharePayload | null {
    try {
      const hash = window.location.hash;
      if (!hash || !hash.includes('#share=')) {
        return null;
      }

      const rawData = hash.split('#share=')[1];
      if (!rawData) return null;

      const decompressed = LZString.decompressFromEncodedURIComponent(rawData);
      if (!decompressed) return null;

      const payload: SharePayload = JSON.parse(decompressed);
      if (payload && payload.trip && payload.trip.id) {
        return payload;
      }
      return null;
    } catch (e) {
      console.error('Failed to parse share URL:', e);
      return null;
    }
  },

  /**
   * Clears the share parameter from the URL hash without reloading.
   */
  clearShareHash() {
    window.history.replaceState(null, '', window.location.pathname);
  },

  /**
   * Export trip as JSON file download
   */
  exportToJsonFile(trip: Trip) {
    const fileName = `${trip.destination.toLowerCase().replace(/[^a-z0-9]/g, '_')}_trip_${trip.startDate}.json`;
    const jsonStr = JSON.stringify(trip, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Import trip from JSON string
   */
  importFromJson(jsonString: string): Trip {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.title || !parsed.destination || !Array.isArray(parsed.days)) {
        throw new Error('Invalid travel itinerary file format.');
      }
      // Assign new ID to avoid clashing with existing trip
      const importedTrip: Trip = {
        ...parsed,
        id: `trip-imported-${Date.now()}`,
        title: parsed.title.includes('(Imported)') ? parsed.title : `${parsed.title} (Imported)`,
        updatedAt: new Date().toISOString()
      };
      return importedTrip;
    } catch (e: any) {
      throw new Error(`Failed to parse itinerary JSON: ${e?.message || 'Invalid format'}`);
    }
  }
};
