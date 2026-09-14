import type { ActivityItem, TransportMode } from '../types/travel';

/**
 * The day on a map: which stops have a pin, in what order, and how far apart
 * they are.
 *
 * Distances here are straight lines. Road or transit distance would need a
 * routing service, and the free ones either forbid production use or need a
 * key — the same reason the location search chose Photon. A straight line
 * labelled as one is honest and works offline; the Directions link on each
 * hop is where the real route lives.
 */

export interface MapStop {
  activity: ActivityItem;
  /** 1-based position in the day, counting every activity — pinned or not. */
  order: number;
  lat: number;
  lon: number;
}

export interface MapHop {
  from: MapStop;
  to: MapStop;
  km: number;
}

const hasCoords = (a: ActivityItem): a is ActivityItem & { lat: number; lon: number } =>
  typeof a.lat === 'number' && typeof a.lon === 'number' &&
  Number.isFinite(a.lat) && Number.isFinite(a.lon) &&
  Math.abs(a.lat) <= 90 && Math.abs(a.lon) <= 180;

/** The day's activities that can be placed, keeping their place in the day's order. */
export function locatedStops(activities: ActivityItem[]): MapStop[] {
  return activities.flatMap((activity, idx) =>
    hasCoords(activity)
      ? [{ activity, order: idx + 1, lat: activity.lat, lon: activity.lon }]
      : []
  );
}

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance between two points, in kilometres. */
export function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Each pinned stop to the next pinned one, skipping stops that have no pin. */
export function hopsBetween(stops: MapStop[]): MapHop[] {
  return stops.slice(1).map((to, idx) => {
    const from = stops[idx];
    return { from, to, km: haversineKm(from, to) };
  });
}

export const totalKm = (hops: MapHop[]): number =>
  hops.reduce((sum, hop) => sum + hop.km, 0);

/**
 * "1.2 km" reads as a distance; "1.234 km" reads as a survey. Under a
 * kilometre, metres to the nearest ten are what a person walking wants.
 */
export function roundDistance(km: number): { value: number; unit: 'km' | 'm' } {
  if (km < 1) return { value: Math.max(10, Math.round((km * 1000) / 10) * 10), unit: 'm' };
  if (km < 10) return { value: Math.round(km * 10) / 10, unit: 'km' };
  return { value: Math.round(km), unit: 'km' };
}

export type TravelMode = 'transit' | 'driving' | 'walking';

/**
 * Google's travel mode for each way of getting around. Anything on rails or
 * water is transit; with no mode written down at all, transit is still the
 * answer, because this app plans city days and Google's transit view is where
 * "which station do we get on, which do we get off" actually lives.
 */
export const travelModeFor = (mode: TransportMode | undefined): TravelMode => {
  if (mode === 'taxi') return 'driving';
  if (mode === 'walk') return 'walking';
  return 'transit';
};

/** A pin beats a name: "13.7466,100.4927" resolves to one place, "Wat Pho" to several. */
const placeQuery = (a: ActivityItem): string | null =>
  hasCoords(a) ? `${a.lat},${a.lon}` : (a.locationAddress || a.locationName || '').trim() || null;

/**
 * Google Maps directions from one activity to the next, or null when either
 * end has neither a pin nor a name to ask about. No key, no quota, and the
 * live answer — next train, fare, exact stations — is Google's to keep
 * current, not ours.
 */
export function directionsUrl(
  from: ActivityItem,
  to: ActivityItem,
  mode?: TransportMode
): string | null {
  const origin = placeQuery(from);
  const destination = placeQuery(to);
  if (!origin || !destination) return null;
  const params = new URLSearchParams({
    api: '1',
    origin,
    destination,
    travelmode: travelModeFor(mode)
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/**
 * The pin coordinates out of a Google Maps link the app itself wrote —
 * `...?api=1&query=13.7466,100.4927`. Activities saved before `lat`/`lon`
 * existed carry their position only here, so this is how they get onto the
 * map without anyone re-picking the place.
 */
export function coordsFromMapsUrl(url: string | undefined): { lat: number; lon: number } | null {
  if (!url) return null;
  const match = /[?&]query=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:$|&)/.exec(url);
  if (!match) return null;
  const lat = Number(match[1]);
  const lon = Number(match[2]);
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon };
}
