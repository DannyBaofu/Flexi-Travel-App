import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Copy,
  Check,
  Lock,
  Share2,
  Download,
  Upload,
  Smartphone,
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
  label,
  chipBrand,
  chipPlain,
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

// QR codes cap out around 2953 bytes at level L; leave headroom.
const QR_MAX_URL_LENGTH = 2800;

// Past roughly this length a URL stops surviving the round trip through
// messaging apps and address bars, so we warn instead of letting it fail quietly.
const MESSAGING_SAFE_URL_LENGTH = 2000;

const sectionHeading = 'text-[11px] font-semibold text-faint uppercase tracking-wider';

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
  const [usePin, setUsePin] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);

  // Non-admins may only hand out read-only links
  const effectiveShareRole: TripRole = isAdmin ? shareRole : 'viewer';

  useEffect(() => {
    if (isOpen) {
      const generated = sharingService.generateShareUrl(trip, {
        role: effectiveShareRole,
        pin: usePin ? pinCode : undefined
      });
      setShareUrl(generated);
      setCopied(false);
      setCopyError(false);
      setImportError(null);
      setImportSuccess(false);
      setInviteUrl('');
      setInviteError(null);
      setInviteCopied(false);
    }
  }, [isOpen, trip, effectiveShareRole, usePin, pinCode]);

  const qrFits = shareUrl.length > 0 && shareUrl.length <= QR_MAX_URL_LENGTH;
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setCopyError(false);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard API can fail (older iOS Safari, permissions) — fall back
      try {
        const el = document.createElement('textarea');
        el.value = shareUrl;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch {
        setCopyError(true);
      }
    }
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({ title: trip.title, url: shareUrl });
    } catch {
      // User cancelled or share failed — nothing to do
    }
  };

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
    } catch { /* ignore */ }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = sharingService.importFromJson(content);
        onImportTrip(parsed);
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
        {/* ---- Who the link lets in ---- */}
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

        {/* ---- Invite link: the short one, and the one to reach for ---- */}
        {cloudMode && isAdmin && (
          <section className="space-y-3 pt-5 border-t border-hairline">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className={sectionHeading}>{t('inviteSection')}</h3>
              <span className={chipBrand}>{t('inviteRecommended')}</span>
            </div>
            <p className="text-xs text-muted leading-relaxed">{t('inviteHint')}</p>

            {inviteUrl ? (
              <div className={`${card} p-4 space-y-3`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={chipPlain}>{t('inviteShortBadge', { n: inviteUrl.length })}</span>
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
        )}

        {!cloudMode && (
          <p className="px-3 py-2.5 bg-gilt-tint rounded-control text-xs text-gilt leading-relaxed flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
            <span>{isCloudEnabled ? t('inviteRequiresLogin') : t('cloudOffNotice')}</span>
          </p>
        )}

        {/* ---- Snapshot link ---- */}
        <section className="space-y-3 pt-5 border-t border-hairline">
          <h3 className={sectionHeading}>{cloudMode ? t('snapshotSection') : t('shareableLink')}</h3>
          <p className="text-xs text-muted leading-relaxed">{t('snapshotIsCopy')}</p>

          {shareUrl.length > MESSAGING_SAFE_URL_LENGTH && (
            <p className="px-3 py-2.5 bg-gilt-tint rounded-control text-xs text-gilt leading-relaxed flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
              <span>{t('snapshotLengthWarn', { n: shareUrl.length })}</span>
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              onFocus={(e) => e.currentTarget.select()}
              className={`${inputMono} flex-1 min-w-0 bg-mist text-muted select-all`}
            />
            <div className="flex gap-2 shrink-0">
              <button
                onClick={handleCopyLink}
                className={`${copied ? btnSecondary : btnPrimary} flex-1 sm:flex-none`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? t('copied') : t('copyLink')}
              </button>
              {canNativeShare && (
                <button onClick={handleNativeShare} className={`${btnSecondary} flex-1 sm:flex-none`}>
                  <Share2 className="w-4 h-4" /> {t('nativeShare')}
                </button>
              )}
            </div>
          </div>

          {copyError && (
            <p className="px-3 py-2.5 bg-gilt-tint rounded-control text-xs text-gilt">{t('copyFailed')}</p>
          )}

          {/* A passcode only ever protects a snapshot — an invite link's
              access is decided by the cloud, not the URL. */}
          <div className="pt-1">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="flex items-center gap-2 text-sm text-ink">
                <Lock className={`w-4 h-4 shrink-0 ${usePin ? 'text-gilt' : 'text-faint'}`} />
                {t('requirePin')}
              </span>
              <span className="relative inline-flex shrink-0">
                <input
                  type="checkbox"
                  checked={usePin}
                  onChange={(e) => setUsePin(e.target.checked)}
                  className="sr-only peer"
                />
                <span className="w-10 h-6 bg-hairline rounded-full peer-checked:bg-brand transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-paper after:rounded-full after:h-5 after:w-5 after:transition-transform peer-checked:after:translate-x-4" />
              </span>
            </label>

            {usePin && (
              <div className="mt-3">
                <label className={label}>{t('setPasscode')}</label>
                <input
                  type="password"
                  maxLength={8}
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  placeholder={t('pinPlaceholder')}
                  className={`${inputMono} sm:w-64 tracking-[0.25em]`}
                />
                <p className="text-[11px] text-faint mt-1.5 leading-relaxed">{t('pinHint')}</p>
              </div>
            )}
          </div>

          {qrFits ? (
            <div className={`${card} p-4 flex flex-col sm:flex-row items-center gap-4`}>
              <div className="bg-paper p-2 rounded-control border border-hairline shrink-0">
                <QRCodeSVG value={shareUrl} size={104} level="L" />
              </div>
              <div className="space-y-1.5 text-center sm:text-left">
                <div className="text-sm font-semibold text-ink flex items-center justify-center sm:justify-start gap-1.5">
                  <Smartphone className="w-4 h-4 text-muted" /> {t('scanWithPhone')}
                </div>
                <p className="text-xs text-muted leading-relaxed">{t('qrHint')}</p>
                <span className={chipPlain}>{t('worksOffline')}</span>
              </div>
            </div>
          ) : (
            <p className="px-3 py-2.5 bg-mist rounded-control text-xs text-muted leading-relaxed flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-px text-gilt" />
              <span>{t('qrTooLong')}</span>
            </p>
          )}
        </section>

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
