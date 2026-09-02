import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Copy,
  Check,
  Share2,
  Download,
  Upload,
  Eye,
  Edit3,
  Crown,
  AlertTriangle
} from 'lucide-react';
import type { Trip, TripRole } from '../types/travel';
import { sharingService } from '../services/sharing';
import { createInvite, buildInviteUrl, isCloudEnabled } from '../services/cloudSync';
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
  onImportTrip: (importedTrip: Trip) => void;
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
  cloudMode,
  onImportTrip
}) => {
  const { t } = useI18n();
  const isAdmin = role === 'admin';
  const [shareRole, setShareRole] = useState<TripRole>(isAdmin ? 'member' : 'viewer');
  const [inviteUrl, setInviteUrl] = useState('');
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);

  // Non-admins may only hand out read-only links
  const effectiveShareRole: TripRole = isAdmin ? shareRole : 'viewer';

  useEffect(() => {
    if (isOpen) {
      setInviteUrl('');
      setInviteError(null);
      setInviteCopied(false);
      setImportError(null);
      setImportSuccess(false);
    }
  }, [isOpen, trip, effectiveShareRole]);

  const handleCreateInvite = async () => {
    setInviteBusy(true);
    setInviteError(null);
    try {
      const code = await createInvite(trip.id, effectiveShareRole);
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        onImportTrip(sharingService.importFromJson(content));
        setImportSuccess(true);
        setImportError(null);
        setTimeout(() => onClose(), 1200);
      } catch (err: any) {
        setImportError(err.message || 'Invalid JSON file.');
        setImportSuccess(false);
      }
    };
    reader.readAsText(file);
  };

  const permissionOptions: { value: TripRole; icon: typeof Eye; labelKey: string; descKey: string }[] = [
    { value: 'admin', icon: Crown, labelKey: 'shareAsAdmin', descKey: 'shareAsAdminDesc' },
    { value: 'member', icon: Edit3, labelKey: 'shareAsMember', descKey: 'shareAsMemberDesc' },
    { value: 'viewer', icon: Eye, labelKey: 'viewerReadOnly', descKey: 'viewerDesc' }
  ];

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
        {/* ---- What the link lets them do ---- */}
        <section className="space-y-3">
          <h3 className={sectionHeading}>{t('sharingPermissions')}</h3>

          {isAdmin ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {permissionOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = shareRole === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setShareRole(opt.value)}
                    className={`p-3 rounded-control border text-left flex items-start gap-2.5 transition ${
                      isSelected
                        ? 'bg-brand-tint border-brand-tint text-brand'
                        : 'bg-paper border-hairline text-muted hover:bg-mist'
                    }`}
                  >
                    <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                    <span className="min-w-0">
                      <span className={`block text-sm font-semibold ${isSelected ? 'text-brand' : 'text-ink'}`}>
                        {t(opt.labelKey)}
                      </span>
                      <span className="block text-xs text-muted mt-0.5">{t(opt.descKey)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="px-3 py-2.5 bg-mist rounded-control text-xs text-muted flex items-center gap-2">
              <Eye className="w-4 h-4 shrink-0" />
              {t('memberShareNote')}
            </p>
          )}
        </section>

        {/* ---- The invite link ---- */}
        {cloudMode ? (
          <section className="space-y-3 pt-5 border-t border-hairline">
            <h3 className={sectionHeading}>{t('inviteSection')}</h3>
            <p className="text-xs text-muted leading-relaxed">{t('inviteHint')}</p>

            {inviteUrl ? (
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

        {/* ---- Backup ---- */}
        <section className="space-y-3 pt-5 border-t border-hairline">
          <h3 className={sectionHeading}>{t('backupImport')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button onClick={() => sharingService.exportToJsonFile(trip)} className={btnSecondary}>
              <Download className="w-4 h-4" /> {t('exportJson')}
            </button>

            <label className={`${btnSecondary} cursor-pointer`}>
              <Upload className="w-4 h-4" /> {t('importJson')}
              <input type="file" accept=".json" onChange={handleFileUpload} className="sr-only" />
            </label>
          </div>

          {importSuccess && (
            <p className="px-3 py-2.5 bg-brand-tint rounded-control text-xs text-brand-deep flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" /> {t('importSuccess')}
            </p>
          )}
          {importError && (
            <p className="px-3 py-2.5 bg-clay-tint rounded-control text-xs text-clay">{importError}</p>
          )}
        </section>
      </div>
    </Modal>
  );
};
