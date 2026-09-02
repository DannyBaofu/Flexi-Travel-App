import React from 'react';
import { PiggyBank, Sliders, Check } from 'lucide-react';
import type { ActivityCategory, Trip, TripKitty } from '../types/travel';
import type { KittyState } from '../services/kitty';
import { categoryMetaMap } from '../utils/categoryHelpers';
import { useI18n } from '../utils/i18n';
import { card, btnDanger, iconBtn, input, label, money } from './ui';

interface KittyCardProps {
  trip: Trip;
  kitty: TripKitty;
  state: KittyState;
  isAdmin: boolean;
  meId: string;
  rate: number;
  editing: boolean;
  onToggleEditing: () => void;
  onOpenEditing: () => void;
  onUpdate: (patch: Partial<TripKitty>) => void;
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
  isAdmin,
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
          <div
            className={`text-2xl font-semibold mt-1 ${
              kittyState.exhausted ? 'text-clay' : 'text-ink'
            } ${money}`}
          >
            {trip.homeCurrency} {Math.round(kittyState.remainingHome).toLocaleString()}
          </div>
          {/* The number that matters at the stall is the local one */}
          <div className={`text-xs text-muted ${money}`}>
            ≈ {trip.currency} {Math.round(kittyState.remainingHome * rate).toLocaleString()}
          </div>
        </div>

        {isAdmin && (
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
              used: `${trip.homeCurrency} ${Math.round(kittyState.spentHome).toLocaleString()}`,
              total: `${trip.homeCurrency} ${Math.round(kittyState.potTotalHome).toLocaleString()}`
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
            per: `${trip.homeCurrency} ${kitty.perPerson.toLocaleString()}`
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
      {isAdmin && kittyEditing && (
        <div className="pt-3 border-t border-hairline space-y-3.5 animate-riseIn">
          <div>
            <label className={label} htmlFor="kitty-per-person">
              {t('kittyPerPerson', { cur: trip.homeCurrency })}
            </label>
            <input
              id="kitty-per-person"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              defaultValue={kitty.perPerson || ''}
              onBlur={(e) => updateKitty({ perPerson: Number(e.target.value) || 0 })}
              className={`${input} ${money}`}
            />
          </div>

          <div>
            <span className={label}>{t('kittyHolder')}</span>
            <div className="flex flex-wrap gap-1.5">
              {trip.travelers.map(tv => {
                const on = kitty.holderTravelerId === tv.id;
                return (
                  <button
                    type="button"
                    key={tv.id}
                    onClick={() => updateKitty({ holderTravelerId: tv.id })}
                    aria-pressed={on}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-control text-xs font-semibold border transition ${
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
            <span className={label}>{t('kittyCovers')}</span>
            <div className="flex flex-wrap gap-1.5">
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
            <span className={label}>{t('kittyWhoPaidIn')}</span>
            <div className="flex flex-wrap gap-1.5">
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
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-control text-xs font-semibold border transition ${
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
  ) : isAdmin ? (
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
