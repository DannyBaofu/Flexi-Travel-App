import React from 'react';
import { PiggyBank, Sliders, Check, Banknote, Landmark } from 'lucide-react';
import type { ActivityCategory, Trip } from '../types/travel';
import type { KittyState, PotCurrency, ResolvedKitty } from '../services/kitty';
import { categoryMetaMap } from '../utils/categoryHelpers';
import { useI18n } from '../utils/i18n';
import { card, btnDanger, iconBtn, input, label, money } from './ui';

interface KittyCardProps {
  trip: Trip;
  kitty: ResolvedKitty;
  state: KittyState;
  canEdit: boolean;
  meId: string;
  /** For the "≈" reference line; computeKitty already converted any bills it had to. */
  rate: number;
  editing: boolean;
  onToggleEditing: () => void;
  onOpenEditing: () => void;
  onUpdate: (patch: Partial<ResolvedKitty>) => void;
  onTurnOff: () => void;
  getTravelerName: (id: string) => string;
}

/**
 * The shared cash pot: how much is left, who is holding it, who still owes
 * their share, and — the point of the card — whether it has run out.
 *
 * Split out of BudgetTracker, which had grown past a thousand lines holding
 * this, the personal panel, the expense form and the ledger at once.
 */
export const KittyCard: React.FC<KittyCardProps> = ({
  trip,
  kitty,
  state: kittyState,
  canEdit,
  meId,
  rate,
  editing: kittyEditing,
  onToggleEditing,
  onOpenEditing,
  onUpdate: updateKitty,
  onTurnOff: turnOffKitty,
  getTravelerName
}) => {
  const { lang, t } = useI18n();

  const toggleInList = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter(v => v !== value) : [...list, value];

  // A cash pot is counted in the trip's notes, exactly. A transfer pot is
  // counted in the home currency, and what it has spent went through the
  // rate — so those figures carry "≈" and round to whole units, because
  // sen would claim a precision a card's own rate does not have.
  const inHome = kittyState.potCurrency === 'home';
  const potCur = inHome ? trip.homeCurrency : trip.currency;
  const converted = (n: number) =>
    inHome
      ? `≈ ${potCur} ${Math.round(n).toLocaleString()}`
      : `${potCur} ${n.toLocaleString()}`;
  const reference = inHome
    ? `≈ ${trip.currency} ${Math.round(kittyState.remaining * rate).toLocaleString()}`
    : `≈ ${trip.homeCurrency} ${Math.round(kittyState.remaining / rate).toLocaleString()}`;

  const potCurrencyOptions: { value: PotCurrency; text: string; Icon: typeof Banknote }[] = [
    { value: 'trip', text: t('kittyAsCash', { cur: trip.currency }), Icon: Banknote },
    { value: 'home', text: t('kittyAsTransfer', { cur: trip.homeCurrency }), Icon: Landmark }
  ];
  const editingHome = kitty.potCurrency === 'home';

  return (
    <>
  {/* ---- Shared pot: "have we still got food money?" ---- */}
  {kittyState.enabled ? (
    <div className={`${card} p-4 sm:p-5 space-y-3.5`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] text-faint flex items-center gap-1.5">
            <PiggyBank className="w-3.5 h-3.5" />
            {t('kittyRemaining')}
          </div>
          {/* Cash: what is in the envelope, to the note, no rate in between.
              Transfer: what is left in the holder's account, near enough */}
          <div
            className={`text-2xl font-semibold mt-1 ${
              kittyState.exhausted ? 'text-clay' : 'text-ink'
            } ${money}`}
          >
            {/* At this size a full-weight "≈" outshouts the figure it qualifies */}
            {inHome && <span className="text-lg text-muted font-normal">≈ </span>}
            {potCur} {(inHome ? Math.round(kittyState.remaining) : kittyState.remaining).toLocaleString()}
          </div>
          {/* The other currency is a reference, and the "≈" says so. On a
              transfer pot it is the useful one at the table: baht to spend */}
          <div className={`text-xs text-muted ${money}`}>{reference}</div>
          {inHome && (
            <p className="text-[11px] text-faint mt-1 leading-relaxed">{t('kittyEstimateNote')}</p>
          )}
        </div>

        {canEdit && (
          <button
            onClick={() => onToggleEditing()}
            className={iconBtn}
            title={t('kittySettings')}
          >
            <Sliders className="w-4 h-4" />
          </button>
        )}
      </div>

      <div>
        <div className="w-full bg-mist rounded-full h-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              kittyState.exhausted
                ? 'bg-clay'
                : kittyState.runningLow
                  ? 'bg-gilt'
                  : 'bg-brand'
            }`}
            style={{ width: `${kittyState.usedPercent}%` }}
          />
        </div>
        <div className={`flex items-center justify-between gap-3 text-[11px] text-muted mt-1.5 ${money}`}>
          <span className="truncate">
            {t('kittyUsedOf', {
              used: converted(kittyState.spent),
              total: `${potCur} ${kittyState.potTotal.toLocaleString()}`
            })}
          </span>
          <span className="shrink-0">{kittyState.usedPercent}%</span>
        </div>
      </div>

      {/* Running out is the whole point of the card, so it is said plainly */}
      {kittyState.exhausted ? (
        <p className="text-xs text-clay bg-clay-tint rounded-control px-3 py-2.5 leading-relaxed">
          {t('kittyExhausted')}
        </p>
      ) : kittyState.runningLow ? (
        <p className="text-xs text-gilt bg-gilt-tint rounded-control px-3 py-2.5 leading-relaxed">
          {t('kittyLow')}
        </p>
      ) : null}

      {kittyState.uncoveredCount > 0 && (
        <p className="text-xs text-muted leading-relaxed">
          {kittyState.uncoveredCount === 1
            ? t('kittySplitBackOne')
            : t('kittySplitBack', { n: kittyState.uncoveredCount })}
        </p>
      )}

      <div className="pt-3 border-t border-hairline text-xs text-muted flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className={money}>
          {t('kittyPotLine', {
            n: trip.travelers.length,
            per: `${potCur} ${kittyState.perPerson.toLocaleString()}`
          })}
        </span>
        <span className="text-hairline">·</span>
        <span className="truncate">
          {kitty.holderTravelerId
            ? t('kittyHeldBy', { name: getTravelerName(kitty.holderTravelerId) })
            : t('kittyNoHolder')}
        </span>
        <span className="text-hairline">·</span>
        <span className={kittyState.unpaidTravelerIds.length > 0 ? 'text-gilt' : ''}>
          {kittyState.unpaidTravelerIds.length === 0
            ? t('kittyAllCollected')
            : t('kittyWaitingOn', {
                names: kittyState.unpaidTravelerIds
                  .map(getTravelerName)
                  .join(lang === 'zh' ? '\u3001' : ', ')
              })}
        </span>
      </div>

      {/* Setting the pot up is splitter internals, so it is the admin's */}
      {canEdit && kittyEditing && (
        <div className="pt-3 border-t border-hairline space-y-3.5 animate-riseIn">
          <div>
            <span className={label} id="kitty-currency-label">{t('kittyPaidAs')}</span>
            <div className="flex flex-wrap gap-1.5" role="group" aria-labelledby="kitty-currency-label">
              {potCurrencyOptions.map(({ value, text, Icon }) => {
                const on = kitty.potCurrency === value;
                return (
                  <button
                    type="button"
                    key={value}
                    onClick={() => updateKitty({ potCurrency: value })}
                    aria-pressed={on}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 min-h-11 rounded-control text-xs font-semibold border transition ${
                      on
                        ? 'bg-brand-tint border-brand-tint text-brand'
                        : 'bg-paper border-hairline text-muted hover:bg-mist'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    {text}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className={label} htmlFor="kitty-per-person">
              {editingHome
                ? t('kittyPerPersonTransfer', { cur: trip.homeCurrency })
                : t('kittyPerPerson', { cur: trip.currency })}
            </label>
            {/* Each currency keeps its own amount, and the key swaps the
                uncontrolled field over when the choice above changes —
                otherwise it would go on showing the other one's figure */}
            <input
              key={kitty.potCurrency}
              id="kitty-per-person"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              defaultValue={(editingHome ? kitty.perPersonHome : kitty.perPersonCash) || ''}
              onBlur={(e) => {
                const value = Number(e.target.value) || 0;
                updateKitty(editingHome ? { perPersonHome: value } : { perPersonCash: value });
              }}
              className={`${input} ${money}`}
              aria-describedby="kitty-per-person-hint"
            />
            <p id="kitty-per-person-hint" className="text-[11px] text-faint mt-1.5 leading-relaxed">
              {editingHome
                ? t('kittyTransferHint', { cur: trip.currency })
                : t('kittyCashHint')}
            </p>
          </div>

          <div>
            <span className={label} id="kitty-holder-label">{t('kittyHolder')}</span>
            <div className="flex flex-wrap gap-1.5" role="group" aria-labelledby="kitty-holder-label">
              {trip.travelers.map(tv => {
                const on = kitty.holderTravelerId === tv.id;
                return (
                  <button
                    type="button"
                    key={tv.id}
                    onClick={() => updateKitty({ holderTravelerId: tv.id })}
                    aria-pressed={on}
                    className={`inline-flex items-center gap-2 px-3 py-2 min-h-11 rounded-control text-xs font-semibold border transition ${
                      on
                        ? 'bg-brand-tint border-brand-tint text-brand'
                        : 'bg-paper border-hairline text-muted hover:bg-mist'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tv.avatarColor }} />
                    {tv.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className={label} id="kitty-covers-label">{t('kittyCovers')}</span>
            <div className="flex flex-wrap gap-1.5" role="group" aria-labelledby="kitty-covers-label">
              {(Object.keys(categoryMetaMap) as ActivityCategory[]).map(cat => {
                const meta = categoryMetaMap[cat];
                const Icon = meta.icon;
                const on = kitty.categories.includes(cat);
                return (
                  <button
                    type="button"
                    key={cat}
                    onClick={() => {
                      const next = toggleInList(kitty.categories, cat);
                      // A pot that covers nothing would silently stop working
                      if (next.length > 0) updateKitty({ categories: next });
                    }}
                    aria-pressed={on}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 min-h-11 rounded-control text-xs font-semibold border transition ${
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
            <span className={label} id="kitty-paidin-label">{t('kittyWhoPaidIn')}</span>
            <div className="flex flex-wrap gap-1.5" role="group" aria-labelledby="kitty-paidin-label">
              {trip.travelers.map(tv => {
                const on = kitty.paidInTravelerIds.includes(tv.id);
                return (
                  <button
                    type="button"
                    key={tv.id}
                    onClick={() =>
                      updateKitty({ paidInTravelerIds: toggleInList(kitty.paidInTravelerIds, tv.id) })
                    }
                    aria-pressed={on}
                    className={`inline-flex items-center gap-2 px-3 py-2 min-h-11 rounded-control text-xs font-semibold border transition ${
                      on
                        ? 'bg-brand-tint border-brand-tint text-brand'
                        : 'bg-paper border-hairline text-muted hover:bg-mist'
                    }`}
                  >
                    {on
                      ? <Check className="w-3.5 h-3.5 shrink-0" />
                      : <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tv.avatarColor }} />}
                    {tv.name}
                  </button>
                );
              })}
            </div>
          </div>

          <button type="button" onClick={turnOffKitty} className={`${btnDanger} w-full`}>
            {t('kittyTurnOff')}
          </button>
        </div>
      )}
    </div>
  ) : canEdit ? (
    <button
      onClick={() => {
        updateKitty({
          enabled: true,
          holderTravelerId: kitty.holderTravelerId || meId || trip.travelers[0]?.id
        });
        onOpenEditing();
      }}
      className={`${card} w-full p-4 flex items-center gap-3 text-left hover:bg-mist transition`}
    >
      <span className="w-10 h-10 rounded-control bg-brand-tint text-brand flex items-center justify-center shrink-0">
        <PiggyBank className="w-5 h-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{t('kittyStart')}</span>
        <span className="block text-xs text-muted mt-0.5 leading-relaxed">{t('kittyStartHint')}</span>
      </span>
    </button>
  ) : null}
    </>
  );
};
