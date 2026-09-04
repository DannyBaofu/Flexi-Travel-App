import React, { useState, useEffect } from 'react';
import { X, Sliders, Calendar, DollarSign, Image, Users, Plus, Trash2 } from 'lucide-react';
import type { Trip, Traveler, TripRole, SeatClaim } from '../types/travel';
import { useI18n } from '../utils/i18n';
import { reconcileDays } from '../services/tripDays';
import { fetchSeatClaims, releaseSeat, setSeatRole } from '../services/cloudSync';
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
  role: TripRole;
  cloudMode: boolean;
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
  role,
  cloudMode,
  onSave,
  onDeleteTrip
}) => {
  const isAdmin = role === 'admin';
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
  const [claims, setClaims] = useState<SeatClaim[]>([]);
  const [seatError, setSeatError] = useState<string | null>(null);

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

  // Who currently holds each name. Only the server knows, and only for a trip
  // that is actually in the cloud.
  useEffect(() => {
    if (!isOpen || !cloudMode) return;
    let cancelled = false;
    fetchSeatClaims(trip.id)
      .then(rows => { if (!cancelled) setClaims(rows); })
      .catch(e => console.error('Could not read seat claims:', e));
    return () => { cancelled = true; };
  }, [isOpen, cloudMode, trip.id]);

  const handleAddTraveler = () => {
    if (!newTravelerName.trim()) return;
    const newTraveler: Traveler = {
      id: `t-${Date.now()}`,
      name: newTravelerName.trim(),
      avatarColor: AVATAR_COLORS[travelers.length % AVATAR_COLORS.length],
      role: 'member'
    };
    setTravelers([...travelers, newTraveler]);
    setNewTravelerName('');
  };

  const describeFailure = (e: unknown) =>
    t('rosterActionFailed', { msg: (e as { message?: string })?.message || String(e) });

  const handleRenameTraveler = (id: string, name: string) => {
    setTravelers(prev => prev.map(tv => (tv.id === id ? { ...tv, name } : tv)));
  };

  const handleRemoveTraveler = (id: string) => {
    if (travelers.length <= 1) return; // Keep at least one traveler
    setTravelers(travelers.filter(tv => tv.id !== id));

    // Taking the name off the roster has to take the access with it, or the
    // person keeps a live membership for a trip they are no longer on.
    if (cloudMode && claims.some(c => c.travelerId === id)) {
      setClaims(prev => prev.filter(c => c.travelerId !== id));
      releaseSeat(trip.id, id).catch(e => setSeatError(describeFailure(e)));
    }
  };

  /**
   * An unclaimed seat's role is only an intention, saved with the trip. A
   * claimed one is a permission somebody is holding right now, so it changes
   * on the server immediately rather than waiting for Save.
   */
  const handleRoleChange = async (travelerId: string, nextRole: TripRole) => {
    setTravelers(prev => prev.map(tv => (tv.id === travelerId ? { ...tv, role: nextRole } : tv)));
    if (!cloudMode || !claims.some(c => c.travelerId === travelerId)) return;
    try {
      await setSeatRole(trip.id, travelerId, nextRole);
      setClaims(prev =>
        prev.map(c => (c.travelerId === travelerId ? { ...c, role: nextRole } : c))
      );
      setSeatError(null);
    } catch (e) {
      setSeatError(describeFailure(e));
    }
  };

  const handleRelease = async (traveler: Traveler) => {
    if (!window.confirm(t('rosterReleaseConfirm', { name: traveler.name }))) return;
    try {
      await releaseSeat(trip.id, traveler.id);
      setClaims(prev => prev.filter(c => c.travelerId !== traveler.id));
      setSeatError(null);
    } catch (e) {
      setSeatError(describeFailure(e));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Days used to be generated once and never revisited, so changing the
    // dates left the itinerary at its old length and each day carrying its
    // old date. Reconcile, and say so when a planned day had to be kept.
    const { days, keptWithActivities } = reconcileDays(trip.days || [], startDate, endDate);
    if (keptWithActivities > 0) {
      window.alert(t('daysKeptWarning', { n: keptWithActivities }));
    }

    onSave({
      ...trip,
      days,
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
            <label className={label} htmlFor="settings-title">{t('tripNameLabel')}</label>
            <input
              id="settings-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={input}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={label} htmlFor="settings-destination">{t('destinationCityLabel')}</label>
              <input
                id="settings-destination"
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className={input}
                required
              />
            </div>
            <div>
              <label className={label} htmlFor="settings-country">{t('country')}</label>
              <input
                id="settings-country"
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
              <label className={label} htmlFor="settings-start">{t('startDate')}</label>
              <input
                id="settings-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={input}
                required
              />
            </div>
            <div>
              <label className={label} htmlFor="settings-end">{t('endDate')}</label>
              <input
                id="settings-end"
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
              <label className={label} htmlFor="settings-currency">{t('destCurrencyLabel')}</label>
              <input
                id="settings-currency"
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                className={`${inputMono} uppercase`}
                required
              />
            </div>
            <div>
              <label className={label} htmlFor="settings-home-currency">{t('homeCurrencyLabel')}</label>
              <input
                id="settings-home-currency"
                type="text"
                value={homeCurrency}
                onChange={(e) => setHomeCurrency(e.target.value.toUpperCase())}
                className={`${inputMono} uppercase`}
                required
              />
            </div>
            <div>
              <label className={label} htmlFor="settings-rate">
                1 {homeCurrency} = ? {currency}
              </label>
              <input
                id="settings-rate"
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

          {cloudMode && isAdmin && (
            <p className="text-[11px] text-faint leading-relaxed">{t('rosterCloudHint')}</p>
          )}

          <ul className="space-y-2">
            {travelers.map((traveler) => {
              const claim = claims.find(c => c.travelerId === traveler.id);
              // Two permissions: organiser and traveller. Admin is only
              // offered where it can actually be granted — a free seat is
              // clamped to member when somebody claims it, so promoting one
              // in advance would be a promise the server does not keep.
              const roleOptions: TripRole[] = claim ? ['admin', 'member'] : ['member'];

              return (
                <li
                  key={traveler.id}
                  className="bg-mist border border-hairline rounded-control px-3 py-2.5 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: traveler.avatarColor }}
                    />
                    <input
                      type="text"
                      value={traveler.name}
                      onChange={(e) => handleRenameTraveler(traveler.id, e.target.value)}
                      aria-label={t('travelerNameLabel')}
                      className={`${input} py-1.5 text-sm font-medium flex-1 min-w-0`}
                    />

                    {cloudMode && (
                      <span
                        className={`text-[11px] shrink-0 ${claim ? 'text-brand font-medium' : 'text-faint'}`}
                      >
                        {claim
                          ? claim.isMe ? t('rosterYou') : t('rosterStatusTaken')
                          : t('rosterStatusFree')}
                      </span>
                    )}

                    {travelers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTraveler(traveler.id)}
                        className="w-11 h-11 shrink-0 inline-flex items-center justify-center rounded-full text-faint hover:text-clay hover:bg-clay-tint transition"
                        title={t('deleteItem')}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted shrink-0">{t('rosterPermission')}</span>
                      {roleOptions.length > 1 ? (
                        <select
                          aria-label={`${traveler.name} — ${t('rosterPermission')}`}
                          value={claim?.role ?? traveler.role ?? 'member'}
                          onChange={(e) => handleRoleChange(traveler.id, e.target.value as TripRole)}
                          className={`${input} py-1.5 min-h-11 text-xs flex-1 min-w-0`}
                        >
                          {roleOptions.map(opt => (
                            <option key={opt} value={opt}>
                              {t(opt === 'admin' ? 'seatRoleAdmin' : 'seatRoleMember')}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-ink flex-1 min-w-0 truncate">
                          {t('seatRoleMember')}
                        </span>
                      )}
                      {claim && !claim.isMe && (
                        <button
                          type="button"
                          onClick={() => handleRelease(traveler)}
                          className={`${btnSecondarySm} shrink-0`}
                        >
                          {t('rosterRelease')}
                        </button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {seatError && (
            <p className="px-3 py-2.5 bg-clay-tint rounded-control text-xs text-clay leading-relaxed">
              {seatError}
            </p>
          )}

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
              aria-label={t('addFriendPlaceholder')}
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
            aria-label={t('coverPhotoUrl')}
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
