import React, { useState, useEffect } from 'react';
import { X, Sliders, Calendar, DollarSign, Image, Users, Plus, Trash2 } from 'lucide-react';
import type { Trip, Traveler } from '../types/travel';
import { useI18n } from '../utils/i18n';
import {
  Modal,
  btnPrimary,
  btnGhost,
  btnDanger,
  btnSecondarySm,
  input,
  inputMono,
  label
} from './ui';

interface TripSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  onSave: (updatedTrip: Trip) => void;
  onDeleteTrip: (tripId: string) => void;
}

const COVER_PRESETS = [
  { name: 'Bangkok Temples', url: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1600&q=80' },
  { name: 'Bangkok Skyline', url: 'https://images.unsplash.com/photo-1563492065599-3580f777d666?auto=format&fit=crop&w=1600&q=80' },
  { name: 'Tropical Beach', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80' },
  { name: 'Tokyo Neon', url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1600&q=80' },
  { name: 'European City', url: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=1600&q=80' },
  { name: 'Mountain Adventure', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=80' }
];

// Deep enough to carry white initials on a white page.
const AVATAR_COLORS = ['#3930DB', '#B42318', '#8A5D0B', '#0F766E', '#6D28D9', '#1D4ED8', '#BE185D', '#4D7C0F'];

const sectionHeading = 'text-[11px] font-semibold text-faint uppercase tracking-wider flex items-center gap-1.5';

export const TripSettingsModal: React.FC<TripSettingsModalProps> = ({
  isOpen,
  onClose,
  trip,
  onSave,
  onDeleteTrip
}) => {
  const { t } = useI18n();
  const [title, setTitle] = useState(trip.title);
  const [destination, setDestination] = useState(trip.destination);
  const [country, setCountry] = useState(trip.country);
  const [startDate, setStartDate] = useState(trip.startDate);
  const [endDate, setEndDate] = useState(trip.endDate);
  const [currency, setCurrency] = useState(trip.currency);
  const [homeCurrency, setHomeCurrency] = useState(trip.homeCurrency || 'USD');
  const [exchangeRate, setExchangeRate] = useState(trip.exchangeRate || 1);
  const [coverImage, setCoverImage] = useState(trip.coverImage);
  const [travelers, setTravelers] = useState<Traveler[]>(trip.travelers || []);
  const [newTravelerName, setNewTravelerName] = useState('');

  useEffect(() => {
    setTitle(trip.title);
    setDestination(trip.destination);
    setCountry(trip.country);
    setStartDate(trip.startDate);
    setEndDate(trip.endDate);
    setCurrency(trip.currency);
    setHomeCurrency(trip.homeCurrency || 'USD');
    setExchangeRate(trip.exchangeRate || 1);
    setCoverImage(trip.coverImage);
    setTravelers(trip.travelers || []);
  }, [trip, isOpen]);

  const handleAddTraveler = () => {
    if (!newTravelerName.trim()) return;
    const newTraveler: Traveler = {
      id: `t-${Date.now()}`,
      name: newTravelerName.trim(),
      avatarColor: AVATAR_COLORS[travelers.length % AVATAR_COLORS.length]
    };
    setTravelers([...travelers, newTraveler]);
    setNewTravelerName('');
  };

  const handleRemoveTraveler = (id: string) => {
    if (travelers.length <= 1) return; // Keep at least one traveler
    setTravelers(travelers.filter(tv => tv.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...trip,
      title: title.trim(),
      destination: destination.trim(),
      country: country.trim(),
      startDate,
      endDate,
      currency: currency.trim().toUpperCase(),
      homeCurrency: homeCurrency.trim().toUpperCase(),
      exchangeRate: Number(exchangeRate) || 1,
      coverImage: coverImage.trim(),
      travelers,
      updatedAt: new Date().toISOString()
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('tripSettingsTitle')}
      subtitle={t('tripSettingsSubtitle')}
      icon={<Sliders className="w-5 h-5" />}
      closeLabel={t('close')}
      size="lg"
      footer={
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              if (window.confirm(t('confirmDeleteTrip', { title: trip.title }))) {
                onDeleteTrip(trip.id);
                onClose();
              }
            }}
            className={btnDanger}
          >
            <Trash2 className="w-4 h-4" /> {t('deleteTrip')}
          </button>

          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className={btnGhost}>
              {t('cancel')}
            </button>
            <button type="submit" form="trip-settings-form" className={btnPrimary}>
              {t('saveSettings')}
            </button>
          </div>
        </div>
      }
    >
      <form id="trip-settings-form" onSubmit={handleSubmit} className="p-5 space-y-6">
        {/* General */}
        <section className="space-y-3">
          <h3 className={sectionHeading}>{t('generalInfo')}</h3>
          <div>
            <label className={label}>{t('tripNameLabel')}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={input}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={label}>{t('destinationCityLabel')}</label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className={input}
                required
              />
            </div>
            <div>
              <label className={label}>{t('country')}</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className={input}
                required
              />
            </div>
          </div>
        </section>

        {/* Dates */}
        <section className="space-y-3 pt-5 border-t border-hairline">
          <h3 className={sectionHeading}>
            <Calendar className="w-3.5 h-3.5" /> {t('travelDates')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={label}>{t('startDate')}</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={input}
                required
              />
            </div>
            <div>
              <label className={label}>{t('endDate')}</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={input}
                required
              />
            </div>
          </div>
        </section>

        {/* Currencies */}
        <section className="space-y-3 pt-5 border-t border-hairline">
          <h3 className={sectionHeading}>
            <DollarSign className="w-3.5 h-3.5" /> {t('currenciesRate')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={label}>{t('destCurrencyLabel')}</label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                className={`${inputMono} uppercase`}
                required
              />
            </div>
            <div>
              <label className={label}>{t('homeCurrencyLabel')}</label>
              <input
                type="text"
                value={homeCurrency}
                onChange={(e) => setHomeCurrency(e.target.value.toUpperCase())}
                placeholder="USD"
                className={`${inputMono} uppercase`}
                required
              />
            </div>
            <div>
              <label className={label}>1 {homeCurrency} = ? {currency}</label>
              <input
                type="number"
                step="any"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(Number(e.target.value))}
                className={inputMono}
                required
              />
            </div>
          </div>
        </section>

        {/* Travelers */}
        <section className="space-y-3 pt-5 border-t border-hairline">
          <h3 className={sectionHeading}>
            <Users className="w-3.5 h-3.5" /> {t('travelersCompanions')}
          </h3>

          <div className="flex flex-wrap gap-2">
            {travelers.map((traveler) => (
              <div
                key={traveler.id}
                className="flex items-center gap-2 bg-mist border border-hairline pl-3 pr-1.5 py-1.5 rounded-control text-sm"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: traveler.avatarColor }}
                />
                <span className="text-ink font-medium">{traveler.name}</span>
                {travelers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveTraveler(traveler.id)}
                    className="w-6 h-6 inline-flex items-center justify-center rounded-full text-faint hover:text-clay hover:bg-clay-tint transition"
                    title={t('deleteItem')}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newTravelerName}
              onChange={(e) => setNewTravelerName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTraveler();
                }
              }}
              placeholder={t('addFriendPlaceholder')}
              className={`${input} flex-1`}
            />
            <button type="button" onClick={handleAddTraveler} className={`${btnSecondarySm} shrink-0 py-2.5`}>
              <Plus className="w-3.5 h-3.5" /> {t('add')}
            </button>
          </div>
        </section>

        {/* Cover photo */}
        <section className="space-y-3 pt-5 border-t border-hairline">
          <h3 className={sectionHeading}>
            <Image className="w-3.5 h-3.5" /> {t('coverPhoto')}
          </h3>

          <input
            type="url"
            value={coverImage}
            onChange={(e) => setCoverImage(e.target.value)}
            className={`${input} break-all`}
          />

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {COVER_PRESETS.map((preset, idx) => (
              <button
                type="button"
                key={idx}
                onClick={() => setCoverImage(preset.url)}
                title={preset.name}
                className={`relative rounded-control overflow-hidden aspect-video border-2 transition ${
                  coverImage === preset.url
                    ? 'border-brand'
                    : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </section>
      </form>
    </Modal>
  );
};
