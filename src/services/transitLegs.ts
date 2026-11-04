import type { ActivityItem, DaySchedule, TransportMode, Trip } from '../types/travel';

/** The hops that are a train or a boat — what the routes card is about. */
const RAIL_AND_BOAT: ReadonlySet<TransportMode> = new Set<TransportMode>([
  'bts',
  'mrt',
  'boat',
  'train',
  'airportRail'
]);

/**
 * A rail line or a river boat named in a hop note. This is how an
 * alternative shows up: a hop the group plans to Grab, whose note goes on
 * "或坐 BTS…" / "or by boat…", still has a train or boat route worth listing.
 *
 * Names only — station systems, lines and the boat services — never a bare
 * 码头 or "pier", because "walk to the pier" for a longtail ride is not a route.
 */
const TRANSIT_MENTION =
  /\b(?:BTS|MRT|SRT|ARL|Skytrain|Airport Rail Link|ferry|express boat)\b|\b(?:orange|blue|yellow)-flag\b|\b(?:Gold|Red|Purple|Blue|Yellow|Pink) Line\b|渡船|[橙蓝黄]旗船|坐船|地铁|轻轨|捷运/i;

export function mentionsTransit(text: string | undefined): boolean {
  return !!text && TRANSIT_MENTION.test(text);
}

export interface TransitLeg {
  from: ActivityItem;
  to: ActivityItem;
  /**
   * The hop itself goes another way (a Grab, a walk) and only its note offers
   * the train or boat. Shown as an option, never as the plan.
   */
  isOption: boolean;
}

export interface TransitDay {
  day: DaySchedule;
  legs: TransitLeg[];
}

/**
 * Every train and boat leg in the schedule, day by day, in the order the day
 * runs. Read straight off each activity's hop to the next one, so it can never
 * disagree with the plan: move an activity and its leg moves with it.
 *
 * Days with no such leg are left out, and a trip with none returns nothing —
 * which is what keeps the card off trips that have no trains at all.
 */
export function transitLegs(trip: Trip): TransitDay[] {
  return trip.days
    .map(day => {
      const activities = day.activities ?? [];
      const legs: TransitLeg[] = [];
      activities.forEach((from, idx) => {
        const to = activities[idx + 1];
        const hop = from.transportToNext;
        // The last activity of a day has nowhere to go
        if (!to || !hop) return;
        if (RAIL_AND_BOAT.has(hop.mode)) {
          legs.push({ from, to, isOption: false });
        } else if ([hop.note, hop.noteZh, from.translationEn?.transportNote].some(mentionsTransit)) {
          legs.push({ from, to, isOption: true });
        }
      });
      return { day, legs };
    })
    .filter(d => d.legs.length > 0);
}

export function countLegs(days: TransitDay[]): number {
  return days.reduce((n, d) => n + d.legs.length, 0);
}
