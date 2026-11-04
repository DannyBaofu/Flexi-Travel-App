// @vitest-environment jsdom
import React, { lazy, Suspense } from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChunkBoundary, MapUnavailable, DialogUnavailable } from './ChunkBoundary';
import { I18nProvider } from '../utils/i18n';

/**
 * A part fetched on first use that cannot be fetched — no signal, or an old
 * build asking for a file that no longer exists — must fail where it is.
 * Before the boundary, the same failure was the app-wide crash page.
 */

// What React.lazy sees when the download fails
const failingPart = () =>
  lazy(() => Promise.reject(new TypeError('Failed to fetch dynamically imported module')));

afterEach(cleanup);

describe('ChunkBoundary', () => {
  it('shows the map message in place, and the rest of the screen carries on', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const Broken = failingPart();
    render(
      <I18nProvider>
        <p>The day list</p>
        <ChunkBoundary fallback={<MapUnavailable className="h-64" />}>
          <Suspense fallback={<div>loading</div>}>
            <Broken />
          </Suspense>
        </ChunkBoundary>
      </I18nProvider>
    );

    expect(await screen.findByText(/地图暂时打不开/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重新载入' })).toBeInTheDocument();
    expect(screen.getByText('The day list')).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it('closes a dialog notice, and clears once the dialogs it covered have closed', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    const Broken = failingPart();

    const Harness = () => {
      const [open, setOpen] = React.useState(true);
      return (
        <ChunkBoundary resetKey={String(open)} fallback={<DialogUnavailable onDismiss={() => setOpen(false)} />}>
          <Suspense fallback={null}>{open && <Broken />}</Suspense>
        </ChunkBoundary>
      );
    };
    render(
      <I18nProvider>
        <Harness />
      </I18nProvider>
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(/这个窗口暂时打不开/);
    await user.click(screen.getByRole('button', { name: '关闭' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    vi.restoreAllMocks();
  });
});
