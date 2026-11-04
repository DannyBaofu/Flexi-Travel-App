import React, { useState } from 'react';
import { Route, ChevronDown, ExternalLink, Lock } from 'lucide-react';
import type { Trip, TripRole } from '../types/travel';
import { useI18n, translateWeekday } from '../utils/i18n';
import { transitLegs, countLegs } from '../services/transitLegs';
import type { TransitLeg } from '../services/transitLegs';
import { activityText } from '../services/activityText';
import { travelTimeLabel } from '../services/travelTime';
import { directionsUrl } from '../services/geo';
import { transportModeMeta, directionsLink } from './transportModes';
import { card, chipPlain } from './ui';

interface TransitRoutesCardProps {
  trip: Trip;
  role: TripRole;
}

/**
 * Every train and boat leg in the plan on one sheet, for the organiser only:
 * from where, to where, how long, and the route note — so "which way are we
 * going to Chatuchak" has an answer without opening six days one by one.
 *
 * Nothing is stored for it. The legs are read off each activity's hop to the
 * next (`services/transitLegs.ts`), so the card cannot drift from the days
 * below it, and a trip with no train or boat leg shows nothing at all.
 *
 * A member and a viewer see nothing: the travellers already read each leg in
 * its own day, and the sheet is the organiser's overview, not a second copy
 * of the plan for everybody. Collapsed by default for the same reason — it is
 * a reference, and the day is what the schedule tab opens for.
 */
export const TransitRoutesCard: React.FC<TransitRoutesCardProps> = ({ trip, role }) => {
  const { lang, t } = useI18n();
  const [open, setOpen] = useState(false);

  if (role !== 'admin') return null;
  const days = transitLegs(trip);
  if (days.length === 0) return null;
  const total = countLegs(days);

  const renderLeg = ({ from, to, isOption }: TransitLeg) => {
    const hop = from.transportToNext!;
    const meta = transportModeMeta[hop.mode];
    const ModeIcon = meta.icon;
    const note = activityText(from, lang).transportNote;
    // An option is a train or boat on a Grab hop, so its link asks Google for
    // transit rather than the driving route the hop's own mode would open.
    const url = directionsUrl(from, to, isOption ? undefined : hop.mode);

    return (
      <li key={from.id} className="flex items-start gap-2.5 py-2.5 border-t border-hairline first:border-t-0">
        <ModeIcon className="w-4 h-4 mt-0.5 text-muted shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-ink leading-snug">
            {activityText(from, lang).title}
            <span className="text-faint"> → </span>
            {activityText(to, lang).title}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
            <span className="font-medium">{t(meta.tKey)}</span>
            <span className="tabular-nums">{travelTimeLabel(hop.durationMin, t)}</span>
            {isOption && <span className={chipPlain}>{t('routesOption')}</span>}
          </div>
          {/* The whole note, not two clamped lines: the stations and the
              change are what this sheet is opened for */}
          {note && <p className="mt-1 text-xs text-muted leading-relaxed">{note}</p>}
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer" className={`${directionsLink} text-xs`}>
              <ExternalLink className="w-3 h-3" />
              <span>{t('directions')}</span>
            </a>
          )}
        </div>
      </li>
    );
  };

  return (
    <div className={`${card} overflow-hidden`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        title={open ? t('routesHide') : t('routesShow')}
        className="w-full min-h-11 flex items-center gap-3 px-4 py-3 text-left hover:bg-mist transition"
      >
        <span className="w-9 h-9 rounded-control bg-brand-tint text-brand flex items-center justify-center shrink-0">
          <Route className="w-4.5 h-4.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink">{t('routesTitle')}</span>
          <span className="flex items-center gap-1 text-xs text-muted">
            <Lock className="w-3 h-3 shrink-0" />
            <span className="truncate">
              {t('routesOnlyOrganiser')} · {total === 1 ? t('routesCountOne') : t('routesCount', { n: total })}
            </span>
          </span>
        </span>
        <ChevronDown
          className={`w-4 h-4 text-faint shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="px-4 pb-3 sm:px-5 border-t border-hairline">
          {days.map(({ day, legs }) => (
            <section key={day.id} className="pt-4">
              <h3 className="text-[11px] font-semibold text-faint uppercase tracking-wider">
                {t('dayN', { n: day.dayNumber })}
                {/* The weekday carries a date ("Sunday (Nov 8)") that
                    uppercase would turn into "NOV 8" */}
                <span className="normal-case tracking-normal font-medium text-muted">
                  {' · '}{translateWeekday(day.dayOfWeek, lang)}
                </span>
              </h3>
              <ul className="mt-1">{legs.map(renderLeg)}</ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};
