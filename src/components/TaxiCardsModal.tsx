import React, { useEffect, useState } from 'react';
import { X, Car, Plus, Trash2, Sparkles, Navigation, Maximize2 } from 'lucide-react';
import type { TaxiCard, Trip, TripRole } from '../types/travel';
import { useI18n } from '../utils/i18n';
import {
  Modal,
  btnPrimary,
  btnGhost,
  btnSecondarySm,
  cardFlat,
  input,
  label,
  iconBtn
} from './ui';

interface TaxiCardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  onUpdateTrip: (updatedTrip: Trip) => void;
  role: TripRole;
}

const COMMON_THAI_PHRASES = [
  { th: 'กรุณาเปิดมิเตอร์ด้วยครับ / ค่ะ', en: 'Please turn on the taxi meter', zh: '请打表（按计价器收费）', pronunciation: 'Ka-ru-na perd meter duay khrup/kha' },
  { th: 'จอดตรงนี้ครับ / ค่ะ', en: 'Please stop here / Drop off here', zh: '请在这里停车 / 下车', pronunciation: 'Jord dtrong-nee khrup/kha' },
  { th: 'เลี้ยวซ้าย / เลี้ยวขวา', en: 'Turn Left / Turn Right', zh: '左转 / 右转', pronunciation: 'Liao sai / Liao khwa' },
  { th: 'ตรงไป', en: 'Go straight', zh: '直走', pronunciation: 'Dtrong bpai' },
  { th: 'ขึ้นทางด่วนครับ / ค่ะ', en: 'Take the highway / Expressway', zh: '请走高速 / 快速路', pronunciation: 'Khuen thang-duan khrup/kha' },
  { th: 'ขอบคุณครับ / ค่ะ', en: 'Thank you very much', zh: '非常感谢', pronunciation: 'Khawp khun khrup/kha' }
];

