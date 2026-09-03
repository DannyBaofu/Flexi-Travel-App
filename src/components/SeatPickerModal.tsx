import React from 'react';
import { Users, Check, Lock, AlertTriangle } from 'lucide-react';
import type { TripSeat } from '../types/travel';
import { useI18n } from '../utils/i18n';
import { Modal, btnSecondary } from './ui';

interface SeatPickerModalProps {
  isOpen: boolean;
  tripTitle: string;
  seats: TripSeat[];
  /** The seat currently being claimed, so only that row shows a spinner. */
  busySeatId: string | null;
  error: string | null;
  onPick: (travelerId: string) => void;
  onCancel: () => void;
}

const roleKey = (role: TripSeat['role']) =>
  role === 'viewer' ? 'seatRoleViewer' : role === 'admin' ? 'seatRoleAdmin' : 'seatRoleMember';

/**
 * The whole join flow: the organiser wrote the roster, and you say which of
 * those names is you. No password, because the invite link is the secret and
 * the seat you claim is the permission.
 *
 * A name already held by somebody else is shown but not tappable — seeing it
 * greyed out is what tells a latecomer their name was taken by mistake, which
 * a filtered-out row never could.
 */
export const SeatPickerModal: React.FC<SeatPickerModalProps> = ({
  isOpen,
  tripTitle,
  seats,
  busySeatId,
  error,
  onPick,
  onCancel
}) => {
  const { t } = useI18n();
  if (!isOpen) return null;

  const busy = busySeatId !== null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={t('seatPickerTitle')}
      subtitle={t('seatPickerSubtitle', { trip: tripTitle })}
      icon={<Users className="w-5 h-5" />}
      closeLabel={t('close')}
      size="sm"
      footer={
        <div className="flex justify-end">
          <button onClick={onCancel} disabled={busy} className={btnSecondary}>
            {t('seatPickerLater')}
          </button>
        </div>
      }
    >
      <div className="p-5 space-y-4">
        {seats.length === 0 ? (
          <p className="px-3 py-2.5 bg-gilt-tint rounded-control text-xs text-gilt leading-relaxed flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
            <span>{t('seatPickerEmpty')}</span>
          </p>
        ) : (
          <>
            <p className="text-xs text-muted leading-relaxed">{t('seatPickerHint')}</p>

            <ul className="space-y-2">
              {seats.map((seat) => {
                const locked = seat.claimed && !seat.mine;
                const claiming = busySeatId === seat.travelerId;

                return (
                  <li key={seat.travelerId}>
                    <button
                      type="button"
                      disabled={locked || busy}
                      onClick={() => onPick(seat.travelerId)}
                      className={`w-full min-h-[52px] px-3.5 py-3 rounded-control border flex items-center gap-3 text-left transition ${
                        locked
                          ? 'bg-mist border-hairline opacity-60 cursor-not-allowed'
                          : 'bg-paper border-hairline hover:border-brand hover:bg-brand-tint disabled:opacity-60'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: seat.avatarColor || undefined }}
                      />

                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-ink truncate">
                          {seat.name}
                        </span>
                        <span className="block text-[11px] text-muted mt-0.5">
                          {t(roleKey(seat.role))}
                        </span>
                      </span>

                      {claiming ? (
                        <span className="text-[11px] font-medium text-brand shrink-0">
                          {t('seatJoining')}
                        </span>
                      ) : seat.mine ? (
                        <span className="text-[11px] font-medium text-brand shrink-0 inline-flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> {t('seatYouBadge')}
                        </span>
                      ) : locked ? (
                        <span className="text-[11px] font-medium text-faint shrink-0 inline-flex items-center gap-1">
                          <Lock className="w-3.5 h-3.5" /> {t('seatTakenBadge')}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>

            <p className="text-[11px] text-faint leading-relaxed">{t('seatNotYouHint')}</p>
          </>
        )}

        {error && (
          <p className="px-3 py-2.5 bg-clay-tint rounded-control text-xs text-clay leading-relaxed">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
};
