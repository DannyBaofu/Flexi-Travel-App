// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TransitRoutesCard } from './TransitRoutesCard';
import { I18nProvider } from '../utils/i18n';
import type { ActivityItem, Trip, TripRole } from '../types/travel';

/**
 * The organiser's sheet of train and boat legs. What these guard is who sees
 * it — the organiser only — and that it shows nothing on a trip without a
 * single such leg.
 */

const act = (id: string, title: string, over: Partial<ActivityItem> = {}): ActivityItem => ({
  id,
  time: '09:00',
  title,
  category: 'sightseeing',
  locationName: title,
  cost: 0,
  currency: 'THB',
  ...over
});

const withLegs = [
  act('a1', '恰图恰周末市集', { transportToNext: { mode: 'mrt', durationMin: 40, note: 'MRT 到 Sukhumvit' } }),
  act('a2', 'Phed Mark 打抛饭', { transportToNext: { mode: 'taxi', durationMin: 5, note: 'Grab 去 Health Land' } }),
  act('a3', 'Jodd Fairs 夜市', {
    transportToNext: { mode: 'taxi', durationMin: 35, note: '21:00 叫 Grab 回住宿；或坐 MRT 到 Si Lom' }
  }),
  act('a4', '回住宿')
];

const trip = (activities: ActivityItem[]): Trip =>
  ({
    id: 'trip-1',
    title: 'Bangkok',
    destination: 'Bangkok',
    startDate: '2099-01-10',
    endDate: '2099-01-10',
    currency: 'THB',
    homeCurrency: 'MYR',
    travelers: [],
    days: [{ id: 'd1', dayNumber: 4, dateString: '', dayOfWeek: 'Sunday', title: '', activities }],
    expenses: [],
    ideas: []
  }) as unknown as Trip;

const renderCard = (role: TripRole, activities = withLegs) =>
  render(
    <I18nProvider>
      <TransitRoutesCard trip={trip(activities)} role={role} />
    </I18nProvider>
  );

afterEach(cleanup);

describe('who sees it', () => {
  it('shows the organiser the card, collapsed, saying only they can see it', () => {
    renderCard('admin');
    expect(screen.getByRole('button', { name: /火车和船路线/, expanded: false })).toBeInTheDocument();
    expect(screen.getByText(/只有组织者看得到/)).toBeInTheDocument();
    expect(screen.getByText(/2 段/)).toBeInTheDocument();
  });

  it('shows a traveller nothing', () => {
    const { container } = renderCard('member');
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a viewer nothing', () => {
    const { container } = renderCard('viewer');
    expect(container).toBeEmptyDOMElement();
  });

  it('shows even the organiser nothing on a trip with no train or boat leg', () => {
    const { container } = renderCard('admin', [
      act('b1', 'Breakfast', { transportToNext: { mode: 'taxi', durationMin: 20, note: 'Grab' } }),
      act('b2', 'Palace')
    ]);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('opened', () => {
  it('lists each leg from where to where, under its day, and marks the Grab one an option', async () => {
    renderCard('admin');
    await userEvent.click(screen.getByRole('button', { name: /火车和船路线/ }));
    expect(screen.getByRole('heading', { name: /^第 4 天\s*· 星期日$/ })).toBeInTheDocument();
    expect(screen.getByText(/恰图恰周末市集/)).toBeInTheDocument();
    expect(screen.getByText('MRT 到 Sukhumvit')).toBeInTheDocument();
    expect(screen.getByText('21:00 叫 Grab 回住宿；或坐 MRT 到 Si Lom')).toBeInTheDocument();
    // One option chip: the Jodd Fairs Grab. The plain Grab to Health Land is not listed at all.
    expect(screen.getAllByText('有火车 / 船备选')).toHaveLength(1);
    expect(screen.queryByText('Grab 去 Health Land')).not.toBeInTheDocument();
  });

  it('opens Google in transit mode, even for an option on a Grab hop', async () => {
    renderCard('admin');
    await userEvent.click(screen.getByRole('button', { name: /火车和船路线/ }));
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    for (const link of links) expect(link.getAttribute('href')).toContain('travelmode=transit');
  });
});
