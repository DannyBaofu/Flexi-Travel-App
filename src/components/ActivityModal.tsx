import React, { useState, useEffect } from 'react';
import { X, MapPin, DollarSign, Clock, FileText, CheckCircle2, Languages, Globe } from 'lucide-react';
import type { ActivityItem, ActivityCategory, DaySchedule, Trip } from '../types/travel';
import { categoryMetaMap } from '../utils/categoryHelpers';

interface ActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dayId: string, activity: ActivityItem) => void;
  activityToEdit?: ActivityItem | null;
  currentDayId: string;
  trip: Trip;
}

export const ActivityModal: React.FC<ActivityModalProps> = ({
  isOpen,
  onClose,
  onSave,
  activityToEdit,
  currentDayId,
  trip
}) => {
  const [selectedDayId, setSelectedDayId] = useState(currentDayId);
  const [time, setTime] = useState('10:00 AM');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ActivityCategory>('sightseeing');
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [thaiAddress, setThaiAddress] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [cost, setCost] = useState<number | ''>(0);
  const [notes, setNotes] = useState('');
  const [booked, setBooked] = useState(false);

  useEffect(() => {
    if (activityToEdit) {
      setTime(activityToEdit.time);
      setTitle(activityToEdit.title);
      setCategory(activityToEdit.category);
      setLocationName(activityToEdit.locationName);
      setLocationAddress(activityToEdit.locationAddress || '');
      setThaiAddress(activityToEdit.thaiAddress || '');
      setGoogleMapsUrl(activityToEdit.googleMapsUrl || '');
      setCost(activityToEdit.cost !== undefined ? activityToEdit.cost : 0);
      setNotes(activityToEdit.notes || '');
      setBooked(Boolean(activityToEdit.booked));
    } else {
      setTime('10:00 AM');
      setTitle('');
      setCategory('sightseeing');
      setLocationName('');
      setLocationAddress('');
      setThaiAddress('');
      setGoogleMapsUrl('');
      setCost(0);
      setNotes('');
      setBooked(false);
    }
    setSelectedDayId(currentDayId);
  }, [activityToEdit, currentDayId, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let mapsUrl = googleMapsUrl.trim();
    if (!mapsUrl && locationName.trim()) {
      mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(locationName.trim() + ' ' + trip.destination)}`;
    }

    const activity: ActivityItem = {
      id: activityToEdit ? activityToEdit.id : `act-${Date.now()}`,
      time: time.trim() || '12:00 PM',
      title: title.trim(),
      category,
      locationName: locationName.trim() || title.trim(),
      locationAddress: locationAddress.trim() || undefined,
      thaiAddress: thaiAddress.trim() || undefined,
      googleMapsUrl: mapsUrl || undefined,
      cost: cost === '' ? 0 : Number(cost),
      currency: trip.currency,
      notes: notes.trim() || undefined,
      booked
    };

    onSave(selectedDayId, activity);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 sticky top-0 bg-slate-900/95 backdrop-blur z-10">
          <div>
            <h3 className="text-xl font-bold text-white">
              {activityToEdit ? 'Edit Activity' : 'Add New Activity'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Customize details, maps, and local addresses</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Day & Time Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Day Schedule
              </label>
              <select
                value={selectedDayId}
                onChange={(e) => setSelectedDayId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 transition"
              >
                {trip.days.map((day: DaySchedule) => (
                  <option key={day.id} value={day.id}>
                    Day {day.dayNumber}: {day.dayOfWeek}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" /> Time
              </label>
              <input
                type="text"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="e.g. 09:30 AM"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 transition"
                required
              />
            </div>
          </div>

          {/* Activity Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Activity Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Wat Arun (Temple of Dawn) Visit"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 transition"
              required
            />
          </div>

          {/* Category Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Category
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {(Object.keys(categoryMetaMap) as ActivityCategory[]).map((catKey) => {
                const meta = categoryMetaMap[catKey];
                const Icon = meta.icon;
                const isSelected = category === catKey;
                return (
                  <button
                    type="button"
                    key={catKey}
                    onClick={() => setCategory(catKey)}
                    className={`flex items-center gap-2 p-2 rounded-xl text-xs font-medium border transition ${
                      isSelected
                        ? `${meta.badgeBg} ${meta.textColor} ${meta.borderColor} ring-1 ring-emerald-500/50`
                        : 'bg-slate-800/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{meta.label.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Location & Map */}
          <div className="space-y-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Location / Venue Name
              </label>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. Wat Arun Ratchawararam"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Languages className="w-3.5 h-3.5 text-amber-400" /> Thai Address / Show Driver Note
              </label>
              <input
                type="text"
                value={thaiAddress}
                onChange={(e) => setThaiAddress(e.target.value)}
                placeholder="e.g. วัดอรุณราชวราราม (ถนนวังเดิม)"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-amber-200 text-sm focus:outline-none focus:border-amber-500 transition"
              />
              <p className="text-[11px] text-slate-400 mt-1">Useful to show Bangkok taxi/Grab drivers</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-sky-400" /> Google Maps Link (Optional)
              </label>
              <input
                type="url"
                value={googleMapsUrl}
                onChange={(e) => setGoogleMapsUrl(e.target.value)}
                placeholder="https://maps.google.com/..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          </div>

          {/* Cost & Booking */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Estimated Cost ({trip.currency})
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={cost}
                onChange={(e) => setCost(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div className="flex items-center pt-6">
              <label className="relative flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={booked}
                  onChange={(e) => setBooked(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition ${
                  booked ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-slate-800 border-slate-700 text-transparent'
                }`}>
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-slate-200">Already Booked / Reserved</span>
              </label>
            </div>
          </div>

          {/* Notes & Tips */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" /> Notes, Tips & Reminders
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Dress code: covered shoulders and knees. Bring umbrella for afternoon sun."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 transition resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-xl text-sm transition shadow-lg shadow-emerald-500/20"
            >
              {activityToEdit ? 'Save Changes' : 'Add Activity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
