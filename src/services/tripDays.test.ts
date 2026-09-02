import { describe, it, expect } from 'vitest';
import { reconcileDays, buildDays, countDays, parseLocalDate } from './tripDays';
import type { ActivityItem, DaySchedule } from '../types/travel';

const activity = (id: string): ActivityItem => ({
  id,
  time: '10:00',
  title: id,
  category: 'sightseeing',
  locationName: id
});

const day = (n: number, activities: ActivityItem[] = []): DaySchedule => ({
  id: `d${n}`,
  dayNumber: n,
  dateString: '2026-01-01',
  dayOfWeek: 'Old (Jan 1)',
  title: `Day ${n}`,
  activities
});

describe('parseLocalDate', () => {
  it('reads the date in local time, not UTC', () => {
    const d = parseLocalDate('2026-09-01')!;
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8);
    expect(d.getDate()).toBe(1); // would be Aug 31 west of Greenwich if parsed as UTC
  });

  it('rejects anything that is not a plain date', () => {
    expect(parseLocalDate('')).toBeNull();
    expect(parseLocalDate('not-a-date')).toBeNull();
  });
});

describe('countDays', () => {
  it('counts both ends of the range', () => {
    expect(countDays('2026-09-01', '2026-09-06')).toBe(6);
    expect(countDays('2026-09-01', '2026-09-01')).toBe(1);
  });

  it('caps absurd ranges from a mistyped year', () => {
    expect(countDays('2026-09-01', '2036-09-01')).toBe(30);
  });
});

describe('reconcileDays', () => {
  it('appends blank days when the trip is extended', () => {
    const { days } = reconcileDays([day(1), day(2)], '2026-09-01', '2026-09-04');
    expect(days).toHaveLength(4);
    expect(days[3].activities).toEqual([]);
  });

  it('drops trailing empty days when the trip is shortened', () => {
    const { days, keptWithActivities } = reconcileDays(
      [day(1), day(2), day(3)],
      '2026-09-01',
      '2026-09-02'
    );
    expect(days).toHaveLength(2);
    expect(keptWithActivities).toBe(0);
  });

  it('never silently deletes a day someone has planned', () => {
    const { days, keptWithActivities } = reconcileDays(
      [day(1), day(2), day(3, [activity('a1')])],
      '2026-09-01',
      '2026-09-01'
    );
    // Day 3 has an activity, so trimming stops there rather than throwing it away
    expect(days).toHaveLength(3);
    expect(keptWithActivities).toBe(2);
    expect(days[2].activities).toHaveLength(1);
  });

  it('re-dates and renumbers everything when the start date moves', () => {
    const { days } = reconcileDays([day(1), day(2)], '2026-09-10', '2026-09-11');
    expect(days[0].dateString).toBe('2026-09-10');
    expect(days[1].dateString).toBe('2026-09-11');
    expect(days.map(d => d.dayNumber)).toEqual([1, 2]);
    expect(days[0].dayOfWeek).toContain('Sep 10');
  });

  it('keeps the activities and titles already on a day', () => {
    const { days } = reconcileDays([day(1, [activity('keep')])], '2026-09-01', '2026-09-02');
    expect(days[0].activities.map(a => a.id)).toEqual(['keep']);
    expect(days[0].title).toBe('Day 1');
  });

  it('leaves days alone when the dates are unreadable', () => {
    const original = [day(1), day(2)];
    const { days } = reconcileDays(original, '', '');
    expect(days).toBe(original);
  });
});

describe('buildDays', () => {
  it('generates a dated, numbered run from the start date', () => {
    const days = buildDays('2026-09-01', '2026-09-03');
    expect(days).toHaveLength(3);
    expect(days.map(d => d.dateString)).toEqual(['2026-09-01', '2026-09-02', '2026-09-03']);
    expect(new Set(days.map(d => d.id)).size).toBe(3);
  });
});
