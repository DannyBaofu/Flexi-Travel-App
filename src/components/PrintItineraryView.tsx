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

export const PrintItineraryView: React.FC<PrintItineraryViewProps> = ({ trip }) => {
  const { lang, t } = useI18n();
  return (
    <div className="hidden print:block text-black bg-white p-8 space-y-6 font-sans">
      <div className="border-b-2 border-black pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold">{trip.title}</h1>
          <p className="text-sm text-gray-700 mt-1">
            📍 {trip.destination}, {trip.country} | 🗓️ {trip.startDate} to {trip.endDate}
          </p>
        </div>
        <div className="text-right text-xs text-gray-600">
          <div>{t('printTravelers')}: {trip.travelers.map(tv => tv.name).join(', ')}</div>
          <div>{t('printCurrency')}: {trip.currency} (1 {trip.homeCurrency} = {trip.exchangeRate} {trip.currency})</div>
        </div>
      </div>

      {/* Days Iteration */}
      <div className="space-y-6">
        {trip.days.map((day) => (
          <div key={day.id} className="border border-gray-300 rounded-lg p-4 break-inside-avoid">
            <div className="flex justify-between items-center border-b border-gray-200 pb-2 mb-3">
              <h2 className="text-lg font-bold">
                {t('dayN', { n: day.dayNumber })}: {translateWeekday(day.dayOfWeek, lang)} – {day.title}
              </h2>
            </div>
            {day.summary && (
              <p className="text-xs text-gray-600 italic mb-3">{day.summary}</p>
            )}

            <div className="space-y-2">
              {day.activities.map((act) => (
                <div key={act.id} className="text-xs flex gap-3 items-start border-l-2 border-gray-400 pl-2">
                  <span className="font-mono font-bold w-16 shrink-0">{act.time}</span>
                  <div className="flex-1">
                    <div className="font-semibold text-black">
                      {act.title}
                      {act.cost ? ` (${act.cost} ${trip.currency})` : ''}
                    </div>
                    {act.locationName && (
                      <div className="text-gray-600">📍 {act.locationName}</div>
                    )}
                    {act.thaiAddress && (
                      <div className="text-gray-800 font-medium">🇹🇭 {act.thaiAddress}</div>
                    )}
                    {act.notes && (
                      <div className="text-gray-500 mt-0.5">💡 {act.notes}</div>
                    )}
                    {act.transportToNext && (
                      <div className="text-gray-600 mt-0.5 font-medium">
                        → {t(MODE_T_KEYS[act.transportToNext.mode])} · {t('approxMinutes', { n: act.transportToNext.durationMin })}
                        {act.transportToNext.costHint ? ` · ${act.transportToNext.costHint}` : ''}
                        {' · '}{lang === 'zh' ? (act.transportToNext.noteZh || act.transportToNext.note) : act.transportToNext.note}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Taxi Flashcards in Thai */}
      {trip.taxiCards && trip.taxiCards.length > 0 && (
        <div className="border-t-2 border-black pt-4 break-before-page">
          <h2 className="text-xl font-bold mb-3">{t('printTaxiCards')}</h2>
          <div className="grid grid-cols-2 gap-3">
            {trip.taxiCards.map((card) => (
              <div key={card.id} className="border border-gray-300 p-3 rounded">
                <div className="font-bold text-sm">{card.nameEnglish}</div>
                <div className="text-base font-bold text-black my-1">{card.nameThai}</div>
                <div className="text-xs text-gray-700">{card.thaiAddress}</div>
                {card.nearestStation && (
                  <div className="text-[11px] text-gray-500 mt-1">{t('printStation')}: {card.nearestStation}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
