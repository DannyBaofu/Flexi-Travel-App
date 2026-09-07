import React, { useEffect, useRef, useState } from 'react';
import {
  Share2,
  Plus,
  Sliders,
  Printer,
  ChevronDown,
  LogIn,
  LogOut,
  MoreHorizontal,
  Lock
} from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import type { Trip, TripRole } from '../types/travel';
import { emailToId } from '../services/cloudSync';
import { useI18n } from '../utils/i18n';
import { iconBtn, iconBtnSolid } from './ui';

interface NavbarProps {
  trips: Trip[];
  activeTrip: Trip;
  onSelectTrip: (tripId: string) => void;
  onOpenNewTripModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenShareModal: () => void;
  onPrint: () => void;
  role: TripRole;
  cloudEnabled: boolean;
  user: User | null;
  onOpenAuthModal: () => void;
  onSignOut: () => void;
}

const menuItem =
  'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-control text-sm text-ink ' +
  'hover:bg-mist transition text-left';

export const Navbar: React.FC<NavbarProps> = ({
  trips,
  activeTrip,
  onSelectTrip,
  onOpenNewTripModal,
  onOpenSettingsModal,
  onOpenShareModal,
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

  // The organiser's menu, and only theirs. Three controls is plenty for a
  // phone top bar, so everything of theirs that is not language or share
  // lives behind this one.
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const run = (fn: () => void) => () => {
    setMenuOpen(false);
    fn();
  };

  return (
    <header className="sticky top-0 z-40 bg-paper/90 backdrop-blur border-b border-hairline no-print">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2 h-14">
          {/* Trip selector */}
          <div className="relative flex items-center min-w-0">
            <select
              value={activeTrip.id}
              onChange={(e) => onSelectTrip(e.target.value)}
              aria-label={t('tripSettings')}
              className="appearance-none bg-mist hover:bg-hairline/60 border border-hairline text-ink text-sm font-semibold rounded-control pl-3 pr-8 py-2 min-h-11 focus:outline-none focus:border-brand cursor-pointer max-w-[150px] sm:max-w-[280px] truncate transition"
            >
              {trips.map((tr) => (
                <option key={tr.id} value={tr.id}>
                  {tr.destination} ({tr.startDate.slice(5)})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-muted absolute right-2.5 pointer-events-none" />
          </div>

          {/* Quick actions — language, then whichever door this person has */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
              className={`${iconBtn} text-xs font-bold`}
              title={lang === 'zh' ? 'Switch to English' : '切换为中文'}
            >
              {lang === 'zh' ? 'EN' : '中'}
            </button>

            {/* Organising the trip is a different job from being on it.
                Settings, printing, sharing and the account itself belong to
                whoever set the trip up, so the menu holding them is the
                organiser's. A traveller's one extra door is starting a trip
                of their own, and a single item behind a "more" menu is a tap
                spent on nothing — so they get the button itself.

                The account row stays inside that menu on purpose: ID +
                password is the organiser's own sign-in, never something a
                friend is handed. And a guest who opened an invite is signed
                in anonymously, so "sign out" there reads as "?" and destroys
                the seat their name is bound to — which only an admin
                pressing Release can give back. */}
            {isAdmin ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className={iconBtn}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  title={t('more')}
                >
                  <MoreHorizontal className="w-[18px] h-[18px]" />
                </button>

                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-60 bg-paper border border-hairline rounded-card shadow-lift p-1.5 animate-riseIn z-50"
                  >
                    <button className={menuItem} onClick={run(onOpenNewTripModal)}>
                      <Plus className="w-4 h-4 text-muted shrink-0" />
                      {t('createNewTrip')}
                    </button>

                    <button className={menuItem} onClick={run(onOpenSettingsModal)}>
                      <Sliders className="w-4 h-4 text-muted shrink-0" />
                      {t('tripSettings')}
                    </button>

                    <button className={menuItem} onClick={run(onPrint)}>
                      <Printer className="w-4 h-4 text-muted shrink-0" />
                      {t('printTitle')}
                    </button>

                    {cloudEnabled && (
                      <>
                        <div className="h-px bg-hairline my-1.5" />
                        {user ? (
                          <button className={menuItem} onClick={run(onSignOut)}>
                            <LogOut className="w-4 h-4 text-muted shrink-0" />
                            <span className="min-w-0 truncate">
                              {t('signOut')}
                              <span className="text-faint"> · {emailToId(user.email) || '?'}</span>
                            </span>
                          </button>
                        ) : (
                          <button className={menuItem} onClick={run(onOpenAuthModal)}>
                            <LogIn className="w-4 h-4 text-muted shrink-0" />
                            {t('signIn')}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* No menu to open: the one thing a traveller keeps is starting
                 a trip of their own, and a viewer keeps nothing. */
              !isReadOnly && (
                <button
                  onClick={onOpenNewTripModal}
                  className={iconBtn}
                  title={t('createNewTrip')}
                >
                  <Plus className="w-[18px] h-[18px]" />
                </button>
              )
            )}

            {isAdmin && (
              <button
                onClick={onOpenShareModal}
                className={iconBtnSolid}
                title={t('shareTrip')}
              >
                <Share2 className="w-[18px] h-[18px]" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Read-only is plain neutral with a lock; only a real capability
          change earns the brand tint. */}
      {isReadOnly && (
        <div className="bg-mist border-b border-hairline px-4 py-1.5 flex items-center justify-center gap-1.5 text-xs font-medium text-muted">
          <Lock className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{t('readOnlyBanner')}</span>
        </div>
      )}
    </header>
  );
};
