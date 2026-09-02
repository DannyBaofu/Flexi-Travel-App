import React from 'react';

/**
 * Without this, a single render error unmounts the whole app and leaves a blank
 * white page — on a phone, in another country, with no way back and no way to
 * get the trip out. So the fallback does two things: offer a reload, and offer
 * an escape hatch that saves the trips to a file straight from localStorage,
 * without going through any of the code that just crashed.
 *
 * Deliberately not translated: `useI18n` is a hook and this must be a class
 * component, and if the crash came from the i18n layer a translated fallback
 * would crash too. Both languages are shown instead.
 */

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

const TRIPS_KEY = 'travelsync_trips_v1';

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('App crashed:', error, info.componentStack);
  }

  private rescueTrips = () => {
    try {
      const raw = localStorage.getItem(TRIPS_KEY) ?? '[]';
      const blob = new Blob([raw], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `travelsync-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Could not export trips:', e);
    }
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen bg-mist flex items-center justify-center p-5">
        <div className="bg-paper border border-hairline rounded-card shadow-lift w-full max-w-sm p-5 space-y-4">
          <div className="space-y-1.5">
            <h1 className="text-lg font-semibold text-ink">出了点问题 · Something broke</h1>
            <p className="text-sm text-muted leading-relaxed">
              你的行程还在这台设备上，没有丢失。
              <br />
              Your trips are still saved on this device — nothing was lost.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => window.location.reload()}
              className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-control text-sm font-semibold bg-brand hover:bg-brand-deep text-white transition"
            >
              重新载入 · Reload
            </button>
            <button
              onClick={this.rescueTrips}
              className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-control text-sm font-semibold bg-paper hover:bg-mist text-ink border border-hairline transition"
            >
              导出备份 · Save a backup
            </button>
          </div>

          <p className="text-[11px] text-faint leading-relaxed break-words">
            {this.state.error.message}
          </p>
        </div>
      </div>
    );
  }
}
