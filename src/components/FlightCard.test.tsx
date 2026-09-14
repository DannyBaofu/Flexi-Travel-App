// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FlightCard } from './FlightCard';
import { I18nProvider } from '../utils/i18n';
import type { FlightLeg, Trip, TripFlights, TripRole } from '../types/travel';

/**
 * The card is read by everyone and written by one person, so what these guard
 * is the split: a member or a viewer sees the flights and nothing else, an
 * organiser is the only one offered a way to add them, and the one sum the
 * card does perform — the wait at a connection — comes out right.
 */

const leg = (over: Partial<FlightLeg> = {}): FlightLeg => ({
  id: 'leg-1',
  flightNo: 'SQ 131',
  from: 'PEN',
  to: 'SIN',
  date: '2099-01-10',
  departTime: '10:15',
  arriveTime: '11:45',
  ...over
});

const sample: TripFlights = {
  airline: 'Singapore Airlines',
  outbound: {
    note: 'Gather by 07:00 at the check-in counter',
    legs: [
      leg(),
      leg({ id: 'leg-2', flightNo: 'SQ 634', from: 'SIN', to: 'HND', departTime: '12:40', arriveTime: '21:55' })
    ]
  },
  inbound: {
    legs: [leg({ id: 'leg-3', flightNo: 'SQ 637', from: 'HND', to: 'SIN', date: '2099-01-17', departTime: '10:55', arriveTime: '16:55' })]
  }
};

// A trip that has not started: the organiser's add prompt only shows then.
const trip = (over: Partial<Trip> = {}): Trip =>
  ({
    id: 'trip-1',
    title: 'Tokyo',
    destination: 'Tokyo',
    country: 'Japan',
    startDate: '2099-01-10',
    endDate: '2099-01-17',
    coverImage: '',
    currency: 'JPY',
    homeCurrency: 'MYR',
    exchangeRate: 33,
    travelers: [{ id: 't1', name: 'Danny', avatarColor: '#3930DB' }],
    days: Array.from({ length: 8 }, (_, i) => ({
      id: `d${i}`, dayNumber: i + 1, dateString: '', dayOfWeek: 'Monday', title: '', activities: []
    })),
    expenses: [],
    ideas: [],
    createdAt: '',
    updatedAt: '',
    ...over
  }) as Trip;

const renderCard = (over: Partial<Trip>, role: TripRole) => {
  const onOpenSettings = vi.fn();
  const view = render(
    <I18nProvider>
      <FlightCard trip={trip(over)} role={role} onOpenSettings={onOpenSettings} />
    </I18nProvider>
  );
  return { ...view, onOpenSettings };
};

afterEach(cleanup);

describe('with no flights entered', () => {
  it('offers the organiser a way in, which opens Trip Settings', async () => {
    const { onOpenSettings } = renderCard({}, 'admin');
    await userEvent.click(screen.getByRole('button', { name: '添加航班信息' }));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('renders nothing at all for a member or a viewer', () => {
    const { container: member } = renderCard({}, 'member');
    expect(member).toBeEmptyDOMElement();
    cleanup();
    const { container: viewer } = renderCard({}, 'viewer');
    expect(viewer).toBeEmptyDOMElement();
  });

  it('stops prompting once the trip has started', () => {
    const { container } = renderCard({ startDate: '2000-01-01' }, 'admin');
    expect(container).toBeEmptyDOMElement();
  });
});

describe('with flights entered', () => {
  it('shows every leg to a viewer, linked to a Google lookup', () => {
    renderCard({ flights: sample }, 'viewer');
    const link = screen.getByRole('link', { name: '在 Google 查询 SQ 131' });
    expect(link).toHaveAttribute('href', 'https://www.google.com/search?q=SQ%20131%20flight');
    expect(screen.getByRole('link', { name: '在 Google 查询 SQ 637' })).toBeInTheDocument();
    expect(screen.getByText('Singapore Airlines')).toBeInTheDocument();
    expect(screen.getByText('Gather by 07:00 at the check-in counter')).toBeInTheDocument();
  });

  it('works out the wait at the connection from the two clocks at that airport', () => {
    renderCard({ flights: sample }, 'member');
    expect(screen.getByText('在 SIN 中转 · 等候 55 分钟')).toBeInTheDocument();
  });

  it('offers no editing controls to anyone — the form lives in Trip Settings', () => {
    renderCard({ flights: sample }, 'admin');
    expect(screen.queryByRole('button', { name: '添加航班信息' })).not.toBeInTheDocument();
  });

  it('collapses on demand and keeps the heading', async () => {
    renderCard({ flights: sample }, 'member');
    const toggle = screen.getByRole('button', { name: /航班信息/, expanded: true });
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: '在 Google 查询 SQ 131' })).not.toBeInTheDocument();
    expect(screen.getByText('航班信息')).toBeInTheDocument();
  });
});
