import React from 'react';
import { Calendar, MapPin, Edit2 } from 'lucide-react';
import type { Trip, TripRole } from '../types/travel';
import { useI18n } from '../utils/i18n';

interface TripBannerProps {
  trip: Trip;
  onOpenSettings: () => void;
  role: TripRole;
}

export const TripBanner: React.FC<TripBannerProps> = ({
  trip,
  onOpenSettings,
  role
}) => {
  const { lang, t } = useI18n();
  const isAdmin = role === 'admin';

  const totalActivities = trip.days.reduce((sum, day) => sum + (day.activities?.length || 0), 0);

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

      </div>
    </div>
  );
};
