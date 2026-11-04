import { describe, it, expect } from 'vitest';
import { shouldReloadForMissingChunk, RELOAD_WINDOW_MS } from './chunkRecovery';

const base = { online: true, warming: false, unsent: false, lastReloadAt: 0, now: 1_000_000 };

describe('shouldReloadForMissingChunk', () => {
  it('reloads once when online, which is the old-build case a reload fixes', () => {
    expect(shouldReloadForMissingChunk(base)).toBe(true);
  });

  it('does not reload offline, where a reload fetches nothing new', () => {
    expect(shouldReloadForMissingChunk({ ...base, online: false })).toBe(false);
  });

  it('does not reload for the background download, which nobody is waiting on', () => {
    expect(shouldReloadForMissingChunk({ ...base, warming: true })).toBe(false);
  });

  it('does not reload while an edit is still on its way to the cloud', () => {
    // That edit lives in memory only; a reload would drop it without a word
    expect(shouldReloadForMissingChunk({ ...base, unsent: true })).toBe(false);
  });

  it('reloads at most once per window, so a file that is really gone cannot loop', () => {
    expect(shouldReloadForMissingChunk({ ...base, lastReloadAt: base.now - 5_000 })).toBe(false);
    expect(shouldReloadForMissingChunk({ ...base, lastReloadAt: base.now - RELOAD_WINDOW_MS - 1 })).toBe(true);
  });
});
