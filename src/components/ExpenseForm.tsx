import React from 'react';
import { Check, ChevronDown } from 'lucide-react';
import type { ActivityCategory, Trip } from '../types/travel';
import { categoryMetaMap } from '../utils/categoryHelpers';
import { useI18n } from '../utils/i18n';
import { card, btnPrimary, btnGhost, input, label, money } from './ui';

interface ExpenseFormProps {
  trip: Trip;
  isAdmin: boolean;
  meId: string;
  /** Amount converted to the home currency, for the live line under the field. */
  toHome: (n: number) => string;

  amount: number | '';
  setAmount: (v: number | '') => void;
  title: string;
  setTitle: (v: string) => void;
  category: ActivityCategory;
  setCategory: (c: ActivityCategory) => void;
  date: string;
  setDate: (d: string) => void;
  effectivePaidBy: string;
  setPaidBy: (id: string) => void;
  splitWith: string[];
  toggleSplitter: (id: string) => void;

  showMore: boolean;
  setShowMore: (fn: (v: boolean) => boolean) => void;
  describePayer: (id: string) => string;
  describeDate: (iso: string) => string;

  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

/**
 * Amount, category, save — and nothing else visible.
 *
 * Everything with a sensible default (who paid, which day, who splits it) sits
 * behind one summary line, so the common case is two taps and the uncommon one
 * is still reachable.
 */
export const ExpenseForm: React.FC<ExpenseFormProps> = ({
  trip,
  isAdmin,
  meId,
  toHome,
  amount,
  setAmount,
  title,
  setTitle,
  category,
  setCategory,
  date,
  setDate,
  effectivePaidBy,
  setPaidBy,
  splitWith,
  toggleSplitter,
  showMore,
  setShowMore,
  describePayer,
  describeDate,
  onSubmit: handleAddExpense,
  onCancel
}) => {
  const { lang, t } = useI18n();
  // Amount, category, save. Everything else has a sensible default and lives
  // behind "more options".
  return (
    <form onSubmit={handleAddExpense} className={`${card} p-4 sm:p-5 space-y-5 animate-riseIn`}>
      {/* The one thing you actually have to type */}
      <div>
        <label className={label} htmlFor="expense-amount">{t('expenseAmountQ')}</label>
        <div className="flex items-baseline gap-2">
          <input
            id="expense-amount"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
            className={`flex-1 min-w-0 bg-transparent border-0 border-b-2 border-hairline focus:border-brand focus:outline-none text-3xl font-semibold text-ink py-1 ${money}`}
            required
          />
          <span className="text-base font-semibold text-muted shrink-0">{trip.currency}</span>
        </div>
        {/* Fixed height so the layout does not jump as you type */}
        <div className={`text-xs text-muted mt-2 h-4 ${money}`}>
          {amount !== '' && Number(amount) > 0
            ? `\u2248 ${trip.homeCurrency} ${toHome(Number(amount))}`
            : ''}
        </div>
      </div>

      {/* Tapping a chip beats opening a nine-item dropdown on a phone */}
      <div>
        <span className={label}>{t('expenseWhatFor')}</span>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(categoryMetaMap) as ActivityCategory[]).map(cat => {
            const meta = categoryMetaMap[cat];
            const Icon = meta.icon;
            const on = category === cat;
            return (
              <button
                type="button"
                key={cat}
                onClick={() => setCategory(cat)}
                aria-pressed={on}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-control text-xs font-semibold border transition ${
                  on
                    ? 'bg-brand-tint border-brand-tint text-brand'
                    : 'bg-paper border-hairline text-muted hover:bg-mist'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {lang === 'zh' ? meta.labelZh : meta.label.split(' ')[0]}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className={label} htmlFor="expense-note">{t('expenseNoteOptional')}</label>
        <input
          id="expense-note"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('expensePlaceholder')}
          className={input}
        />
      </div>

      {/* Payer, date and split: shown as one line, opened only if wrong */}
      <div className="border-t border-hairline pt-3">
        <button
          type="button"
          onClick={() => setShowMore(v => !v)}
          aria-expanded={showMore}
          className="w-full flex items-center justify-between gap-3 text-left min-h-[36px]"
        >
          <span className="text-xs text-muted min-w-0 truncate">
            {describePayer(effectivePaidBy)}
            {' \u00b7 '}
            {describeDate(date)}
            {isAdmin && splitWith.length !== trip.travelers.length
              ? ` \u00b7 ${t('splitByN', { n: splitWith.length })}`
              : ''}
          </span>
          <span className="text-xs font-semibold text-brand shrink-0 inline-flex items-center gap-1">
            {t('expenseMoreOptions')}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showMore ? 'rotate-180' : ''}`} />
          </span>
        </button>

        {showMore && (
          <div className="mt-3 space-y-3.5">
            {/* Who paid is the admin's call; a member logs their own */}
            {isAdmin && (
              <div>
                <span className={label}>{t('paidBy')}</span>
                <div className="flex flex-wrap gap-1.5">
                  {trip.travelers.map(tv => {
                    const on = effectivePaidBy === tv.id;
                    return (
                      <button
                        type="button"
                        key={tv.id}
                        onClick={() => setPaidBy(tv.id)}
                        aria-pressed={on}
                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-control text-xs font-semibold border transition ${
                          on
                            ? 'bg-brand-tint border-brand-tint text-brand'
                            : 'bg-paper border-hairline text-muted hover:bg-mist'
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tv.avatarColor }} />
                        {tv.name}{tv.id === meId ? ` (${t('youLabel')})` : ''}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <label className={label} htmlFor="expense-date">{t('date')}</label>
              <input
                id="expense-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={input}
              />
            </div>

            {isAdmin && (
              <div>
                <span className={label}>{t('splitWithLabel')}</span>
                <div className="flex flex-wrap gap-1.5">
                  {trip.travelers.map(tv => {
                    const isSelected = splitWith.includes(tv.id);
                    return (
                      <button
                        type="button"
                        key={tv.id}
                        onClick={() => toggleSplitter(tv.id)}
                        aria-pressed={isSelected}
                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-control text-xs font-semibold border transition ${
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
          </div>
        )}
      </div>

      {/* Save is visibly the thing to press */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className={`${btnGhost} flex-1`}
        >
          {t('cancel')}
        </button>
        <button type="submit" className={`${btnPrimary} flex-[2]`}>
          {t('saveExpense')}
        </button>
      </div>
    </form>
  );
};
