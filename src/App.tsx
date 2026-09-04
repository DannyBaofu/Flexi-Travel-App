import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Calendar, Compass } from 'lucide-react';
import type { Trip, ActivityItem, TripRole, TripSeat } from './types/travel';
import { storageService } from './services/storage';
import { Navbar } from './components/Navbar';
import { TripBanner } from './components/TripBanner';
import { ItineraryView } from './components/ItineraryView';
import { BudgetTracker } from './components/BudgetTracker';
import { PrintItineraryView } from './components/PrintItineraryView';
import { PhrasesTab } from './components/PhrasesTab';
import { TopTabs, BottomTabs } from './components/TabBar';

// Dialogs are opened rarely and some are heavy — ShareModal alone pulls in the
// QR library. Splitting them out keeps the first paint to what every session
// actually needs.
const ActivityModal = lazy(() => import('./components/ActivityModal').then(m => ({ default: m.ActivityModal })));
const ShareModal = lazy(() => import('./components/ShareModal').then(m => ({ default: m.ShareModal })));
const TripSettingsModal = lazy(() => import('./components/TripSettingsModal').then(m => ({ default: m.TripSettingsModal })));
const NewTripModal = lazy(() => import('./components/NewTripModal').then(m => ({ default: m.NewTripModal })));
const AuthModal = lazy(() => import('./components/AuthModal').then(m => ({ default: m.AuthModal })));
const SeatPickerModal = lazy(() => import('./components/SeatPickerModal').then(m => ({ default: m.SeatPickerModal })));
import type { TabId } from './components/TabBar';
import { btnPrimary, btnSecondary, card, inputMono, label as labelCls } from './components/ui';
import { useI18n } from './utils/i18n';
import { mergeRemoteTrip } from './services/mergeTrip';
import { SyncBar } from './components/SyncBar';
import { UndoToast } from './components/UndoToast';
import type { PendingUndo } from './components/UndoToast';
import type { SyncState } from './components/SyncBar';
import type { User } from '@supabase/supabase-js';
import { fetchLiveRate } from './services/exchangeRate';
import {
  isCloudEnabled,
  getSession,
  onAuthChange,
  signOut,
  fetchMyTrips,
  createTripCloud,
  upsertTripCloud,
  deleteTripCloud,
  subscribeTrip,
  signInAnonymously,
  fetchInviteRoster,
  fetchSeatClaims,
  claimSeat,
  mergeSeats,
  parseJoinCodeFromUrl,
  clearJoinHash
} from './services/cloudSync';
import { writeMe } from './services/me';

/**
 * The server raises bare codes so the UI can say something a traveller
 * understands. Anything unrecognised keeps its own text rather than being
 * flattened into a shrug.
 */
const seatErrorKey = (raw: string): string | null => {
  if (raw.includes('SEAT_TAKEN')) return 'seatErrorTaken';
  if (raw.includes('INVALID_INVITE') || raw.includes('UNKNOWN_SEAT')) return 'seatErrorInvalid';
  return null;
};

