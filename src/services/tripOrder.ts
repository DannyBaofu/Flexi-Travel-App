import type { Trip } from '../types/travel';
import { parseLocalDate } from './tripDays';

/**
 * What order a person's trips belong in, and which one the app should open on.
 *
 * A trip planner accumulates trips: the live one, the one being planned, and
 * every one already taken. Storage order is creation order, which answers none
 * of the questions anybody has — so the list is ordered by *when*, and the one
 * thing a traveller wants is always near the top.
 *
 * Pure, and here rather than in the switcher, because "which trip is current"
 * is also what decides what opens on launch. Two places asking that question
 * must not answer it two ways.
 */

export type TripPhase = 'live' | 'upcoming' | 'past';

export interface TripStatus {
  phase: TripPhase;
  /** Whole days from today to the start date. Only meaningful when upcoming. */
  daysUntil: number;
}

export interface TripWithStatus {
  trip: Trip;
  status: TripStatus;
}

const DAY_MS = 86400000;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/**
 * Whether a trip is running, still coming, or over — by the local calendar
 * day, the same way the itinerary decides which day is today.
 */
export function tripStatus(trip: Trip, now: Date = new Date()): TripStatus {
  const today = startOfDay(now);
  const start = parseLocalDate(trip.startDate);

  // A trip whose start date will not parse sorts with the ones still to come
  // rather than being declared finished. 'past' is the answer that folds it
  // away behind a disclosure, and a typo in a date should not hide a trip.
  if (!start) return { phase: 'upcoming', daysUntil: 0 };

  const daysUntil = Math.round((start.getTime() - today.getTime()) / DAY_MS);
  if (daysUntil > 0) return { phase: 'upcoming', daysUntil };

  const end = parseLocalDate(trip.endDate) ?? start;
  if (today.getTime() > end.getTime()) return { phase: 'past', daysUntil };
  return { phase: 'live', daysUntil: 0 };
}

const PHASE_ORDER: Record<TripPhase, number> = { live: 0, upcoming: 1, past: 2 };

/**
 * Every trip with its status, ordered so that row one is the trip most likely
 * to be wanted: what is happening now, then what is nearest, then what is most
 * recently over.
 *
 * ISO dates compare as strings in the same order they compare as dates, which
 * is the whole reason the trip stores them that way.
 */
export function orderedTrips(trips: Trip[], now: Date = new Date()): TripWithStatus[] {
  return trips
    .map(trip => ({ trip, status: tripStatus(trip, now) }))
    .sort((a, b) => {
      const byPhase = PHASE_ORDER[a.status.phase] - PHASE_ORDER[b.status.phase];
      if (byPhase !== 0) return byPhase;
      // Within a phase the near end is the useful one: of the trips still to
      // come, the one that starts soonest; of the finished ones, the one that
      // finished last.
      if (a.status.phase === 'past') {
        return (b.trip.endDate || '').localeCompare(a.trip.endDate || '');
      }
      return (a.trip.startDate || '').localeCompare(b.trip.startDate || '');
    });
}

/**
 * Which trip to open, given what this browser had open last.
 *
 * An explicit choice keeps its claim while it still matters. A finished trip
 * loses it — coming back in March to last November's itinerary is the wrong
 * greeting — but only when there is a live or upcoming trip to hand over to,
 * or "all my trips are over" would drag somebody off the one they were reading.
 */
export function preferredTripId(
  trips: Trip[],
  lastActiveId: string | null | undefined,
  now: Date = new Date()
): string {
  const ordered = orderedTrips(trips, now);
  if (ordered.length === 0) return '';

  const last = ordered.find(entry => entry.trip.id === lastActiveId);
  if (last) {
    const stillMatters = last.status.phase !== 'past';
    const hasSomethingAhead = ordered.some(entry => entry.status.phase !== 'past');
    if (stillMatters || !hasSomethingAhead) return last.trip.id;
  }

  return ordered[0].trip.id;
}
