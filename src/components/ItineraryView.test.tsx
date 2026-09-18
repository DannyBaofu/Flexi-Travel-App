// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ItineraryView } from './ItineraryView';
import { I18nProvider } from '../utils/i18n';
import { toISODate } from '../services/tripDays';
import type { Trip, DaySchedule } from '../types/travel';

/**
 * jsdom does no layout, so every rect here is zero and the day strip cannot
 * be *measured* in these tests — whether today ends up centred is a question
 * only a real browser answers. What these cover is everything around that:
 * the states the strip has to survive (a finished trip, one day, no days at
 * all), and the wording that sits beside it.
 */

const day = (n: number, activities: DaySchedule['activities'] = []): DaySchedule => ({
  id: `d${n}`,
  dayNumber: n,
  dateString: `2026-09-0${n}`,
  dayOfWeek: 'Tuesday (Sep 1)',
  title: `Day ${n}`,
  activities
});

const trip = (over: Partial<Trip> = {}): Trip =>
  ({
    id: 'trip-1',
    title: 'Bangkok',
    destination: 'Bangkok',
    country: 'Thailand',
    startDate: '2026-09-01',
    endDate: '2026-09-03',
    coverImage: '',
    currency: 'THB',
    homeCurrency: 'MYR',
    exchangeRate: 8,
    travelers: [{ id: 't1', name: 'Danny', avatarColor: '#3930DB' }],
    days: [day(1), day(2), day(3)],
    expenses: [],
    createdAt: '',
    updatedAt: '',
    ...over
  }) as Trip;

const renderItinerary = (over: Partial<Trip> = {}, role: Trip['myRole'] = 'admin') => {
  const onOpenAddActivityModal = vi.fn();
  render(
    <I18nProvider>
      <ItineraryView
        trip={trip(over)}
        onUpdateTrip={vi.fn()}
        onOpenAddActivityModal={onOpenAddActivityModal}
        onOpenEditActivityModal={vi.fn()}
        onOfferUndo={vi.fn()}
        role={role!}
      />
    </I18nProvider>
  );
  return { onOpenAddActivityModal };
};

// Testing Library only auto-cleans with vitest globals on, and they are off.
afterEach(cleanup);

describe('ItineraryView — an empty day', () => {
  /**
   * This line read "no activities matching filters for this day" long after
   * the filter it referred to was deleted, so an empty day sent people
   * hunting for a control that does not exist.
   */
  it('says the day is empty without blaming a filter', () => {
    renderItinerary();
    expect(screen.getByText(/这天还没有安排/)).toBeInTheDocument();
    expect(screen.queryByText(/筛选/)).not.toBeInTheDocument();
  });

  it('offers the way to fill it', () => {
    renderItinerary();
    expect(screen.getByRole('button', { name: /添加第一个活动/ })).toBeInTheDocument();
  });

  it('offers a viewer nothing to add', () => {
    renderItinerary({}, 'viewer');
    expect(screen.getByText(/这天还没有安排/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /添加第一个活动/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /添加活动/ })).not.toBeInTheDocument();
  });
});

describe('ItineraryView — the day strip survives every shape of trip', () => {
  /**
   * The strip centres the selected day through a layout read on mount. These
   * are the shapes that read can be asked to run against, and a throw in any
   * of them takes the whole tab down.
   */
  const today = toISODate(new Date());

  it('opens on today while the trip is running, and marks it', () => {
    renderItinerary({ startDate: today, days: [day(1), day(2), day(3)] });
    // Two badges: one on the strip's card, one beside the day heading
    expect(screen.getAllByText('今天').length).toBeGreaterThan(0);
  });

  it('renders a finished trip without a today to centre on', () => {
    renderItinerary({ startDate: '2020-01-01', endDate: '2020-01-03' });
    expect(screen.queryByText('今天')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /第 1 天/ })).toBeInTheDocument();
  });

  it('renders a one-day trip, where there is nothing to scroll', () => {
    renderItinerary({ days: [day(1)] });
    expect(screen.getByRole('button', { name: /第 1 天/ })).toBeInTheDocument();
  });

  it('renders a trip with no days at all', () => {
    renderItinerary({ days: [] });
    expect(screen.queryByRole('button', { name: /第 1 天/ })).not.toBeInTheDocument();
  });

  it('keeps the overview toggle reachable, which deselects every day', () => {
    renderItinerary();
    expect(screen.getByRole('button', { name: /全部总览/ })).toBeInTheDocument();
  });
});
