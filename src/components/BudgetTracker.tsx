import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  PieChart, 
  ArrowRight, 
  Users, 
  Calculator, 
  Receipt
} from 'lucide-react';
import type { Trip, ExpenseItem, ActivityCategory } from '../types/travel';
import { categoryMetaMap } from '../utils/categoryHelpers';

interface BudgetTrackerProps {
  trip: Trip;
  onUpdateTrip: (updatedTrip: Trip) => void;
  isReadOnly?: boolean;
}

export const BudgetTracker: React.FC<BudgetTrackerProps> = ({
  trip,
  onUpdateTrip,
  isReadOnly
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [category, setCategory] = useState<ActivityCategory>('food');
  const [paidBy, setPaidBy] = useState<string>(trip.travelers[0]?.id || '');
  const [splitWith, setSplitWith] = useState<string[]>(trip.travelers.map(t => t.id));
  const [date, setDate] = useState<string>(trip.startDate);

  const rate = trip.exchangeRate && trip.exchangeRate > 0 ? trip.exchangeRate : 1;

  // Calculate total spent
  const totalSpent = (trip.expenses || []).reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const totalSpentHome = (totalSpent / rate).toFixed(0);

  // Calculate spending by category
  const categoryTotals = (trip.expenses || []).reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    return acc;
  }, {} as Record<ActivityCategory, number>);

  // Calculate settlement balances: who paid vs who consumed
  const balances: Record<string, number> = {};
  trip.travelers.forEach(t => { balances[t.id] = 0; });

  (trip.expenses || []).forEach(exp => {
    const payer = exp.paidByTravelerId;
    const splitters = exp.splitWithTravelerIds && exp.splitWithTravelerIds.length > 0 
      ? exp.splitWithTravelerIds 
      : trip.travelers.map(t => t.id);

    const share = exp.amount / splitters.length;

    // Payer is credited the full amount
    balances[payer] = (balances[payer] || 0) + exp.amount;

    // Each splitter is debited their share
    splitters.forEach(splitterId => {
      balances[splitterId] = (balances[splitterId] || 0) - share;
    });
  });

  // Simplified debts calculation: debtors pay creditors
  const settlements: { from: string; to: string; amount: number }[] = [];
  const debtors = Object.keys(balances).filter(id => balances[id] < -0.01).map(id => ({ id, balance: -balances[id] }));
  const creditors = Object.keys(balances).filter(id => balances[id] > 0.01).map(id => ({ id, balance: balances[id] }));

  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const payment = Math.min(debtor.balance, creditor.balance);

    settlements.push({
      from: debtor.id,
      to: creditor.id,
      amount: Math.round(payment)
    });

    debtor.balance -= payment;
    creditor.balance -= payment;

    if (debtor.balance < 0.01) i++;
    if (creditor.balance < 0.01) j++;
  }

  const getTravelerName = (id: string) => {
    return trip.travelers.find(t => t.id === id)?.name || 'Unknown';
  };

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
      splitWithTravelerIds: splitWith.length > 0 ? splitWith : trip.travelers.map(t => t.id)
    };

    onUpdateTrip({
      ...trip,
      expenses: [newExpense, ...(trip.expenses || [])]
    });

    setIsAdding(false);
    setTitle('');
    setAmount('');
  };

  const handleDeleteExpense = (expId: string) => {
    if (isReadOnly) return;
    onUpdateTrip({
      ...trip,
      expenses: (trip.expenses || []).filter(e => e.id !== expId)
    });
  };

  const toggleSplitter = (travelerId: string) => {
    if (splitWith.includes(travelerId)) {
      if (splitWith.length > 1) {
        setSplitWith(splitWith.filter(id => id !== travelerId));
      }
    } else {
      setSplitWith([...splitWith, travelerId]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Total Group Spent</span>
            <Receipt className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-2 font-mono">
            {totalSpent.toLocaleString()} {trip.currency}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            ≈ {trip.homeCurrency} {totalSpentHome} (Rate: 1 {trip.homeCurrency} = {rate} {trip.currency})
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Per Person Average</span>
            <Users className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-sky-400 mt-2 font-mono">
            {trip.travelers.length > 0 ? Math.round(totalSpent / trip.travelers.length).toLocaleString() : 0} {trip.currency}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Split evenly across {trip.travelers.length} travelers
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Quick Action</span>
            <Calculator className="w-4 h-4 text-amber-400" />
          </div>
          <div className="pt-2">
            {!isReadOnly ? (
              <button
                onClick={() => setIsAdding(!isAdding)}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-lg shadow-emerald-500/20"
              >
                <Plus className="w-4 h-4" /> {isAdding ? 'Close Form' : 'Log New Expense'}
              </button>
            ) : (
              <div className="text-xs text-slate-400">Viewing shared expense ledger</div>
            )}
          </div>
        </div>
      </div>

      {/* Add Expense Form (collapsible) */}
      {isAdding && (
        <form onSubmit={handleAddExpense} className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 shadow-2xl space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-400" /> Add Travel Expense
            </h3>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Expense Description *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Chao Phraya Dinner Cruise / Grab Taxi"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Amount ({trip.currency}) *</label>
              <input
                type="number"
                min="1"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="1500"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ActivityCategory)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
              >
                {(Object.keys(categoryMetaMap) as ActivityCategory[]).map(cat => (
                  <option key={cat} value={cat}>
                    {categoryMetaMap[cat].label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Paid By</label>
              <select
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
              >
                {trip.travelers.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Split with checkboxes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Split With (Whose share is this?)</label>
            <div className="flex flex-wrap gap-2">
              {trip.travelers.map(t => {
                const isSelected = splitWith.includes(t.id);
                return (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => toggleSplitter(t.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-2 ${
                      isSelected
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.avatarColor }} />
                    {t.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition"
            >
              Save Expense
            </button>
          </div>
        </form>
      )}

      {/* Settlements & Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Who Owes Who Debt Simplifier (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" /> Group Settlement Summary
            </h3>
            <p className="text-xs text-slate-400">
              Smart debt simplification algorithm calculates exact repayments.
            </p>

            <div className="space-y-2.5 pt-2">
              {settlements.length > 0 ? (
                settlements.map((s, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 font-medium text-slate-300">
                      <span className="font-bold text-white">{getTravelerName(s.from)}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="font-bold text-emerald-300">{getTravelerName(s.to)}</span>
                    </div>
                    <div className="font-bold text-amber-400 font-mono text-sm">
                      {s.amount.toLocaleString()} {trip.currency}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-xs text-slate-500 bg-slate-950/40 rounded-2xl">
                  🎉 All expenses are currently balanced!
                </div>
              )}
            </div>

            {/* Traveler Net Balances */}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Individual Balances</div>
              {trip.travelers.map(t => {
                const bal = Math.round(balances[t.id] || 0);
                const isPositive = bal > 0;
                return (
                  <div key={t.id} className="flex items-center justify-between text-xs py-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.avatarColor }} />
                      <span className="text-slate-300">{t.name}</span>
                    </div>
                    <span className={`font-mono font-bold ${
                      isPositive ? 'text-emerald-400' : bal < 0 ? 'text-rose-400' : 'text-slate-400'
                    }`}>
                      {isPositive ? `+${bal.toLocaleString()}` : bal.toLocaleString()} {trip.currency}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Category Breakdown Progress */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <PieChart className="w-4 h-4 text-sky-400" /> Category Breakdown
            </h3>
            <div className="space-y-2.5 pt-1">
              {(Object.keys(categoryTotals) as ActivityCategory[]).map(catKey => {
                const amount = categoryTotals[catKey] || 0;
                const percent = totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0;
                const meta = categoryMetaMap[catKey] || categoryMetaMap.other;

                return (
                  <div key={catKey} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-300 flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${meta.textColor}`} />
                        {meta.label}
                      </span>
                      <span className="font-mono text-slate-300">{amount.toLocaleString()} {trip.currency} ({percent}%)</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Expense Ledger Table (7 Cols) */}
        <div className="lg:col-span-7">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" /> Expense History ({trip.expenses?.length || 0})
              </h3>
            </div>

            <div className="space-y-2">
              {trip.expenses && trip.expenses.length > 0 ? (
                trip.expenses.map((exp) => {
                  const meta = categoryMetaMap[exp.category] || categoryMetaMap.other;
                  const Icon = meta.icon;

                  return (
                    <div
                      key={exp.id}
                      className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-2xl flex items-center justify-between gap-3 hover:border-slate-700 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl ${meta.bgColor} ${meta.borderColor} border flex items-center justify-center ${meta.textColor} shrink-0`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white">{exp.title}</div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>Paid by <strong className="text-slate-200">{getTravelerName(exp.paidByTravelerId)}</strong></span>
                            <span>•</span>
                            <span>{exp.date}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right font-mono">
                          <div className="text-sm font-bold text-emerald-400">{exp.amount.toLocaleString()} {exp.currency}</div>
                          <div className="text-[10px] text-slate-500">Split by {exp.splitWithTravelerIds?.length || trip.travelers.length}</div>
                        </div>

                        {!isReadOnly && (
                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition"
                            title="Delete Expense"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 text-xs text-slate-500">
                  No expenses logged yet. Click "Log New Expense" above to get started.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
