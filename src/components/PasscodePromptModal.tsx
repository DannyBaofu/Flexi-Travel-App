import React, { useState } from 'react';
import { Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { hashPin } from '../services/sharing';
import { useI18n } from '../utils/i18n';
import { btnPrimary, btnSecondary, inputMono, card } from './ui';

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
  const { t } = useI18n();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expectedPinHash) {
      onSuccess();
      return;
    }

    if (hashPin(pin.trim()) === expectedPinHash) {
      setError(false);
      onSuccess();
    } else {
      setError(true);
    }
  };

  // This one blocks the whole app rather than sitting over it, so it keeps
  // its own centred layout instead of the shared modal shell.
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-mist animate-fadeIn no-print">
      <div className={`${card} w-full max-w-sm p-6 space-y-5 text-center`}>
        <div className="w-14 h-14 rounded-modal bg-gilt-tint text-gilt flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold text-ink">{t('passcodeTitle')}</h2>
          <p className="text-xs text-muted leading-relaxed">
            {t('passcodeDescPrefix')}{' '}
            <span className="font-semibold text-ink">“{tripTitle}”</span>{' '}
            {t('passcodeDescSuffix')}
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-3">
          <input
            type="password"
            autoFocus
            maxLength={8}
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setError(false);
            }}
            placeholder={t('enterPin')}
            className={`${inputMono} text-center text-lg tracking-[0.3em] py-3`}
          />

          {error && (
            <p className="text-xs text-clay bg-clay-tint py-2.5 px-3 rounded-control flex items-center justify-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {t('wrongPin')}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onCancel} className={`${btnSecondary} flex-1`}>
              {t('cancel')}
            </button>
            <button type="submit" className={`${btnPrimary} flex-1`}>
              {t('unlock')} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
