// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IdeasView } from './IdeasView';
import { I18nProvider } from '../utils/i18n';
import type { Trip, TripIdea } from '../types/travel';

/**
 * The draft list has one job — keep up with typing — so these cover the ways
 * that quietly stops being true: a line that does not get saved, a pasted
 * list that collapses into one row, the same place added twice by two people,
 * and a viewer handed a field they may not use.
 */

const idea = (over: Partial<TripIdea> = {}): TripIdea => ({
  id: 'idea-1',
  text: 'Jodd Fairs',
  category: 'food',
  createdAt: '2026-09-01T00:00:00.000Z',
  ...over
});

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
    travelers: [
      { id: 't1', name: 'Danny', avatarColor: '#3930DB' },
      { id: 't2', name: 'Wei Ming', avatarColor: '#B42318' }
    ],
    days: [],
    expenses: [],
    ideas: [],
    createdAt: '',
    updatedAt: '',
    ...over
  }) as Trip;

const renderIdeas = (over: Partial<Trip> = {}, role: Trip['myRole'] = 'member') => {
  const onUpdateTrip = vi.fn();
  const onOfferUndo = vi.fn();
  const onPlanIdea = vi.fn();
  render(
    <I18nProvider>
      <IdeasView
        trip={trip(over)}
        onUpdateTrip={onUpdateTrip}
        onOfferUndo={onOfferUndo}
        onPlanIdea={onPlanIdea}
        role={role!}
      />
    </I18nProvider>
  );
  return { onUpdateTrip, onOfferUndo, onPlanIdea };
};

const savedIdeas = (mock: ReturnType<typeof vi.fn>): TripIdea[] =>
  (mock.mock.calls[0][0] as Trip).ideas ?? [];

beforeEach(() => {
  localStorage.clear();
});

// Testing Library only auto-cleans with vitest globals on, and they are off.
afterEach(cleanup);

describe('IdeasView — typing into the list', () => {
  it('saves a line on Enter and leaves the field ready for the next one', async () => {
    const user = userEvent.setup();
    const { onUpdateTrip } = renderIdeas();

    const field = screen.getByLabelText('添加想法');
    await user.type(field, '大皇宫{Enter}');

    expect(onUpdateTrip).toHaveBeenCalledTimes(1);
    expect(savedIdeas(onUpdateTrip).map(i => i.text)).toEqual(['大皇宫']);
    expect(field).toHaveValue('');
    expect(field).toHaveFocus();
  });

  it('files the line under the kind that is selected, and says so on the label', async () => {
    const user = userEvent.setup();
    const { onUpdateTrip } = renderIdeas();

    await user.click(screen.getByRole('button', { name: '美食餐饮' }));
    const field = screen.getByLabelText('添加到「美食餐饮」');
    await user.type(field, 'Jay Fai{Enter}');

    expect(savedIdeas(onUpdateTrip)[0].category).toBe('food');
  });

  it('files an unsorted line under “other” rather than guessing', async () => {
    const user = userEvent.setup();
    const { onUpdateTrip } = renderIdeas();

    await user.type(screen.getByLabelText('添加想法'), 'Chatuchak{Enter}');

    expect(savedIdeas(onUpdateTrip)[0].category).toBe('other');
  });

  it('turns a pasted list into one idea per line', async () => {
    const user = userEvent.setup();
    const { onUpdateTrip } = renderIdeas();

    await user.click(screen.getByLabelText('添加想法'));
    await user.paste('Wat Arun\n Jodd Fairs \n\nIconsiam');

    expect(savedIdeas(onUpdateTrip).map(i => i.text)).toEqual([
      'Wat Arun',
      'Jodd Fairs',
      'Iconsiam'
    ]);
  });

  it('does not add a place that is already on the list', async () => {
    const user = userEvent.setup();
    const { onUpdateTrip } = renderIdeas({ ideas: [idea({ text: 'Jodd Fairs' })] });

    await user.type(screen.getByLabelText('添加想法'), 'jodd  fairs{Enter}');

    expect(onUpdateTrip).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('已经有');
  });

  it('records who added it, so a shared list says whose idea was whose', async () => {
    const user = userEvent.setup();
    const { onUpdateTrip } = renderIdeas({ myTravelerId: 't2' });

    await user.type(screen.getByLabelText('添加想法'), 'Terminal 21{Enter}');

    expect(savedIdeas(onUpdateTrip)[0].addedByTravelerId).toBe('t2');
  });
});

describe('IdeasView — working through the list', () => {
  it('ticks an idea off without opening anything', async () => {
    const user = userEvent.setup();
    const { onUpdateTrip } = renderIdeas({ ideas: [idea()] });

    await user.click(screen.getByRole('button', { name: '标记为已安排' }));

    expect(savedIdeas(onUpdateTrip)[0].planned).toBe(true);
  });

  it('hands an idea to the activity form instead of scheduling it silently', async () => {
    const user = userEvent.setup();
    const { onPlanIdea, onUpdateTrip } = renderIdeas({ ideas: [idea()] });

    await user.click(screen.getByRole('button', { expanded: false }));
    await user.click(screen.getByRole('button', { name: '加入行程' }));

    expect(onPlanIdea).toHaveBeenCalledWith(expect.objectContaining({ text: 'Jodd Fairs' }));
    expect(onUpdateTrip).not.toHaveBeenCalled();
  });

  it('offers a way back after a delete rather than asking first', async () => {
    const user = userEvent.setup();
    const { onOfferUndo, onUpdateTrip } = renderIdeas({ ideas: [idea()] });

    await user.click(screen.getByRole('button', { expanded: false }));
    await user.click(screen.getByRole('button', { name: '删除想法' }));

    expect(savedIdeas(onUpdateTrip)).toEqual([]);
    expect(onOfferUndo).toHaveBeenCalled();

    // The restore has to put it back into whatever the trip looks like now
    const restore = onOfferUndo.mock.calls[0][2] as (current: Trip) => Trip;
    expect((restore(trip({ ideas: [] })).ideas ?? []).map(i => i.id)).toEqual(['idea-1']);
  });
});

describe('IdeasView — a viewer', () => {
  it('can read the list but is given nothing to type into', () => {
    renderIdeas({ ideas: [idea()] }, 'viewer');

    expect(screen.getByText('Jodd Fairs')).toBeInTheDocument();
    expect(screen.queryByLabelText('添加想法')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '删除想法' })).not.toBeInTheDocument();
  });
});
