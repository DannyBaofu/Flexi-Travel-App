import React from 'react';
import { Calendar, MapPin, Edit2 } from 'lucide-react';
import type { Trip } from '../types/travel';

interface TripBannerProps {
  trip: Trip;
  onOpenSettings: () => void;
  isReadOnly?: boolean;
}

export const TripBanner: React.FC<TripBannerProps> = ({
  trip,
  onOpenSettings,
  isReadOnly
}) => {
  // Calculate total activities count
  const totalActivities = trip.days.reduce((sum, day) => sum + (day.activities?.length || 0), 0);

  // Calculate total estimated budget across all activities
  const totalEstimatedCost = trip.days.reduce((sum, day) => {
    return sum + (day.activities?.reduce((actSum, act) => actSum + (act.cost || 0), 0) || 0);
  }, 0);

  // Home currency conversion
  const rate = trip.exchangeRate && trip.exchangeRate > 0 ? trip.exchangeRate : 1;
  const costInHomeCurrency = (totalEstimatedCost / rate).toFixed(0);

  // Calculate checklist completion
  const totalChecklist = trip.checklist?.length || 0;
  const completedChecklist = trip.checklist?.filter(c => c.completed).length || 0;
  const checklistPercent = totalChecklist > 0 ? Math.round((completedChecklist / totalChecklist) * 100) : 0;

  // Format dates display
  const formatDateDisplay = (start: string, end: string) => {
    try {
      const s = new Date(start);
      const e = new Date(end);
      return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } catch {
      return `${start} to ${end}`;
    }
  };

  return (
    <div className="relative rounded-3xl overflow-hidden border border-slate-800 shadow-2xl mb-8 bg-slate-900">
      {/* Background Cover Image with Gradient Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={trip.coverImage || 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1600&q=80'}
          alt={trip.title}
          className="w-full h-full object-cover object-center filter brightness-[0.45]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
      </div>

      {/* Banner Content */}
      <div className="relative z-10 p-6 sm:p-8 lg:p-10 flex flex-col justify-between min-h-[300px]">
        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-md">
              <MapPin className="w-3.5 h-3.5" />
              {trip.destination}, {trip.country}
            </span>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800/80 text-slate-200 border border-slate-700/80 backdrop-blur-md">
              <Calendar className="w-3.5 h-3.5 text-sky-400" />
              {formatDateDisplay(trip.startDate, trip.endDate)}
            </span>
          </div>

          {!isReadOnly && (
            <button
              onClick={onOpenSettings}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700 backdrop-blur-md transition shadow-md"
            >
              <Edit2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Customize Trip</span>
            </button>
          )}
        </div>

        {/* Center: Trip Title & Travelers */}
        <div className="my-6 space-y-3">
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight drop-shadow-md">
            {trip.title}
          </h1>

          {/* Travelers Avatars Pile */}
          <div className="flex items-center gap-3 pt-1">
            <div className="flex -space-x-2 overflow-hidden">
              {trip.travelers?.map((traveler) => (
                <div
                  key={traveler.id}
                  className="w-8 h-8 rounded-full border-2 border-slate-900 flex items-center justify-center text-xs font-bold text-slate-950 shadow"
                  style={{ backgroundColor: traveler.avatarColor }}
                  title={traveler.name}
                >
                  {traveler.name.charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
            <span className="text-xs text-slate-300 font-medium">
              {trip.travelers?.length || 1} Travelers ({trip.travelers?.map(t => t.name.split(' ')[0]).join(', ')})
            </span>
          </div>
        </div>

        {/* Bottom Statistics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-800/80">
          <div className="bg-slate-900/80 backdrop-blur border border-slate-800 p-3 rounded-2xl">
            <div className="text-[11px] font-medium text-slate-400">Total Duration</div>
            <div className="text-base font-bold text-white mt-0.5">
              {trip.days.length} Days / {trip.days.length - 1} Nights
            </div>
          </div>

          <div className="bg-slate-900/80 backdrop-blur border border-slate-800 p-3 rounded-2xl">
            <div className="text-[11px] font-medium text-slate-400">Scheduled Activities</div>
            <div className="text-base font-bold text-white mt-0.5">
              {totalActivities} Events
            </div>
          </div>

          <div className="bg-slate-900/80 backdrop-blur border border-slate-800 p-3 rounded-2xl">
            <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
              <span>Estimated Budget</span>
              <span className="text-[10px] text-emerald-400 font-mono">1 {trip.homeCurrency} ≈ {rate} {trip.currency}</span>
            </div>
            <div className="text-base font-bold text-emerald-400 mt-0.5 truncate">
              {totalEstimatedCost.toLocaleString()} {trip.currency}
              <span className="text-xs font-normal text-slate-400 ml-1">
                (≈ {trip.homeCurrency} {costInHomeCurrency})
              </span>
            </div>
          </div>

          <div className="bg-slate-900/80 backdrop-blur border border-slate-800 p-3 rounded-2xl">
            <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
              <span>Packing & Checklist</span>
              <span className="text-[10px] text-sky-400">{checklistPercent}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 mt-2 overflow-hidden">
              <div
                className="bg-sky-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${checklistPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
