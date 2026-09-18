// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BudgetTracker } from './BudgetTracker';
import { I18nProvider } from '../utils/i18n';
import { toISODate } from '../services/tripDays';
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

    await user.click(screen.getByRole('button', { name: /记一笔支出/ }));
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
    // Logged today, not on the trip's start date. "Today" is the local
    // calendar day, which is why this is not toISOString(): east of UTC,
    // a morning here is still yesterday there, and the two disagree for
    // the first eight hours of every day.
    expect(expense.date).toBe(toISODate(new Date()));
    // Driving the form through userEvent costs a few seconds, which sits right
    // on vitest's 5s default and goes over it on a loaded machine. The timeout
    // is generous on purpose: this test failing should mean the form broke.
  }, 20000);

  it('refuses to save without an amount', async () => {
    const user = userEvent.setup();
    const { onUpdateTrip } = renderBudget();

    await user.click(screen.getByRole('button', { name: /记一笔支出/ }));
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

  it('lets a traveller delete an expense too — their spending, their mistake to fix', () => {
    renderBudget(withExpense, 'member');
    expect(screen.getAllByRole('button', { name: /删除支出/ })).toHaveLength(1);
  });

  it('keeps the delete control away from a viewer', () => {
    renderBudget(withExpense, 'viewer');
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

  it('opens the fund settings to a traveller, not just the organiser', () => {
    renderBudget(withKitty, 'member');
    expect(screen.getAllByRole('button', { name: /基金设置/ }).length).toBeGreaterThan(0);
  });

  it('hides the fund settings from a viewer', () => {
    renderBudget(withKitty, 'viewer');
    expect(screen.queryAllByRole('button', { name: /基金设置/ })).toHaveLength(0);
  });
});

describe('BudgetTracker — before the first expense', () => {
  /**
   * Every summary on this tab summarises the ledger, so with no ledger they
   * had nothing to say and said it anyway: a zero total, four balances
   * reading zero, and a banner congratulating the group on settling up
   * before anyone had spent anything.
   */
  it('says what to do and nothing else', () => {
    renderBudget();

    expect(screen.getByText(/还没有记过支出/)).toBeInTheDocument();
    expect(screen.queryByText(/全队总花费/)).not.toBeInTheDocument();
    expect(screen.queryByText(/团队结算摘要/)).not.toBeInTheDocument();
    expect(screen.queryByText(/个人余额/)).not.toBeInTheDocument();
    expect(screen.queryByText(/已结清/)).not.toBeInTheDocument();
  });

  it('offers exactly one way to log the first one', () => {
    renderBudget();
    expect(screen.getAllByRole('button', { name: /记一笔支出/ })).toHaveLength(1);
  });

  it('still shows the whole ledger once there is something in it', () => {
    renderBudget({
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
    });

    expect(screen.getByText(/全队总花费/)).toBeInTheDocument();
    expect(screen.getByText(/团队结算摘要/)).toBeInTheDocument();
    expect(screen.getByText(/个人余额/)).toBeInTheDocument();
  });
});

describe('BudgetTracker — a balance says which way it goes', () => {
  /**
   * The row used to be a coloured, signed number and nothing else, so the
   * whole meaning sat in a hue and a "+" — both gone for a reader who cannot
   * see one, and "+3,080" reads as owed-to and owed-by equally well.
   */
  const dinnerPaidByT1 = {
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

  it('names the direction in words, not just in colour', () => {
    renderBudget(dinnerPaidByT1);

    // Danny paid 800 for two, so he is owed 400 and Wei Ming owes it
    expect(screen.getAllByText('应收').length).toBeGreaterThan(0);
    expect(screen.getAllByText('应付').length).toBeGreaterThan(0);
  });

  it('drops the sign, because the word carries it', () => {
    renderBudget(dinnerPaidByT1);
    expect(screen.queryByText(/\+400/)).not.toBeInTheDocument();
    expect(screen.queryByText(/-400/)).not.toBeInTheDocument();
  });
});

describe('BudgetTracker — an empty ledger says different things to different people', () => {
  /**
   * The hint under "no expenses yet" is an instruction, and a viewer has no
   * button to follow it with — so collapsing the tab to its empty state put a
   * nudge towards a control that is not there in front of the one person who
   * cannot use it.
   */
  it('tells a traveller how to start', () => {
    renderBudget({}, 'member');
    expect(screen.getByText(/记下来就会自动算谁欠谁/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /记一笔支出/ })).toBeInTheDocument();
  });

  it('tells a viewer only the fact, with no instruction attached', () => {
    renderBudget({}, 'viewer');
    expect(screen.getByText(/还没有记过支出/)).toBeInTheDocument();
    expect(screen.queryByText(/记下来就会自动算谁欠谁/)).not.toBeInTheDocument();
    expect(screen.getByText(/正在查看共享账本/)).toBeInTheDocument();
  });
});

describe('BudgetTracker — a settled balance', () => {
  it('says so in words and shows no number at all', () => {
    // Both paid 800 and split both bills, so the two come out even
    const evenly = {
      expenses: [
        {
          id: 'e1', title: 'Dinner', amount: 800, currency: 'THB',
          category: 'food' as const, date: '2026-09-01',
          paidByTravelerId: 't1', splitWithTravelerIds: ['t1', 't2']
        },
        {
          id: 'e2', title: 'Lunch', amount: 800, currency: 'THB',
          category: 'food' as const, date: '2026-09-02',
          paidByTravelerId: 't2', splitWithTravelerIds: ['t1', 't2']
        }
      ]
    };
    renderBudget(evenly, 'admin');

    expect(screen.getAllByText('已结清')).toHaveLength(2);
    expect(screen.queryByText('应收')).not.toBeInTheDocument();
    expect(screen.queryByText('应付')).not.toBeInTheDocument();
  });
});
