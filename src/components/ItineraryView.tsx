import React, { lazy, Suspense, useMemo, useState } from 'react';
import {
  Plus,
  MapPin,
  Map as MapIcon,
  ExternalLink,
  Edit3,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  Train,
  TramFront,
  Ship,
  Car,
  Bus,
  Footprints
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Trip, DaySchedule, ActivityItem, TransportMode, TripRole } from '../types/travel';
import { useI18n, translateWeekday } from '../utils/i18n';
import { locatedStops, hopsBetween, totalKm, roundDistance, directionsUrl } from '../services/geo';
import {
  card,
  cardFlat,
  btnPrimarySm,
  btnSecondarySm,
  chipGilt,
  chipPlain,
  money
} from './ui';

// Leaflet only downloads when somebody opens a map.
const DayMap = lazy(() => import('./DayMap'));

interface ItineraryViewProps {
  trip: Trip;
  onUpdateTrip: (updatedTrip: Trip) => void;
  onOpenAddActivityModal: (dayId: string) => void;
  onOpenEditActivityModal: (dayId: string, activity: ActivityItem) => void;
  onOfferUndo: (tripId: string, message: string, restore: (current: Trip) => Trip) => void;
  role: TripRole;
}

// Transport mode → icon and i18n key. Which Google travel mode each one opens
// lives with the rest of the geography in `geo.ts`.
const transportModeMeta: Record<TransportMode, { icon: LucideIcon; tKey: string }> = {
  bts: { icon: TramFront, tKey: 'mode_bts' },
  mrt: { icon: Train, tKey: 'mode_mrt' },
  boat: { icon: Ship, tKey: 'mode_boat' },
  taxi: { icon: Car, tKey: 'mode_taxi' },
  walk: { icon: Footprints, tKey: 'mode_walk' },
  bus: { icon: Bus, tKey: 'mode_bus' },
  train: { icon: Train, tKey: 'mode_train' },
  airportRail: { icon: Train, tKey: 'mode_airportRail' }
};

// The one live-answer control in the schedule: it opens Google's transit
// view for the hop, so it carries the 44px floor itself.
const directionsLink =
  'inline-flex items-center gap-1 min-h-11 px-1 -mx-1 text-brand hover:underline shrink-0';

/**
 * Which day is today, or -1 when the trip is not running.
 * Days are consecutive from startDate, so the offset is the index.
 */
const findTodayIndex = (startDate: string, dayCount: number): number => {
  try {
    const start = new Date(`${startDate}T00:00:00`);
    if (Number.isNaN(start.getTime())) return -1;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const offset = Math.round((today.getTime() - start.getTime()) / 86400000);
    return offset >= 0 && offset < dayCount ? offset : -1;
  } catch {
    return -1;
  }
};

// A 40px control inside a 44px row keeps the tap target legal without
// making the action bar look like a toolbar.
const actionBtn =
  'w-10 h-10 inline-flex items-center justify-center rounded-control text-muted ' +
  'hover:text-ink hover:bg-mist disabled:opacity-30 disabled:hover:bg-transparent transition';

