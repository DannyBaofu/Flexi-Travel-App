import type { FlightJourney, FlightLeg, TripFlights } from '../types/travel';
import { parseLocalDate } from './tripDays';

/**
 * The flight schedule: what the organiser types into Trip Settings and what
 * the card on the itinerary tab reads back.
 *
 * Everything here is deliberately arithmetic-light. Times on a ticket are the
 * local clock at each airport, and without a timezone table there is no
 * honest way to turn "13:55 out of Singapore, 21:55 into Tokyo" into a flight
 * time — a naive subtraction would be an hour out, and a wrong number is
 * worse than none. The one duration that *can* be worked out is the wait
 * between two legs, where both clocks belong to the same airport.
 */

export const emptyFlights = (): TripFlights => ({
  outbound: { legs: [] },
  inbound: { legs: [] }
});

export const newFlightLeg = (date: string): FlightLeg => ({
  id: `leg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  flightNo: '',
  from: '',
  to: '',
  date,
  departTime: '',
  arriveTime: ''
});

/** Anything worth showing: a leg in either direction, or a meeting note. */
export function hasFlightInfo(flights: TripFlights | undefined): boolean {
  if (!flights) return false;
  return [flights.outbound, flights.inbound].some(
    j => (j?.legs?.length ?? 0) > 0 || !!j?.note?.trim()
  );
}

const isBlankLeg = (leg: FlightLeg) =>
  !leg.flightNo.trim() && !leg.from.trim() && !leg.to.trim();

function tidyJourney(journey: FlightJourney): FlightJourney {
  const legs = journey.legs
    .filter(leg => !isBlankLeg(leg))
    .map(leg => ({
      ...leg,
      // The form shows the number in capitals; saving it that way means the
      // card agrees with what the organiser saw. Places stay as typed —
      // "Penang" is not shouting.
      flightNo: leg.flightNo.trim().toUpperCase(),
      from: leg.from.trim(),
      to: leg.to.trim()
    }));
  const note = journey.note?.trim();
  return note ? { legs, note } : { legs };
}

/**
 * What gets saved: whitespace off every field, and a leg the organiser added
 * and then never filled in is dropped rather than rendered as an empty row.
 */
export function tidyFlights(flights: TripFlights): TripFlights {
  const airline = flights.airline?.trim();
  const tidy: TripFlights = {
    outbound: tidyJourney(flights.outbound),
    inbound: tidyJourney(flights.inbound)
  };
  return airline ? { airline, ...tidy } : tidy;
}

/** Minutes since local midnight, or null for anything that is not HH:MM. */
function parseClock(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

/** A leg's arrival or departure as a local timestamp, for same-place arithmetic. */
function legInstant(date: string, time: string): number | null {
  const day = parseLocalDate(date);
  const clock = parseClock(time);
  if (!day || clock === null) return null;
  return day.getTime() + clock * 60000;
}

/**
 * The wait between landing off one leg and taking off on the next, in
 * minutes. Both clocks are the connecting airport's own, so this one sum is
 * safe. Null when either time is missing or the next flight leaves before
 * this one lands — that is a mistyped date, and the card should show nothing
 * rather than a negative wait.
 */
export function layoverMinutes(arriving: FlightLeg, departing: FlightLeg): number | null {
  const lands = legInstant(arriving.date, arriving.arriveTime);
  const leaves = legInstant(departing.date, departing.departTime);
  if (lands === null || leaves === null) return null;
  const minutes = Math.round((leaves - lands) / 60000);
  return minutes > 0 ? minutes : null;
}

export const splitMinutes = (minutes: number): { h: number; m: number } => ({
  h: Math.floor(minutes / 60),
  m: minutes % 60
});

/** "11月17日周二" / "Tue, Nov 17" — the date as the card and the print view both show it. */
export function formatLegDate(iso: string, locale: string): string {
  const day = parseLocalDate(iso);
  if (!day) return iso;
  return day.toLocaleDateString(locale, { month: 'short', day: 'numeric', weekday: 'short' });
}

/** The first leg's date is the journey's date; a later leg on another day is the exception. */
export const journeyDate = (journey: FlightJourney): string | undefined =>
  journey.legs.find(leg => leg.date)?.date;

/**
 * Google's flight-status box answers "SQ 131" directly. Nothing about the
 * traveller goes into the query — only the flight number, which is public.
 */
export const flightLookupUrl = (flightNo: string): string =>
  `https://www.google.com/search?q=${encodeURIComponent(`${flightNo.trim()} flight`)}`;
