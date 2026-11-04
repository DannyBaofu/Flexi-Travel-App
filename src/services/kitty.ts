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
 *
 * Every sum here is in the pot's own currency, and there are two.
 *
 * A cash pot (the default) is in the trip's currency. It is a stack of real
 * notes, and expenses are logged in the same currency, so the remainder is a
 * subtraction — exact, and checkable against the envelope. It used to be kept
 * in the home currency and converted at the market rate, which no money
 * changer pays, so the "baht left" it showed never matched the cash.
 *
 * A transfer pot is in the home currency, because that is what sits in the
 * holder's account: everyone sends ringgit, and the holder pays baht bills by
 * card or e-wallet out of it. Bills are still logged in baht — that is what
 * the receipt says — so each one is converted at the trip's rate, to the sen,
 * before it comes off. That makes the remainder an estimate: a card charges
 * its own rate, a percent or two off the market's. The holder's bank app is
 * the real figure, and the card says as much.
 */

export type PotCurrency = 'trip' | 'home';

/** The pot as the rest of the app reads it: both amounts and the currency always present. */
export type ResolvedKitty = Omit<
  TripKitty,
  'perPerson' | 'perPersonCash' | 'perPersonHome' | 'potCurrency'
> & {
  potCurrency: PotCurrency;
  perPersonCash: number;
  perPersonHome: number;
};

export const DEFAULT_KITTY: ResolvedKitty = {
  enabled: false,
  potCurrency: 'trip',
  perPersonCash: 0,
  perPersonHome: 0,
  categories: ['food'],
  paidInTravelerIds: []
};

const positive = (n: unknown): number => {
  const v = Number(n);
  return Number.isFinite(v) && v > 0 ? v : 0;
};

/** To the cent (or sen, or satang): what a card statement actually prints. */
const toCents = (n: number): number => Math.round(n * 100) / 100;

/**
 * Trips saved before the pot existed, or arriving over a share link, have none.
 *
 * A pot saved before it counted cash holds a home-currency `perPerson`. It is
 * converted at the stored rate and rounded to whole notes, so it reads as a
 * sensible starting figure rather than as "THB 300" — and the converted value
 * is what the next edit to the pot writes back, dropping the old field.
 */
export function resolveKitty(
  trip: Pick<Trip, 'kitty'> & Partial<Pick<Trip, 'exchangeRate'>>
): ResolvedKitty {
  const k = trip.kitty;
  if (!k) return { ...DEFAULT_KITTY };
  const rate = trip.exchangeRate && trip.exchangeRate > 0 ? trip.exchangeRate : 1;
  const cash =
    typeof k.perPersonCash === 'number'
      ? k.perPersonCash
      : Math.round((Number(k.perPerson) || 0) * rate);
  return {
    enabled: Boolean(k.enabled),
    // Anything but an explicit 'home' is cash, so a pot from before the
    // choice — or a malformed one — keeps counting the notes it always did
    potCurrency: k.potCurrency === 'home' ? 'home' : 'trip',
    perPersonCash: positive(cash),
    perPersonHome: positive(k.perPersonHome),
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
  /**
   * Which currency every sum below is in. With `home`, `spent` and
   * `remaining` went through the exchange rate and are estimates.
   */
  potCurrency: PotCurrency;
  /** What each traveller hands over, in the pot's currency. */
  perPerson: number;
  potTotal: number;
  collected: number;
  spent: number;
  remaining: number;
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
  const travellers = trip.travelers ?? [];

  const inHome = kitty.potCurrency === 'home';
  const perPerson = inHome ? kitty.perPersonHome : kitty.perPersonCash;
  const potTotal = toCents(perPerson * travellers.length);

  // Bills are logged in the trip's currency. A cash pot takes them off as
  // they are; a transfer pot pays them at the trip's rate (trip currency per
  // one unit of home currency), rounded to the sen as a card would charge.
  const rate = trip.exchangeRate && trip.exchangeRate > 0 ? trip.exchangeRate : 1;
  const costOf = (exp: ExpenseItem): number =>
    inHome ? toCents(exp.amount / rate) : exp.amount;

  const paidIn = new Set(kitty.paidInTravelerIds);
  const collected = toCents(perPerson * travellers.filter(tv => paidIn.has(tv.id)).length);
  const unpaidTravelerIds = travellers.filter(tv => !paidIn.has(tv.id)).map(tv => tv.id);

  const coveredIds = new Set<string>();
  let spent = 0;
  let uncoveredCount = 0;

  if (kitty.enabled && potTotal > 0) {
    const eligible = oldestFirst(trip.expenses ?? []).filter(exp =>
      kitty.categories.includes(exp.category)
    );

    for (const exp of eligible) {
      // All of a bill or none of it. Paying half a dinner from the pot and
      // splitting the rest is accurate but impossible to follow on a phone,
      // and a smaller later bill may still fit in what is left.
      // Summing to the cent keeps float dust (0.1 + 0.2) from refusing a
      // bill that fits the pot exactly.
      const cost = costOf(exp);
      if (toCents(spent + cost) <= potTotal) {
        coveredIds.add(exp.id);
        spent = toCents(spent + cost);
      } else {
        uncoveredCount += 1;
      }
    }
  }

  const remaining = Math.max(toCents(potTotal - spent), 0);
  const usedPercent =
    potTotal > 0 ? Math.min(100, Math.round((spent / potTotal) * 100)) : 0;

  const leftRatio = potTotal > 0 ? remaining / potTotal : 1;

  // "Spent" has to mean more than landing exactly on zero, which real money
  // almost never does. Once the dregs are too small to cover bills and those
  // bills are bouncing back to being split, the fund is done in every sense
  // that matters. A single bill larger than the whole pot does not count —
  // that is one expensive dinner, not an empty fund.
  const exhausted =
    potTotal > 0 && (remaining < 0.005 || (uncoveredCount > 0 && leftRatio < 0.2));

  return {
    enabled: kitty.enabled,
    potCurrency: kitty.potCurrency,
    perPerson,
    potTotal,
    collected,
    spent,
    remaining,
    usedPercent,
    coveredIds,
    uncoveredCount,
    exhausted,
    runningLow: potTotal > 0 && !exhausted && leftRatio < 0.2,
    unpaidTravelerIds
  };
}
