import { describe, it, expect } from 'vitest';
import { transitLegs, countLegs, mentionsTransit } from './transitLegs';
import type { ActivityItem, DaySchedule, Trip } from '../types/travel';

const act = (id: string, over: Partial<ActivityItem> = {}): ActivityItem => ({
  id,
  time: '09:00',
  title: id,
  category: 'sightseeing',
  locationName: id,
  cost: 0,
  currency: 'THB',
  ...over
});

const day = (id: string, n: number, activities: ActivityItem[]): DaySchedule => ({
  id,
  dayNumber: n,
  dateString: '',
  dayOfWeek: 'Monday',
  title: '',
  activities
});

const trip = (days: DaySchedule[]): Trip => ({ id: 'trip-1', days } as unknown as Trip);

describe('mentionsTransit', () => {
  it('spots a line, a station system or a river boat, in either language', () => {
    expect(mentionsTransit('或走到 BTS Saphan Taksin 坐 1 站')).toBe(true);
    expect(mentionsTransit('MRT Sanam Chai to Sam Yan')).toBe(true);
    expect(mentionsTransit('在 Sathorn 码头坐橙旗船')).toBe(true);
    expect(mentionsTransit('or the orange-flag boat from Sathorn')).toBe(true);
    expect(mentionsTransit('Gold Line, one stop')).toBe(true);
  });

  it('ignores a Grab, a bare pier and words that only contain the letters', () => {
    expect(mentionsTransit('21:00 叫 Grab 回住宿')).toBe(false);
    // Walking to the longtail pier is not a route
    expect(mentionsTransit('走到码头')).toBe(false);
    expect(mentionsTransit('Walk to the pier')).toBe(false);
    expect(mentionsTransit('SUBMRTX')).toBe(false);
    expect(mentionsTransit(undefined)).toBe(false);
  });
});

describe('transitLegs', () => {
  it('lists a train or boat hop as the plan, with where it starts and ends', () => {
    const from = act('chatuchak', { transportToNext: { mode: 'mrt', durationMin: 40, note: 'MRT to Sukhumvit' } });
    const [d] = transitLegs(trip([day('d1', 1, [from, act('ekkamai')])]));
    expect(d.legs).toHaveLength(1);
    expect(d.legs[0].from.id).toBe('chatuchak');
    expect(d.legs[0].to.id).toBe('ekkamai');
    expect(d.legs[0].isOption).toBe(false);
  });

  it('lists a Grab hop whose note offers a train as an option, not as the plan', () => {
    const grab = act('breakfast', {
      transportToNext: { mode: 'taxi', durationMin: 25, note: '08:00 叫 Grab；或坐 BTS 到 Saphan Taksin' }
    });
    const [d] = transitLegs(trip([day('d1', 1, [grab, act('palace')])]));
    expect(d.legs[0].isOption).toBe(true);
  });

  it('finds the option when only the English copy names the line', () => {
    const grab = act('dinner', {
      transportToNext: { mode: 'taxi', durationMin: 10, note: '叫车回去' },
      translationEn: { transportNote: 'Grab back, or BTS one stop' }
    });
    expect(transitLegs(trip([day('d1', 1, [grab, act('home')])]))[0].legs[0].isOption).toBe(true);
  });

  it('leaves out Grabs and walks that offer nothing else', () => {
    const plain = [
      act('a', { transportToNext: { mode: 'taxi', durationMin: 20, note: 'Grab 回住宿' } }),
      act('b', { transportToNext: { mode: 'walk', durationMin: 5, note: '走到码头' } }),
      act('c')
    ];
    expect(transitLegs(trip([day('d1', 1, plain)]))).toEqual([]);
  });

  it('skips a hop on the last activity, which has nowhere to go', () => {
    const last = act('last', { transportToNext: { mode: 'bts', durationMin: 10 } });
    expect(transitLegs(trip([day('d1', 1, [act('first'), last])]))).toEqual([]);
  });

  it('keeps day order, drops days with no leg, and counts every leg', () => {
    const rail = (id: string) => act(id, { transportToNext: { mode: 'bts', durationMin: 10 } });
    const days = transitLegs(
      trip([
        day('d1', 1, [rail('a'), act('b')]),
        day('d2', 2, [act('c'), act('d')]),
        day('d3', 3, [rail('e'), rail('f'), act('g')])
      ])
    );
    expect(days.map(d => d.day.id)).toEqual(['d1', 'd3']);
    expect(countLegs(days)).toBe(3);
  });
});
