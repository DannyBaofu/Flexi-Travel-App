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
  Search
} from 'lucide-react';
import type { Trip, DaySchedule, ActivityItem, ActivityCategory } from '../types/travel';
import { categoryMetaMap } from '../utils/categoryHelpers';

interface ItineraryViewProps {
  trip: Trip;
  onUpdateTrip: (updatedTrip: Trip) => void;
  onOpenAddActivityModal: (dayId: string) => void;
  onOpenEditActivityModal: (dayId: string, activity: ActivityItem) => void;
  onShowTaxiAddress: (thaiAddress: string, title: string) => void;
  isReadOnly?: boolean;
}

export const ItineraryView: React.FC<ItineraryViewProps> = ({
  trip,
  onUpdateTrip,
  onOpenAddActivityModal,
  onOpenEditActivityModal,
  onShowTaxiAddress,
  isReadOnly
}) => {
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const [showAllDays, setShowAllDays] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ActivityCategory | 'all'>('all');

  const currentDay: DaySchedule | undefined = trip.days[selectedDayIndex];

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
    if (isReadOnly) return;
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
    if (isReadOnly) return;
    if (!window.confirm('Delete this activity from your schedule?')) return;
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
    if (isReadOnly) return;
    const duplicated: ActivityItem = {
      ...activity,
      id: `act-${Date.now()}`,
      title: `${activity.title} (Copy)`
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

  const daysToRender = showAllDays ? trip.days : (currentDay ? [currentDay] : []);

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
                    Day {day.dayNumber}
                  </span>
                  <span className="text-sm font-bold truncate w-full">
                    {day.dayOfWeek}
                  </span>
                  <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>
                    {activityCount} {activityCount === 1 ? 'activity' : 'activities'}
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
              {showAllDays ? 'Single Day View' : 'All Days Overview'}
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
              placeholder="Search places, foods, temples..."
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
              All
            </button>
            {(Object.keys(categoryMetaMap) as ActivityCategory[]).slice(0, 6).map((catKey) => {
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
                  <span>{meta.label.split(' ')[0]}</span>
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

          return (
            <div key={day.id} className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 sm:p-7 shadow-xl">
              {/* Day Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 font-extrabold text-xs rounded-full border border-emerald-500/30">
                      Day {day.dayNumber}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                      {day.title || day.dayOfWeek}
                    </h2>
                  </div>
                  {day.summary && (
                    <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
                      {day.summary}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 self-start sm:self-center">
                  <div className="text-right hidden sm:block">
                    <div className="text-[11px] text-slate-400">Day Estimated Cost</div>
                    <div className="text-sm font-bold text-emerald-400 font-mono">
                      {dayTotalCost.toLocaleString()} {trip.currency}
                    </div>
                  </div>

                  {!isReadOnly && (
                    <button
                      onClick={() => onOpenAddActivityModal(day.id)}
                      className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-md shadow-emerald-500/20"
                    >
                      <Plus className="w-4 h-4" /> Add Activity
                    </button>
                  )}
                </div>
              </div>

              {/* Activities List */}
              <div className="mt-6 space-y-4">
                {filteredActivities.length > 0 ? (
                  filteredActivities.map((activity, actIdx) => {
                    const meta = categoryMetaMap[activity.category] || categoryMetaMap.other;
                    const Icon = meta.icon;
                    const rate = trip.exchangeRate && trip.exchangeRate > 0 ? trip.exchangeRate : 1;
                    const homeCost = activity.cost ? (activity.cost / rate).toFixed(1) : null;

                    return (
                      <div
                        key={activity.id}
                        className={`group relative rounded-2xl p-4 sm:p-5 border transition-all duration-200 ${
                          activity.booked
                            ? 'bg-slate-900/90 border-emerald-500/30 shadow-md'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          {/* Left Column: Time & Category */}
                          <div className="flex items-start gap-3.5">
                            {/* Checkbox for Booked / Completed */}
                            <button
                              type="button"
                              onClick={() => handleToggleBooked(day.id, activity.id)}
                              disabled={isReadOnly}
                              className={`w-6 h-6 rounded-lg border mt-0.5 flex items-center justify-center shrink-0 transition ${
                                activity.booked
                                  ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-sm'
                                  : 'bg-slate-800/80 border-slate-700 text-transparent hover:border-slate-500'
                              }`}
                              title={activity.booked ? 'Mark as pending' : 'Mark as booked/completed'}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>

                            {/* Category Icon */}
                            <div className={`w-10 h-10 rounded-2xl ${meta.bgColor} ${meta.borderColor} border flex items-center justify-center ${meta.textColor} shrink-0`}>
                              <Icon className="w-5 h-5" />
                            </div>

                            {/* Activity Info */}
                            <div className="space-y-1.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded-md">
                                  <Clock className="w-3 h-3 text-emerald-400" />
                                  {activity.time}
                                </span>

                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${meta.badgeBg} ${meta.textColor}`}>
                                  {meta.label}
                                </span>

                                {activity.cost !== undefined && activity.cost > 0 && (
                                  <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 font-mono">
                                    {activity.cost.toLocaleString()} {trip.currency}
                                    {homeCost && (
                                      <span className="text-[10px] text-slate-400 ml-1">
                                        (≈ ${homeCost})
                                      </span>
                                    )}
                                  </span>
                                )}
                              </div>

                              <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-emerald-300 transition">
                                {activity.title}
                              </h3>

                              {/* Location & Taxi Driver helper */}
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-400 pt-0.5">
                                {activity.locationName && (
                                  <span className="flex items-center gap-1 text-slate-300 font-medium">
                                    <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                    {activity.locationName}
                                  </span>
                                )}

                                {activity.thaiAddress && (
                                  <button
                                    onClick={() => onShowTaxiAddress(activity.thaiAddress!, activity.title)}
                                    className="inline-flex items-center gap-1 text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/30 font-medium transition"
                                    title="Show Thai destination card to taxi driver"
                                  >
                                    <Languages className="w-3 h-3 text-amber-400" />
                                    <span>Thai Taxi Card</span>
                                  </button>
                                )}

                                {activity.googleMapsUrl && (
                                  <a
                                    href={activity.googleMapsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 hover:underline transition"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    <span>Google Maps</span>
                                  </a>
                                )}
                              </div>

                              {/* Notes & Tips */}
                              {activity.notes && (
                                <div className="mt-2 text-xs text-slate-300 bg-slate-900/90 p-2.5 rounded-xl border border-slate-800/80 leading-relaxed">
                                  💡 <span className="font-semibold text-slate-200">Tips:</span> {activity.notes}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Right Column: Actions (Reorder, Edit, Duplicate, Delete) */}
                          {!isReadOnly && (
                            <div className="flex items-center gap-1 sm:self-center bg-slate-900/80 p-1.5 rounded-xl border border-slate-800 shrink-0">
                              {/* Move Up */}
                              <button
                                onClick={() => handleMoveActivity(day.id, actIdx, 'up')}
                                disabled={actIdx === 0}
                                className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded-lg hover:bg-slate-800 transition"
                                title="Move Earlier"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>

                              {/* Move Down */}
                              <button
                                onClick={() => handleMoveActivity(day.id, actIdx, 'down')}
                                disabled={actIdx === (day.activities.length - 1)}
                                className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded-lg hover:bg-slate-800 transition"
                                title="Move Later"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>

                              {/* Duplicate */}
                              <button
                                onClick={() => handleDuplicateActivity(day.id, activity)}
                                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                                title="Duplicate Activity"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>

                              {/* Edit */}
                              <button
                                onClick={() => onOpenEditActivityModal(day.id, activity)}
                                className="p-1.5 text-emerald-400 hover:text-emerald-300 rounded-lg hover:bg-emerald-500/10 transition"
                                title="Edit Details"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete */}
                              <button
                                onClick={() => handleDeleteActivity(day.id, activity.id)}
                                className="p-1.5 text-red-400 hover:text-red-300 rounded-lg hover:bg-red-500/10 transition"
                                title="Delete Activity"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-10 border border-dashed border-slate-800 rounded-2xl bg-slate-950/30">
                    <p className="text-sm text-slate-400 font-medium">No scheduled activities matching filters for this day.</p>
                    {!isReadOnly && (
                      <button
                        onClick={() => onOpenAddActivityModal(day.id)}
                        className="mt-3 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold rounded-xl transition inline-flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add First Activity
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
