// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '../utils/i18n';
import type { Trip, TripRole } from '../types/travel';

/**
 * An invite link is the only door into a trip, so the two things this sheet
 * must not get wrong are showing the code that is actually live and being
 * clear about destroying it. Replacing a link cannot be undone, and the old
 * one may already be sitting in a group chat.
 */

const fetchInvite = vi.fn();
const createInvite = vi.fn();

vi.mock('../services/cloudSync', () => ({
  fetchInvite: (...args: unknown[]) => fetchInvite(...args),
  createInvite: (...args: unknown[]) => createInvite(...args),
  buildInviteUrl: (code: string) => `https://travellor.vercel.app/j/${code}`,
  isCloudEnabled: true
}));

// Imported after the mock so the component picks up the stubs.
const { ShareModal } = await import('./ShareModal');

const trip = (over: Partial<Trip> = {}): Trip =>
  ({
    id: 'trip-1',
    title: 'Bangkok',
    destination: 'Bangkok',
    country: 'Thailand',
    startDate: '2026-09-01',
    endDate: '2026-09-05',
    coverImage: '',
    currency: 'THB',
    homeCurrency: 'MYR',
    exchangeRate: 8,
    travelers: [{ id: 't1', name: 'Danny', avatarColor: '#3930DB' }],
    days: [],
    expenses: [],
    createdAt: '',
    updatedAt: '',
    ...over
  }) as Trip;

const renderShare = (role: TripRole = 'admin', cloudMode = true) => {
  const onClose = vi.fn();
  render(
    <I18nProvider>
      <ShareModal
        isOpen
        onClose={onClose}
        trip={trip()}
        role={role}
        cloudMode={cloudMode}
      />
    </I18nProvider>
  );
  return { onClose };
};

beforeEach(() => {
  // Chinese is the app default; pin English so these assertions read as the
  // behaviour they are checking rather than as translated strings.
  localStorage.clear();
  localStorage.setItem('travelsync-lang', 'en');
  fetchInvite.mockReset().mockResolvedValue(null);
  createInvite.mockReset().mockResolvedValue('NEW123');
});

// Testing Library only auto-cleans with vitest globals, which are off here.
afterEach(cleanup);

describe('ShareModal — the live invite', () => {
  it('shows the code that is already out there instead of offering a new one', async () => {
    fetchInvite.mockResolvedValue('AB3F7K');
    renderShare();

    await waitFor(() =>
      expect(screen.getByDisplayValue('https://travellor.vercel.app/j/AB3F7K')).toBeTruthy()
    );
    // The sheet used to start blank every time, so re-reading your own link
    // meant pressing the button that makes a new one.
    expect(screen.queryByText('Create Invite Link')).toBeNull();
    expect(createInvite).not.toHaveBeenCalled();
  });

  it('offers to create one when the trip has no live invite', async () => {
    renderShare();
    await waitFor(() => expect(screen.getByText('Create Invite Link')).toBeTruthy());
  });

  it('creates the first link without asking, because nothing is lost', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderShare();

    await userEvent.click(await screen.findByText('Create Invite Link'));

    expect(confirm).not.toHaveBeenCalled();
    expect(createInvite).toHaveBeenCalledWith('trip-1');
    confirm.mockRestore();
  });
});

describe('ShareModal — replacing a link', () => {
  it('asks before destroying a link that may already be sent', async () => {
    fetchInvite.mockResolvedValue('AB3F7K');
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderShare();

    await userEvent.click(await screen.findByText('Replace with a new link'));

    expect(confirm).toHaveBeenCalled();
    // Declined, so the live code survives.
    expect(createInvite).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue('https://travellor.vercel.app/j/AB3F7K')).toBeTruthy();
    confirm.mockRestore();
  });

  it('replaces it once confirmed, and shows the new one', async () => {
    fetchInvite.mockResolvedValue('AB3F7K');
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderShare();

    await userEvent.click(await screen.findByText('Replace with a new link'));

    await waitFor(() =>
      expect(screen.getByDisplayValue('https://travellor.vercel.app/j/NEW123')).toBeTruthy()
    );
    expect(createInvite).toHaveBeenCalledWith('trip-1');
    confirm.mockRestore();
  });

  it('says that the old link stops working, rather than leaving it a surprise', async () => {
    fetchInvite.mockResolvedValue('AB3F7K');
    renderShare();

    await waitFor(() =>
      expect(
        screen.getByText(/the old link and code stop working/i)
      ).toBeTruthy()
    );
  });
});

describe('ShareModal — who may invite', () => {
  it('reads nothing and offers nothing to a traveller', async () => {
    renderShare('member');

    await waitFor(() =>
      expect(screen.getByText(/only the organiser can create the invite link/i)).toBeTruthy()
    );
    expect(fetchInvite).not.toHaveBeenCalled();
    expect(screen.queryByText('Create Invite Link')).toBeNull();
  });

  it('reads nothing on a trip that is not in the cloud', async () => {
    renderShare('admin', false);

    await waitFor(() => expect(screen.getByText(/Sign in/i)).toBeTruthy());
    expect(fetchInvite).not.toHaveBeenCalled();
  });
});
