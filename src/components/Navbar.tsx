import React from 'react';
import {
  Compass,
  Share2,
  Plus,
  Sliders,
  Car,
  Printer,
  ChevronDown,
  LogIn
} from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import type { Trip, TripRole } from '../types/travel';
import { useI18n } from '../utils/i18n';

interface NavbarProps {
  trips: Trip[];
  activeTrip: Trip;
  onSelectTrip: (tripId: string) => void;
  onOpenNewTripModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenShareModal: () => void;
  onOpenTaxiCardsModal: () => void;
  onPrint: () => void;
  role: TripRole;
  cloudEnabled: boolean;
  user: User | null;
  onOpenAuthModal: () => void;
  onSignOut: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  trips,
  activeTrip,
  onSelectTrip,
  onOpenNewTripModal,
  onOpenSettingsModal,
  onOpenShareModal,
  onOpenTaxiCardsModal,
  onPrint,
  role,
  cloudEnabled,
  user,
  onOpenAuthModal,
  onSignOut
}) => {
  const { lang, setLang, t } = useI18n();
  const isAdmin = role === 'admin';
  const isReadOnly = role === 'viewer';
  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 transition-all no-print">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Trip Dropdown */}
          <div className="flex items-center gap-1.5 sm:gap-6 min-w-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-slate-950 shadow-md shadow-emerald-500/20">
                <Compass className="w-5 h-5 font-bold" />
              </div>
              <span className="text-lg font-extrabold tracking-tight text-white hidden md:inline-block">
                Travel<span className="text-emerald-400">Sync</span>
              </span>
            </div>

            {/* Trip Selector */}
            <div className="relative flex items-center">
              <select
                value={activeTrip.id}
                onChange={(e) => onSelectTrip(e.target.value)}
                className="appearance-none bg-slate-800/90 hover:bg-slate-800 border border-slate-700 text-white text-xs sm:text-sm font-semibold rounded-xl pl-3.5 pr-8 py-2 focus:outline-none focus:border-emerald-500 cursor-pointer max-w-[104px] sm:max-w-[260px] truncate"
              >
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.destination} ({t.startDate.slice(5)})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 pointer-events-none" />
            </div>

            {/* New Trip Button */}
            {!isReadOnly && (
              <button
                onClick={onOpenNewTripModal}
                className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 hover:text-white transition flex items-center gap-1.5 text-xs font-medium"
                title={t('createNewTrip')}
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">{t('newTrip')}</span>
              </button>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Cloud Sign In / Account */}
            {cloudEnabled && (
              user ? (
                <button
                  onClick={onSignOut}
                  className="w-8 h-8 shrink-0 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-300 text-xs font-bold flex items-center justify-center transition hover:bg-sky-500/30"
                  title={`${t('cloudOn')} · ${user.email} · ${t('signOut')}`}
                >
                  {(user.email || '?').charAt(0).toUpperCase()}
                </button>
              ) : (
                <button
                  onClick={onOpenAuthModal}
                  className="p-1.5 sm:px-3 sm:py-2 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                  title={t('signInTitle')}
                >
                  <LogIn className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('signIn')}</span>
                </button>
              )
            )}

            {/* Language Toggle */}
            <button
              onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
              className="p-1.5 sm:px-3 sm:py-2 text-[11px] sm:text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition"
              title={lang === 'zh' ? 'Switch to English' : '切换为中文'}
            >
              {lang === 'zh' ? 'EN' : '中文'}
            </button>

            {/* Show Taxi Cards Button (Super handy for Bangkok!) */}
            <button
              onClick={onOpenTaxiCardsModal}
              className="p-1.5 sm:px-3 sm:py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              title={t('showDriverTaxiCards')}
            >
              <Car className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">{t('taxiCards')}</span>
            </button>

            {/* Print / Save PDF Button */}
            <button
              onClick={onPrint}
              className="hidden sm:block p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs transition"
              title={t('printTitle')}
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* Trip Settings (admin only) */}
            {isAdmin && (
              <button
                onClick={onOpenSettingsModal}
                className="p-1.5 sm:p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs transition"
                title={t('tripSettings')}
              >
                <Sliders className="w-4 h-4" />
              </button>
            )}

            {/* Share with Friends Button */}
            <button
              onClick={onOpenShareModal}
              className="p-1.5 sm:px-3.5 sm:py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-lg shadow-emerald-500/20 active:scale-95"
              title={t('shareTrip')}
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">{t('shareTrip')}</span>
            </button>
          </div>
        </div>
      </div>

      {isReadOnly && (
        <div className="bg-sky-950/80 border-b border-sky-800/60 px-4 py-1.5 text-center text-xs text-sky-200 font-medium">
          {t('readOnlyBanner')}
        </div>
      )}
      {role === 'member' && (
        <div className="bg-emerald-950/70 border-b border-emerald-800/50 px-4 py-1.5 text-center text-xs text-emerald-200 font-medium">
          {t('memberBanner')}
        </div>
      )}
    </header>
  );
};
