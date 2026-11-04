/**
 * Every part of the app that downloads on first use, for the background
 * download in `services/chunkRecovery.ts`. Each import names the same module
 * its `React.lazy` does, so the bundler gives both one file, and fetching it
 * here is what puts it in the service worker's cache.
 *
 * Add a `lazy()` anywhere and it belongs here too — `lazyChunks.test.ts`
 * fails until it is, because a part missing from this list is a part that
 * crashes the first time somebody opens it with no signal.
 */
export const lazyChunkLoaders: Array<() => Promise<unknown>> = [
  () => import('./components/DayMap'),
  () => import('./components/TripMap'),
  () => import('./components/ActivityModal'),
  () => import('./components/ShareModal'),
  () => import('./components/TripSettingsModal'),
  () => import('./components/NewTripModal'),
  () => import('./components/AuthModal'),
  () => import('./components/SeatPickerModal')
];
