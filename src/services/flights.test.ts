import { describe, it, expect } from 'vitest';
import {
  emptyFlights,
  hasFlightInfo,
  tidyFlights,
  layoverMinutes,
  splitMinutes,
  journeyDate,
  flightLookupUrl
} from './flights';
import type { FlightLeg } from '../types/travel';

const leg = (over: Partial<FlightLeg> = {}): FlightLeg => ({
  id: 'leg-1',
  flightNo: 'SQ 131',
  from: 'PEN',
  to: 'SIN',
  date: '2026-11-17',
  departTime: '10:15',
  arriveTime: '11:45',
  ...over
});

describe('hasFlightInfo', () => {
  it('is false for nothing, and for the empty shape a backfilled trip carries', () => {
    expect(hasFlightInfo(undefined)).toBe(false);
    expect(hasFlightInfo(emptyFlights())).toBe(false);
  });

  it('is true for a leg in either direction', () => {
    expect(hasFlightInfo({ outbound: { legs: [leg()] }, inbound: { legs: [] } })).toBe(true);
    expect(hasFlightInfo({ outbound: { legs: [] }, inbound: { legs: [leg()] } })).toBe(true);
  });

  it('counts a meeting note on its own — "07:00 at the counter" is worth showing without a flight number', () => {
    expect(
      hasFlightInfo({ outbound: { legs: [], note: 'Gather by 07:00' }, inbound: { legs: [] } })
    ).toBe(true);
  });

  it('ignores an airline name with nothing under it', () => {
    expect(hasFlightInfo({ ...emptyFlights(), airline: 'Singapore Airlines' })).toBe(false);
  });
});

describe('tidyFlights', () => {
  it('drops a leg that was added and never filled in', () => {
    const tidy = tidyFlights({
      outbound: { legs: [leg(), leg({ id: 'leg-2', flightNo: '', from: '', to: '', departTime: '', arriveTime: '' })] },
      inbound: { legs: [] }
    });
    expect(tidy.outbound.legs.map(l => l.id)).toEqual(['leg-1']);
  });

  it('keeps a half-typed leg — a flight number with no times is still information', () => {
    const tidy = tidyFlights({
      outbound: { legs: [leg({ departTime: '', arriveTime: '', from: '', to: '' })] },
      inbound: { legs: [] }
    });
    expect(tidy.outbound.legs).toHaveLength(1);
  });

  it('trims every text field and leaves out empty notes and airline', () => {
    const tidy = tidyFlights({
      airline: '   ',
      outbound: { legs: [leg({ flightNo: ' sq 131 ', from: ' PEN', to: 'Tokyo ' })], note: '  ' },
      inbound: { legs: [], note: ' Lobby at 15:00 ' }
    });
    expect(tidy.airline).toBeUndefined();
    // The number is capitalised to match what the form showed; a place name is left alone
    expect(tidy.outbound.legs[0]).toMatchObject({ flightNo: 'SQ 131', from: 'PEN', to: 'Tokyo' });
    expect(tidy.outbound.note).toBeUndefined();
    expect(tidy.inbound.note).toBe('Lobby at 15:00');
  });
});

describe('layoverMinutes', () => {
  it('is the wait between landing and the next take-off on the same day', () => {
    const next = leg({ id: 'leg-2', flightNo: 'SQ 634', from: 'SIN', to: 'HND', departTime: '13:55', arriveTime: '21:55' });
    expect(layoverMinutes(leg({ arriveTime: '13:00' }), next)).toBe(55);
  });

  it('crosses midnight when the next leg is dated the following day', () => {
    const late = leg({ arriveTime: '23:30' });
    const early = leg({ id: 'leg-2', date: '2026-11-18', departTime: '01:15' });
    expect(layoverMinutes(late, early)).toBe(105);
  });

  it('is null when a time is missing or the next flight leaves before this one lands', () => {
    expect(layoverMinutes(leg({ arriveTime: '' }), leg({ departTime: '13:55' }))).toBeNull();
    expect(layoverMinutes(leg({ arriveTime: '13:00' }), leg({ departTime: '12:00' }))).toBeNull();
  });

  it('rejects clocks that are not clocks', () => {
    expect(layoverMinutes(leg({ arriveTime: '25:00' }), leg({ departTime: '13:55' }))).toBeNull();
    expect(layoverMinutes(leg({ arriveTime: 'noon' }), leg({ departTime: '13:55' }))).toBeNull();
  });
});

describe('splitMinutes', () => {
  it('splits into whole hours and leftover minutes', () => {
    expect(splitMinutes(55)).toEqual({ h: 0, m: 55 });
    expect(splitMinutes(135)).toEqual({ h: 2, m: 15 });
    expect(splitMinutes(120)).toEqual({ h: 2, m: 0 });
  });
});

describe('journeyDate', () => {
  it('reads the first dated leg', () => {
    expect(journeyDate({ legs: [leg({ date: '' }), leg({ id: 'leg-2', date: '2026-11-18' })] })).toBe('2026-11-18');
    expect(journeyDate({ legs: [] })).toBeUndefined();
  });
});

describe('flightLookupUrl', () => {
  it('searches the flight number and nothing else', () => {
    expect(flightLookupUrl(' SQ 131 ')).toBe('https://www.google.com/search?q=SQ%20131%20flight');
  });
});
