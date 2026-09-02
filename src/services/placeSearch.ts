/**
 * Place suggestions, keyless.
 *
 * Uses Photon (photon.komoot.io), an OpenStreetMap geocoder built specifically
 * for type-ahead. Nominatim is the better-known OSM endpoint but its usage
 * policy explicitly forbids autocomplete, so it is the wrong tool here.
 *
 * No API key, no billing, no account — which is the whole reason it was chosen
 * over Google Places.
 */

export interface PlaceSuggestion {
  id: string;
  /** What to put in the location field. */
  name: string;
  /** The supporting line under it; may be empty for a bare place name. */
  address: string;
  lat: number;
  lon: number;
}

interface PhotonProperties {
  name?: string;
  street?: string;
  housenumber?: string;
  district?: string;
  city?: string;
  county?: string;
  state?: string;
  postcode?: string;
  country?: string;
  osm_id?: number;
  osm_type?: string;
}

interface PhotonFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: PhotonProperties;
}

/**
 * Build the two lines shown in the dropdown.
 *
 * Photon returns address parts separately and inconsistently — a restaurant may
 * have a name but no street, a junction may have a street but no name. Exported
 * for its own tests because that variability is where this goes wrong.
 */
export function describePlace(feature: PhotonFeature): PlaceSuggestion | null {
  const p = feature.properties;
  const coords = feature.geometry?.coordinates;
  if (!p || !coords || coords.length < 2) return null;

  const streetLine = [p.housenumber, p.street].filter(Boolean).join(' ');
  const areaParts = [p.district, p.city || p.county, p.state, p.country].filter(Boolean);

  // Prefer the place's own name; fall back to the street address when a
  // result has no name of its own.
  const name = p.name || streetLine || areaParts[0] || '';
  if (!name) return null;

  const addressParts = [streetLine, ...areaParts].filter(
    (part, idx, all) => part && part !== name && all.indexOf(part) === idx
  );

  return {
    id: `${p.osm_type ?? 'x'}-${p.osm_id ?? `${coords[1]},${coords[0]}`}`,
    name,
    address: addressParts.join(', '),
    lat: coords[1],
    lon: coords[0]
  };
}

/** A precise pin beats a name-based query that might resolve anywhere. */
export function mapsUrlFor(place: PlaceSuggestion): string {
  return `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lon}`;
}

/**
 * @param near  The trip destination, appended to bias results to the right
 *              city — "Krua Apsorn" alone matches things worldwide.
 */
export async function searchPlaces(
  query: string,
  near?: string,
  signal?: AbortSignal
): Promise<PlaceSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const q = near && !trimmed.toLowerCase().includes(near.toLowerCase())
    ? `${trimmed} ${near}`
    : trimmed;

  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Place search failed: ${res.status}`);

  const data = (await res.json()) as { features?: PhotonFeature[] };
  const seen = new Set<string>();

  return (data.features ?? [])
    .map(describePlace)
    .filter((p): p is PlaceSuggestion => p !== null)
    .filter(p => {
      // The same venue often comes back as both a node and a way
      const key = `${p.name}|${p.address}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 5);
}
