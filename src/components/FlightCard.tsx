import React, { useState } from 'react';
import { Plane, ChevronDown, ExternalLink, Users } from 'lucide-react';
import type { FlightJourney, FlightLeg, Trip, TripRole } from '../types/travel';
import { useI18n } from '../utils/i18n';
import {
  hasFlightInfo,
  layoverMinutes,
  splitMinutes,
  journeyDate,
  formatLegDate,
  flightLookupUrl
} from '../services/flights';
import { parseLocalDate } from '../services/tripDays';
import { card, btnSecondarySm, money } from './ui';

interface FlightCardProps {
  trip: Trip;
  role: TripRole;
  onOpenSettings: () => void;
}

/**
 * Where the trip stands against today: before it, on its first or last day,
 * somewhere in the middle, or after. Flights matter at the ends.
 */
type TripPhase = 'before' | 'edge' | 'middle' | 'after';

const tripPhase = (startDate: string, dayCount: number): TripPhase => {
  const start = parseLocalDate(startDate);
  if (!start) return 'before';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const offset = Math.round((today.getTime() - start.getTime()) / 86400000);
  if (offset < 0) return 'before';
  if (offset >= dayCount) return 'after';
  return offset === 0 || offset === dayCount - 1 ? 'edge' : 'middle';
};

interface JourneyBlock {
  key: 'outbound' | 'inbound';
  labelKey: string;
  journey: FlightJourney;
}

const cellHead = 'font-medium pb-1';
const cellTime = `py-0.5 text-right text-ink ${money}`;

/**
 * The flights out and back, above the day strip on the schedule tab.
 *
 * Read by everyone, written by the organiser in Trip Settings — so a viewer
 * sees exactly what a member sees, and only an admin is ever offered a way to
 * add them. Mid-trip the card starts collapsed: on day three of six the plan
 * for today is what you opened the app for, and the flight home is a tap away.
 */
