import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, Share2, AlertTriangle } from 'lucide-react';
import type { Trip, TripRole } from '../types/travel';
import { createInvite, fetchInvite, buildInviteUrl, isCloudEnabled } from '../services/cloudSync';
import { useI18n } from '../utils/i18n';
import {
  Modal,
  btnPrimary,
  btnSecondary,
  btnSecondarySm,
  inputMono,
  chipBrand,
  card,
  money
} from './ui';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  role: TripRole;
  cloudMode: boolean;
}

const sectionHeading = 'text-[11px] font-semibold text-faint uppercase tracking-wider';

/**
 * Sharing is now one short invite link and nothing else.
 *
 * The old snapshot link packed the whole trip into the URL — thousands of
 * characters, no QR, and it sent a frozen copy that never synced back. With
 * cloud sync on, an invite link is ~35 characters and stays live, so the
 * snapshot is not worth the confusion of offering both. Snapshot links that
 * were already sent still open fine; the app just stops making new ones.
 */
export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  trip,
  role,
  cloudMode
}) => {
  const { t } = useI18n();
  const isAdmin = role === 'admin';
  const [inviteUrl, setInviteUrl] = useState('');
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);



  useEffect(() => {
    if (!isOpen) return;
    setInviteUrl('');
    setInviteError(null);
    setInviteCopied(false);

    // Show the link that is actually out there. The sheet used to start blank
    // every time, so re-reading your own invite meant pressing the button that
    // makes a new one — which now retires the old one, and used to leave two
    // live codes behind. Nothing to read for a local trip or a non-admin.
    if (!cloudMode || !isAdmin) return;
    let cancelled = false;
    setInviteLoading(true);
    fetchInvite(trip.id)
      .then(code => {
        if (cancelled || !code) return;
        setInviteUrl(buildInviteUrl(code));
      })
      .finally(() => {
        if (!cancelled) setInviteLoading(false);
      });
    return () => { cancelled = true; };
  }, [isOpen, trip, cloudMode, isAdmin]);

  const handleCreateInvite = async () => {
    // Replacing a link kills one that may already be sitting in a group chat,
    // and there is no undo for that. Creating the first one costs nothing.
    if (inviteUrl && !window.confirm(t('confirmRotateInvite'))) return;
    setInviteBusy(true);
    setInviteError(null);
    try {
      const code = await createInvite(trip.id);
      setInviteUrl(buildInviteUrl(code));
    } catch (err: any) {
      setInviteError(err?.message || String(err));
    } finally {
      setInviteBusy(false);
    }
  };

  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2500);
    } catch {
      // Clipboard can be blocked; the link is on screen and selectable anyway
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('safeShare')}
      subtitle={t('shareSubtitle')}
      icon={<Share2 className="w-5 h-5" />}
      closeLabel={t('close')}
      size="lg"
      footer={
        <div className="flex justify-end">
          <button onClick={onClose} className={btnSecondary}>{t('done')}</button>
        </div>
      }
    >
      <div className="p-5 space-y-6">

        {/* ---- The invite link ---- */}
        {cloudMode ? (
          <section className="space-y-3">
            <h3 className={sectionHeading}>{t('inviteSection')}</h3>
            <p className="text-xs text-muted leading-relaxed">{t('inviteHint')}</p>
            {isAdmin && (
              <p className="text-[11px] text-faint leading-relaxed">{t('inviteRosterHint')}</p>
            )}

            {!isAdmin ? (
              <p className="px-3 py-2.5 bg-gilt-tint rounded-control text-xs text-gilt leading-relaxed flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
                <span>{t('inviteAdminOnly')}</span>
              </p>
            ) : inviteLoading && !inviteUrl ? (
              <p className="text-xs text-muted">{t('inviteLoading')}</p>
            ) : inviteUrl ? (
              <div className={`${card} p-4 space-y-3`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={chipBrand}>{t('inviteShortBadge', { n: inviteUrl.length })}</span>
                  <span className="text-xs text-muted">
                    {t('inviteCodeLabel')}:{' '}
                    <span className={`font-bold text-ink tracking-[0.14em] select-all ${money}`}>
                      {inviteUrl.split('/').pop()}
                    </span>
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    readOnly
                    value={inviteUrl}
                    onFocus={(e) => e.currentTarget.select()}
                    className={`${inputMono} flex-1 min-w-0 bg-mist text-brand select-all`}
                  />
                  <button
                    onClick={handleCopyInvite}
                    className={`${inviteCopied ? btnSecondary : btnPrimary} shrink-0`}
                  >
                    {inviteCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {inviteCopied ? t('copied') : t('copyLink')}
                  </button>
                </div>

                <p className="text-[11px] text-faint leading-relaxed">{t('inviteCodeHint')}</p>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {/* Short enough to scan, unlike the snapshot link ever was */}
                  <div className="bg-paper p-2 rounded-control border border-hairline shrink-0">
                    <QRCodeSVG value={inviteUrl} size={104} level="M" />
                  </div>
                  <button onClick={handleCreateInvite} disabled={inviteBusy} className={btnSecondarySm}>
                    {inviteBusy ? t('creatingInvite') : t('inviteNewLink')}
                  </button>
                </div>

                <p className="text-[11px] text-faint leading-relaxed">{t('inviteRotateHint')}</p>
              </div>
            ) : (
              <button onClick={handleCreateInvite} disabled={inviteBusy} className={btnPrimary}>
                {inviteBusy ? t('creatingInvite') : t('createInviteBtn')}
              </button>
            )}

            {inviteError && (
              <p className="px-3 py-2.5 bg-clay-tint rounded-control text-xs text-clay">{inviteError}</p>
            )}
          </section>
        ) : (
          <p className="px-3 py-2.5 bg-gilt-tint rounded-control text-xs text-gilt leading-relaxed flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
            <span>{isCloudEnabled ? t('inviteRequiresLogin') : t('cloudOffNotice')}</span>
          </p>
        )}
      </div>
    </Modal>
  );
};
