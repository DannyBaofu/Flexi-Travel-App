import React, { useState } from 'react';
import { Check, ChevronRight, Luggage, Plus } from 'lucide-react';
import type { Trip } from '../types/travel';
import { formatDateRange } from '../services/tripDays';
import { orderedTrips, type TripWithStatus } from '../services/tripOrder';
import { useI18n } from '../utils/i18n';
import { Modal, btnPrimary, chipGilt, chipPlain } from './ui';

/**
 * The list of trips this browser is on.
 *
 * Switching trips is a rare act — twice a year, not twice a session — so it
 * stays behind a sheet rather than taking a tab or a home screen of its own.
 * The app opens on the trip that is happening; this is the detour.
 *
 * What it must do well is say *which* trip you are on, which the select it
 * replaced could not: at 375px that control truncated to "Bangk...", printed
 * the destination rather than the title, and gave no sign of whether a trip
 * was running or three years over. Ordering by that state is most of the
 * value here — the trip somebody wants is almost always the first row, so the
 * question is usually answered before anybody taps.
 */

interface TripSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  trips: Trip[];
  activeTripId: string;
  onSelectTrip: (tripId: string) => void;
  /**
   * Absent for a viewer, who is offered nothing to create. Starting a trip of
   * your own lives here rather than in the top bar: this is the list it joins,
   * and the bar was carrying four controls at 375px.
   */
  onCreateTrip?: () => void;
}

export const TripSwitcher: React.FC<TripSwitcherProps> = ({
  isOpen,
  onClose,
  trips,
  activeTripId,
  onSelectTrip,
  onCreateTrip
}) => {
  const { lang, t } = useI18n();
  const [showPast, setShowPast] = useState(false);

  const ordered = orderedTrips(trips);
  const current = ordered.filter(entry => entry.status.phase !== 'past');
  const past = ordered.filter(entry => entry.status.phase === 'past');

  const pick = (tripId: string) => {
    onSelectTrip(tripId);
    onClose();
  };

  const row = ({ trip, status }: TripWithStatus) => {
    const isActive = trip.id === activeTripId;

    // No chip on a finished trip: the group heading above it already said so,
    // and the row has a title and a date range to fit at 375px.
    const chip =
      status.phase === 'live' ? (
        <span className={chipGilt}>{t('tripLive')}</span>
      ) : status.phase === 'upcoming' && status.daysUntil > 0 ? (
        <span className={chipPlain}>
          {status.daysUntil === 1
            ? t('tripStartsTomorrow')
            : t('tripStartsIn', { n: status.daysUntil })}
        </span>
      ) : null;

    return (
      <button
        key={trip.id}
        onClick={() => pick(trip.id)}
        aria-current={isActive ? 'true' : undefined}
        className="w-full min-h-11 flex items-start gap-3 px-5 py-3 text-left hover:bg-mist transition"
      >
        {/* The check is held in a fixed column so every title starts on the
            same line, whichever trip is the current one. */}
        <span className="w-4 shrink-0 pt-0.5">
          {isActive && (
            <>
              <Check className="w-4 h-4 text-brand" aria-hidden="true" />
              <span className="sr-only">{t('currentTrip')}</span>
            </>
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-ink">{trip.title}</span>
            {chip}
          </span>
          <span className="block text-xs text-muted mt-0.5 truncate">
            {trip.destination} · {formatDateRange(trip.startDate, trip.endDate, lang)}
          </span>
        </span>
      </button>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('myTrips')}
      icon={<Luggage className="w-5 h-5" />}
      size="sm"
      closeLabel={t('close')}
      footer={
        onCreateTrip && (
          <button onClick={onCreateTrip} className={`${btnPrimary} w-full`}>
            <Plus className="w-4 h-4" />
            {t('createNewTrip')}
          </button>
        )
      }
    >
      <div className="py-1.5">
        {current.map(row)}

        {/* Finished trips are worth keeping and not worth scrolling past, so
            they fold away once there are any. */}
        {past.length > 0 && (
          <>
            <button
              onClick={() => setShowPast(v => !v)}
              aria-expanded={showPast}
              className="w-full min-h-11 flex items-center gap-1.5 px-5 py-2 text-left text-xs font-semibold text-muted hover:bg-mist transition"
            >
              <ChevronRight
                className={`w-3.5 h-3.5 shrink-0 transition-transform ${showPast ? 'rotate-90' : ''}`}
                aria-hidden="true"
              />
              {t('pastTripsCount', { n: past.length })}
            </button>
            {showPast && past.map(row)}
          </>
        )}
      </div>
    </Modal>
  );
};