export const FlightCard: React.FC<FlightCardProps> = ({ trip, role, onOpenSettings }) => {
  const { lang, t } = useI18n();
  const locale = lang === 'zh' ? 'zh-CN' : 'en-US';
  const phase = tripPhase(trip.startDate, trip.days.length);
  const [open, setOpen] = useState(phase !== 'middle');

  const flights = trip.flights;

  if (!flights || !hasFlightInfo(flights)) {
    // Nothing to show. The organiser gets a way in while there is still a
    // trip to plan for; once it has started, an empty slot is just noise.
    if (role === 'admin' && phase === 'before') {
      return (
        <button
          type="button"
          onClick={onOpenSettings}
          className={`${btnSecondarySm} w-full border-dashed text-muted`}
        >
          <Plane className="w-3.5 h-3.5" /> {t('flightsAddPrompt')}
        </button>
      );
    }
    return null;
  }

  const formatDuration = (minutes: number) => {
    const { h, m } = splitMinutes(minutes);
    if (h > 0 && m > 0) return t('durHM', { h, m });
    if (h > 0) return t('durH', { h });
    return t('durM', { m });
  };

  const both: JourneyBlock[] = [
    { key: 'outbound', labelKey: 'flightsOutbound', journey: flights.outbound },
    { key: 'inbound', labelKey: 'flightsInbound', journey: flights.inbound }
  ];
  const journeys = both.filter(j => j.journey.legs.length > 0 || !!j.journey.note?.trim());

  const anyFlightNo = journeys.some(j => j.journey.legs.some(leg => leg.flightNo));

  /** The wait between this leg and the next, or nothing when there is no next. */
  const renderLayover = (leg: FlightLeg, next: FlightLeg | undefined) => {
    if (!next) return null;
    const wait = layoverMinutes(leg, next);
    const at = leg.to || next.from;
    if (wait === null && !at) return null;
    return (
      <tr>
        <td colSpan={4} className="pb-1.5 pl-2 text-[11px] text-faint italic">
          {wait !== null
            ? t('flightsLayover', { at, dur: formatDuration(wait) })
            : t('flightsLayoverNoTime', { at })}
        </td>
      </tr>
    );
  };

  const renderJourney = ({ key, labelKey, journey }: JourneyBlock) => {
    const date = journeyDate(journey);
    const legs = journey.legs;

    return (
      <section key={key} className="min-w-0">
        <h3 className="text-[11px] font-semibold text-faint uppercase tracking-wider flex flex-wrap items-baseline gap-x-1.5">
          <span>{t(labelKey)}</span>
          {date && (
            <span className="text-muted normal-case tracking-normal font-medium">
              · {formatLegDate(date, locale)}
            </span>
          )}
        </h3>

        {journey.note && (
          <p className="mt-2 flex items-start gap-1.5 text-xs text-ink bg-brand-tint rounded-control px-3 py-2 leading-relaxed">
            <Users className="w-3.5 h-3.5 shrink-0 mt-0.5 text-brand" />
            <span className="min-w-0">{journey.note}</span>
          </p>
        )}

        {legs.length > 0 && (
          // Cells wrap, so this only ever scrolls for a single unbreakable
          // word wider than a phone — a safety net, not the layout.
          <div className="overflow-x-auto">
            <table className="w-full mt-2 text-sm">
              <thead>
                <tr className="text-[11px] text-faint">
                  <th scope="col" className={`${cellHead} text-left pr-2`}>{t('flightsColFlight')}</th>
                  <th scope="col" className={`${cellHead} text-left pr-2`}>{t('flightsColRoute')}</th>
                  <th scope="col" className={`${cellHead} text-right pr-2`}>{t('flightsColDepart')}</th>
                  <th scope="col" className={`${cellHead} text-right`}>{t('flightsColArrive')}</th>
                </tr>
              </thead>
              <tbody>
                {legs.map((leg, idx) => (
                  <React.Fragment key={leg.id}>
                    <tr className="border-t border-hairline align-middle">
                      <td className="pr-2 py-0.5">
                        {leg.flightNo ? (
                          // The link is the tap target, so it carries the
                          // 44px floor; the row just wraps it.
                          <a
                            href={flightLookupUrl(leg.flightNo)}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={t('flightsLookup', { no: leg.flightNo })}
                            className="inline-flex items-center gap-1 min-h-11 font-semibold text-brand hover:underline whitespace-nowrap"
                          >
                            {leg.flightNo}
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="inline-flex items-center min-h-11 text-faint">—</span>
                        )}
                        {/* A connection that leaves on a different day than
                            the journey started says so under its number. */}
                        {!!leg.date && leg.date !== date && (
                          <div className="text-[11px] text-faint pb-1.5">
                            {formatLegDate(leg.date, locale)}
                          </div>
                        )}
                      </td>
                      <td className="pr-2 py-0.5 text-ink">
                        {leg.from}
                        {leg.from && leg.to && <span className="text-faint"> → </span>}
                        {leg.to}
                      </td>
                      <td className={`${cellTime} pr-2`}>{leg.departTime || '—'}</td>
                      <td className={cellTime}>{leg.arriveTime || '—'}</td>
                    </tr>
                    {renderLayover(leg, legs[idx + 1])}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  };

  return (
    <div className={`${card} overflow-hidden`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        title={open ? t('flightsHide') : t('flightsShow')}
        className="w-full min-h-11 flex items-center gap-3 px-4 py-3 text-left hover:bg-mist transition"
      >
        <span className="w-9 h-9 rounded-control bg-brand-tint text-brand flex items-center justify-center shrink-0">
          <Plane className="w-4.5 h-4.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink">{t('flightsTitle')}</span>
          {flights.airline && (
            <span className="block text-xs text-muted truncate">{flights.airline}</span>
          )}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-faint shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="px-4 pb-4 sm:px-5 sm:pb-5 border-t border-hairline">
          <div className={`pt-4 grid gap-5 ${journeys.length > 1 ? 'sm:grid-cols-2' : ''}`}>
            {journeys.map(renderJourney)}
          </div>
          {anyFlightNo && (
            <p className="text-[11px] text-faint mt-3">{t('flightsLookupHint')}</p>
          )}
        </div>
      )}
    </div>
  );
};
