import React from 'react';
import { Calendar, MapPin, Edit2 } from 'lucide-react';
import type { Trip, TripRole } from '../types/travel';
import { useI18n } from '../utils/i18n';
import { money } from './ui';

interface TripBannerProps {
  trip: Trip;
  onOpenSettings: () => void;
  role: TripRole;
  rateIsLive?: boolean;
}

export const TripBanner: React.FC<TripBannerProps> = ({
  trip,
  onOpenSettings,
  role,
  rateIsLive
}) => {
  const { lang, t } = useI18n();
  const isAdmin = role === 'admin';

  const totalActivities = trip.days.reduce((sum, day) => sum + (day.activities?.length || 0), 0);

  const totalEstimatedCost = trip.days.reduce((sum, day) => {
    return sum + (day.activities?.reduce((actSum, act) => actSum + (act.cost || 0), 0) || 0);
  }, 0);

  const rate = trip.exchangeRate && trip.exchangeRate > 0 ? trip.exchangeRate : 1;
  const costInHomeCurrency = Math.round(totalEstimatedCost / rate);

  const totalChecklist = trip.checklist?.length || 0;
  const completedChecklist = trip.checklist?.filter(c => c.completed).length || 0;
  const checklistPercent = totalChecklist > 0 ? Math.round((completedChecklist / totalChecklist) * 100) : 0;

  const formatDateDisplay = (start: string, end: string) => {
    const locale = lang === 'zh' ? 'zh-CN' : 'en-US';
    try {
      const s = new Date(start);
      const e = new Date(end);
      return `${s.toLocaleDateString(locale, { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString(locale, { month: 'short', day: 'numeric' })}`;
    } catch {
      return `${start} – ${end}`;
    }
  };

  return (
    <div className="bg-paper border border-hairline rounded-card shadow-lift overflow-hidden mb-5">
      {/* A photo band rather than a full-bleed hero: on white, text over a
          picture needs a scrim, and a scrim is the one thing this theme
          has no room for. */}
      <div className="relative h-24 sm:h-32 bg-mist">
        <img
          src={trip.coverImage || 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1600&q=80'}
          alt=""
          className="w-full h-full object-cover object-center"
        />
        {isAdmin && (
          <button
            onClick={onOpenSettings}
            className="absolute top-2.5 right-2.5 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-control text-xs font-semibold bg-paper/90 backdrop-blur text-ink border border-hairline hover:bg-paper transition"
          >
            <Edit2 className="w-3.5 h-3.5 text-muted" />
            <span className="hidden sm:inline">{t('customizeTrip')}</span>
          </button>
        )}
      </div>

      <div className="p-4 sm:p-5">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-ink text-balance">
          {trip.title}
        </h1>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted mt-1.5">
          <span className="inline-flex items-center gap-1 min-w-0">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-faint" />
            <span className="truncate">{trip.destination}, {trip.country}</span>
          </span>
          <span className="text-hairline">·</span>
          <span className="inline-flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 shrink-0 text-faint" />
            {formatDateDisplay(trip.startDate, trip.endDate)}
          </span>
          <span className="text-hairline">·</span>
          <span>{t('daysNights', { d: trip.days.length, n: Math.max(trip.days.length - 1, 0) })}</span>
          <span className="text-hairline">·</span>
          <span>{t('events', { n: totalActivities })}</span>
        </div>

        {/* Travelers */}
        <div className="flex items-center gap-2.5 mt-3">
          <div className="flex -space-x-1.5">
            {trip.travelers?.map((traveler) => (
              <div
                key={traveler.id}
                className="w-7 h-7 rounded-full border-2 border-paper flex items-center justify-center text-[11px] font-bold text-white"
                style={{ backgroundColor: traveler.avatarColor }}
                title={traveler.name}
              >
                {traveler.name.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
          <span className="text-xs text-muted truncate min-w-0">
            {t('travelers', { n: trip.travelers?.length || 1 })}
          </span>
        </div>

        {/* The two numbers people actually open this screen for */}
        <div className="grid grid-cols-2 gap-4 sm:gap-12 sm:grid-cols-[minmax(0,200px)_minmax(0,260px)] mt-4 pt-4 border-t border-hairline">
          <div className="min-w-0">
            <div className="text-[11px] text-faint">{t('estimatedBudget')}</div>
            <div className={`text-base font-semibold text-ink mt-0.5 truncate ${money}`}>
              {totalEstimatedCost.toLocaleString()} {trip.currency}
            </div>
            <div className={`text-[11px] text-muted flex items-center gap-1.5 ${money}`}>
              {rateIsLive && (
                <span
                  className="w-1.5 h-1.5 rounded-full bg-brand shrink-0"
                  title={t('liveRate')}
                />
              )}
              ≈ {trip.homeCurrency} {costInHomeCurrency.toLocaleString()}
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="text-faint truncate">{t('packingChecklist')}</span>
              <span className={`text-muted shrink-0 ${money}`}>
                {completedChecklist}/{totalChecklist}
              </span>
            </div>
            <div className="w-full bg-mist rounded-full h-1.5 mt-2.5 overflow-hidden">
              <div
                className="bg-brand h-full rounded-full transition-all duration-500"
                style={{ width: `${checklistPercent}%` }}
              />
            </div>
            <div className={`text-[11px] text-muted mt-1.5 ${money}`}>{checklistPercent}%</div>
          </div>
        </div>
      </div>
    </div>
  );
};
