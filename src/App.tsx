import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Compass } from 'lucide-react';
import type { Trip, ActivityItem, TripRole } from './types/travel';
import { storageService } from './services/storage';
import { sharingService, resolveShareRole } from './services/sharing';
import type { SharePayload } from './services/sharing';
import { Navbar } from './components/Navbar';
import { TripBanner } from './components/TripBanner';
import { ItineraryView } from './components/ItineraryView';
import { BudgetTracker } from './components/BudgetTracker';
import { ChecklistTab } from './components/ChecklistTab';
import { ActivityModal } from './components/ActivityModal';
import { ShareModal } from './components/ShareModal';
import { TripSettingsModal } from './components/TripSettingsModal';
import { NewTripModal } from './components/NewTripModal';
import { TaxiCardsModal } from './components/TaxiCardsModal';
import { PasscodePromptModal } from './components/PasscodePromptModal';
import { PrintItineraryView } from './components/PrintItineraryView';
import { PhrasesTab } from './components/PhrasesTab';
import { TopTabs, BottomTabs } from './components/TabBar';
import type { TabId } from './components/TabBar';
import { btnPrimary, btnSecondary, card, inputMono, label as labelCls } from './components/ui';
import { AuthModal } from './components/AuthModal';
import { useI18n } from './utils/i18n';
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
  joinTripByCode,
  parseJoinCodeFromUrl,
  clearJoinHash
} from './services/cloudSync';

