import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  DollarSign, 
  Luggage, 
  Car, 
  Compass
} from 'lucide-react';
import type { Trip, ActivityItem } from './types/travel';
import { storageService } from './services/storage';
import { sharingService } from './services/sharing';
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
import { useI18n } from './utils/i18n';

export function App() {
  const { t } = useI18n();
  const [trips, setTrips] = useState<Trip[]>(() => storageService.getTrips());
  const [activeTripId, setActiveTripId] = useState<string>(() => storageService.getActiveTripId());
  
  // Shared URL & Read-Only State
  const [isReadOnly, setIsReadOnly] = useState<boolean>(false);
  const [pendingSharePayload, setPendingSharePayload] = useState<SharePayload | null>(null);
  const [isPasscodePromptOpen, setIsPasscodePromptOpen] = useState<boolean>(false);

  // Active Tab: 'itinerary' | 'budget' | 'checklist'
  const [activeTab, setActiveTab] = useState<'itinerary' | 'budget' | 'checklist'>('itinerary');

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

  const applySharedTrip = (payload: SharePayload) => {
    const sharedTrip = payload.trip;
    setIsReadOnly(payload.readOnly);
    
    // Add to storage or switch to it
    const updatedTrips = storageService.saveTrip(sharedTrip);
    setTrips(updatedTrips);
    setActiveTripId(sharedTrip.id);
    storageService.setActiveTripId(sharedTrip.id);
    
    // Clean hash from URL so it doesn't stay permanently
    sharingService.clearShareHash();
  };

  // Get active trip object
  const activeTrip = trips.find(t => t.id === activeTripId) || trips[0];

  // Switch trip
  const handleSelectTrip = (tripId: string) => {
    setActiveTripId(tripId);
    storageService.setActiveTripId(tripId);
    setIsReadOnly(false);
  };

  // Update trip in state and local storage
  const handleUpdateTrip = (updatedTrip: Trip) => {
    const newTrips = storageService.saveTrip(updatedTrip);
    setTrips(newTrips);
  };

  // Create new trip
  const handleCreateTrip = (newTrip: Trip) => {
    const newTrips = storageService.saveTrip(newTrip);
    setTrips(newTrips);
    setActiveTripId(newTrip.id);
    storageService.setActiveTripId(newTrip.id);
    setIsReadOnly(false);
  };

  // Delete trip
  const handleDeleteTrip = (tripId: string) => {
    const remaining = storageService.deleteTrip(tripId);
    setTrips(remaining);
    setActiveTripId(remaining[0].id);
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
        isReadOnly={isReadOnly}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 no-print">
        {/* Destination Hero Banner */}
        <TripBanner
          trip={activeTrip}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          isReadOnly={isReadOnly}
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
          </div>

          <button
            onClick={() => setIsTaxiCardsModalOpen(true)}
            className="hidden sm:flex items-center gap-1.5 text-xs text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-2 rounded-xl border border-amber-500/30 font-semibold transition"
          >
            <Car className="w-4 h-4 text-amber-400" />
            <span>{t('showTaxiCards')}</span>
          </button>
        </div>

        {/* Tab Views */}
        {activeTab === 'itinerary' && (
          <ItineraryView
            trip={activeTrip}
            onUpdateTrip={handleUpdateTrip}
            onOpenAddActivityModal={handleOpenAddActivity}
            onOpenEditActivityModal={handleOpenEditActivity}
            onShowTaxiAddress={handleShowTaxiAddress}
            isReadOnly={isReadOnly}
          />
        )}

        {activeTab === 'budget' && (
          <BudgetTracker
            trip={activeTrip}
            onUpdateTrip={handleUpdateTrip}
            isReadOnly={isReadOnly}
          />
        )}

        {activeTab === 'checklist' && (
          <ChecklistTab
            trip={activeTrip}
            onUpdateTrip={handleUpdateTrip}
            isReadOnly={isReadOnly}
          />
        )}
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
        isOpen={isTaxiCardsModalOpen}
        onClose={() => setIsTaxiCardsModalOpen(false)}
        trip={activeTrip}
        onUpdateTrip={handleUpdateTrip}
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
