import React, { useState } from 'react';
import { CloudLightning, UserRound, KeyRound } from 'lucide-react';
import {
  signInWithId,
  signUpWithId,
  isValidId,
  MIN_PASSWORD_LENGTH,
  CONFIRM_EMAIL_ON
} from '../services/cloudSync';
import { useI18n } from '../utils/i18n';
import { Modal, btnPrimary, input, label } from './ui';

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

  const tabCls = (on: boolean) =>
    `flex-1 py-2 rounded-[7px] text-xs font-semibold transition ${
      on ? 'bg-brand text-white' : 'text-muted hover:text-ink'
    }`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('signInTitle')}
      subtitle={t('signInSubtitle')}
      icon={<CloudLightning className="w-5 h-5" />}
      closeLabel={t('close')}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div className="flex gap-1 p-1 bg-mist rounded-control">
          <button type="button" onClick={() => switchMode('signIn')} className={tabCls(mode === 'signIn')}>
            {t('authTabSignIn')}
          </button>
          <button type="button" onClick={() => switchMode('signUp')} className={tabCls(mode === 'signUp')}>
            {t('authTabFirstTime')}
          </button>
        </div>

        <p className="text-xs text-muted leading-relaxed">
          {mode === 'signIn' ? t('authSignInHint') : t('authFirstTimeHint')}
        </p>

        <div>
          <label className={`${label} flex items-center gap-1.5`}>
            <UserRound className="w-3.5 h-3.5" /> {t('authIdLabel')}
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
            className={input}
            required
          />
          <p className="text-[11px] text-faint mt-1.5 leading-relaxed">{t('authIdHint')}</p>
        </div>

        <div>
          <label className={`${label} flex items-center gap-1.5`}>
            <KeyRound className="w-3.5 h-3.5" /> {t('authPasswordLabel')}
          </label>
          <input
            type="password"
            autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('authPasswordPlaceholder')}
            className={input}
            required
          />
        </div>

        {error && (
          <p className="px-3 py-2.5 bg-clay-tint rounded-control text-xs text-clay leading-relaxed">
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className={`${btnPrimary} w-full`}>
          {busy ? t('authWorking') : mode === 'signIn' ? t('authSignInBtn') : t('authCreateBtn')}
        </button>
      </form>
    </Modal>
  );
};
