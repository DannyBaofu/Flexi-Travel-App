import React from 'react';
import { CloudOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { useI18n } from '../utils/i18n';

export type SyncState = 'idle' | 'saving' | 'saved' | 'offline' | 'error';

interface SyncBarProps {
  state: SyncState;
  onRetry: () => void;
}

/**
 * Only speaks up when something is wrong.
 *
 * A permanent "synced ✓" badge trains people to ignore the spot where the
 * failure will eventually appear, so the healthy states stay silent and only
 * offline and error get a bar — the two cases where an edit is sitting on this
 * phone and nowhere else.
 */
export const SyncBar: React.FC<SyncBarProps> = ({ state, onRetry }) => {
  const { t } = useI18n();

  if (state !== 'offline' && state !== 'error') return null;

  const offline = state === 'offline';

  return (
    <div
      role="status"
      className={`px-4 py-2 flex items-center justify-center gap-2.5 text-xs font-medium no-print ${
        offline ? 'bg-mist text-muted border-b border-hairline' : 'bg-gilt-tint text-gilt'
      }`}
    >
      {offline ? (
        <CloudOff className="w-3.5 h-3.5 shrink-0" />
      ) : (
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
      )}
      <span className="min-w-0 truncate">{offline ? t('syncOffline') : t('syncFailed')}</span>
      {!offline && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1 font-semibold underline shrink-0"
        >
          <RefreshCw className="w-3 h-3" />
          {t('syncRetry')}
        </button>
      )}
    </div>
  );
};
