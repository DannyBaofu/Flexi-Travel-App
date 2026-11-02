import React, { useState } from 'react';
import { TrainFront, ChevronDown, Users } from 'lucide-react';
import type { TrainJourney, TrainLeg, Trip } from '../types/travel';
import { useI18n } from '../utils/i18n';
import { journeyDate, formatLegDate, travelPhase } from '../services/flights';
import { hasTrainInfo } from '../services/trains';
import { card, money } from './ui';

interface TrainCardProps {
  trip: Trip;
}

interface JourneyBlock {
  key: 'outbound' | 'inbound';
  labelKey: string;
  journey: TrainJourney;
}

const cellHead = 'font-medium pb-1';
const cellTime = `py-2 text-right text-ink ${money}`;

/**
 * The trains out and back, under the flights on the schedule tab, and built
 * the same way: read by everyone, written by the organiser in Trip Settings,
 * collapsed mid-trip.
 *
 * Two deliberate differences from `FlightCard`. A change of trains names the
 * station but not the wait, because the two tickets may not share a clock
 * (see `services/trains.ts`). And an empty schedule renders nothing for
 * anybody, the organiser included: most trips have no train, and a second
 * dashed "add" prompt under the flights' one would be noise on every one of
 * them. The trains section sits right under the flights in Trip Settings.
 */
export const TrainCard: React.FC<TrainCardProps> = ({ trip }) => {
  const { lang, t } = useI18n();
  const locale = lang === 'zh' ? 'zh-CN' : 'en-US';
  const phase = travelPhase(trip.startDate, trip.days.length);
  const [open, setOpen] = useState(phase !== 'middle');

  const trains = trip.trains;
  if (!trains || !hasTrainInfo(trains)) return null;

  const both: JourneyBlock[] = [
    { key: 'outbound', labelKey: 'trainsOutbound', journey: trains.outbound },
    { key: 'inbound', labelKey: 'trainsInbound', journey: trains.inbound }
  ];
  const journeys = both.filter(j => j.journey.legs.length > 0 || !!j.journey.note?.trim());

  /** Where this train meets the next one, or nothing when there is no next. */
  const renderChange = (leg: TrainLeg, next: TrainLeg | undefined) => {
    if (!next) return null;
    const at = leg.to || next.from;
    if (!at) return null;
    return (
      <tr>
        <td colSpan={4} className="pb-1.5 pl-2 text-[11px] text-faint italic">
          {t('trainsChange', { at })}
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
                  <th scope="col" className={`${cellHead} text-left pr-2`}>{t('trainsColTrain')}</th>
                  <th scope="col" className={`${cellHead} text-left pr-2`}>{t('trainsColRoute')}</th>
                  <th scope="col" className={`${cellHead} text-right pr-2`}>{t('trainsColDepart')}</th>
                  <th scope="col" className={`${cellHead} text-right`}>{t('trainsColArrive')}</th>
                </tr>
              </thead>
              <tbody>
                {legs.map((leg, idx) => (
                  <React.Fragment key={leg.id}>
                    <tr className="border-t border-hairline align-middle">
                      <td className="pr-2 py-2">
                        {/* Nothing to tap here: a train number has no
                            status lookup worth linking to, unlike a flight's. */}
                        <span className={`font-semibold ${leg.trainNo ? 'text-ink' : 'text-faint'}`}>
                          {leg.trainNo || '—'}
                        </span>
                        {/* A connection that leaves on a different day than
                            the journey started says so under its number. */}
                        {!!leg.date && leg.date !== date && (
                          <div className="text-[11px] text-faint">
                            {formatLegDate(leg.date, locale)}
                          </div>
                        )}
                      </td>
                      <td className="pr-2 py-2 text-ink">
                        {leg.from}
                        {leg.from && leg.to && <span className="text-faint"> → </span>}
                        {leg.to}
                      </td>
                      <td className={`${cellTime} pr-2`}>{leg.departTime || '—'}</td>
                      <td className={cellTime}>{leg.arriveTime || '—'}</td>
                    </tr>
                    {renderChange(leg, legs[idx + 1])}
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
        title={open ? t('trainsHide') : t('trainsShow')}
        className="w-full min-h-11 flex items-center gap-3 px-4 py-3 text-left hover:bg-mist transition"
      >
        <span className="w-9 h-9 rounded-control bg-brand-tint text-brand flex items-center justify-center shrink-0">
          <TrainFront className="w-4.5 h-4.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink">{t('trainsTitle')}</span>
          {trains.operator && (
            <span className="block text-xs text-muted truncate">{trains.operator}</span>
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
        </div>
      )}
    </div>
  );
};
