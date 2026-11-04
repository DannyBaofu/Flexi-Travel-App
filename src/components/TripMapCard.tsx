import React, { lazy, Suspense, useRef, useState } from 'react';
import { Map as MapIcon, ChevronDown } from 'lucide-react';
import type { Trip } from '../types/travel';
import { useI18n, translateWeekday } from '../utils/i18n';
import { tripStops } from '../services/geo';
import { activityText } from '../services/activityText';
import { dayTone } from './tripMapTones';
import { card, btnSecondarySm } from './ui';

// Leaflet only downloads when somebody opens the map
const TripMap = lazy(() => import('./TripMap'));

interface TripMapCardProps {
  trip: Trip;
}

/**
 * The whole trip on one map — "where are we going, all of it" — above the
 * day strip, for everyone on the trip.
 *
 * Nothing is stored for it: it reads the pins the days already carry, so it
 * cannot disagree with them, and a trip with no pinned stop shows nothing.
 * Collapsed by default, like the day maps, because the tiles are a download
 * and today's plan is what the schedule tab is opened for.
 *
 * Under the map, one row per day names that day's stops in order. Tapping a
 * row zooms the map to that day and fades the rest — on a trip that starts in
 * Penang and spends four days in Bangkok, the whole-trip view shows Bangkok
 * as one cluster, and the day rows are how you get inside it.
 */
export const TripMapCard: React.FC<TripMapCardProps> = ({ trip }) => {
  const { lang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [focusDayId, setFocusDayId] = useState<string | null>(null);
  const mapBox = useRef<HTMLDivElement>(null);

  // Stop names in the reader's language, for the list and the pin popups
  const days = tripStops(trip.days ?? [], a => ({ ...a, title: activityText(a, lang).title }));
  if (days.length === 0) return null;

  const stopCount = days.reduce((n, d) => n + d.stops.length, 0);
  const focusedDay = days.find(d => d.day.id === focusDayId)?.day;

  const focus = (dayId: string | null) => {
    setFocusDayId(dayId);
    // The rows sit under the map, so on a phone the map can be scrolled out
    // of sight by the time a lower day is tapped. Bring it back; `nearest`
    // leaves the page alone when the map is already in view. Optional, since
    // jsdom has no scrollIntoView and a missing scroll costs nothing.
    mapBox.current?.scrollIntoView?.({ block: 'nearest' });
  };

  return (
    <div className={`${card} overflow-hidden`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        title={open ? t('tripMapHide') : t('tripMapShow')}
        className="w-full min-h-11 flex items-center gap-3 px-4 py-3 text-left hover:bg-mist transition"
      >
        <span className="w-9 h-9 rounded-control bg-brand-tint text-brand flex items-center justify-center shrink-0">
          <MapIcon className="w-4.5 h-4.5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink">{t('tripMapTitle')}</span>
          <span className="block text-xs text-muted truncate">
            {t('tripMapSummary', { days: days.length, n: stopCount })}
          </span>
        </span>
        <ChevronDown
          className={`w-4 h-4 text-faint shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="px-4 pb-4 sm:px-5 pt-3 border-t border-hairline space-y-3">
          <div ref={mapBox}>
            <Suspense fallback={<div className="h-72 sm:h-96 rounded-control bg-mist animate-pulse" />}>
              <TripMap
                days={days}
                focusDayId={focusDayId}
                label={t('tripMapRegion')}
                dayLabel={n => t('dayN', { n })}
              />
            </Suspense>
          </div>

          {/* One fixed-height line under the map, so zooming in or out never
              moves the map the reader is looking at */}
          <div className="min-h-11 flex items-center justify-between gap-3">
            {focusedDay ? (
              <>
                <span className="text-xs font-semibold text-ink">{t('dayN', { n: focusedDay.dayNumber })}</span>
                <button type="button" onClick={() => focus(null)} className={btnSecondarySm}>
                  {t('tripMapShowAll')}
                </button>
              </>
            ) : (
              <span className="text-[11px] text-faint leading-relaxed">{t('tripMapPickDay')}</span>
            )}
          </div>

          <ol className="space-y-1.5">
            {days.map(({ day, stops }) => {
              const tone = dayTone(day.dayNumber);
              const focused = focusDayId === day.id;
              return (
                <li key={day.id}>
                  <button
                    type="button"
                    onClick={() => focus(focused ? null : day.id)}
                    aria-pressed={focused}
                    title={focused ? t('tripMapShowAll') : t('tripMapFocusDay')}
                    className={`w-full min-h-11 flex items-start gap-2.5 px-3 py-2.5 rounded-control border text-left transition ${
                      focused
                        ? 'bg-brand-tint border-brand-tint'
                        : 'bg-paper border-hairline hover:bg-mist'
                    }`}
                  >
                    {/* The same disc as the day's pins: number and tone */}
                    <span
                      className={`w-6 h-6 mt-px rounded-full ${tone.bg} text-white text-[11px] font-bold inline-flex items-center justify-center shrink-0`}
                      aria-hidden="true"
                    >
                      {day.dayNumber}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold text-ink">
                        {t('dayN', { n: day.dayNumber })}
                        <span className="font-medium text-muted"> · {translateWeekday(day.dayOfWeek, lang)}</span>
                      </span>
                      <span className="block text-xs text-muted leading-relaxed mt-0.5">
                        {stops.map((s, i) => (
                          <React.Fragment key={s.activity.id}>
                            {i > 0 && <span className="text-faint"> → </span>}
                            {s.activity.title}
                          </React.Fragment>
                        ))}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <p className="text-[11px] text-faint leading-relaxed">{t('tripMapPinHint')}</p>
        </div>
      )}
    </div>
  );
};
