import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, 
  DollarSign, 
  Luggage, 
  Languages,
  Compass
} from 'lucide-react';
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
  const cloudMode = isCloudEnabled && !!user;
  const pushTimerRef = useRef<number | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'itinerary' | 'budget' | 'checklist' | 'phrases'>('itinerary');
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
    if (joinCode && isCloudEnabled) {
      setPendingJoinCode(joinCode);
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
    setActiveTripId(remaining[0].id);
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

  const handleShowTaxiAddress = () => {
    setIsTaxiCardsModalOpen(true);
  };

  if (!activeTrip) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white p-4">
        <div className="text-center space-y-4">
          <Compass className="w-12 h-12 text-emerald-400 mx-auto animate-spin" />
          <h2 className="text-xl font-bold">{t('loading')}</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
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

      {joinError && (
        <div className="bg-red-950/80 border-b border-red-800/60 px-4 py-2 text-center text-xs text-red-200 no-print flex items-center justify-center gap-3">
          <span>{t('joinFailed', { msg: joinError })}</span>
          <button onClick={() => setJoinError(null)} className="underline hover:text-white">X</button>
        </div>
      )}
      {cloudMode && pendingJoinCode && (
        <div className="bg-sky-950/80 border-b border-sky-800/60 px-4 py-2 text-center text-xs text-sky-200 no-print">
          {t('joiningTrip')}
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 no-print">
        {/* Destination Hero Banner */}
        <TripBanner
          trip={activeTrip}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          role={role}
          rateIsLive={rateIsLive}
        />

        {/* Tab Navigation (Itinerary, Budget, Packing Checklist) */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-6">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab('itinerary')}
              className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition ${
                activeTab === 'itinerary'
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>{t('tabItinerary')}</span>
            </button>

            <button
              onClick={() => setActiveTab('budget')}
              className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition ${
                activeTab === 'budget'
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>{t('tabBudget')}</span>
            </button>

            <button
              onClick={() => setActiveTab('checklist')}
              className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition ${
                activeTab === 'checklist'
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              <Luggage className="w-4 h-4" />
              <span>{t('tabChecklist')}</span>
            </button>

            <button
              onClick={() => setActiveTab('phrases')}
              className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition ${
                activeTab === 'phrases'
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              <Languages className="w-4 h-4" />
              <span>{t('tabPhrases')}</span>
            </button>
          </div>
        </div>

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
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500 no-print">
        <p>{t('appTagline')}</p>
      </footer>

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
