import React, { useState, useEffect } from 'react';
import { MapPin, Clock, Check, Languages, Globe, CalendarPlus } from 'lucide-react';
import type { ActivityItem, ActivityCategory, DaySchedule, Trip } from '../types/travel';
import { categoryMetaMap } from '../utils/categoryHelpers';
import { useI18n, translateWeekday } from '../utils/i18n';
import { Modal, btnPrimary, btnGhost, input, inputMono, select, label } from './ui';

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={activityToEdit ? t('editActivity') : t('addNewActivity')}
      subtitle={t('activityModalSubtitle')}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={label}>{t('daySchedule')}</label>
            <select
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
            <label className={`${label} flex items-center gap-1.5`}>
              <Clock className="w-3.5 h-3.5" /> {t('time')}
            </label>
            <input
              type="text"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              placeholder={t('timePlaceholder')}
              className={input}
              required
            />
          </div>
        </div>

        <div>
          <label className={label}>{t('activityTitleLabel')}</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('activityTitlePlaceholder')}
            className={input}
            required
          />
        </div>

        <div>
          <label className={label}>{t('category')}</label>
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

        <div className="space-y-3">
          <div>
            <label className={`${label} flex items-center gap-1.5`}>
              <MapPin className="w-3.5 h-3.5" /> {t('locationVenue')}
            </label>
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder={t('locationPlaceholder')}
              className={input}
            />
          </div>

          <div>
            <label className={`${label} flex items-center gap-1.5`}>
              <Languages className="w-3.5 h-3.5 text-gilt" /> {t('thaiAddressLabel')}
            </label>
            <input
              type="text"
              value={thaiAddress}
              onChange={(e) => setThaiAddress(e.target.value)}
              placeholder="e.g. วัดอรุณราชวราราม (ถนนวังเดิม)"
              className={`${input} thai-display`}
            />
            <p className="text-[11px] text-faint mt-1.5 leading-relaxed">{t('thaiAddressHint')}</p>
          </div>

          <div>
            <label className={`${label} flex items-center gap-1.5`}>
              <Globe className="w-3.5 h-3.5" /> {t('gmapsLinkLabel')}
            </label>
            <input
              type="url"
              value={googleMapsUrl}
              onChange={(e) => setGoogleMapsUrl(e.target.value)}
              placeholder="https://maps.google.com/..."
              className={`${input} break-all`}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
          <div>
            <label className={label}>{t('estCostLabel', { cur: trip.currency })}</label>
            <input
              type="number"
              min="0"
              step="any"
              value={cost}
              onChange={(e) => setCost(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0"
              className={inputMono}
            />
          </div>

          <button
            type="button"
            onClick={() => setBooked(!booked)}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-control border text-sm font-medium transition ${
              booked
                ? 'bg-gilt-tint border-gilt/25 text-gilt'
                : 'bg-paper border-hairline text-muted hover:bg-mist'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-[6px] border flex items-center justify-center shrink-0 ${
                booked ? 'bg-gilt border-gilt text-white' : 'bg-paper border-hairline text-transparent'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
            </span>
            {t('alreadyBooked')}
          </button>
        </div>

        <div>
          <label className={label}>{t('notesTips')}</label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('notesPlaceholder')}
            className={`${input} resize-none`}
          />
        </div>
      </form>
    </Modal>
  );
};
