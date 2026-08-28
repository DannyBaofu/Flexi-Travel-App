import React, { useState } from 'react';
import { X, Plus, Sparkles, Compass } from 'lucide-react';
import { createNewTrip } from '../data/defaultTrips';
import { bangkokDefaultTrip } from '../data/bangkokTrip';
import type { Trip } from '../types/travel';
import { useI18n } from '../utils/i18n';

interface NewTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTrip: (newTrip: Trip) => void;
}

export const NewTripModal: React.FC<NewTripModalProps> = ({
  isOpen,
  onClose,
  onCreateTrip
}) => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'custom' | 'templates'>('custom');
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [country, setCountry] = useState('');
  const [startDate, setStartDate] = useState('2026-10-05');
  const [endDate, setEndDate] = useState('2026-10-10');
  const [currency, setCurrency] = useState('THB');

  if (!isOpen) return null;

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !destination.trim()) return;

    const trip = createNewTrip(
      title.trim(),
      destination.trim(),
      country.trim() || destination.trim(),
      startDate,
      endDate,
      currency.trim().toUpperCase() || 'USD'
    );
    onCreateTrip(trip);
    onClose();
  };

  const handleSelectTemplate = () => {
    const clonedBkk: Trip = {
      ...structuredClone(bangkokDefaultTrip),
      id: `trip-bkk-${Date.now()}`,
      title: `Bangkok Trip (Copy ${new Date().toLocaleDateString()})`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    onCreateTrip(clonedBkk);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{t('createNewTrip')}</h2>
              <p className="text-xs text-slate-400">{t('newTripSubtitle')}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="flex p-3 bg-slate-950 border-b border-slate-800 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('custom')}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition ${
              activeTab === 'custom'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-4 h-4" /> {t('customTrip')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('templates')}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition ${
              activeTab === 'templates'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" /> {t('tripTemplates')}
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'custom' ? (
          <form onSubmit={handleCreateCustom} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">{t('tripNameRequired')}</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('tripNamePlaceholder')}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{t('destinationCity')}</label>
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
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
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

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">{t('destCurrencyCode')}</label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                placeholder="THB, JPY, EUR, USD..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm uppercase focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
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
                {t('createTrip')}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6 space-y-3">
            <button
              onClick={handleSelectTemplate}
              className="w-full p-4 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-2xl text-left flex items-center justify-between group transition"
            >
              <div className="space-y-1">
                <div className="text-sm font-bold text-white group-hover:text-emerald-400 transition flex items-center gap-1.5">
                  <span>🇹🇭 Bangkok 5-Day Explorer (5th - 10th)</span>
                </div>
                <p className="text-xs text-slate-400">{t('bkkTemplateDesc')}</p>
              </div>
              <span className="text-xs text-emerald-400 font-semibold shrink-0 ml-3">{t('useTemplate')}</span>
            </button>

          </div>
        )}
      </div>
    </div>
  );
};
