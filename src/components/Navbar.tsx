import React from 'react';
import { 
  Compass, 
  Share2, 
  Plus, 
  Sliders, 
  Car, 
  Printer, 
  ChevronDown
} from 'lucide-react';
import type { Trip } from '../types/travel';

interface NavbarProps {
  trips: Trip[];
  activeTrip: Trip;
  onSelectTrip: (tripId: string) => void;
  onOpenNewTripModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenShareModal: () => void;
  onOpenTaxiCardsModal: () => void;
  onPrint: () => void;
  isReadOnly?: boolean;
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
  isReadOnly
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 transition-all no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Trip Dropdown */}
          <div className="flex items-center gap-4 sm:gap-6">
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
                className="appearance-none bg-slate-800/90 hover:bg-slate-800 border border-slate-700 text-white text-xs sm:text-sm font-semibold rounded-xl pl-3.5 pr-8 py-2 focus:outline-none focus:border-emerald-500 cursor-pointer max-w-[200px] sm:max-w-[260px] truncate"
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
                title="Create New Trip"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">New Trip</span>
              </button>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Show Taxi Cards Button (Super handy for Bangkok!) */}
            <button
              onClick={onOpenTaxiCardsModal}
              className="p-2 sm:px-3 sm:py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              title="Show Driver Taxi Cards"
            >
              <Car className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Taxi Cards</span>
            </button>

            {/* Print / Save PDF Button */}
            <button
              onClick={onPrint}
              className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs transition"
              title="Print Itinerary or Save as PDF"
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* Trip Settings */}
            {!isReadOnly && (
              <button
                onClick={onOpenSettingsModal}
                className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs transition"
                title="Trip Settings"
              >
                <Sliders className="w-4 h-4" />
              </button>
            )}

            {/* Share with Friends Button */}
            <button
              onClick={onOpenShareModal}
              className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              <Share2 className="w-4 h-4" />
              <span>Share Trip</span>
            </button>
          </div>
        </div>
      </div>

      {isReadOnly && (
        <div className="bg-sky-950/80 border-b border-sky-800/60 px-4 py-1.5 text-center text-xs text-sky-200 font-medium">
          👁️ Viewing Shared Itinerary in Read-Only Mode. You can browse schedule, maps, and taxi cards!
        </div>
      )}
    </header>
  );
};
