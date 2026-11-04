import { describe, it, expect } from 'vitest';
import { computeKitty, resolveKitty } from './kitty';
import type { ExpenseItem, Trip } from '../types/travel';

// 3 travellers x 3000 THB in cash = a 9000 THB pot, spent in THB, so the
// arithmetic is plain subtraction. The market rate (10) is there to prove
// nothing in the pot is converted by it.
const baseTrip = (expenses: ExpenseItem[], kitty?: Partial<Trip['kitty']>): Trip =>
  ({
    id: 't',
    title: 'Trip',
    destination: 'Bangkok',
    country: 'Thailand',
    startDate: '2026-09-01',
    endDate: '2026-09-05',
    coverImage: '',
    currency: 'THB',
    homeCurrency: 'MYR',
    exchangeRate: 10,
    travelers: [
      { id: 'a', name: 'A', avatarColor: '#000' },
      { id: 'b', name: 'B', avatarColor: '#000' },
      { id: 'c', name: 'C', avatarColor: '#000' }
    ],
    days: [],
    expenses,
    kitty: {
      enabled: true,
      perPersonCash: 3000,
      categories: ['food'],
      paidInTravelerIds: [],
      ...kitty
    },
    shareSettings: { isPublic: false, isPasswordProtected: false, allowGuestEdits: false },
    createdAt: '',
    updatedAt: ''
  }) as Trip;

const expense = (
  id: string,
  amount: number,
  date: string,
  category: ExpenseItem['category'] = 'food'
): ExpenseItem => ({
  id,
  title: id,
  amount,
  currency: 'THB',
  category,
  date,
  paidByTravelerId: 'a',
  splitWithTravelerIds: ['a', 'b', 'c']
});

describe('computeKitty', () => {
  it('adds contributions up into a pot', () => {
    const state = computeKitty(baseTrip([]));
    expect(state.potTotal).toBe(9000);
    expect(state.remaining).toBe(9000);
    expect(state.usedPercent).toBe(0);
  });

  it('only counts money that has actually been handed over as collected', () => {
    const state = computeKitty(baseTrip([], { paidInTravelerIds: ['a', 'b'] }));
    expect(state.collected).toBe(6000);
    expect(state.unpaidTravelerIds).toEqual(['c']);
    // The pot total is still what it will be once everyone pays
    expect(state.potTotal).toBe(9000);
  });

  it('draws covered spending down and leaves other categories alone', () => {
    const state = computeKitty(
      baseTrip([
        expense('e2', 3000, '2026-09-02'),
        expense('e1', 2000, '2026-09-01'),
        expense('taxi', 5000, '2026-09-01', 'transport')
      ])
    );
    expect(state.spent).toBe(5000);
    expect(state.remaining).toBe(4000);
    expect(state.coveredIds.has('taxi')).toBe(false);
  });

  it('leaves exactly the cash that is in the envelope, whatever the market rate says', () => {
    // 9000 handed over, 1234.5 spent: 7765.5 left, to the satang. Changing
    // the rate must not move it, because no rate is involved.
    const bills = [expense('e1', 1234.5, '2026-09-01')];
    expect(computeKitty(baseTrip(bills)).remaining).toBe(7765.5);
    expect(computeKitty({ ...baseTrip(bills), exchangeRate: 7.31 }).remaining).toBe(7765.5);
  });

  it('drains oldest first, whatever order things were entered', () => {
    // Stored newest-first, as the app does. 8000 then 4000: the older one
    // fits, the newer one does not.
    const state = computeKitty(
      baseTrip([expense('newer', 4000, '2026-09-03'), expense('older', 8000, '2026-09-01')])
    );
    expect(state.coveredIds.has('older')).toBe(true);
    expect(state.coveredIds.has('newer')).toBe(false);
    expect(state.uncoveredCount).toBe(1);
  });

  it('sends a bill the pot cannot cover back to being split', () => {
    const state = computeKitty(baseTrip([expense('huge', 20000, '2026-09-01')]));
    expect(state.coveredIds.size).toBe(0);
    expect(state.uncoveredCount).toBe(1);
    expect(state.remaining).toBe(9000);
  });

  it('still covers a later small bill after skipping one it could not afford', () => {
    // 8500 covered, 500 left; the 2000 bill will not fit but the 500 one will.
    const state = computeKitty(
      baseTrip([
        expense('small', 500, '2026-09-03'),
        expense('big', 2000, '2026-09-02'),
        expense('first', 8500, '2026-09-01')
      ])
    );
    expect([...state.coveredIds].sort()).toEqual(['first', 'small']);
    expect(state.uncoveredCount).toBe(1);
  });

  it('reports exhausted and running low', () => {
    const spent = computeKitty(baseTrip([expense('e', 9000, '2026-09-01')]));
    expect(spent.exhausted).toBe(true);
    expect(spent.remaining).toBe(0);

    const low = computeKitty(baseTrip([expense('e', 8000, '2026-09-01')]));
    expect(low.runningLow).toBe(true);
    expect(low.exhausted).toBe(false);
  });

  it('counts dregs too small to spend as exhausted', () => {
    // Real money rarely lands on zero: 8700 of 9000 gone, and the last bill
    // bounced off the 300 that is left. The fund is done in every useful sense.
    const state = computeKitty(
      baseTrip([expense('bounced', 2000, '2026-09-02'), expense('first', 8700, '2026-09-01')])
    );
    expect(state.remaining).toBeGreaterThan(0);
    expect(state.uncoveredCount).toBe(1);
    expect(state.exhausted).toBe(true);
    expect(state.runningLow).toBe(false);
  });

  it('does not call a full pot exhausted just because one bill was huge', () => {
    // 20000 of lobster against a 9000 pot: the fund is untouched, not spent.
    const state = computeKitty(baseTrip([expense('lobster', 20000, '2026-09-01')]));
    expect(state.uncoveredCount).toBe(1);
    expect(state.remaining).toBe(9000);
    expect(state.exhausted).toBe(false);
  });

  it('covers nothing while switched off', () => {
    const state = computeKitty(
      baseTrip([expense('e', 1000, '2026-09-01')], { enabled: false })
    );
    expect(state.enabled).toBe(false);
    expect(state.coveredIds.size).toBe(0);
  });
});