export function App() {
  const { t } = useI18n();
  const [trips, setTrips] = useState<Trip[]>(() => storageService.getTrips());
  const [activeTripId, setActiveTripId] = useState<string>(() => storageService.getActiveTripId());
  
  // Shared URL state
  const [pendingSharePayload, setPendingSharePayload] = useState<SharePayload | null>(null);
  const [isPasscodePromptOpen, setIsPasscodePromptOpen] = useState<boolean>(false);

  // Cloud sync state
  const [user, setUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [pendingJoinCode, setPendingJoinCode] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  // An invite link arrived, but this deployment has no cloud backend configured
  const [joinBlockedNoCloud, setJoinBlockedNoCloud] = useState(false);
  // Typed by hand on the first screen, for a friend given the code verbally
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const cloudMode = isCloudEnabled && !!user;
  const pushTimerRef = useRef<number | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabId>('itinerary');
  const [rateIsLive, setRateIsLive] = useState(false);

  // Modals
  const [isNewTripModalOpen, setIsNewTripModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isTaxiCardsModalOpen, setIsTaxiCardsModalOpen] = useState(false);

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
    const payload = sharingService.parseShareFromUrl();
    if (payload) {
      if (payload.requiresPin && payload.pinHash) {
        setPendingSharePayload(payload);
        setIsPasscodePromptOpen(true);
      } else {
        applySharedTrip(payload);
      }
    }
  }, []);

  // Cloud auth bootstrap
  useEffect(() => {
    if (!isCloudEnabled) return;
    getSession().then(s => setUser(s?.user ?? null));
    const off = onAuthChange(setUser);
    return off;
  }, []);

  // An invite link needs a signed-in user
  useEffect(() => {
    if (pendingJoinCode && isCloudEnabled && !user) {
      setIsAuthModalOpen(true);
    }
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
        for (const lt of localTrips) {
          if (!cloudIds.has(lt.id) && (lt.myRole === undefined || lt.myRole === 'admin')) {
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

  // Join a trip from an invite link once signed in
  useEffect(() => {
    if (!cloudMode || !pendingJoinCode) return;
    (async () => {
      try {
        const tripId = await joinTripByCode(pendingJoinCode);
        const cloudTrips = await fetchMyTrips();
        storageService.saveTrips(cloudTrips);
        setTrips(cloudTrips);
        setActiveTripId(tripId);
        storageService.setActiveTripId(tripId);
      } catch (e: any) {
        setJoinError(e?.message || String(e));
      }
      setPendingJoinCode(null);
    })();
  }, [cloudMode, pendingJoinCode]);

  const applySharedTrip = (payload: SharePayload) => {
    const grantedRole = resolveShareRole(payload);

    // Never let a share link downgrade or overwrite the owner's own copy:
    // if we already hold this trip as its admin, just switch to it.
    const existing = storageService.getTrips().find(t => t.id === payload.trip.id);
    if (existing && (existing.myRole === undefined || existing.myRole === 'admin')) {
      setActiveTripId(existing.id);
      storageService.setActiveTripId(existing.id);
      sharingService.clearShareHash();
      return;
    }

    const sharedTrip: Trip = { ...payload.trip, myRole: grantedRole };
    const updatedTrips = storageService.saveTrip(sharedTrip);
    setTrips(updatedTrips);
    setActiveTripId(sharedTrip.id);
    storageService.setActiveTripId(sharedTrip.id);

    // Clean hash from URL so it doesn't stay permanently
    sharingService.clearShareHash();
  };

  // Get active trip object
  const activeTrip = trips.find(t => t.id === activeTripId) || trips[0];

  // Role of this user for the active trip: locally created trips = admin
  const role: TripRole = activeTrip?.myRole || 'admin';

  // Switch trip
  const handleSelectTrip = (tripId: string) => {
    setActiveTripId(tripId);
    storageService.setActiveTripId(tripId);
  };

  // Update trip in state and local storage; mirror to cloud when signed in
  const handleUpdateTrip = (updatedTrip: Trip) => {
    const newTrips = storageService.saveTrip(updatedTrip);
    setTrips(newTrips);
    if (cloudMode && updatedTrip.myRole !== 'viewer') {
      if (pushTimerRef.current) window.clearTimeout(pushTimerRef.current);
      pushTimerRef.current = window.setTimeout(() => {
        upsertTripCloud(updatedTrip).catch(err => console.error('Cloud push failed:', err));
      }, 600);
    }
  };

  // Create new trip
  const handleCreateTrip = (newTrip: Trip) => {
    const newTrips = storageService.saveTrip(newTrip);
    setTrips(newTrips);
    setActiveTripId(newTrip.id);
    storageService.setActiveTripId(newTrip.id);
    if (cloudMode) {
      createTripCloud(newTrip).catch(err => console.error('Cloud create failed:', err));
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
        const merged: Trip = { ...remoteTrip, myRole: current?.myRole };
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
    if (!activeTrip || role === 'viewer') {
      setRateIsLive(false);
      return;
    }
    let cancelled = false;
    fetchLiveRate(activeTrip.homeCurrency, activeTrip.currency).then((liveRate) => {
      if (cancelled || !liveRate) return;
      setRateIsLive(true);
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

  const handleShowTaxiAddress = () => {
    setIsTaxiCardsModalOpen(true);
  };

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
            {cloudMode && pendingJoinCode && (
              <p className="text-xs text-muted mt-2">{t('joiningTrip')}</p>
            )}
          </form>
        </div>

        <NewTripModal
          isOpen={isNewTripModalOpen}
          onClose={() => setIsNewTripModalOpen(false)}
          onCreateTrip={handleCreateTrip}
        />

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
        />
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
        onOpenTaxiCardsModal={() => setIsTaxiCardsModalOpen(true)}
        onPrint={() => window.print()}
        role={role}
        cloudEnabled={isCloudEnabled}
        user={user}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onSignOut={handleSignOut}
      />

      {(joinError || joinBlockedNoCloud) && (
        <div className="bg-clay-tint border-b border-clay/20 px-4 py-2 text-xs text-clay no-print flex items-center justify-center gap-3">
          <span>{joinBlockedNoCloud ? t('joinNeedsCloud') : t('joinFailed', { msg: joinError ?? '' })}</span>
          <button
            onClick={() => { setJoinError(null); setJoinBlockedNoCloud(false); }}
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
        {/* Destination Hero Banner */}
        <TripBanner
          trip={activeTrip}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          role={role}
          rateIsLive={rateIsLive}
        />

        <TopTabs active={activeTab} onChange={setActiveTab} />

        {/* Tab Views */}
        {activeTab === 'itinerary' && (
          <ItineraryView
            key={activeTrip.id}
            trip={activeTrip}
            onUpdateTrip={handleUpdateTrip}
            onOpenAddActivityModal={handleOpenAddActivity}
            onOpenEditActivityModal={handleOpenEditActivity}
            onShowTaxiAddress={handleShowTaxiAddress}
            role={role}
          />
        )}

        {activeTab === 'budget' && (
          <BudgetTracker
            key={activeTrip.id}
            trip={activeTrip}
            onUpdateTrip={handleUpdateTrip}
            role={role}
          />
        )}

        {activeTab === 'checklist' && (
          <ChecklistTab
            key={activeTrip.id}
            trip={activeTrip}
            onUpdateTrip={handleUpdateTrip}
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

      {/* Print / PDF Document Layout (Only shown in print mode) */}
      <PrintItineraryView trip={activeTrip} />

      {/* Modals */}
      <ActivityModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        onSave={handleSaveActivity}
        activityToEdit={activityToEdit}
        currentDayId={activityTargetDayId || activeTrip.days[0]?.id || ''}
        trip={activeTrip}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        trip={activeTrip}
        role={role}
        cloudMode={cloudMode}
        onImportTrip={(imported) => {
          handleCreateTrip(imported);
        }}
      />

      <TripSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        trip={activeTrip}
        onSave={handleUpdateTrip}
        onDeleteTrip={handleDeleteTrip}
      />

      <NewTripModal
        isOpen={isNewTripModalOpen}
        onClose={() => setIsNewTripModalOpen(false)}
        onCreateTrip={handleCreateTrip}
      />

      <TaxiCardsModal
        key={activeTrip.id}
        isOpen={isTaxiCardsModalOpen}
        onClose={() => setIsTaxiCardsModalOpen(false)}
        trip={activeTrip}
        onUpdateTrip={handleUpdateTrip}
        role={role}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <PasscodePromptModal
        isOpen={isPasscodePromptOpen}
        expectedPinHash={pendingSharePayload?.pinHash}
        tripTitle={pendingSharePayload?.trip?.title || t('sharedTrip')}
        onSuccess={() => {
          if (pendingSharePayload) {
            applySharedTrip(pendingSharePayload);
          }
          setIsPasscodePromptOpen(false);
          setPendingSharePayload(null);
        }}
        onCancel={() => {
          setIsPasscodePromptOpen(false);
          setPendingSharePayload(null);
          sharingService.clearShareHash();
        }}
      />
    </div>
  );
}

export default App;
