import React, { useState } from 'react';
import { X, CloudLightning, UserRound, KeyRound } from 'lucide-react';
import {
  signInWithId,
  signUpWithId,
  isValidId,
  MIN_PASSWORD_LENGTH,
  CONFIRM_EMAIL_ON
} from '../services/cloudSync';
import { useI18n } from '../utils/i18n';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Mode = 'signIn' | 'signUp';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>('signIn');
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Supabase speaks in emails and English error strings; friends typed an ID.
  // Translate the handful of cases they can actually hit.
  const friendlyError = (raw: string): string => {
    if (raw === CONFIRM_EMAIL_ON) return t('authConfirmEmailOn');
    if (/invalid login credentials/i.test(raw)) return t('authWrongCredentials');
    if (/already registered|already exists|user_already_exists/i.test(raw)) return t('authIdTaken');
    if (/password/i.test(raw) && /least|short|weak/i.test(raw)) {
      return t('authPasswordTooShort', { n: MIN_PASSWORD_LENGTH });
    }
    if (/rate limit|too many/i.test(raw)) return t('authTooManyTries');
    if (/fetch|network/i.test(raw)) return t('authOffline');
    return t('authFailed', { msg: raw });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = id.trim();

    if (!isValidId(cleanId)) {
      setError(t('authBadId'));
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t('authPasswordTooShort', { n: MIN_PASSWORD_LENGTH }));
      return;
    }

    setBusy(true);
    setError(null);
    try {
      if (mode === 'signIn') {
        await signInWithId(cleanId, password);
      } else {
        await signUpWithId(cleanId, password);
      }
      // The auth listener in App picks the session up from here
      setPassword('');
      onClose();
    } catch (err: any) {
      setError(friendlyError(err?.message || String(err)));
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
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
            title={t('cancel')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sign in / first time toggle */}
        <div className="px-6 pt-5">
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950 border border-slate-800 rounded-2xl">
            <button
              type="button"
              onClick={() => switchMode('signIn')}
              className={`py-2 rounded-xl text-xs font-bold transition ${
                mode === 'signIn'
                  ? 'bg-sky-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('authTabSignIn')}
            </button>
            <button
              type="button"
              onClick={() => switchMode('signUp')}
              className={`py-2 rounded-xl text-xs font-bold transition ${
                mode === 'signUp'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('authTabFirstTime')}
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-2.5 bg-slate-800/60 border border-slate-700/60 rounded-xl text-xs text-slate-300 leading-relaxed">
            {mode === 'signIn' ? t('authSignInHint') : t('authFirstTimeHint')}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <UserRound className="w-3.5 h-3.5 text-sky-400" /> {t('authIdLabel')}
            </label>
            <input
              type="text"
              autoFocus
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder={t('authIdPlaceholder')}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-sky-500"
              required
            />
            <p className="text-[11px] text-slate-500 mt-1">{t('authIdHint')}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-emerald-400" /> {t('authPasswordLabel')}
            </label>
            <input
              type="password"
              autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('authPasswordPlaceholder')}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          {error && (
            <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 leading-relaxed">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className={`w-full py-2.5 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-sm transition ${
              mode === 'signIn'
                ? 'bg-sky-500 hover:bg-sky-400'
                : 'bg-emerald-500 hover:bg-emerald-400'
            }`}
          >
            {busy
              ? t('authWorking')
              : mode === 'signIn'
                ? t('authSignInBtn')
                : t('authCreateBtn')}
          </button>
        </form>
      </div>
    </div>
  );
};
