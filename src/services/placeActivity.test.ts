import { describe, it, expect } from 'vitest';
import { placeActivity } from './placeActivity';
import type { ActivityItem, DaySchedule } from '../types/travel';

const act = (id: string, over: Partial<ActivityItem> = {}): ActivityItem => ({
  id,
  time: '10:00',
  title: id,
  category: 'food',
  locationName: '',
  ...over
});

const day = (id: string, activities: ActivityItem[]): DaySchedule => ({
  id,
  dayNumber: 1,
  dateString: '2026-11-05',
  dayOfWeek: 'Thursday',
  title: '',
  activities
});

const ids = (days: DaySchedule[]) => days.map(d => d.activities.map(a => a.id));

describe('placeActivity', () => {
  it('adds a new activity to the end of its day', () => {
    const days = [day('d1', [act('a')]), day('d2', [])];
    expect(ids(placeActivity(days, 'd1', act('b')))).toEqual([['a', 'b'], []]);
  });

  it('replaces an edited activity where it is', () => {
    const days = [day('d1', [act('a'), act('b'), act('c')])];
    const out = placeActivity(days, 'd1', act('b', { title: 'edited' }));
    expect(ids(out)).toEqual([['a', 'b', 'c']]);
    expect(out[0].activities[1].title).toBe('edited');
  });

  it('moves an activity to another day instead of copying it', () => {
    const days = [day('d1', [act('a'), act('b')]), day('d2', [act('c')])];
    expect(ids(placeActivity(days, 'd2', act('a')))).toEqual([['b'], ['c', 'a']]);
  });

  it('drops the hop to the next stop when an activity changes day', () => {
    const hopper = act('a', {
      transportToNext: { mode: 'walk', durationMin: 5, note: '走过去' },
      translationEn: { title: 'A', transportNote: 'Walk over' }
    });
    const days = [day('d1', [hopper]), day('d2', [])];
    const moved = placeActivity(days, 'd2', hopper)[1].activities[0];
    expect(moved.transportToNext).toBeUndefined();
    expect(moved.translationEn).toEqual({ title: 'A', transportNote: undefined });
  });

  it('keeps the hop when the activity stays on its day', () => {
    const hopper = act('a', { transportToNext: { mode: 'walk', durationMin: 5 } });
    const out = placeActivity([day('d1', [hopper])], 'd1', hopper);
    expect(out[0].activities[0].transportToNext).toEqual({ mode: 'walk', durationMin: 5 });
  });
});
