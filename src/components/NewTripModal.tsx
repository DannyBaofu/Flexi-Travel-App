import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { createNewTrip } from '../data/defaultTrips';
import type { Trip } from '../types/travel';
import { useI18n } from '../utils/i18n';
import { Modal, btnPrimary, btnGhost, input, inputMono, label } from './ui';

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
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [country, setCountry] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currency, setCurrency] = useState('');

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !destination.trim()) return;

    const trip = createNewTrip(
      title.trim(),
      destination.trim(),
      country.trim() || destination.trim(),
      startDate,
      endDate,
      currency.trim().toUpperCase() || 'USD',
      t('travelerMeDefault')
    );
    onCreateTrip(trip);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('createNewTrip')}
      subtitle={t('newTripSubtitle')}
      icon={<Plus className="w-5 h-5" />}
      closeLabel={t('close')}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className={btnGhost}>
            {t('cancel')}
          </button>
          <button type="submit" form="new-trip-form" className={btnPrimary}>
            {t('createTrip')}
          </button>
        </div>
      }
    >
      <form id="new-trip-form" onSubmit={handleCreateCustom} className="p-5 space-y-4">
        <div>
          <label className={label} htmlFor="new-trip-title">{t('tripNameRequired')}</label>
          <input
            id="new-trip-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={input}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={label} htmlFor="new-trip-destination">{t('destinationCity')}</label>
            <input
              id="new-trip-destination"
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className={input}
              required
            />
          </div>
          <div>
            <label className={label} htmlFor="new-trip-country">{t('country')}</label>
            <input
              id="new-trip-country"
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className={input}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={label} htmlFor="new-trip-start">{t('startDate')}</label>
            <input
              id="new-trip-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={input}
              required
            />
          </div>
          <div>
            <label className={label} htmlFor="new-trip-end">{t('endDate')}</label>
            <input
              id="new-trip-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={input}
              required
            />
          </div>
        </div>

        <div>
          <label className={label} htmlFor="new-trip-currency">{t('destCurrencyCode')}</label>
          <input
            id="new-trip-currency"
            type="text"
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            className={`${inputMono} uppercase`}
          />
        </div>
      </form>
    </Modal>
  );
};
