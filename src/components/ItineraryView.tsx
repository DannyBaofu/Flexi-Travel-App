import React, { useMemo, useState } from 'react';
import {
  Plus,
  MapPin,
  ExternalLink,
  Edit3,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Search,
  ChevronDown,
  X,
  Train,
  TramFront,
  Ship,
  Car,
  Bus,
  Footprints
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Trip, DaySchedule, ActivityItem, ActivityCategory, TransportMode, TripRole } from '../types/travel';
import { categoryMetaMap } from '../utils/categoryHelpers';
import { useI18n, translateWeekday } from '../utils/i18n';
import {
  card,
  cardFlat,
  btnPrimarySm,
  btnSecondarySm,
  chipGilt,
  chipPlain,
  input,
  money
} from './ui';

interface ItineraryViewProps {
  trip: Trip;
  onUpdateTrip: (updatedTrip: Trip) => void;
  onOpenAddActivityModal: (dayId: string) => void;
  onOpenEditActivityModal: (dayId: string, activity: ActivityItem) => void;
  role: TripRole;
}

// Transport mode → icon, i18n key, google maps travelmode
const transportModeMeta: Record<TransportMode, { icon: LucideIcon; tKey: string; gmapsMode: string }> = {
  bts: { icon: TramFront, tKey: 'mode_bts', gmapsMode: 'transit' },
  mrt: { icon: Train, tKey: 'mode_mrt', gmapsMode: 'transit' },
  boat: { icon: Ship, tKey: 'mode_boat', gmapsMode: 'transit' },
  taxi: { icon: Car, tKey: 'mode_taxi', gmapsMode: 'driving' },
  walk: { icon: Footprints, tKey: 'mode_walk', gmapsMode: 'walking' },
  bus: { icon: Bus, tKey: 'mode_bus', gmapsMode: 'transit' },
  train: { icon: Train, tKey: 'mode_train', gmapsMode: 'transit' },
  airportRail: { icon: Train, tKey: 'mode_airportRail', gmapsMode: 'transit' }
};

