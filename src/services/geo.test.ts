import { describe, it, expect } from 'vitest';
import {
  locatedStops,
  haversineKm,
  hopsBetween,
  totalKm,
  roundDistance,
  coordsFromMapsUrl,
  directionsUrl,
  travelModeFor
} from './geo';
import type { ActivityItem } from '../types/travel';

const act = (over: Partial<ActivityItem> = {}): ActivityItem => ({
  id: over.id ?? 'a',
  time: '10:00',
  title: 'Somewhere',
  category: 'sightseeing',
  locationName: 'Somewhere',
  ...over
});

// Bangkok landmarks — close enough together that a wrong formula shows.
const watPho = { lat: 13.7466, lon: 100.4927 };
const grandPalace = { lat: 13.7500, lon: 100.4913 };
const jodd = { lat: 13.7581, lon: 100.5651 };

describe('locatedStops', () => {
  it('keeps each pinned stop with its position in the whole day, not among pinned ones', () => {
    const stops = locatedStops([
      act({ id: 'a', ...watPho }),
      act({ id: 'b' }), // typed by hand, no pin
      act({ id: 'c', ...jodd })
    ]);
    expect(stops.map(s => [s.activity.id, s.order])).toEqual([['a', 1], ['c', 3]]);
  });

  it('refuses coordinates that cannot be on the globe', () => {
    expect(locatedStops([act({ lat: 91, lon: 0 }), act({ lat: 0, lon: 181 }), act({ lat: NaN, lon: 1 })])).toEqual([]);
  });
});

describe('haversineKm', () => {
  it('measures Wat Pho to the Grand Palace at about 400 m', () => {
    const km = haversineKm(watPho, grandPalace);
    expect(km).toBeGreaterThan(0.35);
    expect(km).toBeLessThan(0.45);
  });

  it('measures Wat Pho to Jodd Fairs at about 8 km', () => {
    const km = haversineKm(watPho, jodd);
    expect(km).toBeGreaterThan(7.5);
    expect(km).toBeLessThan(8.5);
  });

  it('is zero from a point to itself and symmetric', () => {
    expect(haversineKm(watPho, watPho)).toBe(0);
    expect(haversineKm(watPho, jodd)).toBeCloseTo(haversineKm(jodd, watPho), 10);
  });
});

describe('hopsBetween and totalKm', () => {
  it('links each pinned stop to the next and adds them up', () => {
    const stops = locatedStops([act({ id: 'a', ...watPho }), act({ id: 'b', ...grandPalace }), act({ id: 'c', ...jodd })]);
    const hops = hopsBetween(stops);
    expect(hops.map(h => [h.from.activity.id, h.to.activity.id])).toEqual([['a', 'b'], ['b', 'c']]);
    expect(totalKm(hops)).toBeCloseTo(hops[0].km + hops[1].km, 10);
  });

  it('has no hops for a single stop', () => {
    expect(hopsBetween(locatedStops([act(watPho)]))).toEqual([]);
  });
});

describe('roundDistance', () => {
  it('shows metres to the nearest ten under a kilometre', () => {
    expect(roundDistance(0.412)).toEqual({ value: 410, unit: 'm' });
    expect(roundDistance(0.004)).toEqual({ value: 10, unit: 'm' });
  });

  it('shows one decimal up to ten kilometres and whole numbers beyond', () => {
    expect(roundDistance(1.26)).toEqual({ value: 1.3, unit: 'km' });
    expect(roundDistance(8.04)).toEqual({ value: 8, unit: 'km' });
    expect(roundDistance(23.7)).toEqual({ value: 24, unit: 'km' });
  });
});

describe('directionsUrl', () => {
  const params = (url: string | null) => new URL(url!).searchParams;

  it('asks for transit between two pins, by coordinates rather than by name', () => {
    const url = directionsUrl(act({ ...watPho, locationName: 'Wat Pho' }), act({ ...jodd, locationName: 'Jodd Fairs' }));
    expect(url).toMatch(/^https:\/\/www\.google\.com\/maps\/dir\/\?/);
    expect(params(url).get('origin')).toBe('13.7466,100.4927');
    expect(params(url).get('destination')).toBe('13.7581,100.5651');
    expect(params(url).get('travelmode')).toBe('transit');
  });

  it('falls back to the address, then the name, for a stop with no pin', () => {
    const typed = act({ locationName: 'Krua Apsorn', locationAddress: '169 Dinso Rd, Bangkok' });
    const bare = act({ locationName: 'a noodle stall' });
    expect(params(directionsUrl(act(watPho), typed)).get('destination')).toBe('169 Dinso Rd, Bangkok');
    expect(params(directionsUrl(bare, act(watPho))).get('origin')).toBe('a noodle stall');
  });

  it('is nothing when an end has neither pin nor name', () => {
    expect(directionsUrl(act(watPho), act({ locationName: '' }))).toBeNull();
  });

  it('follows a written-down mode: taxi drives, walking walks, everything else rides', () => {
    expect(travelModeFor('taxi')).toBe('driving');
    expect(travelModeFor('walk')).toBe('walking');
    expect(travelModeFor('bts')).toBe('transit');
    expect(travelModeFor('boat')).toBe('transit');
    expect(travelModeFor(undefined)).toBe('transit');
    expect(params(directionsUrl(act(watPho), act(jodd), 'taxi')).get('travelmode')).toBe('driving');
  });
});

describe('coordsFromMapsUrl', () => {
  it('reads the pin the app itself wrote', () => {
    expect(coordsFromMapsUrl('https://www.google.com/maps/search/?api=1&query=13.7466,100.4927'))
      .toEqual({ lat: 13.7466, lon: 100.4927 });
  });

  it('handles negative coordinates and a trailing parameter', () => {
    expect(coordsFromMapsUrl('https://www.google.com/maps/search/?api=1&query=-33.86,151.21&hl=en'))
      .toEqual({ lat: -33.86, lon: 151.21 });
  });

  it('gives nothing for a name-based or missing link', () => {
    expect(coordsFromMapsUrl('https://www.google.com/maps/search/?api=1&query=Wat+Pho')).toBeNull();
    expect(coordsFromMapsUrl(undefined)).toBeNull();
    expect(coordsFromMapsUrl('https://maps.app.goo.gl/abc')).toBeNull();
  });
});
