import { describe, it, expect } from 'vitest';
import { orderedTrips, preferredTripId, tripStatus } from './tripOrder';
import type { Trip } from '../types/travel';

// Every test reads "today" as the 15th of September 2026, so the dates below
// can be read against it without arithmetic.
const TODAY = new Date(2026, 8, 15);

const trip = (id: string, startDate: string, endDate: string): Trip =>
  ({
    id,
    title: id,
    destination: 'Bangkok',
    country: 'Thailand',
    startDate,
    endDate,
    coverImage: '',
    currency: 'THB',
    homeCurrency: 'MYR',
    exchangeRate: 10,
    travelers: [],
    days: [],
    expenses: [],
    createdAt: '',
    updatedAt: ''
  }) as Trip;

const ids = (trips: Trip[]) => orderedTrips(trips, TODAY).map(entry => entry.trip.id);

describe('tripStatus', () => {
  it('calls a trip live from its first day to its last, inclusive', () => {
    expect(tripStatus(trip('t', '2026-09-15', '2026-09-20'), TODAY).phase).toBe('live');
    expect(tripStatus(trip('t', '2026-09-10', '2026-09-15'), TODAY).phase).toBe('live');
    expect(tripStatus(trip('t', '2026-09-10', '2026-09-20'), TODAY).phase).toBe('live');
  });

  it('calls a trip past only once its last day is behind us', () => {
    expect(tripStatus(trip('t', '2026-09-01', '2026-09-14'), TODAY).phase).toBe('past');
  });

  it('counts the days to a trip still ahead', () => {
    const status = tripStatus(trip('t', '2026-09-27', '2026-10-02'), TODAY);
    expect(status).toEqual({ phase: 'upcoming', daysUntil: 12 });
  });

  it('reports a single day for tomorrow, so the caller can say "tomorrow"', () => {
    expect(tripStatus(trip('t', '2026-09-16', '2026-09-18'), TODAY).daysUntil).toBe(1);
  });

  // A mistyped date must not fold the trip away behind the past disclosure.
  it('treats an unreadable start date as still ahead', () => {
    expect(tripStatus(trip('t', 'not-a-date', 'nor-this'), TODAY).phase).toBe('upcoming');
  });

  // The phase is a calendar-day question, not an hours-from-now one.
  it('is still live late on the last evening', () => {
    const lateOnTheLastDay = new Date(2026, 8, 15, 23, 45);
    expect(tripStatus(trip('t', '2026-09-12', '2026-09-15'), lateOnTheLastDay).phase).toBe('live');
  });
});

describe('orderedTrips', () => {
  it('puts the live trip first, whatever order it was stored in', () => {
    const trips = [
      trip('past', '2026-08-01', '2026-08-05'),
      trip('soon', '2026-09-20', '2026-09-25'),
      trip('live', '2026-09-14', '2026-09-18')
    ];
    expect(ids(trips)[0]).toBe('live');
  });

  it('orders trips still ahead by the one starting soonest', () => {
    const trips = [
      trip('december', '2026-12-01', '2026-12-05'),
      trip('october', '2026-10-01', '2026-10-05'),
      trip('november', '2026-11-01', '2026-11-05')
    ];
    expect(ids(trips)).toEqual(['october', 'november', 'december']);
  });

  it('orders finished trips by the one that finished last', () => {
    const trips = [
      trip('january', '2026-01-01', '2026-01-05'),
      trip('august', '2026-08-01', '2026-08-05'),
      trip('april', '2026-04-01', '2026-04-05')
    ];
    expect(ids(trips)).toEqual(['august', 'april', 'january']);
  });

  it('groups by phase before date, so no finished trip outranks one ahead', () => {
    const trips = [
      trip('past', '2026-09-01', '2026-09-10'),
      trip('ahead', '2027-06-01', '2027-06-10')
    ];
    expect(ids(trips)).toEqual(['ahead', 'past']);
  });

  it('leaves the array it was handed alone', () => {
    const trips = [trip('b', '2026-11-01', '2026-11-05'), trip('a', '2026-10-01', '2026-10-05')];
    orderedTrips(trips, TODAY);
    expect(trips.map(t => t.id)).toEqual(['b', 'a']);
  });

  it('has nothing to say about no trips', () => {
    expect(orderedTrips([], TODAY)).toEqual([]);
  });
});

describe('preferredTripId', () => {
  const live = trip('live', '2026-09-14', '2026-09-18');
  const ahead = trip('ahead', '2026-11-01', '2026-11-05');
  const over = trip('over', '2026-05-01', '2026-05-06');

  it('keeps the trip this browser last had open', () => {
    expect(preferredTripId([live, ahead, over], 'ahead', TODAY)).toBe('ahead');
  });

  // The reason this function exists: storage used to restore whatever was
  // last active, so opening the app months later greeted you with an
  // itinerary that had already happened.
  it('hands a finished trip over to the live one', () => {
    expect(preferredTripId([live, ahead, over], 'over', TODAY)).toBe('live');
  });

  it('stays on a finished trip when every trip is finished', () => {
    const older = trip('older', '2026-01-01', '2026-01-05');
    expect(preferredTripId([over, older], 'older', TODAY)).toBe('older');
  });

  it('falls back to the trip most worth opening when there is no last choice', () => {
    expect(preferredTripId([over, ahead, live], null, TODAY)).toBe('live');
    expect(preferredTripId([over, ahead], null, TODAY)).toBe('ahead');
  });

  it('ignores a last choice that is no longer on this device', () => {
    expect(preferredTripId([live, ahead], 'deleted-trip', TODAY)).toBe('live');
  });

  it('answers with nothing when there are no trips', () => {
    expect(preferredTripId([], 'anything', TODAY)).toBe('');
  });
});
