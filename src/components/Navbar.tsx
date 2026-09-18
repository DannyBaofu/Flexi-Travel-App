import React, { useEffect, useRef, useState } from 'react';
import {
  Share2,
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
import { TripSwitcher } from './TripSwitcher';
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

  // Starting a trip of your own is not a trip-scoped permission, but it was
  // gated on the active trip's role before this and stays so: a viewer is
  // offered nothing. Which is also what decides whether the trip name opens
  // anything -- with one trip and no create row there is nothing behind it,
  // and a control that opens an empty sheet is a control that lies.
  const canCreateTrip = !isReadOnly;
  const canOpenSwitcher = trips.length > 1 || canCreateTrip;
  const [switcherOpen, setSwitcherOpen] = useState(false);

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
    <>
      <header className="sticky top-0 z-40 bg-paper/90 backdrop-blur border-b border-hairline no-print">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-2 h-14">
            {/* Which trip you are on, and the way to the others.
                A select here printed the destination rather than the title, cut
                it to "Bangk..." at 375px, and on iOS opened a wheel picker that
                reads as a form field rather than as somewhere to go. */}
            <div className="flex items-center min-w-0">
              {canOpenSwitcher ? (
                <button
                  onClick={() => setSwitcherOpen(true)}
                  aria-haspopup="dialog"
                  aria-expanded={switcherOpen}
                  aria-label={t('switchTrip')}
                  className="flex items-center gap-1.5 min-w-0 min-h-11 px-3 rounded-control bg-mist hover:bg-hairline/60 border border-hairline focus:outline-none focus:border-brand transition"
                >
                  <span className="text-sm font-semibold text-ink truncate max-w-[140px] sm:max-w-[260px]">
                    {activeTrip.title}
                  </span>
                  <ChevronDown className="w-4 h-4 text-muted shrink-0" aria-hidden="true" />
                </button>
              ) : (
                <span className="text-sm font-semibold text-ink truncate max-w-[160px] sm:max-w-[280px]">
                  {activeTrip.title}
                </span>
              )}
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
                  organiser's. A traveller gets no menu at all: starting a trip
                  of their own is the one extra door they have, and it is in the
                  trip sheet now, beneath the list it would join.

                  The account row stays inside that menu on purpose: ID +
                  password is the organiser's own sign-in, never something a
                  friend is handed. And a guest who opened an invite is signed
                  in anonymously, so "sign out" there reads as "?" and destroys
                  the seat their name is bound to — which only an admin
                  pressing Release can give back. */}
              {isAdmin && (
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

      {/* Outside the header on purpose: `sticky z-40` up there is a stacking
          context, so a dialog nested inside it would paint at z-40 and open
          underneath the z-40 bottom tabs. */}
      <TripSwitcher
        isOpen={switcherOpen}
        onClose={() => setSwitcherOpen(false)}
        trips={trips}
        activeTripId={activeTrip.id}
        onSelectTrip={onSelectTrip}
        onCreateTrip={
          canCreateTrip
            ? () => {
                setSwitcherOpen(false);
                onOpenNewTripModal();
              }
            : undefined
        }
      />
    </>
  );
};
