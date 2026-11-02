import type { TrainJourney, TrainLeg, TripTrains } from '../types/travel';

/**
 * The train schedule: the flights' twin, out and back, written in Trip
 * Settings and read off a card on the schedule tab.
 *
 * It does even less arithmetic than the flights do. A flight connection is
 * one airport and one clock, so the wait there is safe to work out; a train
 * connection need not be. The likeliest train journey for this group changes
 * at Padang Besar, where the KTM ticket is in Malaysian time and the SRT
 * ticket in Thai time, an hour apart — so subtracting the two would show an
 * hour that is not there, or hide one that is. The card names the station and
 * leaves the clock to the tickets.
 */

export const emptyTrains = (): TripTrains => ({
  outbound: { legs: [] },
  inbound: { legs: [] }
});

export const newTrainLeg = (date: string): TrainLeg => ({
  id: `train-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  trainNo: '',
  from: '',
  to: '',
  date,
  departTime: '',
  arriveTime: ''
});

/** Anything worth showing: a train in either direction, or a meeting note. */
export function hasTrainInfo(trains: TripTrains | undefined): boolean {
  if (!trains) return false;
  return [trains.outbound, trains.inbound].some(
    j => (j?.legs?.length ?? 0) > 0 || !!j?.note?.trim()
  );
}

const isBlankLeg = (leg: TrainLeg) =>
  !leg.trainNo.trim() && !leg.from.trim() && !leg.to.trim();

function tidyJourney(journey: TrainJourney): TrainJourney {
  const legs = journey.legs
    .filter(leg => !isBlankLeg(leg))
    .map(leg => ({
      ...leg,
      // Kept as typed, unlike a flight number: "Special Express 45" in
      // capitals would be shouting.
      trainNo: leg.trainNo.trim(),
      from: leg.from.trim(),
      to: leg.to.trim()
    }));
  const note = journey.note?.trim();
  return note ? { legs, note } : { legs };
}

/**
 * What gets saved: whitespace off every field, and a train the organiser
 * added and then never filled in is dropped rather than shown as an empty row.
 */
export function tidyTrains(trains: TripTrains): TripTrains {
  const operator = trains.operator?.trim();
  const tidy: TripTrains = {
    outbound: tidyJourney(trains.outbound),
    inbound: tidyJourney(trains.inbound)
  };
  return operator ? { operator, ...tidy } : tidy;
}
