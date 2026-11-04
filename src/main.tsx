import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { I18nProvider } from './utils/i18n.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { installChunkRecovery, warmLazyChunks } from './services/chunkRecovery.ts'
import { lazyChunkLoaders } from './lazyChunks.ts'

// Before the first render, so a lazy part failing straight away is covered.
// Production only: in dev nothing is renamed between deploys.
if (import.meta.env.PROD) installChunkRecovery()

// The boundary sits outside I18nProvider on purpose: if the crash came from
// the language layer, a fallback that needed translating would crash too.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <I18nProvider>
        <App />
      </I18nProvider>
    </ErrorBoundary>
  </StrictMode>,
)

// Offline shell. Registered only in a real build: in dev the worker would sit
// in front of Vite's module server and fight HMR. Failure is not worth
// reporting — the app works exactly as before without it, just not offline.
//
// Once the worker is active, the maps and dialogs are downloaded in the
// background so it has them for the next time there is no signal. Waiting
// for `ready` matters: a file fetched before the worker is running goes
// past it and is never saved.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
    navigator.serviceWorker.ready.then(() => warmLazyChunks(lazyChunkLoaders)).catch(() => {})
  })
}
