import React, { useEffect, useRef, useState } from 'react';
import { Undo2 } from 'lucide-react';
import { useI18n } from '../utils/i18n';

/**
 * Delete now, offer a way back.
 *
 * A confirm dialog is the weakest kind of safety net: it interrupts everyone
 * every time and people click through it without reading, so it stops the
 * deliberate deletes and waves the accidental ones through. An undo does the
 * opposite — no friction when you meant it, a real way back when you didn't.
 */

export interface PendingUndo {
  /** What was removed, phrased for a person: "Jodd Fairs deleted". */
  message: string;
  /** Put it back. */
  undo: () => void;
}

const VISIBLE_MS = 6000;

export const UndoToast: React.FC<{
  pending: PendingUndo | null;
  onDismiss: () => void;
}> = ({ pending, onDismiss }) => {
  const { t } = useI18n();
  const timerRef = useRef<number | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!pending) return;
    setLeaving(false);
    timerRef.current = window.setTimeout(onDismiss, VISIBLE_MS);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [pending, onDismiss]);

  if (!pending) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-x-0 z-50 flex justify-center px-4 no-print
        bottom-[calc(env(safe-area-inset-bottom)+76px)] sm:bottom-6
        ${leaving ? 'opacity-0' : 'animate-riseIn'}`}
    >
      <div className="bg-ink text-paper rounded-card shadow-lift px-4 py-3 flex items-center gap-4 max-w-sm w-full">
        <span className="text-sm min-w-0 flex-1 truncate">{pending.message}</span>
        <button
          onClick={() => {
            setLeaving(true);
            pending.undo();
            onDismiss();
          }}
          className="inline-flex items-center gap-1.5 text-sm font-semibold shrink-0 underline"
        >
          <Undo2 className="w-4 h-4" />
          {t('undo')}
        </button>
      </div>
    </div>
  );
};
