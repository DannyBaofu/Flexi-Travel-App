/**
 * Keeping the parts that download on first use from crashing the app.
 *
 * The two maps and every dialog are `React.lazy`: their code is a separate
 * file fetched the first time somebody opens one. That fetch fails in two
 * ways a phone on a trip actually meets, and both used to end on the
 * full-screen "something broke" page:
 *
 *   An older build. Every deploy renames those files, and the old names stop
 *   existing — the catch-all rewrite in vercel.json then answers them with
 *   index.html, which is not a script. A phone that kept the app open across
 *   a deploy (a home-screen app resumed from the background does exactly
 *   that) asks for an old name the first time it opens a map or a dialog.
 *   One reload fetches the new build and the problem is gone, so the app
 *   does that reload itself — once, and only when a reload can help.
 *
 *   No signal. A map never opened on this phone is not in the service
 *   worker's cache, so in the metro it cannot load at all. The fix for that
 *   is to have it already: a few seconds after the app opens online, every
 *   such file is downloaded in the background, and the worker keeps them.
 *
 * What is left — offline before the background download ever ran — is caught
 * by `ChunkBoundary` around each map and the dialogs, which says so in place
 * instead of taking the rest of the app down with it.
 */

const RELOAD_KEY = 'travelsync-chunk-reload-at';

/** One automatic reload per this long, so a file that is really gone cannot loop. */
export const RELOAD_WINDOW_MS = 30_000;

let warming = false;
let unsentWork: () => boolean = () => false;

/**
 * App tells this module whether an edit is still on its way to the cloud.
 * That state lives in memory only, so a reload would drop the edit — and
 * nobody would know, because the same reload also clears the "not saved"
 * banner that would have said so.
 */
export function setUnsentWorkProbe(probe: () => boolean): void {
  unsentWork = probe;
}

export interface ReloadCheck {
  online: boolean;
  /** The failure came from the background download, which nobody is waiting on. */
  warming: boolean;
  unsent: boolean;
  lastReloadAt: number;
  now: number;
}

export function shouldReloadForMissingChunk(c: ReloadCheck): boolean {
  // Offline, a reload fetches nothing new; the boundary explains instead
  if (!c.online) return false;
  if (c.warming) return false;
  if (c.unsent) return false;
  return c.now - c.lastReloadAt > RELOAD_WINDOW_MS;
}

/**
 * Vite raises `vite:preloadError` on window whenever a lazy import fails.
 * The error still reaches the component either way; this only decides
 * whether to reload as well.
 */
export function installChunkRecovery(): void {
  window.addEventListener('vite:preloadError', () => {
    let lastReloadAt = 0;
    try {
      lastReloadAt = Number(sessionStorage.getItem(RELOAD_KEY)) || 0;
    } catch {
      // Storage refused (private mode): fall through to the time check with 0
    }
    const reload = shouldReloadForMissingChunk({
      online: navigator.onLine !== false,
      warming,
      unsent: unsentWork(),
      lastReloadAt,
      now: Date.now()
    });
    if (!reload) return;
    try {
      sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    } catch {
      // Without the stamp the window still holds for this page; good enough
    }
    window.location.reload();
  });
}

/**
 * Download every on-demand file in the background, once the first screen is
 * up, so the service worker has them for the next time there is no signal.
 * About 70 kB gzipped (Leaflet is most of it), once per deploy; a failure here is silent, because
 * nobody asked for these files yet.
 */
export function warmLazyChunks(loaders: Array<() => Promise<unknown>>, delayMs = 4000): void {
  if (navigator.onLine === false) return;
  const run = () => {
    warming = true;
    void Promise.allSettled(loaders.map(load => load())).finally(() => {
      warming = false;
    });
  };
  window.setTimeout(() => {
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(run, { timeout: 5000 });
    } else {
      run();
    }
  }, delayMs);
}
