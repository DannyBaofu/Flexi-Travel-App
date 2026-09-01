import React from 'react';
import { Calendar, Wallet, Luggage, Languages } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useI18n } from '../utils/i18n';

export type TabId = 'itinerary' | 'budget' | 'checklist' | 'phrases';

const TABS: { id: TabId; icon: LucideIcon; longKey: string; shortKey: string }[] = [
  { id: 'itinerary', icon: Calendar, longKey: 'tabItinerary', shortKey: 'tabItineraryShort' },
  { id: 'budget', icon: Wallet, longKey: 'tabBudget', shortKey: 'tabBudgetShort' },
  { id: 'checklist', icon: Luggage, longKey: 'tabChecklist', shortKey: 'tabChecklistShort' },
  { id: 'phrases', icon: Languages, longKey: 'tabPhrases', shortKey: 'tabPhrasesShort' }
];

interface TabsProps {
  active: TabId;
  onChange: (id: TabId) => void;
}

/** Desktop and tablet: a quiet segmented row under the banner. */
export const TopTabs: React.FC<TabsProps> = ({ active, onChange }) => {
  const { t } = useI18n();
  return (
    <div className="hidden sm:flex items-center gap-1.5 mb-6 no-print">
      {TABS.map(({ id, icon: Icon, longKey }) => {
        const on = active === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            aria-current={on ? 'page' : undefined}
            className={`px-4 py-2.5 rounded-control text-sm font-semibold flex items-center gap-2 border transition ${
              on
                ? 'bg-brand-tint text-brand border-brand-tint'
                : 'bg-paper text-muted border-hairline hover:bg-mist hover:text-ink'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{t(longKey)}</span>
          </button>
        );
      })}
    </div>
  );
};

/**
 * Phone: fixed to the bottom, where the thumb already is. These are the
 * most-used control in the app; the top of the screen is the hardest
 * place to reach one-handed.
 */
export const BottomTabs: React.FC<TabsProps> = ({ active, onChange }) => {
  const { t } = useI18n();
  return (
    <nav className="sm:hidden fixed inset-x-0 bottom-0 z-40 bg-paper/95 backdrop-blur border-t border-hairline no-print pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch gap-1 px-2 py-1.5">
        {TABS.map(({ id, icon: Icon, shortKey }) => {
          const on = active === id;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              aria-current={on ? 'page' : undefined}
              className={`flex-1 min-h-[48px] flex flex-col items-center justify-center gap-1 rounded-control transition ${
                on ? 'bg-brand-tint text-brand' : 'text-faint active:bg-mist'
              }`}
            >
              <Icon className="w-[18px] h-[18px]" />
              <span className="text-[10.5px] font-medium leading-none">{t(shortKey)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
