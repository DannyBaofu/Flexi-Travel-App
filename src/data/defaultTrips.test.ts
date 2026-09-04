import { describe, it, expect } from 'vitest';
import { createNewTrip } from './defaultTrips';

describe('createNewTrip', () => {
  it('generates one day per calendar date, inclusive', () => {
    const trip = createNewTrip('Test', 'Penang', 'Malaysia', '2026-11-20', '2026-11-22', 'MYR');
    expect(trip.days).toHaveLength(3);
  });

  it('keeps the first day on the requested start date (no timezone shift)', () => {
    const trip = createNewTrip('Test', 'Penang', 'Malaysia', '2026-11-20', '2026-11-22', 'MYR');
    expect(trip.days[0].dateString).toBe('2026-11-20');
    expect(trip.days[2].dateString).toBe('2026-11-22');
  });

  it('labels weekdays correctly (2026-11-20 is a Friday)', () => {
    const trip = createNewTrip('Test', 'Penang', 'Malaysia', '2026-11-20', '2026-11-20', 'MYR');
    expect(trip.days[0].dayOfWeek).toContain('Friday');
  });

  it('crosses month boundaries with correct dates', () => {
    const trip = createNewTrip('Test', 'Tokyo', 'Japan', '2026-10-30', '2026-11-02', 'JPY');
    expect(trip.days.map(d => d.dateString)).toEqual([
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
      '2026-11-02'
    ]);
  });

  it('caps runaway ranges at 30 days', () => {
    const trip = createNewTrip('Test', 'Bali', 'Indonesia', '2026-01-01', '2026-12-31', 'IDR');
    expect(trip.days).toHaveLength(30);
  });

  it('falls back to 3 days on invalid dates', () => {
    const trip = createNewTrip('Test', 'X', 'Y', 'not-a-date', 'also-bad', 'USD');
    expect(trip.days).toHaveLength(3);
  });

  it('says the creator is the admin rather than leaving it to be inferred', () => {
    // A trip with no role on it is read as read-only, so creation has to state
    // one. Leaving the field off used to be how the app said 'mine', which
    // also meant anyone opening the app for the first time became an admin.
    const trip = createNewTrip('Test', 'Penang', 'Malaysia', '2026-11-20', '2026-11-22', 'MYR');
    expect(trip.myRole).toBe('admin');
  });
});
