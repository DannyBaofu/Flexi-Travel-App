import React from 'react';
import { WifiOff } from 'lucide-react';
import { useI18n } from '../utils/i18n';
import { btnSecondarySm } from './ui';

/**
 * Catches a part that could not load — a map or a dialog fetched on first
 * use — so it fails where it is instead of on the app-wide "something broke"
 * page. See `services/chunkRecovery.ts` for why that fetch fails at all.
 *
 * React.lazy remembers a failed import, so trying again in place cannot
 * work; the way back is a reload, which is what the fallbacks offer. When
 * `resetKey` changes the boundary clears, which is how a dismissed dialog
 * notice goes away rather than staying up until the next reload.
 */

interface Props {
  fallback: React.ReactNode;
  resetKey?: string;
  children: React.ReactNode;
}

interface State {
  error: Error | null;
  resetKey?: string;
}

export class ChunkBoundary extends React.Component<Props, State> {
  state: State = { error: null, resetKey: this.props.resetKey };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  // Cleared during render rather than in componentDidUpdate, so the notice
  // is gone in the same paint as the dialog it stood in for
  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    return props.resetKey !== state.resetKey ? { error: null, resetKey: props.resetKey } : null;
  }

  componentDidCatch(error: Error) {
    console.error('A part of the app could not load:', error);
  }

  render() {
    return this.state.error ? this.props.fallback : this.props.children;
  }
}

/** In place of a map: same box, a sentence, and the way back. */
export const MapUnavailable: React.FC<{ className: string }> = ({ className }) => {
  const { t } = useI18n();
  return (
    <div
      role="status"
      className={`${className} w-full rounded-control border border-hairline bg-mist flex flex-col items-center justify-center gap-3 p-4 text-center`}
    >
      <WifiOff className="w-5 h-5 text-muted" aria-hidden="true" />
      <p className="text-xs text-muted leading-relaxed max-w-xs">{t('chunkMapFailed')}</p>
      <button type="button" onClick={() => window.location.reload()} className={btnSecondarySm}>
        {t('chunkReload')}
      </button>
    </div>
  );
};

/**
 * In place of a dialog: a notice above the bottom tabs. Closing it closes
 * the dialog that failed, so the screen behind is usable straight away.
 */
export const DialogUnavailable: React.FC<{ onDismiss: () => void }> = ({ onDismiss }) => {
  const { t } = useI18n();
  return (
    <div
      role="alert"
      className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+76px)] sm:bottom-6 sm:left-auto sm:right-6 sm:max-w-sm z-50 bg-paper border border-hairline rounded-card shadow-lift p-4 animate-riseIn"
    >
      <div className="flex items-start gap-3">
        <WifiOff className="w-5 h-5 text-muted shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-xs text-muted leading-relaxed">{t('chunkDialogFailed')}</p>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={onDismiss} className={btnSecondarySm}>
          {t('close')}
        </button>
        <button type="button" onClick={() => window.location.reload()} className={btnSecondarySm}>
          {t('chunkReload')}
        </button>
      </div>
    </div>
  );
};
