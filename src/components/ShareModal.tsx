import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  X,
  Copy,
  Check,
  Lock,
  Unlock,
  Share2,
  Download,
  Upload,
  ShieldCheck,
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

  if (!isOpen) return null;

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
        const input = document.createElement('textarea');
        input.value = shareUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
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
        setTimeout(() => {
          onClose();
        }, 1200);
      } catch (err: any) {
        setImportError(err.message || 'Invalid JSON file.');
        setImportSuccess(false);
      }
    };
    reader.readAsText(file);
  };

  const permissionOptions: { value: TripRole; icon: typeof Eye; labelKey: string; descKey: string; activeClasses: string; iconActive: string }[] = [
    { value: 'admin', icon: Crown, labelKey: 'shareAsAdmin', descKey: 'shareAsAdminDesc', activeClasses: 'bg-amber-500/10 border-amber-500/40 text-white', iconActive: 'text-amber-400' },
    { value: 'member', icon: Edit3, labelKey: 'shareAsMember', descKey: 'shareAsMemberDesc', activeClasses: 'bg-emerald-500/10 border-emerald-500/40 text-white', iconActive: 'text-emerald-400' },
    { value: 'viewer', icon: Eye, labelKey: 'viewerReadOnly', descKey: 'viewerDesc', activeClasses: 'bg-sky-500/10 border-sky-500/40 text-white', iconActive: 'text-sky-400' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 sticky top-0 bg-slate-900/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{t('safeShare')}</h2>
              <p className="text-xs text-slate-400">{t('shareSubtitle')}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Security & Access Controls */}
          <div className="bg-slate-800/60 border border-slate-800 rounded-2xl p-4 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> {t('sharingPermissions')}
            </h3>

            {/* Permission Level (Admin / Member / Viewer) */}
            {isAdmin ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {permissionOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = shareRole === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setShareRole(opt.value)}
                      className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition ${
                        isSelected
                          ? opt.activeClasses
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${isSelected ? opt.iconActive : 'text-slate-500'}`} />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">{t(opt.labelKey)}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{t(opt.descKey)}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 bg-sky-500/5 border border-sky-500/20 rounded-xl text-xs text-sky-300 flex items-center gap-2">
                <Eye className="w-4 h-4 shrink-0" />
                {t('memberShareNote')}
              </div>
            )}

            {/* PIN Passcode Toggle */}
            <div className="pt-2 border-t border-slate-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {usePin ? <Lock className="w-4 h-4 text-amber-400" /> : <Unlock className="w-4 h-4 text-slate-400" />}
                  <span className="text-sm font-medium text-slate-200">{t('requirePin')}</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={usePin}
                    onChange={(e) => setUsePin(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {usePin && (
                <div className="mt-3">
                  <label className="block text-xs text-slate-400 mb-1">{t('setPasscode')}</label>
                  <input
                    type="password"
                    maxLength={8}
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value)}
                    placeholder={t('pinPlaceholder')}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-white text-sm focus:outline-none focus:border-amber-500 w-full sm:w-64 tracking-widest font-mono"
                  />
                  <p className="text-[11px] text-amber-400/80 mt-1">{t('pinHint')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Live Collaboration Invite (cloud sync) â€” the short link */}
          {cloudMode && isAdmin && (
            <div className="space-y-3 bg-sky-500/5 border border-sky-500/20 rounded-2xl p-4">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xs font-bold text-sky-300 uppercase tracking-wider">{t('inviteSection')}</h3>
                <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md uppercase tracking-wide">
                  {t('inviteRecommended')}
                </span>
              </div>
              <p className="text-xs text-slate-400">{t('inviteHint')}</p>

              {inviteUrl ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      {t('inviteShortBadge', { n: inviteUrl.length })}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {t('inviteCodeLabel')}:{' '}
                      <span className="font-mono font-bold text-sky-200 tracking-widest select-all">
                        {inviteUrl.split('/').pop()}
                      </span>
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={inviteUrl}
                      className="flex-1 min-w-0 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-sky-200 font-mono select-all focus:outline-none"
                    />
                    <button
                      onClick={handleCopyInvite}
                      className={`px-4 py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition shrink-0 ${
                        inviteCopied
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-sky-600 hover:bg-sky-500 text-white'
                      }`}
                    >
                      {inviteCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {inviteCopied ? t('copied') : t('copyLink')}
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-500">{t('inviteCodeHint')}</p>

                  <div className="flex flex-col sm:flex-row items-start gap-3">
                    <div className="bg-white p-3 rounded-xl shrink-0 shadow-lg">
                      <QRCodeSVG value={inviteUrl} size={110} level="M" />
                    </div>
                    <button
                      onClick={handleCreateInvite}
                      disabled={inviteBusy}
                      className="px-3 py-2 rounded-xl text-[11px] font-semibold text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition"
                    >
                      {inviteBusy ? t('creatingInvite') : t('inviteNewLink')}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleCreateInvite}
                  disabled={inviteBusy}
                  className="px-4 py-2.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs transition"
                >
                  {inviteBusy ? t('creatingInvite') : t('createInviteBtn')}
                </button>
              )}

              {inviteError && (
                <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300">
                  {inviteError}
                </div>
              )}
            </div>
          )}

          {/* Cloud not configured at all â€” explain why links are long */}
          {!cloudMode && (
            <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-2xl text-xs text-amber-200/90 leading-relaxed flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <span>{isCloudEnabled ? t('inviteRequiresLogin') : t('cloudOffNotice')}</span>
            </div>
          )}

          {/* Share Link & QR Code Box */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {cloudMode ? t('snapshotSection') : t('shareableLink')}
            </h3>

            <p className="text-xs text-slate-400 leading-relaxed">{t('snapshotIsCopy')}</p>

            {shareUrl.length > MESSAGING_SAFE_URL_LENGTH && (
              <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-xs text-amber-200/90 leading-relaxed flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <span>{t('snapshotLengthWarn', { n: shareUrl.length })}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 min-w-0 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-300 font-mono select-all focus:outline-none"
              />
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleCopyLink}
                  className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition ${
                    copied
                      ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? t('copied') : t('copyLink')}
                </button>
                {canNativeShare && (
                  <button
                    onClick={handleNativeShare}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white transition"
                  >
                    <Share2 className="w-4 h-4" /> {t('nativeShare')}
                  </button>
                )}
              </div>
            </div>

            {copyError && (
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300">
                {t('copyFailed')}
              </div>
            )}

            {/* QR Code Section — only when the URL fits QR capacity */}
            {qrFits ? (
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center gap-4">
                <div className="bg-white p-3 rounded-xl shrink-0 shadow-lg">
                  <QRCodeSVG value={shareUrl} size={110} level="L" />
                </div>
                <div className="space-y-1 text-center sm:text-left">
                  <div className="text-sm font-semibold text-white flex items-center justify-center sm:justify-start gap-1.5">
                    <Smartphone className="w-4 h-4 text-emerald-400" /> {t('scanWithPhone')}
                  </div>
                  <p className="text-xs text-slate-400">
                    {t('qrHint')}
                  </p>
                  <div className="pt-1">
                    <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      {t('worksOffline')}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-300 leading-relaxed">{t('qrTooLong')}</p>
              </div>
            )}
          </div>

          {/* Backup, Export & Import */}
          <div className="pt-2 border-t border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('backupImport')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => sharingService.exportToJsonFile(trip)}
                className="flex items-center justify-center gap-2 p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 transition"
              >
                <Download className="w-4 h-4 text-sky-400" /> {t('exportJson')}
              </button>

              <label className="flex items-center justify-center gap-2 p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 transition cursor-pointer">
                <Upload className="w-4 h-4 text-emerald-400" /> {t('importJson')}
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="sr-only"
                />
              </label>
            </div>

            {importSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                <Check className="w-4 h-4" /> {t('importSuccess')}
              </div>
            )}
            {importError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300">
                {importError}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
          >
            {t('done')}
          </button>
        </div>
      </div>
    </div>
  );
};