const buildDirectionsUrl = (from: string, to: string, gmapsMode?: string) => {
  const params = new URLSearchParams({ api: '1', origin: from, destination: to });
  if (gmapsMode) params.set('travelmode', gmapsMode);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
};

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
  role
}) => {
  const { lang, t } = useI18n();
  const isAdmin = role === 'admin';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ActivityCategory | 'all'>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const currentDay: DaySchedule | undefined = trip.days[selectedDayIndex];

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
    if (!isAdmin) return;
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
    if (!isAdmin) return;
    if (!window.confirm(t('confirmDeleteActivity'))) return;
    const updatedDays = trip.days.map(day => {
      if (day.id !== dayId) return day;
      return { ...day, activities: day.activities.filter(a => a.id !== activityId) };
    });
    onUpdateTrip({ ...trip, days: updatedDays });
  };

  const handleDuplicateActivity = (dayId: string, activity: ActivityItem) => {
    if (!isAdmin) return;
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

  const filterActivities = (activities: ActivityItem[]) => {
    return activities.filter((act) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = searchQuery === '' ||
        act.title.toLowerCase().includes(q) ||
        act.locationName.toLowerCase().includes(q) ||
        (act.notes && act.notes.toLowerCase().includes(q));

      const matchesCat = selectedCategory === 'all' || act.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  };

  const hasActiveFilter = searchQuery !== '' || selectedCategory !== 'all';
  const rate = trip.exchangeRate && trip.exchangeRate > 0 ? trip.exchangeRate : 1;

  const daysToRender = showAllDays ? trip.days : (currentDay ? [currentDay] : []);

  const catLabel = (meta: typeof categoryMetaMap[ActivityCategory]) =>
    lang === 'zh' ? meta.labelZh : meta.label.split(' ')[0];

  /** The hop to the next activity: connective tissue, not an item. */
  const renderTransportConnector = (activity: ActivityItem, nextActivity: ActivityItem) => {
    const transport = activity.transportToNext;
    const from = activity.locationAddress || activity.locationName;
    const to = nextActivity.locationAddress || nextActivity.locationName;
    if (!transport && (!from || !to)) return null;

    const modeMeta = transport ? transportModeMeta[transport.mode] : null;
    const ModeIcon = modeMeta?.icon || MapPin;
    const dirUrl = from && to ? buildDirectionsUrl(from, to, modeMeta?.gmapsMode) : null;
    const note = transport ? (lang === 'zh' ? (transport.noteZh || transport.note) : transport.note) : null;

    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pl-3 py-1.5 text-[11px] text-faint">
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
          <a
            href={dirUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-brand hover:underline shrink-0"
          >
            <ExternalLink className="w-3 h-3" />
            <span>{t('directions')}</span>
          </a>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Day picker + filters */}
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
            className={`shrink-0 px-3.5 py-2.5 rounded-control text-xs font-semibold border transition ${
              showAllDays
                ? 'bg-brand-tint text-brand border-brand-tint'
                : 'bg-paper text-muted border-hairline hover:bg-mist'
            }`}
          >
            {showAllDays ? t('singleDayView') : t('allDaysOverview')}
          </button>
        </div>

        {/* Search & category filter */}
        <div className="mt-3 pt-3 border-t border-hairline space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-faint absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className={`${input} pl-9 ${searchQuery ? 'pr-10' : ''} bg-mist`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 inline-flex items-center justify-center rounded-full text-faint hover:text-ink hover:bg-hairline transition"
                title={t('clearFilter')}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none -mx-3 px-3 sm:-mx-4 sm:px-4">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-2.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition ${
                selectedCategory === 'all'
                  ? 'bg-brand-tint text-brand'
                  : 'bg-mist text-muted hover:text-ink'
              }`}
            >
              {t('all')}
            </button>
            {(Object.keys(categoryMetaMap) as ActivityCategory[]).map((catKey) => {
              const meta = categoryMetaMap[catKey];
              const Icon = meta.icon;
              const isSelected = selectedCategory === catKey;
              return (
                <button
                  key={catKey}
                  onClick={() => setSelectedCategory(isSelected ? 'all' : catKey)}
                  className={`px-2.5 py-1.5 rounded-full text-xs font-medium shrink-0 flex items-center gap-1.5 transition ${
                    isSelected
                      ? 'bg-brand-tint text-brand'
                      : 'bg-mist text-muted hover:text-ink'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{catLabel(meta)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Days */}
      <div className="space-y-4">
        {daysToRender.map((day) => {
          const filteredActivities = filterActivities(day.activities || []);
          const shownCost = filteredActivities.reduce((sum, a) => sum + (a.cost || 0), 0);
          const isToday = trip.days.indexOf(day) === todayIndex;

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

              {/* Activities */}
              <div className="mt-3 space-y-1.5">
                {filteredActivities.length > 0 ? (
                  filteredActivities.map((activity, actIdx) => {
                    const meta = categoryMetaMap[activity.category] || categoryMetaMap.other;
                    const Icon = meta.icon;
                    const homeCost = activity.cost ? Math.round(activity.cost / rate) : null;
                    const isExpanded = expandedIds.has(activity.id);
                    const nextActivity = !hasActiveFilter ? filteredActivities[actIdx + 1] : undefined;

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
                            className="flex items-start gap-2.5 p-3 cursor-pointer select-none"
                          >
                            <span className={`text-xs font-medium text-muted shrink-0 w-[46px] pt-0.5 ${money}`}>
                              {activity.time}
                            </span>

                            {/* Tonal spine — decorative; the icon carries identity */}
                            <span
                              className={`w-[3px] rounded-full shrink-0 self-stretch min-h-[38px] ${meta.spine}`}
                              aria-hidden="true"
                            />

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

                              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                <span className={chipPlain}>
                                  <Icon className="w-3 h-3" />
                                  {catLabel(meta)}
                                </span>

                                {activity.cost !== undefined && activity.cost > 0 && (
                                  <span className={`${chipPlain} ${money}`}>
                                    {activity.cost.toLocaleString()} {trip.currency}
                                  </span>
                                )}
                              </div>
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
                                  {isAdmin && (
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
                                  {isAdmin && (
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
              {filteredActivities.length > 0 && (
                <div className="mt-3 pt-3 border-t border-hairline flex items-center justify-between gap-3">
                  <span className="text-xs text-muted">
                    {hasActiveFilter
                      ? t('filteredItems', { n: filteredActivities.length })
                      : t('dayTotalLabel')}
                  </span>
                  <span className={`text-sm font-semibold text-ink ${money}`}>
                    {shownCost.toLocaleString()} {trip.currency}
                    <span className="text-xs font-normal text-muted ml-1.5">
                      ≈ {trip.homeCurrency} {Math.round(shownCost / rate).toLocaleString()}
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