export function App() {
  const { t } = useI18n();
  const [trips, setTrips] = useState<Trip[]>(() => storageService.getTrips());
  const [activeTripId, setActiveTripId] = useState<string>(() => storageService.getActiveTripId());
  
  // An old snapshot link arrived. Those are no longer read, so all this does
  // is explain why rather than dropping the visitor on a blank app.
  const [staleShareLink, setStaleShareLink] = useState(false);

  // Cloud sync state
  const [user, setUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [pendingJoinCode, setPendingJoinCode] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  // An invite link arrived, but this deployment has no cloud backend configured
  const [joinBlockedNoCloud, setJoinBlockedNoCloud] = useState(false);
  // Typed by hand on the first screen, for a friend given the code verbally
  const [joinCodeInput, setJoinCodeInput] = useState('');
  /**
   * The "who are you?" prompt. Raised either by an invite link (the code comes
   * with it) or for somebody already on a trip who has no name against it.
   */
  const [seatPrompt, setSeatPrompt] = useState<{
    tripId: string;
    tripTitle: string;
    seats: TripSeat[];
    code?: string;
  } | null>(null);
  const [seatBusyId, setSeatBusyId] = useState<string | null>(null);
  const [seatError, setSeatError] = useState<string | null>(null);
  const cloudMode = isCloudEnabled && !!user;
  const pushTimerRef = useRef<number | null>(null);

  // A push that never landed is the app's worst failure: the local copy saved,
  // so everything looks fine, and a later remote update can quietly overwrite
  // it. Track it, show it, retry it.
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const unsentTripRef = useRef<Trip | null>(null);

  const [pendingUndo, setPendingUndo] = useState<PendingUndo | null>(null);
  // Undo acts on the trip as it stands when Undo is pressed, not on the copy
  // captured when the delete happened — otherwise undoing a delete would also
  // revert anything edited in between.
  const tripsRef = useRef(trips);
  tripsRef.current = trips;

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabId>('itinerary');

  // Modals
  const [isNewTripModalOpen, setIsNewTripModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Activity Modal (Add / Edit)
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [activityTargetDayId, setActivityTargetDayId] = useState<string>('');
  const [activityToEdit, setActivityToEdit] = useState<ActivityItem | null>(null);

  // Parse share hash from URL on page mount
  useEffect(() => {
    const joinCode = parseJoinCodeFromUrl();
    if (joinCode) {
      // An invite link is useless without the cloud backend; say so rather than
      // silently dropping the user on an empty app at a /j/... URL.
      if (isCloudEnabled) {
        setPendingJoinCode(joinCode);
      } else {
        setJoinBlockedNoCloud(true);
      }
      clearJoinHash();
      return;
    }
    if (window.location.hash.includes('#share=')) {
      setStaleShareLink(true);
      window.history.replaceState(null, '', '/');
    }
  }, []);

  // Cloud auth bootstrap
  useEffect(() => {
    if (!isCloudEnabled) return;
    getSession().then(s => setUser(s?.user ?? null));
    const off = onAuthChange(setUser);
    return off;
  }, []);

  // An invite link needs an identity, but a guest should never have to invent
  // one: an anonymous account is taken silently so that tapping your name is
  // the entire join. Projects with anonymous sign-ins switched off fall back
  // to the ID + password modal, and the seat picker after it is identical.
  useEffect(() => {
    if (!pendingJoinCode || !isCloudEnabled || user) return;
    let cancelled = false;
    signInAnonymously().then(ok => {
      if (!cancelled && !ok) setIsAuthModalOpen(true);
    });
    return () => { cancelled = true; };
  }, [pendingJoinCode, user]);

  // On sign-in: pull cloud trips, upload local admin trips that are not there yet
  useEffect(() => {
    if (!cloudMode) return;
    let cancelled = false;
    (async () => {
      try {
        const cloudTrips = await fetchMyTrips();
        const cloudIds = new Set(cloudTrips.map(ct => ct.id));
        const localTrips = storageService.getTrips();
        // Only trips this browser actually owns. A guest opening an invite
        // link is signed in anonymously a moment later, which runs this — and
        // an `undefined` role used to count as ours, so their own unrelated
        // trips were uploaded into the organiser's project under a throwaway
        // account. `getTrips` gives every stored trip a role, so asking for
        // admin outright is now the whole test.
        for (const lt of localTrips) {
          if (!cloudIds.has(lt.id) && lt.myRole === 'admin') {
            try {
              await createTripCloud(lt);
              cloudTrips.push({ ...lt, myRole: 'admin' });
            } catch (e) {
              console.error('Failed to upload local trip:', e);
            }
          }
        }
        if (cancelled || cloudTrips.length === 0) return;
        storageService.saveTrips(cloudTrips);
        setTrips(cloudTrips);
        setActiveTripId(prev => (cloudTrips.some(ct => ct.id === prev) ? prev : cloudTrips[0].id));
      } catch (e) {
        console.error('Cloud sync bootstrap failed:', e);
      }
    })();
    return () => { cancelled = true; };
  }, [cloudMode]);

  // Arrived on an invite link: fetch the roster the organiser wrote and ask
  // which of those names they are. Claiming one is what joins the trip.
  useEffect(() => {
    if (!cloudMode || !pendingJoinCode) return;
    const code = pendingJoinCode;
    let cancelled = false;
    (async () => {
      try {
        const roster = await fetchInviteRoster(code);
        if (cancelled) return;
        setSeatPrompt({ ...roster, code });
        setSeatError(null);
      } catch (e: any) {
        const raw = e?.message || String(e);
        if (!cancelled) setJoinError(seatErrorKey(raw) ? t('seatErrorInvalid') : raw);
      }
      if (!cancelled) setPendingJoinCode(null);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudMode, pendingJoinCode]);

  const handlePickSeat = async (travelerId: string) => {
    if (!seatPrompt) return;
    setSeatBusyId(travelerId);
    setSeatError(null);
    try {
      const tripId = await claimSeat(seatPrompt.tripId, travelerId, seatPrompt.code);
      const cloudTrips = await fetchMyTrips();
      storageService.saveTrips(cloudTrips);
      setTrips(cloudTrips);
      setActiveTripId(tripId);
      storageService.setActiveTripId(tripId);
      // The budget tab asks the same question for its own reasons. Answering
      // it here means claiming a seat settles "who are you?" everywhere at
      // once, and keeps holding while the browser is offline.
      writeMe(tripId, travelerId);
      setSeatPrompt(null);
    } catch (e: any) {
      const raw = e?.message || String(e);
      const key = seatErrorKey(raw);
      setSeatError(key ? t(key) : t('seatErrorFailed', { msg: raw }));
      // A seat lost to somebody faster is only visible on a fresh roster.
      if (key === 'seatErrorTaken' && seatPrompt.code) {
        try {
          const roster = await fetchInviteRoster(seatPrompt.code);
          setSeatPrompt(prev => (prev ? { ...prev, seats: roster.seats } : prev));
        } catch { /* keep the stale list rather than emptying the modal */ }
      }
    } finally {
      setSeatBusyId(null);
    }
  };

  // Get active trip object
  const activeTrip = trips.find(t => t.id === activeTripId) || trips[0];

  // Role of this user for the active trip. Every path that hands us a trip
  // states the role it comes with — creation and import say admin, the cloud
  // says whatever the membership row enforces, a share link says what it
  // grants, and `getTrips` backfills the trips saved before any of that was
  // written down. So there is no longer an innocent reason for the field to be
  // missing, and the safe reading of one that is missing is read-only: an
  // unknown role must not be the most powerful one.
  const role: TripRole = activeTrip?.myRole ?? 'viewer';

  // On a trip but with no name against it — every membership made before seats
  // existed, and the organiser's own trips from before this version. Same
  // picker, no code needed because they already belong here.
  useEffect(() => {
    if (!cloudMode || seatPrompt || !activeTrip) return;
    if (!activeTrip.myRole || activeTrip.myTravelerId) return;
    const trip = activeTrip;
    let cancelled = false;
    (async () => {
      try {
        const claims = await fetchSeatClaims(trip.id);
        if (cancelled) return;
        setSeatPrompt({
          tripId: trip.id,
          tripTitle: trip.title,
          seats: mergeSeats(trip.travelers, claims)
        });
      } catch (e) {
        console.error('Could not read the roster:', e);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudMode, activeTrip?.id, activeTrip?.myRole, activeTrip?.myTravelerId, seatPrompt]);

  // Switch trip
  const handleSelectTrip = (tripId: string) => {
    setActiveTripId(tripId);
    storageService.setActiveTripId(tripId);
  };

  // Push to the cloud, remembering the trip if it does not get there so the
  // retry path and the remote-merge path both know local is ahead.
  const pushTrip = async (trip: Trip) => {
    unsentTripRef.current = trip;
    setSyncState('saving');
    try {
      let settled: Trip;
      try {
        settled = await upsertTripCloud(trip);
      } catch (err: any) {
        // The trip is not in the cloud at all — its creation failed earlier,
        // most likely offline. Put it there first, then save on top of it, so
        // a trip cannot stay stranded local-only with no way back.
        if (err?.message !== 'TRIP_NOT_ON_SERVER') throw err;
        await createTripCloud(trip);
        settled = await upsertTripCloud(trip);
      }
      // Only clear if nothing newer queued up behind this push
      if (unsentTripRef.current === trip) {
        unsentTripRef.current = null;
        setSyncState('saved');
      }
      // A clash was resolved during the write, so what landed on the server is
      // not what we sent. Adopt it, or this browser keeps showing a version
      // nobody else has. Saved directly rather than through handleUpdateTrip,
      // which would push it straight back.
      if (settled !== trip) {
        setTrips(storageService.saveTrip({ ...settled, myRole: trip.myRole }));
      }
    } catch (err: any) {
      console.error('Cloud push failed:', err);
      if (err?.message === 'WRITE_FORBIDDEN') {
        // The server takes no writes from this account on this trip, so there
        // is nothing to retry and offering it would only fail again. What is
        // actually wrong is this browser's idea of its own role — correct it
        // from what the server just enforced, and the read-only banner
        // explains the controls going away.
        //
        // Only the role changes. Going through saveTrip would stamp a fresh
        // updatedAt on a document the server never accepted, and the realtime
        // handler skips anything older than what it already holds — so the
        // authoritative copy would be turned away as stale.
        if (unsentTripRef.current === trip) unsentTripRef.current = null;
        setSyncState('idle');
        setTrips(prev => {
          const next = prev.map(pt =>
            pt.id === trip.id ? { ...pt, myRole: 'viewer' as TripRole } : pt
          );
          storageService.saveTrips(next);
          return next;
        });
        return;
      }
      setSyncState(navigator.onLine === false ? 'offline' : 'error');
    }
  };

  const retryPush = () => {
    const pending = unsentTripRef.current;
    if (pending) void pushTrip(pending);
  };

  // Update trip in state and local storage; mirror to cloud when signed in
  const handleUpdateTrip = (updatedTrip: Trip) => {
    const newTrips = storageService.saveTrip(updatedTrip);
    setTrips(newTrips);
    if (cloudMode && updatedTrip.myRole !== 'viewer') {
      unsentTripRef.current = updatedTrip;
      if (pushTimerRef.current) window.clearTimeout(pushTimerRef.current);
      pushTimerRef.current = window.setTimeout(() => void pushTrip(updatedTrip), 600);
    }
  };

  // Coming back online is the most likely moment for a stuck push to succeed
  useEffect(() => {
    const onOnline = () => retryPush();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Create new trip
  const handleCreateTrip = (newTrip: Trip) => {
    const newTrips = storageService.saveTrip(newTrip);
    setTrips(newTrips);
    setActiveTripId(newTrip.id);
    storageService.setActiveTripId(newTrip.id);
    if (cloudMode) {
      createTripCloud(newTrip).catch(err => {
        console.error('Cloud create failed:', err);
        // A trip that never reached the cloud has no membership row behind it,
        // so sharing and syncing it both fail later with nothing on screen to
        // explain why. Show it now, and leave it where retry can pick it up.
        unsentTripRef.current = newTrip;
        setSyncState(navigator.onLine === false ? 'offline' : 'error');
      });
    }
  };

  // Delete trip
  const handleDeleteTrip = (tripId: string) => {
    const remaining = storageService.deleteTrip(tripId);
    setTrips(remaining);
    setActiveTripId(remaining[0]?.id || '');
    if (cloudMode) {
      deleteTripCloud(tripId).catch(err => console.error('Cloud delete failed:', err));
    }
  };

  // Live updates: apply remote edits to the active trip
  useEffect(() => {
    if (!cloudMode || !activeTripId) return;
    const unsubscribe = subscribeTrip(activeTripId, (remoteTrip) => {
      setTrips(prev => {
        const current = prev.find(pt => pt.id === remoteTrip.id);
        // Skip our own echo and anything older than what we already have
        if (current?.updatedAt && remoteTrip.updatedAt && remoteTrip.updatedAt <= current.updatedAt) {
          return prev;
        }
        // If this browser is still holding an edit that never reached the
        // server, take the remote copy but carry that work across; otherwise
        // the remote copy is authoritative and replaces ours outright.
        const hasUnsent = unsentTripRef.current?.id === remoteTrip.id;
        const merged: Trip = hasUnsent && current
          ? mergeRemoteTrip(current, remoteTrip)
          : { ...remoteTrip, myRole: current?.myRole ?? 'viewer' };
        const next = current
          ? prev.map(pt => (pt.id === remoteTrip.id ? merged : pt))
          : [merged, ...prev];
        storageService.saveTrips(next);
        return next;
      });
    });
    return unsubscribe;
  }, [cloudMode, activeTripId]);

  // Refresh the exchange rate from free mid-market APIs (12h cached)
  useEffect(() => {
    if (!activeTrip || role === 'viewer') return;
    let cancelled = false;
    fetchLiveRate(activeTrip.homeCurrency, activeTrip.currency).then((liveRate) => {
      if (cancelled || !liveRate) return;
      const rounded = Math.round(liveRate * 100) / 100;
      const current = activeTrip.exchangeRate || 0;
      if (Math.abs(current - rounded) / rounded > 0.001) {
        handleUpdateTrip({ ...activeTrip, exchangeRate: rounded });
      }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTrip?.id, activeTrip?.homeCurrency, activeTrip?.currency, role]);

  const handleSignOut = async () => {
    if (!window.confirm(t('confirmSignOut'))) return;
    await signOut();
  };

  // Add / Edit Activity handlers
  const handleOpenAddActivity = (dayId: string) => {
    setActivityTargetDayId(dayId);
    setActivityToEdit(null);
    setIsActivityModalOpen(true);
  };

  const handleOpenEditActivity = (dayId: string, activity: ActivityItem) => {
    setActivityTargetDayId(dayId);
    setActivityToEdit(activity);
    setIsActivityModalOpen(true);
  };

  const handleSaveActivity = (dayId: string, activity: ActivityItem) => {
    if (!activeTrip) return;
    const updatedDays = activeTrip.days.map((day) => {
      if (day.id !== dayId) return day;

      const existingIndex = day.activities.findIndex(a => a.id === activity.id);
      let newActivities: ActivityItem[];
      if (existingIndex >= 0) {
        newActivities = [...day.activities];
        newActivities[existingIndex] = activity;
      } else {
        newActivities = [...day.activities, activity];
      }
      return { ...day, activities: newActivities };
    });

    handleUpdateTrip({ ...activeTrip, days: updatedDays });
  };

  // A hand-typed code joins through exactly the same path as an invite link:
  // set it pending, and the effects above handle sign-in and the join itself.
  /** Delete now, offer a way back for a few seconds. */
  const offerUndo = (tripId: string, message: string, restore: (current: Trip) => Trip) => {
    setPendingUndo({
      message,
      undo: () => {
        const live = tripsRef.current.find(tr => tr.id === tripId);
        if (live) handleUpdateTrip(restore(live));
      }
    });
  };

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCodeInput.trim().toUpperCase();
    if (!code) return;
    setJoinError(null);
    if (!isCloudEnabled) {
      setJoinBlockedNoCloud(true);
      return;
    }
    setPendingJoinCode(code);
  };

  // Name the tab after the trip. With several trips open in several tabs, the
  // app's own name on all of them tells you nothing.
  useEffect(() => {
    document.title = activeTrip?.title?.trim() || t('docTitle');
  }, [activeTrip?.title, t]);

  // No trips at all. Offer both doors plainly: start one, or join a shared one.
  if (!activeTrip) {
    return (
      <div className="min-h-screen bg-mist flex items-center justify-center p-5">
        <div className="w-full max-w-sm space-y-5">
          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-modal bg-brand-tint text-brand flex items-center justify-center mx-auto">
              <Compass className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h1 className="text-xl font-semibold tracking-tight text-ink">{t('emptyTitle')}</h1>
              <p className="text-sm text-muted leading-relaxed">{t('emptyHint')}</p>
            </div>
          </div>

          <button onClick={() => setIsNewTripModalOpen(true)} className={`${btnPrimary} w-full`}>
            <Calendar className="w-4 h-4" /> {t('createFirstTrip')}
          </button>

          <div className="flex items-center gap-3 text-[11px] text-faint">
            <span className="h-px flex-1 bg-hairline" />
            {t('emptyOr')}
            <span className="h-px flex-1 bg-hairline" />
          </div>

          <form onSubmit={handleJoinByCode} className={`${card} p-4`}>
            <label className={labelCls} htmlFor="invite-code">{t('haveInviteCode')}</label>
            <div className="flex gap-2">
              <input
                id="invite-code"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                placeholder={t('inviteCodePlaceholder')}
                maxLength={12}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                className={`${inputMono} tracking-[0.16em] uppercase`}
              />
              <button
                type="submit"
                disabled={!joinCodeInput.trim()}
                className={`${btnSecondary} shrink-0`}
              >
                {t('joinWithCode')}
              </button>
            </div>
            {(joinError || joinBlockedNoCloud) && (
              <p className="text-xs text-clay mt-2 leading-relaxed">
                {joinBlockedNoCloud ? t('joinNeedsCloud') : t('joinFailed', { msg: joinError ?? '' })}
              </p>
            )}
            {staleShareLink && (
              <p className="text-xs text-clay mt-2 leading-relaxed">{t('staleShareLink')}</p>
            )}
            {cloudMode && pendingJoinCode && (
              <p className="text-xs text-muted mt-2">{t('joiningTrip')}</p>
            )}
          </form>

          {isCloudEnabled && (
            user ? (
              <p className="text-xs text-muted text-center leading-relaxed">
                {t('emptyNoCloudTrips')}
                {' '}
                <button onClick={handleSignOut} className="text-brand font-medium underline">
                  {t('signOut')}
                </button>
              </p>
            ) : (
              <p className="text-xs text-muted text-center">
                {t('emptyHaveAccount')}{' '}
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="text-brand font-medium underline"
                >
                  {t('emptySignIn')}
                </button>
              </p>
            )
          )}
        </div>

        <Suspense fallback={null}>
          {isNewTripModalOpen && (
            <NewTripModal
              isOpen
              onClose={() => setIsNewTripModalOpen(false)}
              onCreateTrip={handleCreateTrip}
            />
          )}
          {isAuthModalOpen && (
            <AuthModal isOpen onClose={() => setIsAuthModalOpen(false)} />
          )}
          {seatPrompt && (
            <SeatPickerModal
              isOpen
              tripTitle={seatPrompt.tripTitle}
              seats={seatPrompt.seats}
              busySeatId={seatBusyId}
              error={seatError}
              onPick={handlePickSeat}
              onCancel={() => { setSeatPrompt(null); setSeatError(null); }}
            />
          )}
        </Suspense>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mist text-ink flex flex-col">
      {/* Navigation Bar */}
      <Navbar
        trips={trips}
        activeTrip={activeTrip}
        onSelectTrip={handleSelectTrip}
        onOpenNewTripModal={() => setIsNewTripModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        onPrint={() => window.print()}
        role={role}
        cloudEnabled={isCloudEnabled}
        user={user}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onSignOut={handleSignOut}
      />

      {cloudMode && <SyncBar state={syncState} onRetry={retryPush} />}

      {(joinError || joinBlockedNoCloud || staleShareLink) && (
        <div className="bg-clay-tint border-b border-clay/20 px-4 py-2 text-xs text-clay no-print flex items-center justify-center gap-3">
          <span>
            {staleShareLink
              ? t('staleShareLink')
              : joinBlockedNoCloud
                ? t('joinNeedsCloud')
                : t('joinFailed', { msg: joinError ?? '' })}
          </span>
          <button
            onClick={() => { setJoinError(null); setJoinBlockedNoCloud(false); setStaleShareLink(false); }}
            className="font-semibold underline shrink-0"
            title={t('close')}
          >
            {t('close')}
          </button>
        </div>
      )}
      {cloudMode && pendingJoinCode && (
        <div className="bg-brand-tint border-b border-brand/15 px-4 py-2 text-center text-xs font-medium text-brand-deep no-print">
          {t('joiningTrip')}
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 pb-24 sm:pb-8 no-print">
        {/* The banner belongs to the plan, where the cover photo and the dates
            are the context you are working against. On budget and phrases it
            is 300px of scenery between you and the thing you opened the tab
            for, so it stays behind. */}
        {activeTab === 'itinerary' && (
          <TripBanner
            trip={activeTrip}
            onOpenSettings={() => setIsSettingsModalOpen(true)}
            role={role}
          />
        )}

        <TopTabs active={activeTab} onChange={setActiveTab} />

        {/* Tab Views */}
        {activeTab === 'itinerary' && (
          <ItineraryView
            key={activeTrip.id}
            trip={activeTrip}
            onUpdateTrip={handleUpdateTrip}
            onOpenAddActivityModal={handleOpenAddActivity}
            onOpenEditActivityModal={handleOpenEditActivity}
            onOfferUndo={offerUndo}
            role={role}
          />
        )}

        {activeTab === 'budget' && (
          <BudgetTracker
            key={activeTrip.id}
            trip={activeTrip}
            onUpdateTrip={handleUpdateTrip}
            onOfferUndo={offerUndo}
            role={role}
          />
        )}

        {activeTab === 'phrases' && <PhrasesTab />}
      </main>

      {/* Footer */}
      <footer className="hidden sm:block border-t border-hairline bg-paper py-5 text-center text-xs text-faint no-print">
        <p>{t('appTagline')}</p>
      </footer>

      {/* Phone: the four tabs sit within the thumb arc, not at the top */}
      <BottomTabs active={activeTab} onChange={setActiveTab} />

      <UndoToast pending={pendingUndo} onDismiss={() => setPendingUndo(null)} />

      {/* Print / PDF Document Layout (Only shown in print mode) */}
      <PrintItineraryView trip={activeTrip} />

      {/* Dialogs are mounted only while open: a lazy component still has to
          download before it can render, even to render nothing. */}
      <Suspense fallback={null}>
        {isActivityModalOpen && (
          <ActivityModal
            isOpen
            onClose={() => setIsActivityModalOpen(false)}
            onSave={handleSaveActivity}
            activityToEdit={activityToEdit}
            currentDayId={activityTargetDayId || activeTrip.days[0]?.id || ''}
            trip={activeTrip}
          />
        )}

        {isShareModalOpen && (
          <ShareModal
            isOpen
            onClose={() => setIsShareModalOpen(false)}
            trip={activeTrip}
            role={role}
            cloudMode={cloudMode}
          />
        )}

        {isSettingsModalOpen && (
          <TripSettingsModal
            isOpen
            onClose={() => setIsSettingsModalOpen(false)}
            trip={activeTrip}
            role={role}
            cloudMode={cloudMode}
            onSave={handleUpdateTrip}
            onDeleteTrip={handleDeleteTrip}
          />
        )}

        {isNewTripModalOpen && (
          <NewTripModal
            isOpen
            onClose={() => setIsNewTripModalOpen(false)}
            onCreateTrip={handleCreateTrip}
          />
        )}

        {isAuthModalOpen && (
          <AuthModal isOpen onClose={() => setIsAuthModalOpen(false)} />
        )}

        {seatPrompt && (
          <SeatPickerModal
            isOpen
            tripTitle={seatPrompt.tripTitle}
            seats={seatPrompt.seats}
            busySeatId={seatBusyId}
            error={seatError}
            onPick={handlePickSeat}
            onCancel={() => { setSeatPrompt(null); setSeatError(null); }}
          />
        )}
      </Suspense>
    </div>
  );
}

export default App;
