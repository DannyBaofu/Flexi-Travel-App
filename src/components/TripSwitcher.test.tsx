// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TripSwitcher } from './TripSwitcher';
import { toISODate } from '../services/tripDays';
import { I18nProvider } from '../utils/i18n';
import type { Trip } from '../types/travel';

/**
 * The sheet's whole job is to say which trip you are on and get you to
 * another one. What it must not do is bury a live trip under finished ones,
 * or offer a viewer a way to create anything.
 */

/**
 * Dates are written as offsets from today rather than pinned to a calendar,
 * so which phase a fixture lands in does not depend on when the suite runs.
 * Fake timers are deliberately not used here: userEvent waits on real ones,
 * and the two deadlock.
 */
const dayOffset = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toISODate(d);
};

const trip = (id: string, title: string, startsIn: number, endsIn: number): Trip =>
  ({
    id,
    title,
    destination: 'Bangkok',
    country: 'Thailand',
    startDate: dayOffset(startsIn),
    endDate: dayOffset(endsIn),
    coverImage: '',
    currency: 'THB',
    homeCurrency: 'MYR',
    exchangeRate: 10,
    travelers: [],
    days: [],
    expenses: [],
    createdAt: '',
    updatedAt: ''
  }) as Trip;

const liveTrip = () => trip('live', 'Bangkok Now', -1, 5);
const nextTrip = () => trip('next', 'Seoul Later', 30, 36);
const pastTrip = () => trip('past', 'Tokyo Before', -400, -394);

const renderSwitcher = (
  trips: Trip[],
  over: { activeTripId?: string; canCreate?: boolean } = {}
) => {
  const onSelectTrip = vi.fn();
  const onClose = vi.fn();
  const onCreateTrip = vi.fn();
  render(
    <I18nProvider>
      <TripSwitcher
        isOpen
        onClose={onClose}
        trips={trips}
        activeTripId={over.activeTripId ?? trips[0]?.id ?? ''}
        onSelectTrip={onSelectTrip}
        onCreateTrip={over.canCreate === false ? undefined : onCreateTrip}
      />
    </I18nProvider>
  );
  return { onSelectTrip, onClose, onCreateTrip };
};

const rowFor = (title: string) => screen.getByText(title).closest('button') as HTMLButtonElement;

beforeEach(() => {
  // Chinese is the app default; pin English so these assertions read as the
  // behaviour they check rather than as translated strings.
  localStorage.clear();
  localStorage.setItem('travelsync-lang', 'en');
});

// Testing Library's automatic cleanup only registers with vitest globals,
// which are off in this repo.
afterEach(cleanup);

describe('TripSwitcher', () => {
  it('lists the live and upcoming trips, and folds the finished ones away', () => {
    renderSwitcher([pastTrip(), liveTrip(), nextTrip()]);

    expect(screen.getByText('Bangkok Now')).toBeInTheDocument();
    expect(screen.getByText('Seoul Later')).toBeInTheDocument();
    expect(screen.queryByText('Tokyo Before')).not.toBeInTheDocument();
    expect(screen.getByText('Past trips (1)')).toBeInTheDocument();
  });

  it('shows a finished trip once its group is opened', async () => {
    const user = userEvent.setup();
    renderSwitcher([liveTrip(), pastTrip()]);

    await user.click(screen.getByText('Past trips (1)'));
    expect(screen.getByText('Tokyo Before')).toBeInTheDocument();
  });

  it('puts the live trip first however the list arrived', () => {
    renderSwitcher([nextTrip(), liveTrip()]);

    const order = screen
      .getAllByRole('button')
      .map(b => b.textContent || '')
      .filter(text => text.includes('Bangkok Now') || text.includes('Seoul Later'))
      .map(text => (text.includes('Bangkok Now') ? 'live' : 'next'));
    expect(order).toEqual(['live', 'next']);
  });

  it('says a live trip is on now', () => {
    renderSwitcher([liveTrip()]);
    expect(screen.getByText('On now')).toBeInTheDocument();
  });

  it('says how long until a trip that has not started', () => {
    renderSwitcher([trip('next', 'Seoul Later', 12, 18)]);
    expect(screen.getByText('In 12 days')).toBeInTheDocument();
  });

  it('says tomorrow rather than "in 1 days"', () => {
    renderSwitcher([trip('next', 'Seoul Later', 1, 5)]);
    expect(screen.getByText('Tomorrow')).toBeInTheDocument();
    expect(screen.queryByText('In 1 days')).not.toBeInTheDocument();
  });

  it('marks the trip currently open', () => {
    renderSwitcher([liveTrip(), nextTrip()], { activeTripId: 'next' });

    expect(rowFor('Seoul Later')).toHaveAttribute('aria-current', 'true');
    expect(rowFor('Bangkok Now')).not.toHaveAttribute('aria-current');
  });

  it('switches trip and closes itself in one tap', async () => {
    const user = userEvent.setup();
    const { onSelectTrip, onClose } = renderSwitcher([liveTrip(), nextTrip()]);

    await user.click(rowFor('Seoul Later'));
    expect(onSelectTrip).toHaveBeenCalledWith('next');
    expect(onClose).toHaveBeenCalled();
  });

  // Starting a trip of your own moved here out of the top bar, so this sheet
  // is now the only place it lives -- and the only place it can be withheld.
  it('offers a new trip at the bottom of the list', async () => {
    const user = userEvent.setup();
    const { onCreateTrip } = renderSwitcher([liveTrip()]);

    await user.click(screen.getByText('Create New Trip'));
    expect(onCreateTrip).toHaveBeenCalled();
  });

  it('offers a viewer nothing to create', () => {
    renderSwitcher([liveTrip()], { canCreate: false });
    expect(screen.queryByText('Create New Trip')).not.toBeInTheDocument();
  });

  it('has no past group to show when nothing has finished', () => {
    renderSwitcher([liveTrip()]);
    expect(screen.queryByText(/Past trips/)).not.toBeInTheDocument();
  });
});
