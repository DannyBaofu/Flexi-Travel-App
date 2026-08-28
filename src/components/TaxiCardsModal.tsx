import React, { useState } from 'react';
import { X, Car, Plus, Trash2, Sparkles, Navigation } from 'lucide-react';
import type { TaxiCard, Trip, TripRole } from '../types/travel';
import { useI18n } from '../utils/i18n';

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
  const [nameEn, setNameEn] = useState('');
  const [nameTh, setNameTh] = useState('');
  const [addressTh, setAddressTh] = useState('');
  const [station, setStation] = useState('');
  const [driverNote, setDriverNote] = useState('');

  if (!isOpen) return null;

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

    const updated = {
      ...trip,
      taxiCards: [...(trip.taxiCards || []), newCard]
    };
    onUpdateTrip(updated);
    setSelectedCard(newCard);
    setIsAddingNew(false);
    setNameEn('');
    setNameTh('');
    setAddressTh('');
    setStation('');
    setDriverNote('');
  };

  const handleDeleteCard = (cardId: string) => {
    const updated = {
      ...trip,
      taxiCards: (trip.taxiCards || []).filter(c => c.id !== cardId)
    };
    onUpdateTrip(updated);
    if (selectedCard?.id === cardId) {
      setSelectedCard(updated.taxiCards[0] || null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {t('taxiModalTitle')} <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">{t('bangkokTool')}</span>
              </h2>
              <p className="text-xs text-slate-400">{t('taxiModalSubtitle')}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-800">
          {/* Left: Card Selection List & Quick Phrases */}
          <div className="md:col-span-4 p-4 space-y-4 overflow-y-auto max-h-[70vh]">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('destCards')}</h3>
              {canAdd && (
              <button
                onClick={() => setIsAddingNew(true)}
                className="text-xs flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium"
              >
                <Plus className="w-3.5 h-3.5" /> {t('addPlace')}
              </button>
              )}
            </div>

            <div className="space-y-2">
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
                      className={`w-full text-left p-3 rounded-xl border transition ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500/50 text-white'
                          : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="text-sm font-semibold truncate">{card.nameEnglish}</div>
                      <div className="text-xs text-amber-400/90 font-thai truncate mt-0.5">{card.nameThai}</div>
                    </button>
                  );
                })
              ) : (
                <div className="text-xs text-slate-500 py-4 text-center">{t('noTaxiCards')}</div>
              )}
            </div>

            {/* Quick Thai Phrases */}
            <div className="pt-4 border-t border-slate-800">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> {t('handyPhrases')}
              </h3>
              <div className="space-y-2">
                {COMMON_THAI_PHRASES.map((phrase, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-800/50 rounded-xl border border-slate-800/80 text-xs">
                    <div className="font-bold text-amber-300 text-sm">{phrase.th}</div>
                    <div className="text-slate-200 mt-0.5">{lang === 'zh' ? phrase.zh : phrase.en}</div>
                    <div className="text-[11px] text-slate-400 italic font-mono mt-0.5">{phrase.pronunciation}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Driver View or Add New Form */}
          <div className="md:col-span-8 p-6 flex flex-col justify-between bg-slate-950/50 min-h-[420px]">
            {isAddingNew ? (
              <form onSubmit={handleAddCard} className="space-y-4">
                <h3 className="text-lg font-bold text-white">{t('addCustomCard')}</h3>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{t('placeNameEn')}</label>
                  <input
                    type="text"
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    placeholder="e.g. My Sukhumvit Hotel"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{t('placeNameTh')}</label>
                  <input
                    type="text"
                    value={nameTh}
                    onChange={(e) => setNameTh(e.target.value)}
                    placeholder="e.g. โรงแรม แกรนด์ สุขุมวิท"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-amber-200 text-sm focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{t('fullThaiAddress')}</label>
                  <textarea
                    rows={2}
                    value={addressTh}
                    onChange={(e) => setAddressTh(e.target.value)}
                    placeholder="e.g. ซอยสุขุมวิท 24 แขวงคลองตัน เขตคลองเตย กรุงเทพฯ"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-amber-200 text-sm focus:outline-none focus:border-amber-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">{t('nearestStationLabel')}</label>
                    <input
                      type="text"
                      value={station}
                      onChange={(e) => setStation(e.target.value)}
                      placeholder="e.g. BTS Phrom Phong"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">{t('noteForDriverLabel')}</label>
                    <input
                      type="text"
                      value={driverNote}
                      onChange={(e) => setDriverNote(e.target.value)}
                      placeholder="e.g. Turn on meter please"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-3">
                  <button
                    type="button"
                    onClick={() => setIsAddingNew(false)}
                    className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:bg-slate-800"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm transition"
                  >
                    {t('saveCard')}
                  </button>
                </div>
              </form>
            ) : selectedCard ? (
              <div className="space-y-6">
                {/* Visual Flashcard for Driver */}
                <div className="bg-gradient-to-br from-amber-500/10 via-slate-800/80 to-slate-900 border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
                  <div className="text-xs uppercase font-bold tracking-widest text-amber-400 mb-2 flex items-center justify-between">
                    <span>🚗 SHOW TO DRIVER / แสดงคนขับแท็กซี่</span>
                    {selectedCard.nearestStation && (
                      <span className="text-[11px] bg-slate-800 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                        <Navigation className="w-3 h-3" /> {selectedCard.nearestStation}
                      </span>
                    )}
                  </div>

                  {/* Giant Thai Place Name */}
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-amber-200 leading-snug my-3 select-all">
                    {selectedCard.nameThai}
                  </h1>

                  {/* Thai Address */}
                  {selectedCard.thaiAddress && (
                    <div className="text-base sm:text-lg text-slate-200 bg-slate-900/80 p-4 rounded-2xl border border-slate-700/60 my-3 select-all">
                      📍 {selectedCard.thaiAddress}
                    </div>
                  )}

                  {/* Driver Note */}
                  {selectedCard.noteForDriver && (
                    <div className="text-sm font-semibold text-emerald-400 bg-emerald-500/10 px-3.5 py-2 rounded-xl border border-emerald-500/20 mt-2">
                      💬 {selectedCard.noteForDriver}
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs text-slate-400">
                    <span className="font-medium text-slate-300">{selectedCard.nameEnglish}</span>
                    <span>{t('tapFullscreen')}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{t('taxiTip')}</span>
                  {isAdmin && (
                  <button
                    onClick={() => handleDeleteCard(selectedCard.id)}
                    className="text-red-400 hover:text-red-300 flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-red-500/10 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> {t('deleteCard')}
                  </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2">
                <Car className="w-12 h-12 text-slate-700" />
                <p>{t('selectOrAdd')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
