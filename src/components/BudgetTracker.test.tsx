// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BudgetTracker } from './BudgetTracker';
import { I18nProvider } from '../utils/i18n';
import type { Trip } from '../types/travel';

/**
 * The service tests cover the maths. These cover the parts only a rendered
 * component can get wrong: whether a role sees a control it should not, and
 * whether the form saves what was actually typed.
 */

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
    shareSettings: { isPublic: false, isPasswordProtected: false, allowGuestEdits: false },
    createdAt: '',
    updatedAt: '',
    ...over
  }) as Trip;

const renderBudget = (over: Partial<Trip> = {}, role: Trip['myRole'] = 'admin') => {
  const onUpdateTrip = vi.fn();
  const onOfferUndo = vi.fn();
  render(
    <I18nProvider>
      <BudgetTracker trip={trip(over)} onUpdateTrip={onUpdateTrip} onOfferUndo={onOfferUndo} role={role!} />
    </I18nProvider>
  );
  return { onUpdateTrip, onOfferUndo };
};

beforeEach(() => {
  localStorage.clear();
});

// Testing Library only auto-cleans when vitest globals are on, and they are
// not. Without this, one test's DOM stays mounted and the next test's `screen`
// queries find controls from the previous render.
afterEach(cleanup);

describe('BudgetTracker — logging an expense', () => {
  it('saves the amount that was typed, with sensible defaults filled in', async () => {
    const user = userEvent.setup();
    localStorage.setItem('travelsync-me', JSON.stringify({ 'trip-1': 't1' }));
    const { onUpdateTrip } = renderBudget();

    // The label appears on the main action and again on the empty ledger
    await user.click(screen.getAllByRole('button', { name: /记一笔支出/ })[0]);
    await user.type(screen.getByLabelText(/花了多少/), '450');
    await user.click(screen.getByRole('button', { name: /保存支出/ }));

    expect(onUpdateTrip).toHaveBeenCalledTimes(1);
    const saved = onUpdateTrip.mock.calls[0][0] as Trip;
    expect(saved.expenses).toHaveLength(1);

    const expense = saved.expenses[0];
    expect(expense.amount).toBe(450);
    expect(expense.currency).toBe('THB');
    // Payer defaults to whoever this browser says it is
    expect(expense.paidByTravelerId).toBe('t1');
    // An untitled expense takes its category's name rather than staying blank
    expect(expense.title).not.toBe('');
    // Logged today, not on the trip's start date
    expect(expense.date).toBe(new Date().toISOString().slice(0, 10));
  });

  it('refuses to save without an amount', async () => {
    const user = userEvent.setup();
    const { onUpdateTrip } = renderBudget();

    await user.click(screen.getAllByRole('button', { name: /记一笔支出/ })[0]);
    await user.click(screen.getByRole('button', { name: /保存支出/ }));

    expect(onUpdateTrip).not.toHaveBeenCalled();
  });
});

describe('BudgetTracker — what each role may do', () => {
  const withExpense = {
    expenses: [
      {
        id: 'e1',
        title: 'Dinner',
        amount: 800,
        currency: 'THB',
        category: 'food' as const,
        date: '2026-09-01',
        paidByTravelerId: 't1',
        splitWithTravelerIds: ['t1', 't2']
      }
    ]
  };

  it('lets an admin delete an expense, and offers an undo rather than a confirm', async () => {
    const user = userEvent.setup();
    const { onUpdateTrip, onOfferUndo } = renderBudget(withExpense, 'admin');

    await user.click(screen.getAllByRole('button', { name: /删除支出/ })[0]);

    expect(onUpdateTrip).toHaveBeenCalledTimes(1);
    expect((onUpdateTrip.mock.calls[0][0] as Trip).expenses).toHaveLength(0);
    // The safety net is an undo, not a dialog nobody reads
    expect(onOfferUndo).toHaveBeenCalledTimes(1);
  });

  it('gives a member no delete control at all', () => {
    renderBudget(withExpense, 'member');
    expect(screen.queryAllByRole('button', { name: /删除支出/ })).toHaveLength(0);
  });

  it('gives a viewer no way to log anything', () => {
    renderBudget(withExpense, 'viewer');
    expect(screen.queryAllByRole('button', { name: /记一笔支出/ })).toHaveLength(0);
  });
});

describe('BudgetTracker — the shared fund', () => {
  const withKitty = {
    kitty: {
      enabled: true,
      perPerson: 300,
      holderTravelerId: 't1',
      categories: ['food' as const],
      paidInTravelerIds: ['t1']
    },
    expenses: [
      {
        id: 'e1',
        title: 'Dinner',
        amount: 800,
        currency: 'THB',
        category: 'food' as const,
        date: '2026-09-01',
        paidByTravelerId: 't1',
        splitWithTravelerIds: ['t1', 't2']
      }
    ]
  };

  it('leads with what is left and names who has not paid in', () => {
    renderBudget(withKitty, 'admin');

    // 2 travellers x 300 = 600, minus 800 THB / 8 = 100 -> 500 left
    expect(screen.getByText(/基金还剩/)).toBeInTheDocument();
    expect(screen.getAllByText(/500/).length).toBeGreaterThan(0);
    expect(screen.getByText(/还差 Wei Ming 没交/)).toBeInTheDocument();
  });

  it('marks a fund-paid expense as coming from the fund, not from a person', () => {
    renderBudget(withKitty, 'admin');
    expect(screen.getAllByText('公基金').length).toBeGreaterThan(0);
  });

  it('hides the fund settings from a member', () => {
    renderBudget(withKitty, 'member');
    expect(screen.queryAllByRole('button', { name: /基金设置/ })).toHaveLength(0);
  });
});