describe('computeKitty — a pot funded by transfer', () => {
  // 3 travellers x MYR 300 sent to the holder = a MYR 900 pot. Bills are
  // still logged in baht, and the rate (10 THB per MYR) is what turns them
  // into ringgit.
  const transfer = (expenses: ExpenseItem[], rate = 10) => ({
    ...baseTrip(expenses, { potCurrency: 'home', perPersonHome: 300 }),
    exchangeRate: rate
  });

  it('counts the pot in the home currency', () => {
    const state = computeKitty(transfer([]));
    expect(state.potCurrency).toBe('home');
    expect(state.perPerson).toBe(300);
    expect(state.potTotal).toBe(900);
    expect(state.remaining).toBe(900);
  });

  it('takes each baht bill off at the trip rate, to the sen', () => {
    // 1234.56 / 7.31 = 168.8864..., which a card statement prints as 168.89
    const state = computeKitty(transfer([expense('e1', 1234.56, '2026-09-01')], 7.31));
    expect(state.spent).toBe(168.89);
    expect(state.remaining).toBe(731.11);
  });

  it('still covers a bill in full or not at all, measured in ringgit', () => {
    // 9500 THB is MYR 950, more than the MYR 900 pot: split it instead
    const state = computeKitty(
      transfer([expense('small', 500, '2026-09-02'), expense('huge', 9500, '2026-09-01')])
    );
    expect(state.coveredIds.has('huge')).toBe(false);
    expect(state.coveredIds.has('small')).toBe(true);
    expect(state.remaining).toBe(850);
  });

  it('runs out when the converted bills reach the pot', () => {
    const state = computeKitty(transfer([expense('e', 9000, '2026-09-01')]));
    expect(state.remaining).toBe(0);
    expect(state.exhausted).toBe(true);
  });

  it('ignores the cash figure while funded by transfer, and keeps it for switching back', () => {
    // The trip carries both: 3000 THB cash and MYR 300 transfer a head
    const home = computeKitty(transfer([]));
    const back = computeKitty({ ...transfer([]), kitty: { ...transfer([]).kitty!, potCurrency: 'trip' } });
    expect(home.potTotal).toBe(900);
    expect(back.potTotal).toBe(9000);
    expect(back.potCurrency).toBe('trip');
  });

  it('only counts transfers actually received as collected', () => {
    const state = computeKitty({
      ...transfer([]),
      kitty: { ...transfer([]).kitty!, paidInTravelerIds: ['a'] }
    });
    expect(state.collected).toBe(300);
  });
});

describe('resolveKitty', () => {
  it('gives trips saved before the pot existed a sane default', () => {
    const kitty = resolveKitty({ kitty: undefined });
    expect(kitty.enabled).toBe(false);
    expect(kitty.potCurrency).toBe('trip');
    expect(kitty.perPersonCash).toBe(0);
    expect(kitty.perPersonHome).toBe(0);
    expect(kitty.categories).toEqual(['food']);
    expect(kitty.paidInTravelerIds).toEqual([]);
  });

  it('repairs a half-formed pot rather than trusting it', () => {
    const kitty = resolveKitty({
      kitty: { enabled: true, perPersonCash: 0, categories: [], paidInTravelerIds: [] }
    });
    expect(kitty.categories).toEqual(['food']);
  });

  it('carries a pot saved in the home currency over as whole notes, not as "THB 300"', () => {
    // 300 MYR a head at 7.62 was the old meaning. Read as baht it would be a
    // tenth of the real pot; converted, it is a sensible figure to correct.
    const kitty = resolveKitty({
      exchangeRate: 7.62,
      kitty: { enabled: true, perPerson: 300, categories: ['food'], paidInTravelerIds: [] }
    });
    expect(kitty.perPersonCash).toBe(2286);
    // ...and the old field is gone, so the next write stores cash only
    expect('perPerson' in kitty).toBe(false);
  });

  it('keeps counting cash for a pot saved before the currency choice existed', () => {
    const kitty = resolveKitty({
      kitty: { enabled: true, perPersonCash: 2500, categories: ['food'], paidInTravelerIds: [] }
    });
    expect(kitty.potCurrency).toBe('trip');
    expect(kitty.perPersonCash).toBe(2500);
  });

  it('reads anything but an explicit "home" as cash', () => {
    const kitty = resolveKitty({
      kitty: {
        enabled: true,
        potCurrency: 'USD' as unknown as 'home',
        perPersonCash: 2500,
        categories: ['food'],
        paidInTravelerIds: []
      }
    });
    expect(kitty.potCurrency).toBe('trip');
  });

  it('prefers the cash amount once there is one', () => {
    const kitty = resolveKitty({
      exchangeRate: 7.62,
      kitty: { enabled: true, perPerson: 300, perPersonCash: 2500, categories: ['food'], paidInTravelerIds: [] }
    });
    expect(kitty.perPersonCash).toBe(2500);
  });
});
