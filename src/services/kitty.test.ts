import { describe, it, expect } from 'vitest';
import { computeKitty, resolveKitty } from './kitty';
import type { ExpenseItem, Trip } from '../types/travel';

// 3 travellers x 300 MYR = a 900 MYR pot, spending in THB at 10 THB per MYR
// so the arithmetic in these tests stays readable.
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
      perPerson: 300,
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
    expect(state.potTotalHome).toBe(900);
    expect(state.remainingHome).toBe(900);
    expect(state.usedPercent).toBe(0);
  });

  it('only counts money that has actually been handed over as collected', () => {
    const state = computeKitty(baseTrip([], { paidInTravelerIds: ['a', 'b'] }));
    expect(state.collectedHome).toBe(600);
    expect(state.unpaidTravelerIds).toEqual(['c']);
    // The pot total is still what it will be once everyone pays
    expect(state.potTotalHome).toBe(900);
  });

  it('draws covered spending down and leaves other categories alone', () => {
    const state = computeKitty(
      baseTrip([
        expense('e2', 3000, '2026-09-02'),
        expense('e1', 2000, '2026-09-01'),
        expense('taxi', 5000, '2026-09-01', 'transport')
      ])
    );
    expect(state.spentHome).toBe(500);
    expect(state.remainingHome).toBe(400);
    expect(state.coveredIds.has('taxi')).toBe(false);
  });

  it('drains oldest first, whatever order things were entered', () => {
    // Stored newest-first, as the app does. 800 MYR then 400 MYR: the older
    // one fits, the newer one does not.
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
    expect(state.remainingHome).toBe(900);
  });

  it('still covers a later small bill after skipping one it could not afford', () => {
    // 850 covered, 100 left; the 200 bill will not fit but the 50 one will.
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
    expect(spent.remainingHome).toBe(0);

    const low = computeKitty(baseTrip([expense('e', 8000, '2026-09-01')]));
    expect(low.runningLow).toBe(true);
    expect(low.exhausted).toBe(false);
  });

  it('counts dregs too small to spend as exhausted', () => {
    // Real money rarely lands on zero: 870 of 900 gone, and the last bill
    // bounced off the 30 that is left. The fund is done in every useful sense.
    const state = computeKitty(
      baseTrip([expense('bounced', 2000, '2026-09-02'), expense('first', 8700, '2026-09-01')])
    );
    expect(state.remainingHome).toBeGreaterThan(0);
    expect(state.uncoveredCount).toBe(1);
    expect(state.exhausted).toBe(true);
    expect(state.runningLow).toBe(false);
  });

  it('does not call a full pot exhausted just because one bill was huge', () => {
    // 2000 MYR of lobster against a 900 MYR pot: the fund is untouched, not spent.
    const state = computeKitty(baseTrip([expense('lobster', 20000, '2026-09-01')]));
    expect(state.uncoveredCount).toBe(1);
    expect(state.remainingHome).toBe(900);
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

describe('resolveKitty', () => {
  it('gives trips saved before the pot existed a sane default', () => {
    const kitty = resolveKitty({ kitty: undefined });
    expect(kitty.enabled).toBe(false);
    expect(kitty.categories).toEqual(['food']);
    expect(kitty.paidInTravelerIds).toEqual([]);
  });

  it('repairs a half-formed pot rather than trusting it', () => {
    const kitty = resolveKitty({
      kitty: { enabled: true, perPerson: 0, categories: [], paidInTravelerIds: [] }
    });
    expect(kitty.categories).toEqual(['food']);
  });
});
