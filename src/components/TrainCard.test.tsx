// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TrainCard } from './TrainCard';
import { I18nProvider } from '../utils/i18n';
import type { TrainLeg, Trip, TripTrains } from '../types/travel';

/**
 * The flight card's twin. What these guard is where the two differ: an empty
 * schedule shows nothing to anybody, and a change of trains names the station
 * without inventing a wait — the two tickets at a border change are an hour
 * apart on the clock.
 */

const leg = (over: Partial<TrainLeg> = {}): TrainLeg => ({
  id: 'train-1',
  trainNo: 'ETS 9421',
  from: 'KL Sentral',
  to: 'Padang Besar',
  date: '2099-01-10',
  departTime: '08:00',
  arriveTime: '13:35',
  ...over
});

const sample: TripTrains = {
  operator: 'KTM ETS · SRT',
  outbound: {
    note: '07:30 at KL Sentral, gate B',
    legs: [
      leg(),
      leg({ id: 'train-2', trainNo: 'Special Express 46', from: 'Padang Besar', to: 'Bangkok', departTime: '16:55', arriveTime: '09:50' })
    ]
  },
  inbound: {
    legs: [leg({ id: 'train-3', trainNo: 'Special Express 45', from: 'Bangkok', to: 'Padang Besar', date: '2099-01-17', departTime: '15:10', arriveTime: '08:55' })]
  }
};

const trip = (over: Partial<Trip> = {}): Trip =>
  ({
    id: 'trip-1',
    title: 'Bangkok',
    destination: 'Bangkok',
    country: 'Thailand',
    startDate: '2099-01-10',
    endDate: '2099-01-17',
    coverImage: '',
    currency: 'THB',
    homeCurrency: 'MYR',
    exchangeRate: 7.5,
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

const renderCard = (over: Partial<Trip>) =>
  render(
    <I18nProvider>
      <TrainCard trip={trip(over)} />
    </I18nProvider>
  );

afterEach(cleanup);

describe('with no trains entered', () => {
  it('renders nothing, for the organiser as much as anyone — most trips have no train', () => {
    const { container } = renderCard({});
    expect(container).toBeEmptyDOMElement();
    cleanup();
    const { container: backfilled } = renderCard({ trains: { outbound: { legs: [] }, inbound: { legs: [] } } });
    expect(backfilled).toBeEmptyDOMElement();
  });
});

describe('with trains entered', () => {
  it('shows every train out and back, with the operator and the meeting note', () => {
    renderCard({ trains: sample });
    expect(screen.getByText('ETS 9421')).toBeInTheDocument();
    expect(screen.getByText('Special Express 46')).toBeInTheDocument();
    expect(screen.getByText('Special Express 45')).toBeInTheDocument();
    expect(screen.getByText('KTM ETS · SRT')).toBeInTheDocument();
    expect(screen.getByText('07:30 at KL Sentral, gate B')).toBeInTheDocument();
  });

  it('names the station at a change of trains but never works out a wait', () => {
    renderCard({ trains: sample });
    expect(screen.getByText('在 Padang Besar 换乘')).toBeInTheDocument();
    expect(screen.queryByText(/等候/)).not.toBeInTheDocument();
  });

  it('links nowhere — a train number has no lookup worth sending anyone to', () => {
    renderCard({ trains: sample });
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('collapses on demand and keeps the heading', async () => {
    renderCard({ trains: sample });
    const toggle = screen.getByRole('button', { name: /火车信息/, expanded: true });
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('ETS 9421')).not.toBeInTheDocument();
    expect(screen.getByText('火车信息')).toBeInTheDocument();
  });
});
