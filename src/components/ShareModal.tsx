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
  Edit3
} from 'lucide-react';
import type { Trip } from '../types/travel';
import { sharingService } from '../services/sharing';
import { useI18n } from '../utils/i18n';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  onImportTrip: (importedTrip: Trip) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  trip,
  onImportTrip
}) => {
  const { t } = useI18n();
  const [readOnly, setReadOnly] = useState(false);
  const [usePin, setUsePin] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const generated = sharingService.generateShareUrl(trip, {
        readOnly,
        pin: usePin ? pinCode : undefined
      });
      setShareUrl(generated);
      setCopied(false);
      setImportError(null);
      setImportSuccess(false);
    }
  }, [isOpen, trip, readOnly, usePin, pinCode]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
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

            {/* Permission Mode (Edit vs View-only) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setReadOnly(false)}
                className={`p-3 rounded-xl border text-left flex items-start gap-3 transition ${
                  !readOnly
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Edit3 className={`w-5 h-5 mt-0.5 ${!readOnly ? 'text-emerald-400' : 'text-slate-500'}`} />
                <div>
                  <div className="text-sm font-semibold">{t('collabEdit')}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{t('collabEditDesc')}</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setReadOnly(true)}
                className={`p-3 rounded-xl border text-left flex items-start gap-3 transition ${
                  readOnly
                    ? 'bg-sky-500/10 border-sky-500/40 text-white'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Eye className={`w-5 h-5 mt-0.5 ${readOnly ? 'text-sky-400' : 'text-slate-500'}`} />
                <div>
                  <div className="text-sm font-semibold">{t('viewerReadOnly')}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{t('viewerDesc')}</div>
                </div>
              </button>
            </div>

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

          {/* Share Link & QR Code Box */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('shareableLink')}</h3>
            
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-300 font-mono select-all focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                className={`px-4 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition ${
                  copied
                    ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? t('copied') : t('copyLink')}
              </button>
            </div>

            {/* QR Code Section */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center gap-4">
              <div className="bg-white p-3 rounded-xl shrink-0 shadow-lg">
                <QRCodeSVG value={shareUrl} size={110} level="M" />
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