export const TaxiCardsModal: React.FC<TaxiCardsModalProps> = ({
  isOpen,
  onClose,
  trip,
  onUpdateTrip,
  role
}) => {
  const { lang, t } = useI18n();
  const isAdmin = role === 'admin';
  const canAdd = role !== 'viewer';
  const [selectedCard, setSelectedCard] = useState<TaxiCard | null>(
    trip.taxiCards && trip.taxiCards.length > 0 ? trip.taxiCards[0] : null
  );
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [nameEn, setNameEn] = useState('');
  const [nameTh, setNameTh] = useState('');
  const [addressTh, setAddressTh] = useState('');
  const [station, setStation] = useState('');
  const [driverNote, setDriverNote] = useState('');

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameEn.trim() || !nameTh.trim()) return;

    const newCard: TaxiCard = {
      id: `tc-${Date.now()}`,
      nameEnglish: nameEn.trim(),
      nameThai: nameTh.trim(),
      thaiAddress: addressTh.trim() || nameTh.trim(),
      nearestStation: station.trim() || undefined,
      noteForDriver: driverNote.trim() || undefined
    };

    onUpdateTrip({ ...trip, taxiCards: [...(trip.taxiCards || []), newCard] });
    setSelectedCard(newCard);
    setIsAddingNew(false);
    setNameEn('');
    setNameTh('');
    setAddressTh('');
    setStation('');
    setDriverNote('');
  };

  const handleDeleteCard = (cardId: string) => {
    const updated = { ...trip, taxiCards: (trip.taxiCards || []).filter(c => c.id !== cardId) };
    onUpdateTrip(updated);
    if (selectedCard?.id === cardId) {
      setSelectedCard(updated.taxiCards[0] || null);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={t('taxiModalTitle')}
        subtitle={t('taxiModalSubtitle')}
        icon={<Car className="w-5 h-5" />}
        closeLabel={t('close')}
        size="xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-12">
          {/* Places & handy phrases */}
          <div className="md:col-span-4 p-4 space-y-4 md:border-r border-hairline">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[11px] font-semibold text-faint uppercase tracking-wider">
                {t('destCards')}
              </h3>
              {canAdd && (
                <button onClick={() => setIsAddingNew(true)} className={btnSecondarySm}>
                  <Plus className="w-3.5 h-3.5" /> {t('addPlace')}
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              {trip.taxiCards && trip.taxiCards.length > 0 ? (
                trip.taxiCards.map((card) => {
                  const isSelected = selectedCard?.id === card.id;
                  return (
                    <button
                      key={card.id}
                      onClick={() => {
                        setSelectedCard(card);
                        setIsAddingNew(false);
                      }}
                      className={`w-full text-left p-3 rounded-control border transition ${
                        isSelected
                          ? 'bg-brand-tint border-brand-tint'
                          : 'bg-paper border-hairline hover:bg-mist'
                      }`}
                    >
                      <div className={`text-sm font-semibold truncate ${isSelected ? 'text-brand' : 'text-ink'}`}>
                        {card.nameEnglish}
                      </div>
                      <div className="thai-display text-xs text-muted truncate mt-0.5">{card.nameThai}</div>
                    </button>
                  );
                })
              ) : (
                <p className="text-xs text-faint py-4 text-center">{t('noTaxiCards')}</p>
              )}
            </div>

            <div className="pt-4 border-t border-hairline space-y-2">
              <h3 className="text-[11px] font-semibold text-faint uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> {t('handyPhrases')}
              </h3>
              <div className="space-y-1.5">
                {COMMON_THAI_PHRASES.map((phrase, idx) => (
                  <div key={idx} className={`${cardFlat} p-2.5`}>
                    <div className="thai-display text-sm font-semibold text-ink">{phrase.th}</div>
                    <div className="text-xs text-muted mt-0.5">
                      {lang === 'zh' ? phrase.zh : phrase.en}
                    </div>
                    <div className="text-[11px] text-faint font-mono mt-0.5">{phrase.pronunciation}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Driver view / add form */}
          <div className="md:col-span-8 p-4 sm:p-5 bg-mist min-h-[380px]">
            {isAddingNew ? (
              <form onSubmit={handleAddCard} className="space-y-3.5">
                <h3 className="text-base font-semibold text-ink">{t('addCustomCard')}</h3>

                <div>
                  <label className={label}>{t('placeNameEn')}</label>
                  <input
                    type="text"
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    placeholder="e.g. My Sukhumvit Hotel"
                    className={input}
                    required
                  />
                </div>

                <div>
                  <label className={label}>{t('placeNameTh')}</label>
                  <input
                    type="text"
                    value={nameTh}
                    onChange={(e) => setNameTh(e.target.value)}
                    placeholder="e.g. โรงแรม แกรนด์ สุขุมวิท"
                    className={`${input} thai-display`}
                    required
                  />
                </div>

                <div>
                  <label className={label}>{t('fullThaiAddress')}</label>
                  <textarea
                    rows={2}
                    value={addressTh}
                    onChange={(e) => setAddressTh(e.target.value)}
                    placeholder="e.g. ซอยสุขุมวิท 24 แขวงคลองตัน เขตคลองเตย กรุงเทพฯ"
                    className={`${input} thai-display resize-none`}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={label}>{t('nearestStationLabel')}</label>
                    <input
                      type="text"
                      value={station}
                      onChange={(e) => setStation(e.target.value)}
                      placeholder="e.g. BTS Phrom Phong"
                      className={input}
                    />
                  </div>
                  <div>
                    <label className={label}>{t('noteForDriverLabel')}</label>
                    <input
                      type="text"
                      value={driverNote}
                      onChange={(e) => setDriverNote(e.target.value)}
                      placeholder="e.g. Turn on meter please"
                      className={input}
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button type="button" onClick={() => setIsAddingNew(false)} className={btnGhost}>
                    {t('cancel')}
                  </button>
                  <button type="submit" className={btnPrimary}>{t('saveCard')}</button>
                </div>
              </form>
            ) : selectedCard ? (
              <div className="space-y-4">
                <button
                  onClick={() => setFullscreen(true)}
                  className="w-full text-left bg-paper border border-hairline rounded-card p-5 sm:p-6 shadow-lift hover:border-brand transition"
                >
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">
                      {t('showToLocal')}
                    </span>
                    {selectedCard.nearestStation && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted bg-mist px-2 py-0.5 rounded-full shrink-0">
                        <Navigation className="w-3 h-3" /> {selectedCard.nearestStation}
                      </span>
                    )}
                  </div>

                  <h2 className="thai-display text-2xl sm:text-3xl font-bold text-ink leading-snug select-all">
                    {selectedCard.nameThai}
                  </h2>

                  {selectedCard.thaiAddress && (
                    <p className="thai-display text-base text-muted bg-mist p-3.5 rounded-control mt-3 select-all leading-relaxed">
                      {selectedCard.thaiAddress}
                    </p>
                  )}

                  {selectedCard.noteForDriver && (
                    <p className="text-sm font-medium text-gilt bg-gilt-tint px-3 py-2 rounded-control mt-2.5">
                      {selectedCard.noteForDriver}
                    </p>
                  )}

                  <div className="mt-4 pt-3 border-t border-hairline flex items-center justify-between gap-3 text-xs text-muted">
                    <span className="font-medium truncate">{selectedCard.nameEnglish}</span>
                    <span className="inline-flex items-center gap-1 text-brand shrink-0">
                      <Maximize2 className="w-3.5 h-3.5" /> {t('tapFullscreen')}
                    </span>
                  </div>
                </button>

                <div className="flex items-center justify-between gap-3 text-xs text-muted">
                  <span className="leading-relaxed">{t('taxiTip')}</span>
                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteCard(selectedCard.id)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-control text-clay hover:bg-clay-tint transition shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> {t('deleteCard')}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[320px] text-faint gap-2">
                <Car className="w-10 h-10 text-hairline" />
                <p className="text-sm">{t('selectOrAdd')}</p>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Held up to a driver: maximum size, white ground, nothing else */}
      {fullscreen && selectedCard && (
        <div
          className="fixed inset-0 z-[60] bg-paper flex flex-col animate-fadeIn no-print"
          onClick={() => setFullscreen(false)}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-hairline shrink-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-faint">
              {t('showToLocal')}
            </span>
            <button onClick={() => setFullscreen(false)} className={iconBtn} title={t('close')}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center gap-5 p-6 text-center">
            <h1 className="thai-display text-[32px] sm:text-5xl font-bold text-ink leading-snug select-all">
              {selectedCard.nameThai}
            </h1>
            {selectedCard.thaiAddress && (
              <p className="thai-display text-xl sm:text-2xl text-muted leading-relaxed select-all max-w-2xl">
                {selectedCard.thaiAddress}
              </p>
            )}
            {selectedCard.noteForDriver && (
              <p className="text-base font-medium text-gilt bg-gilt-tint px-4 py-2.5 rounded-control">
                {selectedCard.noteForDriver}
              </p>
            )}
            <p className="text-sm text-faint">{selectedCard.nameEnglish}</p>
          </div>
        </div>
      )}
    </>
  );
};
