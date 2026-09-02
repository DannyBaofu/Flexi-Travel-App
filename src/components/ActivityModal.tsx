import React, { useState, useEffect } from 'react';
import { MapPin, Clock, CalendarPlus } from 'lucide-react';
import type { ActivityItem, ActivityCategory, DaySchedule, Trip } from '../types/travel';
import { categoryMetaMap } from '../utils/categoryHelpers';
import { mapsUrlFor, type PlaceSuggestion } from '../services/placeSearch';
import { useI18n, translateWeekday } from '../utils/i18n';
import { Modal, btnPrimary, btnGhost, input, inputMono, select, label } from './ui';
import { LocationInput } from './LocationInput';

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
  const { lang, t } = useI18n();
  const [selectedDayId, setSelectedDayId] = useState(currentDayId);
  const [time, setTime] = useState('10:00');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ActivityCategory>('sightseeing');
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [cost, setCost] = useState<number | ''>(0);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (activityToEdit) {
      setTime(activityToEdit.time);
      setTitle(activityToEdit.title);
      setCategory(activityToEdit.category);
      setLocationName(activityToEdit.locationName);
      setLocationAddress(activityToEdit.locationAddress || '');
      setGoogleMapsUrl(activityToEdit.googleMapsUrl || '');
      setCost(activityToEdit.cost !== undefined ? activityToEdit.cost : 0);
      setNotes(activityToEdit.notes || '');
    } else {
      setTime('10:00');
      setTitle('');
      setCategory('sightseeing');
      setLocationName('');
      setLocationAddress('');
      setGoogleMapsUrl('');
      setCost(0);
      setNotes('');
    }
    setSelectedDayId(currentDayId);
  }, [activityToEdit, currentDayId, isOpen]);

  /** Picking a suggestion fills the address and an exact map pin for free. */
  const handlePickPlace = (place: PlaceSuggestion) => {
    setLocationName(place.name);
    setLocationAddress(place.address);
    setGoogleMapsUrl(mapsUrlFor(place));
    if (!title.trim()) setTitle(place.name);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const activity: ActivityItem = {
      id: activityToEdit ? activityToEdit.id : `act-${Date.now()}`,
      time: time.trim() || '12:00',
      title: title.trim(),
      category,
      locationName: locationName.trim() || title.trim(),
      locationAddress: locationAddress.trim() || undefined,
      googleMapsUrl: googleMapsUrl.trim() || undefined,
      cost: cost === '' ? 0 : Number(cost),
      currency: trip.currency,
      notes: notes.trim() || undefined
    };

    onSave(selectedDayId, activity);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={activityToEdit ? t('editActivity') : t('addNewActivity')}
      icon={<CalendarPlus className="w-5 h-5" />}
      closeLabel={t('close')}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className={btnGhost}>
            {t('cancel')}
          </button>
          <button type="submit" form="activity-form" className={btnPrimary}>
            {activityToEdit ? t('saveChanges') : t('addActivity')}
          </button>
        </div>
      }
    >
      <form id="activity-form" onSubmit={handleSubmit} className="p-5 space-y-4">
        <div>
          <label className={label} htmlFor="activity-title">{t('activityTitleLabel')}</label>
          <input
            id="activity-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={input}
            required
          />
        </div>

        {/* Type a place, pick it off the list, and the address and map link
            come with it. Typing freely still works. */}
        <div>
          <label className={`${label} flex items-center gap-1.5`} htmlFor="activity-location">
            <MapPin className="w-3.5 h-3.5" /> {t('locationVenue')}
          </label>
          <LocationInput
            id="activity-location"
            value={locationName}
            onChange={setLocationName}
            onPick={handlePickPlace}
            near={trip.destination}
          />
          {locationAddress && (
            <p className="text-[11px] text-muted mt-1.5 leading-relaxed">{locationAddress}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={label} htmlFor="activity-day">{t('daySchedule')}</label>
            <select
              id="activity-day"
              value={selectedDayId}
              onChange={(e) => setSelectedDayId(e.target.value)}
              className={select}
            >
              {trip.days.map((day: DaySchedule) => (
                <option key={day.id} value={day.id}>
                  {t('dayN', { n: day.dayNumber })}: {translateWeekday(day.dayOfWeek, lang)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={`${label} flex items-center gap-1.5`} htmlFor="activity-time">
              <Clock className="w-3.5 h-3.5" /> {t('time')}
            </label>
            <input
              id="activity-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className={input}
              required
            />
          </div>
        </div>

        <div>
          <span className={label}>{t('category')}</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(Object.keys(categoryMetaMap) as ActivityCategory[]).map((catKey) => {
              const meta = categoryMetaMap[catKey];
              const Icon = meta.icon;
              const isSelected = category === catKey;
              return (
                <button
                  type="button"
                  key={catKey}
                  onClick={() => setCategory(catKey)}
                  aria-pressed={isSelected}
                  className={`flex items-center gap-2 px-2.5 py-2.5 rounded-control text-xs font-medium border transition ${
                    isSelected
                      ? 'bg-brand-tint border-brand-tint text-brand'
                      : 'bg-paper border-hairline text-muted hover:bg-mist'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    {lang === 'zh' ? meta.labelZh : meta.label.split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className={label} htmlFor="activity-cost">
            {t('estCostLabel', { cur: trip.currency })}
          </label>
          <input
            id="activity-cost"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={cost}
            onChange={(e) => setCost(e.target.value === '' ? '' : Number(e.target.value))}
            className={inputMono}
          />
        </div>

        <div>
          <label className={label} htmlFor="activity-notes">{t('notesTips')}</label>
          <textarea
            id="activity-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={`${input} resize-none`}
          />
        </div>
      </form>
    </Modal>
  );
};
