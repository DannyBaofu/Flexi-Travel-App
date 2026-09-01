import type { ExpenseItem, Trip, TripKitty } from '../types/travel';

/**
 * The shared cash pot.
 *
 * Everyone hands the holder the same amount before or during the trip, and
 * spending in the covered categories comes out of that pot. Money already
 * pooled is money already settled, so a covered expense must NOT also appear
 * in the who-owes-whom maths — counting it twice would overstate every debt.
 *
 * When the pot cannot cover a bill, that bill stays an ordinary split expense.
 * That is the whole point of the feature: you can see the fund run out, and
 * you can see food going back to being split.
 */

export const DEFAULT_KITTY: TripKitty = {
  enabled: false,
  perPerson: 0,
  categories: ['food'],
  paidInTravelerIds: []
};

/** Trips saved before the pot existed, or arriving over a share link, have none. */
export function resolveKitty(trip: Pick<Trip, 'kitty'>): TripKitty {
  const k = trip.kitty;
  if (!k) return { ...DEFAULT_KITTY };
  return {
    enabled: Boolean(k.enabled),
    perPerson: Number(k.perPerson) || 0,
    holderTravelerId: k.holderTravelerId,
    categories:
      Array.isArray(k.categories) && k.categories.length > 0
        ? k.categories
        : [...DEFAULT_KITTY.categories],
    paidInTravelerIds: Array.isArray(k.paidInTravelerIds) ? k.paidInTravelerIds : []
  };
}

export interface KittyState {
  enabled: boolean;
  /** Everything below is in the trip's home currency — what people hand over. */
  potTotalHome: number;
  collectedHome: number;
  spentHome: number;
  remainingHome: number;
  usedPercent: number;
  /** Expenses the pot actually paid for; everything else still splits. */
  coveredIds: Set<string>;
  /** Eligible bills the pot could not cover, so they went back to being split. */
  uncoveredCount: number;
  /** Nothing left to spend. */
  exhausted: boolean;
  /** Below a fifth left — worth a warning before it bites. */
  runningLow: boolean;
  unpaidTravelerIds: string[];
}

/** Expenses are stored newest-first, but a pot drains in the order you spend. */
function oldestFirst(expenses: ExpenseItem[]): ExpenseItem[] {
  return expenses
    .map((exp, idx) => ({ exp, idx }))
    .sort((a, b) => {
      if (a.exp.date === b.exp.date) return b.idx - a.idx; // higher index = older entry
      return a.exp.date < b.exp.date ? -1 : 1;
    })
    .map(entry => entry.exp);
}

export function computeKitty(trip: Trip): KittyState {
  const kitty = resolveKitty(trip);
  const rate = trip.exchangeRate && trip.exchangeRate > 0 ? trip.exchangeRate : 1;
  const travellers = trip.travelers ?? [];

  const potTotalHome = kitty.perPerson * travellers.length;

  const paidIn = new Set(kitty.paidInTravelerIds);
  const collectedHome = kitty.perPerson * travellers.filter(tv => paidIn.has(tv.id)).length;
  const unpaidTravelerIds = travellers.filter(tv => !paidIn.has(tv.id)).map(tv => tv.id);

  const coveredIds = new Set<string>();
  let spentHome = 0;
  let uncoveredCount = 0;

  if (kitty.enabled && potTotalHome > 0) {
    const eligible = oldestFirst(trip.expenses ?? []).filter(exp =>
      kitty.categories.includes(exp.category)
    );

    for (const exp of eligible) {
      const costHome = exp.amount / rate;
      // All of a bill or none of it. Paying half a dinner from the pot and
      // splitting the rest is accurate but impossible to follow on a phone,
      // and a smaller later bill may still fit in what is left.
      if (spentHome + costHome <= potTotalHome) {
        coveredIds.add(exp.id);
        spentHome += costHome;
      } else {
        uncoveredCount += 1;
      }
    }
  }

  const remainingHome = Math.max(potTotalHome - spentHome, 0);
  const usedPercent =
    potTotalHome > 0 ? Math.min(100, Math.round((spentHome / potTotalHome) * 100)) : 0;

  const leftRatio = potTotalHome > 0 ? remainingHome / potTotalHome : 1;

  // "Spent" has to mean more than landing exactly on zero, which real money
  // almost never does. Once the dregs are too small to cover bills and those
  // bills are bouncing back to being split, the fund is done in every sense
  // that matters. A single bill larger than the whole pot does not count —
  // that is one expensive dinner, not an empty fund.
  const exhausted =
    potTotalHome > 0 && (remainingHome < 0.005 || (uncoveredCount > 0 && leftRatio < 0.2));

  return {
    enabled: kitty.enabled,
    potTotalHome,
    collectedHome,
    spentHome,
    remainingHome,
    usedPercent,
    coveredIds,
    uncoveredCount,
    exhausted,
    runningLow: potTotalHome > 0 && !exhausted && leftRatio < 0.2,
    unpaidTravelerIds
  };
}
