import React, { useState, useEffect } from 'react';
import { X, Sliders, Calendar, DollarSign, Image, Users, Plus, Trash2 } from 'lucide-react';
import type { Trip, Traveler } from '../types/travel';
import { useI18n } from '../utils/i18n';

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

const AVATAR_COLORS = ['#10b981', '#0ea5e9', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#14b8a6', '#6366f1'];

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

  if (!isOpen) return null;

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
    setTravelers(travelers.filter(t => t.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedTrip: Trip = {
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
    };
    onSave(updatedTrip);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 sticky top-0 bg-slate-900/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{t('tripSettingsTitle')}</h2>
              <p className="text-xs text-slate-400">{t('tripSettingsSubtitle')}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Trip Title & Destination */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('generalInfo')}</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">{t('tripNameLabel')}</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Bangkok Adventure 🇹🇭"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{t('destinationCityLabel')}</label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. Bangkok"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{t('country')}</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="e.g. Thailand"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-400" /> {t('travelDates')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{t('startDate')}</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{t('endDate')}</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Currencies & Exchange Rate */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-400" /> {t('currenciesRate')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{t('destCurrencyLabel')}</label>
                <input
                  type="text"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  placeholder="THB"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm uppercase focus:outline-none focus:border-emerald-500 font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{t('homeCurrencyLabel')}</label>
                <input
                  type="text"
                  value={homeCurrency}
                  onChange={(e) => setHomeCurrency(e.target.value.toUpperCase())}
                  placeholder="USD"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm uppercase focus:outline-none focus:border-emerald-500 font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">1 {homeCurrency} = ? {currency}</label>
                <input
                  type="number"
                  step="any"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(Number(e.target.value))}
                  placeholder="35.5"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 font-mono"
                  required
                />
              </div>
            </div>
          </div>

          {/* Travelers List */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-400" /> {t('travelersCompanions')}
            </h3>

            <div className="flex flex-wrap gap-2 mb-2">
              {travelers.map((traveler) => (
                <div
                  key={traveler.id}
                  className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl text-sm"
                >
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: traveler.avatarColor }}
                  />
                  <span className="text-slate-200 font-medium">{traveler.name}</span>
                  {travelers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTraveler(traveler.id)}
                      className="text-slate-400 hover:text-red-400 ml-1"
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
                placeholder={t('addFriendPlaceholder')}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={handleAddTraveler}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 rounded-xl text-xs font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> {t('add')}
              </button>
            </div>
          </div>

          {/* Cover Photo */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Image className="w-4 h-4 text-emerald-400" /> {t('coverPhoto')}
            </h3>

            <div>
              <input
                type="url"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {COVER_PRESETS.map((preset, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setCoverImage(preset.url)}
                  className={`relative rounded-xl overflow-hidden aspect-video border transition ${
                    coverImage === preset.url ? 'ring-2 ring-emerald-500 border-transparent' : 'border-slate-800 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                  <span className="absolute inset-x-0 bottom-0 bg-black/60 text-[9px] text-white p-0.5 truncate text-center">
                    {preset.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (window.confirm(t('confirmDeleteTrip', { title: trip.title }))) {
                  onDeleteTrip(trip.id);
                  onClose();
                }
              }}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-red-500/10 transition"
            >
              <Trash2 className="w-4 h-4" /> {t('deleteTrip')}
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-emerald-500/20"
              >
                {t('saveSettings')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
