// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TripMapCard } from './TripMapCard';
import { I18nProvider } from '../utils/i18n';
import type { ActivityItem, DaySchedule, Trip } from '../types/travel';

/**
 * The whole-trip map. Leaflet itself does not run in jsdom, so the map is a
 * stand-in that reports which day it was told to zoom to; what these guard is
 * everything around it — that the card stays out of the way until opened,
 * that it shows nothing on a trip with no pin, and that a day row zooms.
 */
vi.mock('./TripMap', () => ({
  default: ({ focusDayId }: { focusDayId: string | null }) => (
    <div data-testid="trip-map">{focusDayId ?? 'whole trip'}</div>
  )
}));

const act = (id: string, title: string, over: Partial<ActivityItem> = {}): ActivityItem => ({
  id,
  time: '09:00',
  title,
  category: 'sightseeing',
  locationName: title,
  ...over
});

const day = (id: string, dayNumber: number, dayOfWeek: string, activities: ActivityItem[]): DaySchedule => ({
  id,
  dayNumber,
  dateString: '',
  dayOfWeek,
  title: '',
  activities
});

const pinned = [
  day('d1', 1, 'Thursday', [
    act('a1', '大山脚火车站集合', { lat: 5.3636, lon: 100.4613 }),
    act('a2', '巴东勿刹过关', { lat: 6.6601, lon: 100.3216 }),
    act('a3', '机场吃午饭') // no pin
  ]),
  day('d2', 2, 'Friday', [
    act('b1', '大皇宫和玉佛寺', { lat: 13.75, lon: 100.4913 }),
    act('b2', '卧佛寺', { lat: 13.7466, lon: 100.4927 })
  ]),
  day('d3', 3, 'Saturday', [act('c1', '回住宿')])
];

const trip = (days: DaySchedule[]): Trip =>
  ({
    id: 'trip-1',
    title: 'Bangkok',
    destination: 'Bangkok',
    startDate: '2099-01-10',
    endDate: '2099-01-12',
    currency: 'THB',
    homeCurrency: 'MYR',
    travelers: [],
    days,
    expenses: [],
    ideas: []
  }) as unknown as Trip;

const renderCard = (days = pinned) =>
  render(
    <I18nProvider>
      <TripMapCard trip={trip(days)} />
    </I18nProvider>
  );

afterEach(cleanup);

describe('TripMapCard', () => {
  it('starts collapsed, counting the days and places it would show', () => {
    renderCard();
    expect(screen.getByRole('button', { name: /全程路线图/, expanded: false })).toBeInTheDocument();
    // Day 3 has no pin, so it is two days and four places
    expect(screen.getByText('2 天 · 4 个地点')).toBeInTheDocument();
    expect(screen.queryByTestId('trip-map')).not.toBeInTheDocument();
  });

  it('shows nothing at all on a trip without a single pin', () => {
    const { container } = renderCard([day('d1', 1, 'Thursday', [act('x', '回住宿')])]);
    expect(container).toBeEmptyDOMElement();
  });

  it('opens to the whole trip, with each day’s pinned stops listed in order', async () => {
    const user = userEvent.setup();
    renderCard();
    await user.click(screen.getByRole('button', { name: /全程路线图/ }));

    expect(await screen.findByTestId('trip-map')).toHaveTextContent('whole trip');
    const dayOne = screen.getByRole('button', { name: /第 1 天/ });
    expect(dayOne).toHaveTextContent('大山脚火车站集合 → 巴东勿刹过关');
    // An unpinned stop is not on the map, so it is not in the list either
    expect(dayOne).not.toHaveTextContent('机场吃午饭');
    expect(screen.queryByRole('button', { name: /第 3 天/ })).not.toBeInTheDocument();
  });

  it('zooms to a day when its row is tapped, and back out to the whole trip', async () => {
    const user = userEvent.setup();
    renderCard();
    await user.click(screen.getByRole('button', { name: /全程路线图/ }));

    const dayTwo = await screen.findByRole('button', { name: /第 2 天/ });
    await user.click(dayTwo);
    expect(screen.getByTestId('trip-map')).toHaveTextContent('d2');
    expect(dayTwo).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: '看全程' }));
    expect(screen.getByTestId('trip-map')).toHaveTextContent('whole trip');
    expect(dayTwo).toHaveAttribute('aria-pressed', 'false');
  }, 20000);
});
