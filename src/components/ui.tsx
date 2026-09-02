import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Shared Daylight primitives.
 *
 * Every button, input and card in the app is built from these, so a
 * change to the look happens once here instead of in eighteen files.
 */

// ---- Buttons -------------------------------------------------------------
// Indigo is a scarce resource: at this saturation it dominates whatever it
// touches, so if two buttons are brand-coloured neither one answers
// "what do I do here". One primary per screen.

const btnBase =
  'inline-flex items-center justify-center gap-1.5 font-semibold rounded-control ' +
  'border transition disabled:opacity-50 disabled:cursor-not-allowed';

export const btnPrimary =
  `${btnBase} px-4 py-2.5 text-sm bg-brand hover:bg-brand-deep text-white border-transparent`;

export const btnSecondary =
  `${btnBase} px-4 py-2.5 text-sm bg-paper hover:bg-mist text-ink border-hairline`;

export const btnGhost =
  `${btnBase} px-4 py-2.5 text-sm bg-transparent hover:bg-mist text-muted hover:text-ink border-transparent`;

export const btnDanger =
  `${btnBase} px-4 py-2.5 text-sm bg-paper hover:bg-clay-tint text-clay border-clay/25`;

/** Small variants for dense rows — still 36px tall, inside a 44px tap row. */
export const btnPrimarySm =
  `${btnBase} px-3.5 py-2 text-xs bg-brand hover:bg-brand-deep text-white border-transparent`;

export const btnSecondarySm =
  `${btnBase} px-3 py-2 text-xs bg-paper hover:bg-mist text-ink border-hairline`;

/** Square icon button. 40px box inside a 44px row keeps the target legal. */
export const iconBtn =
  'w-10 h-10 shrink-0 inline-flex items-center justify-center rounded-control ' +
  'border border-hairline bg-paper text-muted hover:text-ink hover:bg-mist transition';

export const iconBtnSolid =
  'w-10 h-10 shrink-0 inline-flex items-center justify-center rounded-control ' +
  'border border-transparent bg-brand text-white hover:bg-brand-deep transition';

// ---- Surfaces ------------------------------------------------------------

export const card = 'bg-paper border border-hairline rounded-card shadow-lift';
export const cardFlat = 'bg-paper border border-hairline rounded-card';

// ---- Form controls -------------------------------------------------------

export const input =
  'w-full bg-paper border border-hairline rounded-control px-3.5 py-2.5 ' +
  'text-ink text-sm placeholder-faint focus:outline-none focus:border-brand transition';

export const inputMono = `${input} font-mono tabular-nums`;

export const select =
  'w-full bg-mist border border-hairline rounded-control px-3.5 py-2.5 ' +
  'text-ink text-sm font-medium focus:outline-none focus:border-brand transition';

export const label = 'block text-xs font-semibold text-muted mb-1.5';

// ---- Chips ---------------------------------------------------------------

const chipBase =
  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11.5px] font-semibold';

export const chipBrand = `${chipBase} bg-brand-tint text-brand`;
export const chipGilt = `${chipBase} bg-gilt-tint text-gilt`;
export const chipPlain = `${chipBase} bg-mist text-muted`;

// ---- Money ---------------------------------------------------------------
// The budget tab is a column of numbers people compare down the page;
// proportional digits make that harder than it needs to be.
export const money = 'font-mono tabular-nums';

// ---- Modal ---------------------------------------------------------------

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  /** 'md' fits a form; 'lg' fits a two-column body. */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeLabel: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const sizeCls: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl'
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  size = 'md',
  closeLabel,
  children,
  footer
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // Escape closes, Tab stays inside, and focus goes back where it came from.
  // Without the trap, keyboard and screen-reader users tab straight out into
  // the page behind a dialog that is visually covering it.
  useEffect(() => {
    if (!isOpen) return;

    const returnFocusTo = document.activeElement as HTMLElement | null;

    const focusables = (): HTMLElement[] =>
      Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) ?? []
      ).filter(el => el.offsetParent !== null);

    // Respect an autoFocus already inside the dialog rather than fighting it
    if (!panelRef.current?.contains(document.activeElement)) {
      focusables()[0]?.focus();
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      returnFocusTo?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-ink/40 backdrop-blur-sm animate-fadeIn no-print"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={`bg-paper border border-hairline w-full ${sizeCls[size]} rounded-t-modal sm:rounded-modal max-h-[92vh] sm:max-h-[90vh] overflow-hidden shadow-lift flex flex-col animate-riseIn`}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-hairline shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div className="w-10 h-10 rounded-control bg-brand-tint text-brand flex items-center justify-center shrink-0">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-ink tracking-tight truncate">{title}</h2>
              {subtitle && <p className="text-xs text-muted mt-0.5 line-clamp-2">{subtitle}</p>}
            </div>
          </div>

          <button onClick={onClose} className={iconBtn} title={closeLabel} aria-label={closeLabel}>
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>

        {footer && (
          <div className="px-5 py-3.5 border-t border-hairline bg-mist shrink-0">{footer}</div>
        )}
      </div>
    </div>
  );
};
