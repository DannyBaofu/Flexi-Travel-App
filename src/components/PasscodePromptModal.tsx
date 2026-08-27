import React, { useState } from 'react';
import { Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { hashPin } from '../services/sharing';

interface PasscodePromptModalProps {
  isOpen: boolean;
  expectedPinHash?: string;
  tripTitle: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const PasscodePromptModal: React.FC<PasscodePromptModalProps> = ({
  isOpen,
  expectedPinHash,
  tripTitle,
  onSuccess,
  onCancel
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expectedPinHash) {
      onSuccess();
      return;
    }

    const calculatedHash = hashPin(pin.trim());
    if (calculatedHash === expectedPinHash) {
      setError(false);
      onSuccess();
    } else {
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 text-center">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
          <Lock className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-white">Passcode Protected Itinerary</h2>
          <p className="text-xs text-slate-400 mt-1">
            The organizer has protected <span className="text-emerald-400 font-semibold">"{tripTitle}"</span> with a security PIN.
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <input
              type="password"
              autoFocus
              maxLength={8}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError(false);
              }}
              placeholder="Enter PIN Passcode"
              className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-center text-white text-lg tracking-widest font-mono focus:outline-none focus:border-amber-500 transition"
            />
          </div>

          {error && (
            <div className="text-xs text-red-400 flex items-center justify-center gap-1.5 bg-red-500/10 p-2.5 rounded-xl border border-red-500/20">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Incorrect PIN code. Please ask the trip organizer.</span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20"
            >
              Unlock Itinerary <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