export const ItineraryView: React.FC<ItineraryViewProps> = ({
  trip,
  onUpdateTrip,
  onOpenAddActivityModal,
  onOpenEditActivityModal,
  onOfferUndo,
  role
}) => {
  const { lang, t } = useI18n();
  // Reordering, duplicating and deleting an activity are ordinary trip
  // planning, so every traveller gets them. Only a viewer is held back.
  const canEdit = role !== 'viewer';
  const isReadOnly = role === 'viewer';

  const todayIndex = useMemo(
    () => findTodayIndex(trip.startDate, trip.days.length),
    [trip.startDate, trip.days.length]
  );

  // Open on today during the trip. Scrolling past three finished days
  // every time you open the app is pure friction.
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(() =>
    todayIndex >= 0 ? todayIndex : 0
  );
  const [showAllDays, setShowAllDays] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  // Which days have their map open. Closed by default: the tiles are a
  // download, and the list is what most visits are for.
  const [mapOpenIds, setMapOpenIds] = useState<Set<string>>(new Set());

  const currentDay: DaySchedule | undefined = trip.days[selectedDayIndex];

  const toggleMap = (dayId: string) => {
    setMapOpenIds(prev => {
      const next = new Set(prev);
      if (next.has(dayId)) next.delete(dayId); else next.add(dayId);
      return next;
    });
  };

  const formatDistance = (km: number) => {
    const { value, unit } = roundDistance(km);
    return t(unit === 'km' ? 'distKm' : 'distM', { n: value });
  };

  const toggleExpanded = (activityId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(activityId)) {
        next.delete(activityId);
      } else {
        next.add(activityId);
      }
      return next;
    });
  };

  const handleMoveActivity = (dayId: string, activityIndex: number, direction: 'up' | 'down') => {
    if (!canEdit) return;
    const targetDay = trip.days.find(d => d.id === dayId);
    if (!targetDay) return;

    const newActivities = [...targetDay.activities];
    const targetIndex = direction === 'up' ? activityIndex - 1 : activityIndex + 1;
    if (targetIndex < 0 || targetIndex >= newActivities.length) return;

    const temp = newActivities[activityIndex];
    newActivities[activityIndex] = newActivities[targetIndex];
    newActivities[targetIndex] = temp;

    const updatedDays = trip.days.map(d => d.id === dayId ? { ...d, activities: newActivities } : d);
    onUpdateTrip({ ...trip, days: updatedDays });
  };

  const handleDeleteActivity = (dayId: string, activityId: string) => {
    if (!canEdit) return;

    const sourceDay = trip.days.find(d => d.id === dayId);
    const activity = sourceDay?.activities.find(a => a.id === activityId);
    if (!sourceDay || !activity) return;
    const position = sourceDay.activities.indexOf(activity);

    const updatedDays = trip.days.map(day =>
      day.id === dayId
        ? { ...day, activities: day.activities.filter(a => a.id !== activityId) }
        : day
    );
    onUpdateTrip({ ...trip, days: updatedDays });

    // Put it back where it was, not on the end of the day
    onOfferUndo(trip.id, t('deletedActivity', { name: activity.title }), current => ({
      ...current,
      days: current.days.map(day => {
        if (day.id !== dayId) return day;
        if (day.activities.some(a => a.id === activityId)) return day;
        const restored = [...day.activities];
        restored.splice(Math.min(position, restored.length), 0, activity);
        return { ...day, activities: restored };
      })
    }));
  };

  const handleDuplicateActivity = (dayId: string, activity: ActivityItem) => {
    if (!canEdit) return;
    const duplicated: ActivityItem = {
      ...activity,
      id: `act-${Date.now()}`,
      title: `${activity.title} (Copy)`,
      // The copy lands at the end of the day, so the original's
      // transport-to-next suggestion no longer applies to it.
      transportToNext: undefined
    };
    const updatedDays = trip.days.map(day => {
      if (day.id !== dayId) return day;
      return { ...day, activities: [...day.activities, duplicated] };
    });
    onUpdateTrip({ ...trip, days: updatedDays });
  };

  const rate = trip.exchangeRate && trip.exchangeRate > 0 ? trip.exchangeRate : 1;

  const daysToRender = showAllDays ? trip.days : (currentDay ? [currentDay] : []);

  /**
   * The hop to the next activity: connective tissue, not an item. The link
   * is the point — Google's transit view answers which station to board and
   * which to leave at, live, which nothing stored in the trip could.
   */
  const renderTransportConnector = (activity: ActivityItem, nextActivity: ActivityItem) => {
    const transport = activity.transportToNext;
    const dirUrl = directionsUrl(activity, nextActivity, transport?.mode);
    if (!transport && !dirUrl) return null;

    const ModeIcon = transport ? transportModeMeta[transport.mode].icon : MapPin;
    const note = transport ? (lang === 'zh' ? (transport.noteZh || transport.note) : transport.note) : null;

    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pl-3 text-[11px] text-faint">
        <ModeIcon className="w-3.5 h-3.5 shrink-0" />
        {transport && (
          <>
            <span className="font-medium text-muted">{t(transportModeMeta[transport.mode].tKey)}</span>
            <span className={money}>{t('approxMinutes', { n: transport.durationMin })}</span>
            {transport.costHint && <span className={money}>{transport.costHint}</span>}
            {note && <span className="min-w-0 truncate max-w-full">{note}</span>}
          </>
        )}
        {dirUrl && (
          <a href={dirUrl} target="_blank" rel="noopener noreferrer" className={directionsLink}>
            <ExternalLink className="w-3 h-3" />
            <span>{t('directions')}</span>
          </a>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Day picker */}
      <div className={`${card} p-3 sm:p-4`}>
        {/* Bleed to the screen edge so it reads as scrollable */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none -mx-3 px-3 sm:-mx-4 sm:px-4">
          {trip.days.map((day, idx) => {
            const isSelected = !showAllDays && selectedDayIndex === idx;
            const isToday = idx === todayIndex;
            const activityCount = day.activities?.length || 0;
            return (
              <button
                key={day.id}
                onClick={() => {
                  setSelectedDayIndex(idx);
                  setShowAllDays(false);
                }}
                className={`px-3.5 py-2.5 rounded-control text-left shrink-0 flex flex-col items-start min-w-[104px] border transition ${
                  isSelected
                    ? 'bg-brand-tint text-brand border-brand-tint'
                    : 'bg-paper text-muted border-hairline hover:bg-mist'
                }`}
              >
                <span className="text-[10.5px] font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  {t('dayN', { n: day.dayNumber })}
                  {isToday && (
                    <span className={`${isSelected ? 'bg-brand text-white' : 'bg-gilt-tint text-gilt'} px-1.5 py-px rounded-full text-[9.5px] tracking-normal`}>
                      {t('todayBadge')}
                    </span>
                  )}
                </span>
                <span className={`text-sm font-semibold truncate w-full ${isSelected ? 'text-brand' : 'text-ink'}`}>
                  {translateWeekday(day.dayOfWeek, lang)}
                </span>
                <span className="text-[10.5px] mt-0.5 opacity-80">
                  {activityCount === 1 ? t('activityCountOne') : t('activitiesCount', { n: activityCount })}
                </span>
              </button>
            );
          })}

          <button
            onClick={() => setShowAllDays(!showAllDays)}
            className={`shrink-0 px-3.5 py-2.5 min-h-11 rounded-control text-xs font-semibold border transition ${
              showAllDays
                ? 'bg-brand-tint text-brand border-brand-tint'
                : 'bg-paper text-muted border-hairline hover:bg-mist'
            }`}
          >
            {showAllDays ? t('singleDayView') : t('allDaysOverview')}
          </button>
        </div>
      </div>

      {/* Days */}
      <div className="space-y-4">
        {daysToRender.map((day) => {
          const activities = day.activities || [];
          const dayCost = activities.reduce((sum, a) => sum + (a.cost || 0), 0);
          const isToday = trip.days.indexOf(day) === todayIndex;
          const stops = locatedStops(activities);
          const hops = hopsBetween(stops);
          const unpinned = activities.length - stops.length;
          const mapOpen = mapOpenIds.has(day.id);

          return (
            <div key={day.id} className={`${card} p-4 sm:p-5`}>
              {/* Day header */}
              <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-hairline">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base sm:text-lg font-semibold text-ink tracking-tight">
                      {t('dayN', { n: day.dayNumber })} · {translateWeekday(day.dayOfWeek, lang)}
                    </h2>
                    {isToday && <span className={chipGilt}>{t('todayBadge')}</span>}
                  </div>
                  {day.title && (
                    <p className="text-sm text-muted mt-0.5">{day.title}</p>
                  )}
                  {day.summary && (
                    <p className="text-xs text-faint mt-1 leading-relaxed max-w-2xl">{day.summary}</p>
                  )}
                </div>

                {!isReadOnly && (
                  <button
                    onClick={() => onOpenAddActivityModal(day.id)}
                    className={`${btnPrimarySm} shrink-0`}
                  >
                    <Plus className="w-4 h-4" /> {t('addActivity')}
                  </button>
                )}
              </div>

              {/* Where the day goes: the pinned stops in order, and how far
                  each hop is as a straight line. Only offered once a stop has
                  a pin — there is nothing to draw before that. */}
              {stops.length > 0 && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => toggleMap(day.id)}
                    aria-expanded={mapOpen}
                    className="w-full min-h-11 flex items-center gap-2 px-3 py-2 rounded-control border border-hairline bg-paper hover:bg-mist text-xs text-muted transition text-left"
                  >
                    <MapIcon className="w-4 h-4 text-brand shrink-0" />
                    {/* Label over the numbers: side by side they fight for
                        the width at 375px and the total is what loses. */}
                    <span className="min-w-0 flex flex-col leading-snug">
                      <span className="font-semibold text-ink">{mapOpen ? t('mapHide') : t('mapShow')}</span>
                      <span className="truncate text-[11px]">
                        {t('mapStops', { n: stops.length })}
                        {hops.length > 0 && (
                          <>
                            {' · '}{t('mapTotalLabel')}{' '}
                            <span className={money}>{formatDistance(totalKm(hops))}</span>
                          </>
                        )}
                      </span>
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-faint shrink-0 ml-auto transition-transform duration-200 ${mapOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {mapOpen && (
                    <div className="mt-2 space-y-2.5">
                      <Suspense fallback={<div className="h-64 sm:h-80 rounded-control bg-mist animate-pulse" />}>
                        <DayMap stops={stops} label={t('mapRegion')} />
                      </Suspense>

                      {hops.length > 0 && (
                        <ol className="space-y-0.5">
                          {hops.map(hop => {
                            const hopUrl = directionsUrl(
                              hop.from.activity,
                              hop.to.activity,
                              hop.from.activity.transportToNext?.mode
                            );
                            return (
                              <li
                                key={`${hop.from.activity.id}-${hop.to.activity.id}`}
                                className="flex items-center gap-2 text-xs text-muted min-h-11"
                              >
                                <span className="inline-flex items-center gap-1 shrink-0">
                                  <span className="w-5 h-5 rounded-full bg-brand-tint text-brand text-[10.5px] font-bold inline-flex items-center justify-center">{hop.from.order}</span>
                                  <span className="text-faint">→</span>
                                  <span className="w-5 h-5 rounded-full bg-brand-tint text-brand text-[10.5px] font-bold inline-flex items-center justify-center">{hop.to.order}</span>
                                </span>
                                <span className="truncate min-w-0">
                                  {hop.from.activity.title} <span className="text-faint">→</span> {hop.to.activity.title}
                                </span>
                                <span className={`ml-auto shrink-0 text-ink font-medium ${money}`}>{formatDistance(hop.km)}</span>
                                {hopUrl && (
                                  <a
                                    href={hopUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={`${hop.from.activity.title} → ${hop.to.activity.title} · ${t('directions')}`}
                                    className={`${directionsLink} text-[11px] font-medium`}
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    <span>{t('directions')}</span>
                                  </a>
                                )}
                              </li>
                            );
                          })}
                        </ol>
                      )}

                      <p className="text-[11px] text-faint leading-relaxed">
                        {t('mapStraightHint')}
                        {unpinned > 0 && ` ${t('mapUnlocated', { n: unpinned })}`}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Activities */}
              <div className="mt-3 space-y-1.5">
                {activities.length > 0 ? (
                  activities.map((activity, actIdx) => {
                    const homeCost = activity.cost ? Math.round(activity.cost / rate) : null;
                    const isExpanded = expandedIds.has(activity.id);
                    const nextActivity = activities[actIdx + 1];

                    return (
                      <React.Fragment key={activity.id}>
                        <div className={`${cardFlat} overflow-hidden`}>
                          <div
                            role="button"
                            tabIndex={0}
                            aria-expanded={isExpanded}
                            onClick={() => toggleExpanded(activity.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                toggleExpanded(activity.id);
                              }
                            }}
                            // min-h-11 is the 44px tap floor. The tonal spine
                            // used to hold this row open; with it gone the
                            // height is content-driven, and a title-only
                            // activity falls under the floor without it.
                            className="flex items-start gap-2.5 p-3 min-h-11 cursor-pointer select-none"
                          >
                            <span className={`text-xs font-medium text-muted shrink-0 w-[46px] pt-0.5 ${money}`}>
                              {activity.time}
                            </span>

                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold text-ink leading-snug line-clamp-2">
                                {activity.title}
                              </div>

                              {activity.locationName && (
                                <div className="text-xs text-muted mt-0.5 flex items-start gap-1">
                                  <MapPin className="w-3 h-3 shrink-0 mt-0.5 text-faint" />
                                  <span className="line-clamp-1">{activity.locationName}</span>
                                </div>
                              )}

                              {activity.cost !== undefined && activity.cost > 0 && (
                                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                  <span className={`${chipPlain} ${money}`}>
                                    {activity.cost.toLocaleString()} {trip.currency}
                                  </span>
                                </div>
                              )}
                            </div>

                            <ChevronDown
                              className={`w-4 h-4 text-faint shrink-0 mt-0.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                            />
                          </div>

                          {isExpanded && (
                            <div className="px-3 pb-3 pt-2.5 border-t border-hairline space-y-3">
                              {activity.cost !== undefined && activity.cost > 0 && homeCost !== null && (
                                <div className={`text-xs text-muted ${money}`}>
                                  {activity.cost.toLocaleString()} {trip.currency} ≈ {trip.homeCurrency} {homeCost.toLocaleString()}
                                </div>
                              )}

                              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
                                {activity.googleMapsUrl && (
                                  <a
                                    href={activity.googleMapsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center gap-1 text-brand hover:underline"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    {t('googleMaps')}
                                  </a>
                                )}
                              </div>

                              {activity.notes && (
                                <p className="text-xs text-muted bg-mist p-2.5 rounded-control leading-relaxed">
                                  <span className="font-semibold text-ink">{t('tips')}: </span>
                                  {activity.notes}
                                </p>
                              )}

                              {!isReadOnly && (
                                <div className="flex items-center gap-0.5 -ml-1.5">
                                  {canEdit && (
                                    <>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleMoveActivity(day.id, actIdx, 'up'); }}
                                        disabled={actIdx === 0}
                                        className={actionBtn}
                                        title={t('moveEarlier')}
                                      >
                                        <ArrowUp className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleMoveActivity(day.id, actIdx, 'down'); }}
                                        disabled={actIdx === (day.activities.length - 1)}
                                        className={actionBtn}
                                        title={t('moveLater')}
                                      >
                                        <ArrowDown className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleDuplicateActivity(day.id, activity); }}
                                        className={actionBtn}
                                        title={t('duplicateActivity')}
                                      >
                                        <Copy className="w-4 h-4" />
                                      </button>
                                    </>
                                  )}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); onOpenEditActivityModal(day.id, activity); }}
                                    className={actionBtn}
                                    title={t('editDetails')}
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  {canEdit && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleDeleteActivity(day.id, activity.id); }}
                                      className={`${actionBtn} hover:text-clay hover:bg-clay-tint`}
                                      title={t('deleteActivity')}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {nextActivity && renderTransportConnector(activity, nextActivity)}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <div className="text-center py-8 border border-dashed border-hairline rounded-card">
                    <p className="text-sm text-muted">{t('noActivities')}</p>
                    {!isReadOnly && (
                      <button
                        onClick={() => onOpenAddActivityModal(day.id)}
                        className={`${btnSecondarySm} mt-3`}
                      >
                        <Plus className="w-3.5 h-3.5" /> {t('addFirstActivity')}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Day subtotal, in both currencies, at the foot where the
                  running total belongs. */}
              {activities.length > 0 && (
                <div className="mt-3 pt-3 border-t border-hairline flex items-center justify-between gap-3">
                  <span className="text-xs text-muted">{t('dayTotalLabel')}</span>
                  <span className={`text-sm font-semibold text-ink ${money}`}>
                    {dayCost.toLocaleString()} {trip.currency}
                    <span className="text-xs font-normal text-muted ml-1.5">
                      ≈ {trip.homeCurrency} {Math.round(dayCost / rate).toLocaleString()}
                    </span>
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
