import React, { useState } from 'react';
import { X, CloudLightning, Mail, KeyRound } from 'lucide-react';
import { sendOtp, verifyOtp } from '../services/cloudSync';
import { useI18n } from '../utils/i18n';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await sendOtp(email.trim());
      setStep('code');
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await verifyOtp(email.trim(), code.trim());
      // Auth state listener in App picks it up from here
      setStep('email');
      setCode('');
      onClose();
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <CloudLightning className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{t('signInTitle')}</h2>
              <p className="text-xs text-slate-400">{t('signInSubtitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        {step === 'email' ? (
          <form onSubmit={handleSendCode} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-sky-400" /> {t('emailLabel')}
              </label>
              <input
                type="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-sky-500"
                required
              />
            </div>

            {error && (
              <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300">
                {t('authFailed', { msg: error })}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-sm transition"
            >
              {busy ? t('sendingCode') : t('sendCode')}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="p-6 space-y-4">
            <div className="p-2.5 bg-sky-500/10 border border-sky-500/20 rounded-xl text-xs text-sky-300">
              {t('codeSentInfo')}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-emerald-400" /> {t('codeLabel')}
              </label>
              <input
                type="text"
                autoFocus
                inputMode="numeric"
                maxLength={8}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-lg text-center tracking-[0.4em] font-mono focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            {error && (
              <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300">
                {t('authFailed', { msg: error })}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setStep('email'); setError(null); }}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={busy}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-sm transition"
              >
                {busy ? t('verifying') : t('verifyCode')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
