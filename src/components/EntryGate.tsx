import React from 'react';
import { Calendar, Lock } from 'lucide-react';
import { useI18n } from '../utils/i18n';
import { btnPrimary, btnSecondary, card, inputMono, label as labelCls } from './ui';

interface EntryGateProps {
  /** The code typed by hand, for a friend given it verbally. */
  code: string;
  onCodeChange: (code: string) => void;
  onSubmitCode: (e: React.FormEvent) => void;
  /** Shown under the code field: a bad code, a stale link, a missing backend. */
  error: string | null;
  /** A join is in flight. */
  joining: boolean;
  /**
   * Whether this visitor may start a trip of their own. True for a signed-in
   * organiser, and for a deployment with no cloud at all — where local trips
   * are the only thing the app can do.
   */
  isOrganiser: boolean;
  cloudEnabled: boolean;
  /** Signed in, so the gate can offer the way back out. */
  signedIn: boolean;
  onCreateTrip: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
}

/**
 * What you see before you are on a trip.
 *
 * This screen used to lead with "create your first trip", which meant a friend
 * sent the bare domain instead of their invite link tapped it, made an empty
 * trip, and became its admin — Share button and all. The trip was their own and
 * nothing leaked, but from the outside it looked exactly like being handed the
 * keys to somebody else's.
 *
 * So the door a stranger gets is a code field and nothing else. Nothing about
 * the trip — not its name, not who is on it — is revealed before the code is
 * right, because `invite_roster` is what reveals it and that needs the code.
 * Starting a trip is an organiser's job, and it lives behind the organiser's
 * sign-in.
 */
export const EntryGate: React.FC<EntryGateProps> = ({
  code,
  onCodeChange,
  onSubmitCode,
  error,
  joining,
  isOrganiser,
  cloudEnabled,
  signedIn,
  onCreateTrip,
  onSignIn,
  onSignOut
}) => {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-mist flex items-center justify-center p-5">
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-modal bg-brand-tint text-brand flex items-center justify-center mx-auto">
            {isOrganiser ? <Calendar className="w-7 h-7" /> : <Lock className="w-7 h-7" />}
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-semibold tracking-tight text-ink">
              {isOrganiser ? t('emptyTitle') : t('gateTitle')}
            </h1>
            <p className="text-sm text-muted leading-relaxed">
              {isOrganiser ? t('emptyHint') : t('gateHint')}
            </p>
          </div>
        </div>

        {/* One primary button per screen, and which one depends on who is
            standing here: an organiser starts a trip, everyone else joins. */}
        {isOrganiser && (
          <button onClick={onCreateTrip} className={`${btnPrimary} w-full`}>
            <Calendar className="w-4 h-4" /> {t('createFirstTrip')}
          </button>
        )}

        {isOrganiser && cloudEnabled && (
          <div className="flex items-center gap-3 text-[11px] text-faint">
            <span className="h-px flex-1 bg-hairline" />
            {t('emptyOr')}
            <span className="h-px flex-1 bg-hairline" />
          </div>
        )}

        {/* The code field is hidden only where it could not work at all. */}
        {(cloudEnabled || !isOrganiser) && (
          <form onSubmit={onSubmitCode} className={`${card} p-4`}>
            <label className={labelCls} htmlFor="invite-code">{t('inviteCodeLabel')}</label>
            <input
              id="invite-code"
              value={code}
              onChange={(e) => onCodeChange(e.target.value.toUpperCase())}
              placeholder={t('inviteCodePlaceholder')}
              maxLength={12}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              className={`${inputMono} tracking-[0.16em] uppercase`}
            />
            {/* Primary for a visitor, because joining is the only thing they
                came to do; secondary for an organiser, whose primary is the
                create button above it. */}
            <button
              type="submit"
              disabled={!code.trim()}
              className={`${isOrganiser ? btnSecondary : btnPrimary} w-full mt-2`}
            >
              {t('joinWithCode')}
            </button>
            {error && <p className="text-xs text-clay mt-2 leading-relaxed">{error}</p>}
            {joining && <p className="text-xs text-muted mt-2">{t('joiningTrip')}</p>}
          </form>
        )}

        {/* The way to the other door. An organiser who is already signed in
            needs the way out instead. */}
        {cloudEnabled && (
          signedIn ? (
            <p className="text-xs text-muted text-center leading-relaxed">
              {t('emptyNoCloudTrips')}{' '}
              <button onClick={onSignOut} className="text-brand font-medium underline">
                {t('signOut')}
              </button>
            </p>
          ) : (
            <p className="text-xs text-muted text-center">
              {t('gateOrganiser')}{' '}
              <button onClick={onSignIn} className="text-brand font-medium underline">
                {t('gateOrganiserLink')}
              </button>
            </p>
          )
        )}
      </div>
    </div>
  );
};
