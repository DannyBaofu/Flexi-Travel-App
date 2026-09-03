import { describe, it, expect, beforeEach } from 'vitest';
import { storageService } from './storage';
import type { Trip } from '../types/travel';

const TRIPS_KEY = 'travelsync_trips_v1';
const PURGE_KEY = 'travelsync_sample_purged_v1';

// Minimal in-memory localStorage so these tests run without a DOM
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: () => null,
  length: 0
} as Storage;

function trip(id: string, title = id): Trip {
  return { id, title, days: [] } as unknown as Trip;
}

beforeEach(() => store.clear());

describe('storageService.getTrips', () => {
  it('returns an empty list for a fresh browser instead of seeding sample data', () => {
    expect(storageService.getTrips()).toEqual([]);
  });

  it('does not write anything to storage on a fresh read', () => {
    storageService.getTrips();
    expect(store.get(TRIPS_KEY)).toBeUndefined();
  });

  it('collapses a trip that got saved twice into one entry', () => {
    // An unfiltered roster read used to return one row per member, so a trip
    // with three people on it arrived three times and went to storage that
    // way. Heal it on read: the picker cannot show one id twice.
    store.set(TRIPS_KEY, JSON.stringify([trip('trip-1', 'Bangkok'), trip('trip-1', 'Bangkok')]));
    store.set(PURGE_KEY, '1');
    expect(storageService.getTrips().map(t => t.id)).toEqual(['trip-1']);
  });

  it('returns the user’s own trips untouched', () => {
    store.set(TRIPS_KEY, JSON.stringify([trip('trip-123', 'Penang')]));
    store.set(PURGE_KEY, '1');
    expect(storageService.getTrips().map(t => t.id)).toEqual(['trip-123']);
  });

  it('survives corrupt stored JSON', () => {
    store.set(TRIPS_KEY, 'not json at all');
    expect(storageService.getTrips()).toEqual([]);
  });
});

describe('one-time sample purge', () => {
  it('removes the old seeded Bangkok demo and its clones', () => {
    store.set(TRIPS_KEY, JSON.stringify([
      trip('bkk-2026-trip'),
      trip('trip-bkk-1699999999'),
      trip('trip-mine', 'My real trip')
    ]));
    expect(storageService.getTrips().map(t => t.id)).toEqual(['trip-mine']);
  });

  it('runs only once, so a later trip is never purged', () => {
    store.set(TRIPS_KEY, JSON.stringify([trip('bkk-2026-trip')]));
    storageService.getTrips();
    // user later creates something that happens to share the prefix
    store.set(TRIPS_KEY, JSON.stringify([trip('trip-bkk-new')]));
    expect(storageService.getTrips().map(t => t.id)).toEqual(['trip-bkk-new']);
  });
});

describe('storageService.saveTrips', () => {
  it('never writes the same trip twice, keeping the first copy', () => {
    storageService.saveTrips([trip('trip-1', 'Bangkok'), trip('trip-1', 'Penang')]);
    const written = JSON.parse(store.get(TRIPS_KEY)!) as Trip[];
    expect(written).toHaveLength(1);
    expect(written[0].title).toBe('Bangkok');
  });
});

describe('storageService.deleteTrip', () => {
  it('allows deleting the last trip, leaving an empty list', () => {
    store.set(PURGE_KEY, '1');
    store.set(TRIPS_KEY, JSON.stringify([trip('only-one')]));
    expect(storageService.deleteTrip('only-one')).toEqual([]);
    expect(storageService.getTrips()).toEqual([]);
  });
});

describe('storageService.getTrips — traveller roles', () => {
  it('gives older travellers a role, with the owner as admin', () => {
    const older = {
      id: 'trip-1',
      title: 'Bangkok',
      days: [],
      travelers: [
        { id: 't1', name: 'Danny', avatarColor: '#3930DB', isOwner: true },
        { id: 't2', name: 'Wei Ming', avatarColor: '#B42318' }
      ]
    };
    store.set(TRIPS_KEY, JSON.stringify([older]));
    store.set(PURGE_KEY, '1');

    const [loaded] = storageService.getTrips();
    expect(loaded.travelers.map(tv => tv.role)).toEqual(['admin', 'member']);
  });

  it('leaves a role that was set deliberately alone', () => {
    const saved = {
      id: 'trip-1',
      title: 'Bangkok',
      days: [],
      travelers: [{ id: 't1', name: 'Danny', avatarColor: '#3930DB', role: 'viewer' }]
    };
    store.set(TRIPS_KEY, JSON.stringify([saved]));
    store.set(PURGE_KEY, '1');

    expect(storageService.getTrips()[0].travelers[0].role).toBe('viewer');
  });
});
