import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  PieChart,
  Users,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  Check
} from 'lucide-react';
import type { Trip, ExpenseItem, ActivityCategory, TripRole } from '../types/travel';
import { categoryMetaMap } from '../utils/categoryHelpers';
import { useI18n } from '../utils/i18n';
import {
  card,
  cardFlat,
  btnPrimary,
  btnPrimarySm,
  btnGhost,
  input,
  inputMono,
  select,
  label,
  money
} from './ui';

interface BudgetTrackerProps {
  trip: Trip;
  onUpdateTrip: (updatedTrip: Trip) => void;
  role: TripRole;
}

/**
 * Which traveler is *this* browser's owner. Local-only, like `myRole` —
 * it describes the device, not the trip, so it never touches the Trip
 * shape and needs no storage migration.
 */
const ME_KEY = 'travelsync-me';

const readMe = (tripId: string): string => {
  try {
    const raw = localStorage.getItem(ME_KEY);
    return raw ? (JSON.parse(raw)[tripId] ?? '') : '';
  } catch {
    return '';
  }
};

const writeMe = (tripId: string, travelerId: string) => {
  try {
    const raw = localStorage.getItem(ME_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[tripId] = travelerId;
    localStorage.setItem(ME_KEY, JSON.stringify(map));
  } catch {
    /* storage unavailable — the picker just won't stick */
  }
};

export const BudgetTracker: React.FC<BudgetTrackerProps> = ({
  trip,
  onUpdateTrip,
  role
}) => {
  const { lang, t } = useI18n();
  const isAdmin = role === 'admin';
  const isReadOnly = role === 'viewer';
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [category, setCategory] = useState<ActivityCategory>('food');
  const [paidBy, setPaidBy] = useState<string>(trip.travelers[0]?.id || '');
  const [splitWith, setSplitWith] = useState<string[]>(trip.travelers.map(tv => tv.id));
  const [date, setDate] = useState<string>(trip.startDate);
  const [meId, setMeId] = useState<string>(() => readMe(trip.id));

  const rate = trip.exchangeRate && trip.exchangeRate > 0 ? trip.exchangeRate : 1;
  const toHome = (n: number) => Math.round(n / rate).toLocaleString();

  const totalSpent = (trip.expenses || []).reduce((sum, exp) => sum + (exp.amount || 0), 0);

  const categoryTotals = (trip.expenses || []).reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    return acc;
  }, {} as Record<ActivityCategory, number>);

  // Who paid vs who consumed
  const balances: Record<string, number> = {};
  trip.travelers.forEach(tv => { balances[tv.id] = 0; });

  (trip.expenses || []).forEach(exp => {
    const payer = exp.paidByTravelerId;
    const splitters = exp.splitWithTravelerIds && exp.splitWithTravelerIds.length > 0
      ? exp.splitWithTravelerIds
      : trip.travelers.map(tv => tv.id);

    const share = exp.amount / splitters.length;
    balances[payer] = (balances[payer] || 0) + exp.amount;
    splitters.forEach(splitterId => {
      balances[splitterId] = (balances[splitterId] || 0) - share;
    });
  });

  // Simplified debts: debtors pay creditors
  const settlements: { from: string; to: string; amount: number }[] = [];
  const debtors = Object.keys(balances).filter(id => balances[id] < -0.01).map(id => ({ id, balance: -balances[id] }));
  const creditors = Object.keys(balances).filter(id => balances[id] > 0.01).map(id => ({ id, balance: balances[id] }));

  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const payment = Math.min(debtor.balance, creditor.balance);

    settlements.push({ from: debtor.id, to: creditor.id, amount: Math.round(payment) });

    debtor.balance -= payment;
    creditor.balance -= payment;

    if (debtor.balance < 0.01) i++;
    if (creditor.balance < 0.01) j++;
  }

  const getTravelerName = (id: string) => trip.travelers.find(tv => tv.id === id)?.name || 'Unknown';

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount || Number(amount) <= 0) return;

    const newExpense: ExpenseItem = {
      id: `exp-${Date.now()}`,
      title: title.trim(),
      amount: Number(amount),
      currency: trip.currency,
      category,
      date,
      paidByTravelerId: paidBy,
      splitWithTravelerIds: splitWith.length > 0 ? splitWith : trip.travelers.map(tv => tv.id)
    };

    onUpdateTrip({ ...trip, expenses: [newExpense, ...(trip.expenses || [])] });

    setIsAdding(false);
    setTitle('');
    setAmount('');
  };

  const handleDeleteExpense = (expId: string) => {
    if (!isAdmin) return;
    onUpdateTrip({ ...trip, expenses: (trip.expenses || []).filter(e => e.id !== expId) });
  };

  const toggleSplitter = (travelerId: string) => {
    if (splitWith.includes(travelerId)) {
      if (splitWith.length > 1) setSplitWith(splitWith.filter(id => id !== travelerId));
    } else {
      setSplitWith([...splitWith, travelerId]);
    }
  };

  const pickMe = (id: string) => {
    setMeId(id);
    writeMe(trip.id, id);
  };

  // The one number people open this tab for. Viewers are looking at
  // someone else's ledger, so they get the group view only.
  const showPersonal = !isReadOnly && trip.travelers.length > 0;
  const myBalance = meId ? Math.round(balances[meId] || 0) : 0;
  const mySettlements = meId ? settlements.filter(s => s.from === meId || s.to === meId) : [];

  return (
    <div className="space-y-4">
      {/* ---- Hero: what do I owe, or what am I owed ---- */}
      {showPersonal && (
        <div className={`${card} p-4 sm:p-5`}>
          {!meId ? (
            <div className="space-y-3">
              <div>
                <h2 className="text-base font-semibold text-ink">{t('whoAreYou')}</h2>
                <p className="text-xs text-muted mt-0.5 leading-relaxed">{t('pickYourselfHint')}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {trip.travelers.map(tv => (
                  <button
                    key={tv.id}
                    onClick={() => pickMe(tv.id)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-control border border-hairline bg-paper hover:bg-mist text-sm font-medium text-ink transition"
                  >
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tv.avatarColor }} />
                    {tv.name}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] text-faint">{t('yourBalance')}</div>

                  {/* Direction is carried by an arrow and a sentence, never
                      by the colour or the sign alone. */}
                  {myBalance > 0 ? (
                    <>
                      <div className="flex items-center gap-1.5 text-brand mt-0.5">
                        <ArrowDownLeft className="w-4 h-4 shrink-0" />
                        <span className="text-sm font-semibold">{t('youAreOwed')}</span>
                      </div>
                      <div className={`text-2xl font-semibold text-ink mt-1 ${money}`}>
                        {myBalance.toLocaleString()} {trip.currency}
                      </div>
                      <div className={`text-xs text-muted ${money}`}>
                        ≈ {trip.homeCurrency} {toHome(myBalance)}
                      </div>
                    </>
                  ) : myBalance < 0 ? (
                    <>
                      <div className="flex items-center gap-1.5 text-clay mt-0.5">
                        <ArrowUpRight className="w-4 h-4 shrink-0" />
                        <span className="text-sm font-semibold">{t('youOwe')}</span>
                      </div>
                      <div className={`text-2xl font-semibold text-ink mt-1 ${money}`}>
                        {Math.abs(myBalance).toLocaleString()} {trip.currency}
                      </div>
                      <div className={`text-xs text-muted ${money}`}>
                        ≈ {trip.homeCurrency} {toHome(Math.abs(myBalance))}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5 text-muted mt-1">
                      <Check className="w-4 h-4 shrink-0" />
                      <span className="text-sm font-semibold">{t('youAreSettled')}</span>
                    </div>
                  )}
                </div>

                <button onClick={() => setMeId('')} className="text-xs text-faint hover:text-ink underline shrink-0">
                  {t('changePerson')}
                </button>
              </div>

              {/* Settlement lines read as sentences, not a matrix */}
              {mySettlements.length > 0 && (
                <div className="space-y-1.5 pt-3 border-t border-hairline">
                  {mySettlements.map((s, idx) => {
                    const theyPayMe = s.to === meId;
                    return (
                      <div key={idx} className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-muted min-w-0 truncate">
                          {theyPayMe
                            ? t('settleTheyPayYou', { name: getTravelerName(s.from) })
                            : t('settleYouPay', { name: getTravelerName(s.to) })}
                        </span>
                        <span className={`font-semibold shrink-0 ${theyPayMe ? 'text-brand' : 'text-clay'} ${money}`}>
                          {s.amount.toLocaleString()} {trip.currency}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ---- Group total: supporting detail, plus the add button ---- */}
      <div className={`${card} p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4`}>
        <div className="min-w-0">
          <div className="text-[11px] text-faint">{t('groupTotalLabel')}</div>
          <div className={`text-lg font-semibold text-ink mt-0.5 ${money}`}>
            {totalSpent.toLocaleString()} {trip.currency}
            <span className="text-xs font-normal text-muted ml-1.5">
              ≈ {trip.homeCurrency} {toHome(totalSpent)}
            </span>
          </div>
          <div className="text-xs text-muted mt-0.5">
            {t('splitEvenly', { n: trip.travelers.length })}
          </div>
        </div>

        {!isReadOnly ? (
          <button onClick={() => setIsAdding(!isAdding)} className={`${btnPrimary} shrink-0`}>
            <Plus className="w-4 h-4" /> {isAdding ? t('closeForm') : t('logNewExpense')}
          </button>
        ) : (
          <span className="text-xs text-faint">{t('viewingSharedLedger')}</span>
        )}
      </div>

      {/* ---- Add expense ---- */}
      {isAdding && (
        <form onSubmit={handleAddExpense} className={`${card} p-4 sm:p-5 space-y-4 animate-riseIn`}>
          <h3 className="text-base font-semibold text-ink">{t('addTravelExpense')}</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={label}>{t('expenseDescription')}</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('expensePlaceholder')}
                className={input}
                required
              />
            </div>

            <div>
              <label className={label}>{t('amountLabel', { cur: trip.currency })}</label>
              <input
                type="number"
                min="1"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="1500"
                className={inputMono}
                required
              />
            </div>
          </div>

          <div className={`grid grid-cols-1 ${isAdmin ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-3`}>
            <div>
              <label className={label}>{t('category')}</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ActivityCategory)}
                className={select}
              >
                {(Object.keys(categoryMetaMap) as ActivityCategory[]).map(cat => (
                  <option key={cat} value={cat}>
                    {lang === 'zh' ? categoryMetaMap[cat].labelZh : categoryMetaMap[cat].label}
                  </option>
                ))}
              </select>
            </div>

            {isAdmin && (
              <div>
                <label className={label}>{t('paidBy')}</label>
                <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)} className={select}>
                  {trip.travelers.map(tv => (
                    <option key={tv.id} value={tv.id}>{tv.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className={label}>{t('date')}</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={input}
              />
            </div>
          </div>

          {/* Split internals are the admin's business */}
          {isAdmin && (
            <div>
              <label className={label}>{t('splitWithLabel')}</label>
              <div className="flex flex-wrap gap-2">
                {trip.travelers.map(tv => {
                  const isSelected = splitWith.includes(tv.id);
                  return (
                    <button
                      type="button"
                      key={tv.id}
                      onClick={() => toggleSplitter(tv.id)}
                      className={`px-3 py-2 rounded-control text-xs font-semibold border transition flex items-center gap-2 ${
                        isSelected
                          ? 'bg-brand-tint border-brand-tint text-brand'
                          : 'bg-paper border-hairline text-muted hover:bg-mist'
                      }`}
                    >
                      {isSelected
                        ? <Check className="w-3.5 h-3.5 shrink-0" />
                        : <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tv.avatarColor }} />}
                      {tv.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-hairline">
            <button type="button" onClick={() => setIsAdding(false)} className={btnGhost}>
              {t('cancel')}
            </button>
            <button type="submit" className={btnPrimary}>{t('saveExpense')}</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5 space-y-4">
          {/* Full settlement matrix stays an admin tool */}
          {isAdmin && (
            <div className={`${card} p-4 sm:p-5 space-y-3`}>
              <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
                <Users className="w-4 h-4 text-muted" /> {t('groupSettlement')}
              </h3>
              <p className="text-xs text-muted leading-relaxed">{t('settlementHint')}</p>

              <div className="space-y-1.5 pt-1">
                {settlements.length > 0 ? (
                  settlements.map((s, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-2.5 bg-mist rounded-control flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="text-muted min-w-0 truncate">
                        {t('settlePersonToPerson', {
                          from: getTravelerName(s.from),
                          to: getTravelerName(s.to)
                        })}
                      </span>
                      <span className={`font-semibold text-ink shrink-0 ${money}`}>
                        {s.amount.toLocaleString()} {trip.currency}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-5 text-xs text-faint bg-mist rounded-control">
                    {t('allBalanced')}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-hairline space-y-1.5">
                <div className="text-[11px] font-semibold text-faint uppercase tracking-wider">
                  {t('individualBalances')}
                </div>
                {trip.travelers.map(tv => {
                  const bal = Math.round(balances[tv.id] || 0);
                  return (
                    <div key={tv.id} className="flex items-center justify-between gap-3 text-xs py-0.5">
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tv.avatarColor }} />
                        <span className="text-muted truncate">{tv.name}</span>
                      </span>
                      <span className={`font-semibold shrink-0 ${money} ${
                        bal > 0 ? 'text-brand' : bal < 0 ? 'text-clay' : 'text-faint'
                      }`}>
                        {bal > 0 ? `+${bal.toLocaleString()}` : bal.toLocaleString()} {trip.currency}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Category breakdown */}
          {totalSpent > 0 && (
            <div className={`${card} p-4 sm:p-5 space-y-3`}>
              <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
                <PieChart className="w-4 h-4 text-muted" /> {t('categoryBreakdown')}
              </h3>
              <div className="space-y-2.5">
                {(Object.keys(categoryTotals) as ActivityCategory[]).map(catKey => {
                  const amt = categoryTotals[catKey] || 0;
                  const percent = totalSpent > 0 ? Math.round((amt / totalSpent) * 100) : 0;
                  const meta = categoryMetaMap[catKey] || categoryMetaMap.other;
                  const Icon = meta.icon;

                  return (
                    <div key={catKey} className="space-y-1.5">
                      <div className="flex justify-between gap-3 text-xs">
                        <span className="text-muted flex items-center gap-1.5 min-w-0">
                          <Icon className="w-3.5 h-3.5 shrink-0 text-faint" />
                          <span className="truncate">{lang === 'zh' ? meta.labelZh : meta.label}</span>
                        </span>
                        <span className={`text-ink shrink-0 ${money}`}>
                          {amt.toLocaleString()} · {percent}%
                        </span>
                      </div>
                      <div className="w-full bg-mist rounded-full h-1.5 overflow-hidden">
                        <div className={`${meta.spine} h-full rounded-full`} style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Ledger */}
        <div className="lg:col-span-7">
          <div className={`${card} p-4 sm:p-5 space-y-3`}>
            <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
              <Receipt className="w-4 h-4 text-muted" />
              {t('expenseHistory')} ({trip.expenses?.length || 0})
            </h3>

            <div className="space-y-1.5">
              {trip.expenses && trip.expenses.length > 0 ? (
                trip.expenses.map((exp) => {
                  const meta = categoryMetaMap[exp.category] || categoryMetaMap.other;
                  const Icon = meta.icon;

                  return (
                    <div
                      key={exp.id}
                      className={`${cardFlat} p-3 flex items-center justify-between gap-3`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-[3px] self-stretch min-h-[34px] rounded-full shrink-0 ${meta.spine}`} aria-hidden="true" />
                        <Icon className="w-4 h-4 text-faint shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-ink truncate">{exp.title}</div>
                          <div className="text-[11px] text-muted truncate">
                            {t('paidByLabel')} {getTravelerName(exp.paidByTravelerId)} · {exp.date}
                            {isAdmin && ` · ${t('splitByN', { n: exp.splitWithTravelerIds?.length || trip.travelers.length })}`}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="text-right">
                          <div className={`text-sm font-semibold text-ink ${money}`}>
                            {exp.amount.toLocaleString()} {exp.currency}
                          </div>
                          <div className={`text-[11px] text-muted ${money}`}>
                            ≈ {trip.homeCurrency} {toHome(exp.amount)}
                          </div>
                        </div>

                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="w-10 h-10 inline-flex items-center justify-center rounded-control text-faint hover:text-clay hover:bg-clay-tint transition"
                            title={t('deleteExpense')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted">{t('noExpensesYet')}</p>
                  {!isReadOnly && !isAdding && (
                    <button onClick={() => setIsAdding(true)} className={`${btnPrimarySm} mt-3`}>
                      <Plus className="w-3.5 h-3.5" /> {t('logNewExpense')}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
