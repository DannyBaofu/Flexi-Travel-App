import React from 'react';
import type { Trip, TransportMode } from '../types/travel';
import { useI18n, translateWeekday } from '../utils/i18n';

const MODE_T_KEYS: Record<TransportMode, string> = {
  bts: 'mode_bts',
  mrt: 'mode_mrt',
  boat: 'mode_boat',
  taxi: 'mode_taxi',
  walk: 'mode_walk',
  bus: 'mode_bus',
  train: 'mode_train',
  airportRail: 'mode_airportRail'
};

interface PrintItineraryViewProps {
  trip: Trip;
}

/**
 * Paper layout. Now that the app itself is light, this view no longer has to
 * undo a dark theme — it only has to be denser and rule-lined, and to use
 * greys that a printer can actually resolve (the on-screen hairline is far
 * too pale for toner).
 */
const RULE = 'border-[#B9BECF]';

export const PrintItineraryView: React.FC<PrintItineraryViewProps> = ({ trip }) => {
  const { lang, t } = useI18n();
  const rate = trip.exchangeRate && trip.exchangeRate > 0 ? trip.exchangeRate : 1;

  return (
    <div className="hidden print:block bg-paper text-ink p-8 space-y-6">
      <header className={`border-b-2 ${RULE} pb-4 flex justify-between items-end gap-6`}>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{trip.title}</h1>
          <p className="text-sm text-muted mt-1">
            {trip.destination}, {trip.country} · {trip.startDate} – {trip.endDate}
          </p>
        </div>
        <div className="text-right text-xs text-muted shrink-0">
          <div>{t('printTravelers')}: {trip.travelers.map(tv => tv.name).join(', ')}</div>
          <div className="font-mono tabular-nums">
            {t('printCurrency')}: {trip.currency} (1 {trip.homeCurrency} = {rate} {trip.currency})
          </div>
        </div>
      </header>

      <div className="space-y-5">
        {trip.days.map((day) => {
          const dayCost = (day.activities || []).reduce((sum, a) => sum + (a.cost || 0), 0);

          return (
            <section key={day.id} className={`border ${RULE} rounded-lg p-4 break-inside-avoid`}>
              <div className={`flex justify-between items-baseline gap-4 border-b ${RULE} pb-2 mb-3`}>
                <h2 className="text-lg font-bold">
                  {t('dayN', { n: day.dayNumber })}: {translateWeekday(day.dayOfWeek, lang)}
                  {day.title ? ` – ${day.title}` : ''}
                </h2>
                <span className="text-xs font-semibold font-mono tabular-nums shrink-0">
                  {dayCost.toLocaleString()} {trip.currency}
                </span>
              </div>

              {day.summary && <p className="text-xs text-muted italic mb-3">{day.summary}</p>}

              <div className="space-y-2">
                {day.activities.map((act) => (
                  <div key={act.id} className={`text-xs flex gap-3 items-start border-l-2 ${RULE} pl-2.5`}>
                    <span className="font-mono tabular-nums font-bold w-16 shrink-0">{act.time}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">
                        {act.title}
                        {act.cost ? ` (${act.cost.toLocaleString()} ${trip.currency})` : ''}
                      </div>
                      {act.locationName && <div className="text-muted">{act.locationName}</div>}
                      {act.thaiAddress && (
                        <div className="thai-display font-medium">{act.thaiAddress}</div>
                      )}
                      {act.notes && <div className="text-muted mt-0.5">{act.notes}</div>}
                      {act.transportToNext && (
                        <div className="text-muted mt-0.5 font-medium">
                          → {t(MODE_T_KEYS[act.transportToNext.mode])} · {t('approxMinutes', { n: act.transportToNext.durationMin })}
                          {act.transportToNext.costHint ? ` · ${act.transportToNext.costHint}` : ''}
                          {' · '}{lang === 'zh' ? (act.transportToNext.noteZh || act.transportToNext.note) : act.transportToNext.note}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {trip.taxiCards && trip.taxiCards.length > 0 && (
        <section className={`border-t-2 ${RULE} pt-4 break-before-page`}>
          <h2 className="text-xl font-bold mb-3">{t('printTaxiCards')}</h2>
          <div className="grid grid-cols-2 gap-3">
            {trip.taxiCards.map((card) => (
              <div key={card.id} className={`border ${RULE} p-3 rounded break-inside-avoid`}>
                <div className="font-bold text-sm">{card.nameEnglish}</div>
                <div className="thai-display text-base font-bold my-1">{card.nameThai}</div>
                <div className="thai-display text-xs text-muted">{card.thaiAddress}</div>
                {card.nearestStation && (
                  <div className="text-[11px] text-muted mt-1">
                    {t('printStation')}: {card.nearestStation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
