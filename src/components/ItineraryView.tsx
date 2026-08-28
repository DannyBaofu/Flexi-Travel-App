import React, { useState } from 'react';
import {
  Plus,
  MapPin,
  Clock,
  ExternalLink,
  Edit3,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  Languages,
  Search,
  ChevronDown,
  Utensils,
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

interface ItineraryViewProps {
  trip: Trip;
  onUpdateTrip: (updatedTrip: Trip) => void;
  onOpenAddActivityModal: (dayId: string) => void;
  onOpenEditActivityModal: (dayId: string, activity: ActivityItem) => void;
  onShowTaxiAddress: (thaiAddress: string, title: string) => void;
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

export const ItineraryView: React.FC<ItineraryViewProps> = ({
  trip,
  onUpdateTrip,
  onOpenAddActivityModal,
  onOpenEditActivityModal,
  onShowTaxiAddress,
  role
}) => {
  const { lang, t } = useI18n();
  const isAdmin = role === 'admin';
  const isReadOnly = role === 'viewer';
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
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

  // Toggle activity booked state
  const handleToggleBooked = (dayId: string, activityId: string) => {
    if (isReadOnly) return;
    const updatedDays = trip.days.map((day) => {
      if (day.id !== dayId) return day;
      return {
        ...day,
        activities: day.activities.map((act) => {
          if (act.id !== activityId) return act;
          return { ...act, booked: !act.booked };
        })
      };
    });
    onUpdateTrip({ ...trip, days: updatedDays });
  };

  // Reorder activity up or down
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

  // Delete activity
  const handleDeleteActivity = (dayId: string, activityId: string) => {
    if (!isAdmin) return;
    if (!window.confirm(t('confirmDeleteActivity'))) return;
    const updatedDays = trip.days.map(day => {
      if (day.id !== dayId) return day;
      return {
        ...day,
        activities: day.activities.filter(a => a.id !== activityId)
      };
    });
    onUpdateTrip({ ...trip, days: updatedDays });
  };

  // Duplicate activity
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
      return {
        ...day,
        activities: [...day.activities, duplicated]
      };
    });
    onUpdateTrip({ ...trip, days: updatedDays });
  };

  // Filter activities
  const filterActivities = (activities: ActivityItem[]) => {
    return activities.filter((act) => {
      const matchesSearch = searchQuery === '' ||
        act.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        act.locationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (act.notes && act.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat = selectedCategory === 'all' || act.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  };

  const hasActiveFilter = searchQuery !== '' || selectedCategory !== 'all';
  const rate = trip.exchangeRate && trip.exchangeRate > 0 ? trip.exchangeRate : 1;

  const daysToRender = showAllDays ? trip.days : (currentDay ? [currentDay] : []);

  const catLabel = (meta: typeof categoryMetaMap[ActivityCategory]) =>
    lang === 'zh' ? meta.labelZh : meta.label;

  // Render the transport connector between an activity and the next one
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
      <div className="flex items-stretch gap-2.5 pl-5 sm:pl-6 py-0.5">
        {/* dotted spine */}
        <div className="w-px border-l-2 border-dotted border-slate-700 my-0.5" />
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-slate-400 py-1 min-w-0">
          <ModeIcon className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          {transport && (
            <>
              <span className="font-semibold text-sky-300 shrink-0">{t(transportModeMeta[transport.mode].tKey)}</span>
              <span className="font-mono text-slate-300 shrink-0">{t('approxMinutes', { n: transport.durationMin })}</span>
              {transport.costHint && (
                <span className="text-emerald-400/90 font-mono shrink-0">{transport.costHint}</span>
              )}
              {note && (
                <span className="text-slate-500 min-w-0 truncate max-w-full">{note}</span>
              )}
            </>
          )}
          {dirUrl && (
            <a
              href={dirUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 hover:underline shrink-0"
            >
              <ExternalLink className="w-3 h-3" />
              <span>{t('directions')}</span>
            </a>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Day Selector Navigation Pills */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-3 sm:p-4 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
          <div className="flex items-center gap-2">
            {trip.days.map((day, idx) => {
              const isSelected = !showAllDays && selectedDayIndex === idx;
              const activityCount = day.activities?.length || 0;
              return (
                <button
                  key={day.id}
                  onClick={() => {
                    setSelectedDayIndex(idx);
                    setShowAllDays(false);
                  }}
                  className={`px-4 py-2.5 rounded-2xl text-left shrink-0 transition flex flex-col items-start min-w-[120px] sm:min-w-[130px] border ${
                    isSelected
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold shadow-lg shadow-emerald-500/20'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700/80 hover:text-white'
                  }`}
                >
                  <span className="text-[11px] font-semibold uppercase tracking-wider opacity-90">
                    {t('dayN', { n: day.dayNumber })}
                  </span>
                  <span className="text-sm font-bold truncate w-full">
                    {translateWeekday(day.dayOfWeek, lang)}
                  </span>
                  <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>
                    {activityCount === 1 ? t('activityCountOne') : t('activitiesCount', { n: activityCount })}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="pl-2 border-l border-slate-800 shrink-0">
            <button
              onClick={() => setShowAllDays(!showAllDays)}
              className={`px-3.5 py-3 rounded-2xl text-xs font-bold border transition ${
                showAllDays
                  ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-md'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              {showAllDays ? t('singleDayView') : t('allDaysOverview')}
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition ${
                selectedCategory === 'all'
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
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
                  onClick={() => setSelectedCategory(catKey)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 flex items-center gap-1 transition ${
                    isSelected
                      ? `${meta.badgeBg} ${meta.textColor} ring-1 ${meta.borderColor}`
                      : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{lang === 'zh' ? meta.labelZh : meta.label.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Days Schedule Content */}
      <div className="space-y-8">
        {daysToRender.map((day) => {
          const filteredActivities = filterActivities(day.activities || []);
          const dayTotalCost = (day.activities || []).reduce((sum, a) => sum + (a.cost || 0), 0);
          const filteredTotalCost = filteredActivities.reduce((sum, a) => sum + (a.cost || 0), 0);

          const foodActivities = (day.activities || []).filter(a => a.category === 'food');
          const foodTotalCost = foodActivities.reduce((sum, a) => sum + (a.cost || 0), 0);

          return (
            <div key={day.id} className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-4 sm:p-7 shadow-xl overflow-hidden">
              {/* Day Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 font-extrabold text-xs rounded-full border border-emerald-500/30 shrink-0">
                      {t('dayN', { n: day.dayNumber })}
                    </span>
                    <h2 className="text-lg sm:text-2xl font-bold text-white tracking-tight">
                      {day.title || translateWeekday(day.dayOfWeek, lang)}
                    </h2>
                  </div>
                  {day.summary && (
                    <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
                      {day.summary}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 self-start sm:self-center shrink-0">
                  <div className="text-left sm:text-right">
                    <div className="text-[11px] text-slate-400">{t('dayEstCost')}</div>
                    <div className="text-sm font-bold text-emerald-400 font-mono">
                      {dayTotalCost.toLocaleString()} {trip.currency}
                    </div>
                  </div>

                  {filteredActivities.length > 0 && (() => {
                    const dayIds = filteredActivities.map(a => a.id);
                    const allExpanded = dayIds.every(id => expandedIds.has(id));
                    return (
                      <button
                        onClick={() => {
                          setExpandedIds((prev) => {
                            const next = new Set(prev);
                            if (allExpanded) {
                              dayIds.forEach(id => next.delete(id));
                            } else {
                              dayIds.forEach(id => next.add(id));
                            }
                            return next;
                          });
                        }}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition"
                      >
                        {allExpanded ? t('collapseAll') : t('expandAll')}
                      </button>
                    );
                  })()}

                  {!isReadOnly && (
                    <button
                      onClick={() => onOpenAddActivityModal(day.id)}
                      className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-md shadow-emerald-500/20"
                    >
                      <Plus className="w-4 h-4" /> {t('addActivity')}
                    </button>
                  )}
                </div>
              </div>

              {/* Food Summary Strip */}
              {foodActivities.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 bg-orange-500/5 border border-orange-500/20 rounded-xl px-3 py-2.5">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-orange-300 shrink-0">
                    <Utensils className="w-3.5 h-3.5" />
                    {foodActivities.length === 1 ? t('mealCountOne') : t('mealsCount', { n: foodActivities.length })}
                  </span>
                  <span className="text-xs text-slate-400 min-w-0 truncate flex-1">
                    {foodActivities.map(a => a.locationName || a.title).join(' · ')}
                  </span>
                  <span className="text-xs font-bold text-orange-300 font-mono shrink-0">
                    {foodTotalCost.toLocaleString()} {trip.currency}
                    <span className="text-[10px] text-slate-400 font-normal ml-1">
                      (≈ {trip.homeCurrency} {(foodTotalCost / rate).toFixed(1)})
                    </span>
                  </span>
                </div>
              )}

              {/* Filtered Total Strip */}
              {hasActiveFilter && filteredActivities.length > 0 && (
                <div className="mt-3 flex items-center justify-between gap-2 bg-sky-500/5 border border-sky-500/20 rounded-xl px-3 py-2">
                  <span className="text-xs text-sky-300 font-semibold">
                    {t('filteredItems', { n: filteredActivities.length })}
                  </span>
                  <span className="text-xs font-bold text-sky-300 font-mono">
                    {filteredTotalCost.toLocaleString()} {trip.currency}
                  </span>
                </div>
              )}

              {/* Activities List — compact rows, tap to expand */}
              <div className="mt-4 space-y-1.5">
                {filteredActivities.length > 0 ? (
                  filteredActivities.map((activity, actIdx) => {
                    const meta = categoryMetaMap[activity.category] || categoryMetaMap.other;
                    const Icon = meta.icon;
                    const homeCost = activity.cost ? (activity.cost / rate).toFixed(1) : null;
                    const isExpanded = expandedIds.has(activity.id);
                    const nextActivity = !hasActiveFilter ? filteredActivities[actIdx + 1] : undefined;

                    return (
                      <React.Fragment key={activity.id}>
                        <div
                          className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                            activity.booked
                              ? 'bg-slate-900/90 border-emerald-500/30'
                              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {/* Compact Row Header */}
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => toggleExpanded(activity.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                toggleExpanded(activity.id);
                              }
                            }}
                            className="flex items-center gap-2.5 px-3 py-2.5 sm:px-4 sm:py-3 cursor-pointer select-none"
                          >
                            {/* Booked Checkbox */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleBooked(day.id, activity.id);
                              }}
                              disabled={isReadOnly}
                              className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition ${
                                activity.booked
                                  ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                                  : 'bg-slate-800/80 border-slate-700 text-transparent hover:border-slate-500'
                              }`}
                              title={activity.booked ? t('markPending') : t('markBooked')}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Category Icon */}
                            <div className={`w-7 h-7 rounded-lg ${meta.bgColor} ${meta.borderColor} border flex items-center justify-center ${meta.textColor} shrink-0`}>
                              <Icon className="w-3.5 h-3.5" />
                            </div>

                            {/* Time */}
                            <span className="text-[11px] font-mono font-bold text-slate-400 shrink-0 w-14 sm:w-16">
                              {activity.time}
                            </span>

                            {/* Title + location (truncated) */}
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold text-white line-clamp-2">
                                {activity.title}
                              </div>
                              {activity.locationName && (
                                <div className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                                  <MapPin className="w-3 h-3 shrink-0 text-rose-400/70" />
                                  {activity.locationName}
                                </div>
                              )}
                            </div>

                            {/* Price */}
                            {activity.cost !== undefined && activity.cost > 0 && (
                              <span className="text-[11px] font-bold text-emerald-400 font-mono shrink-0">
                                {activity.cost.toLocaleString()}
                                <span className="text-slate-500 font-normal ml-0.5">{trip.currency}</span>
                              </span>
                            )}

                            {/* Expand Chevron */}
                            <ChevronDown
                              className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                            />
                          </div>

                          {/* Expanded Details */}
                          {isExpanded && (
                            <div className="px-3 pb-3 sm:px-4 sm:pb-4 pt-1 border-t border-slate-800/70 space-y-3">
                              {/* Badges Row */}
                              <div className="flex flex-wrap items-center gap-2 pt-2.5">
                                <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded-md">
                                  <Clock className="w-3 h-3 text-emerald-400" />
                                  {activity.time}
                                </span>
                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${meta.badgeBg} ${meta.textColor}`}>
                                  {catLabel(meta)}
                                </span>
                                {activity.cost !== undefined && activity.cost > 0 && (
                                  <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 font-mono">
                                    {activity.cost.toLocaleString()} {trip.currency}
                                    {homeCost && (
                                      <span className="text-[10px] text-slate-400 ml-1">
                                        (≈ {trip.homeCurrency} {homeCost})
                                      </span>
                                    )}
                                  </span>
                                )}
                              </div>

                              {/* Location & Links */}
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-400">
                                {activity.locationName && (
                                  <span className="flex items-center gap-1 text-slate-300 font-medium">
                                    <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                    {activity.locationName}
                                  </span>
                                )}

                                {activity.thaiAddress && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onShowTaxiAddress(activity.thaiAddress!, activity.title);
                                    }}
                                    className="inline-flex items-center gap-1 text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/30 font-medium transition"
                                    title={t('thaiTaxiCard')}
                                  >
                                    <Languages className="w-3 h-3 text-amber-400" />
                                    <span>{t('thaiTaxiCard')}</span>
                                  </button>
                                )}

                                {activity.googleMapsUrl && (
                                  <a
                                    href={activity.googleMapsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 hover:underline transition"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    <span>{t('googleMaps')}</span>
                                  </a>
                                )}
                              </div>

                              {/* Notes & Tips */}
                              {activity.notes && (
                                <div className="text-xs text-slate-300 bg-slate-900/90 p-2.5 rounded-xl border border-slate-800/80 leading-relaxed">
                                  💡 <span className="font-semibold text-slate-200">{t('tips')}:</span> {activity.notes}
                                </div>
                              )}

                              {/* Actions */}
                              {!isReadOnly && (
                                <div className="flex items-center gap-1 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800 w-fit">
                                  {isAdmin && (<>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleMoveActivity(day.id, actIdx, 'up'); }}
                                    disabled={actIdx === 0}
                                    className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded-lg hover:bg-slate-800 transition"
                                    title={t('moveEarlier')}
                                  >
                                    <ArrowUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleMoveActivity(day.id, actIdx, 'down'); }}
                                    disabled={actIdx === (day.activities.length - 1)}
                                    className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded-lg hover:bg-slate-800 transition"
                                    title={t('moveLater')}
                                  >
                                    <ArrowDown className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDuplicateActivity(day.id, activity); }}
                                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                                    title={t('duplicateActivity')}
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                  </>)}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); onOpenEditActivityModal(day.id, activity); }}
                                    className="p-1.5 text-emerald-400 hover:text-emerald-300 rounded-lg hover:bg-emerald-500/10 transition"
                                    title={t('editDetails')}
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  {isAdmin && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteActivity(day.id, activity.id); }}
                                    className="p-1.5 text-red-400 hover:text-red-300 rounded-lg hover:bg-red-500/10 transition"
                                    title={t('deleteActivity')}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Transport to next activity */}
                        {nextActivity && renderTransportConnector(activity, nextActivity)}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <div className="text-center py-10 border border-dashed border-slate-800 rounded-2xl bg-slate-950/30">
                    <p className="text-sm text-slate-400 font-medium">{t('noActivities')}</p>
                    {!isReadOnly && (
                      <button
                        onClick={() => onOpenAddActivityModal(day.id)}
                        className="mt-3 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold rounded-xl transition inline-flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" /> {t('addFirstActivity')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
