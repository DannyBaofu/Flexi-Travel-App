import React, { useEffect, useState } from 'react';
import { Lightbulb, X } from 'lucide-react';
import { useI18n } from '../utils/i18n';
import { card, cardFlat, iconBtn } from './ui';
import type { Phrase, Phrasebook } from '../data/phrasebooks';

export const PhrasesTab: React.FC<{ book: Phrasebook }> = ({ book }) => {
  const { lang, t } = useI18n();
  // The phrase is in the trip's language, not the app's: say so, or a
  // Chinese-language page draws Japanese kanji in their Chinese shapes.
  const display = book.lang === 'ja' ? 'ja-display' : 'thai-display';

  // This tab is used *at* someone — you hold the phone up to a driver.
  // So a tapped phrase goes full-size on white with nothing else on screen.
  const [showing, setShowing] = useState<Phrase | null>(null);

  useEffect(() => {
    if (!showing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowing(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showing]);

  return (
    <div className="space-y-4">
      <div className="bg-gilt-tint rounded-card px-4 py-3 flex items-start gap-2.5">
        <Lightbulb className="w-4 h-4 text-gilt shrink-0 mt-0.5" />
        <div className="text-xs text-gilt leading-relaxed space-y-1">
          <p>{t('tapPhraseHint')}</p>
          <p className="opacity-90">{t(book.hintKey)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {book.categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <div key={cat.en} className={`${card} p-4 space-y-2`}>
              <div className="flex items-center gap-2 pb-2 border-b border-hairline">
                <Icon className="w-4 h-4 text-muted shrink-0" />
                <h3 className="text-sm font-semibold text-ink">{lang === 'zh' ? cat.zh : cat.en}</h3>
              </div>

              <div className="space-y-1.5">
                {cat.phrases.map((phrase, idx) => (
                  <button
                    key={idx}
                    onClick={() => setShowing(phrase)}
                    className={`${cardFlat} w-full text-left p-2.5 hover:bg-mist transition`}
                  >
                    {/* Stacked, not side by side: a whole question in Japanese
                        and its translation do not both fit one 375px line */}
                    <div lang={book.lang} className={`${display} text-base font-semibold text-ink`}>
                      {phrase.text}
                    </div>
                    <div className="text-xs text-muted mt-0.5">{lang === 'zh' ? phrase.zh : phrase.en}</div>
                    <div className="text-[11px] text-faint font-mono mt-0.5">{phrase.pron}</div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Show mode — read at arm's length by a stranger, so the type
          scale is broken here on purpose. */}
      {showing && (
        <div
          className="fixed inset-0 z-50 bg-paper flex flex-col animate-fadeIn no-print"
          onClick={() => setShowing(null)}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-hairline shrink-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-faint">
              {t('showToLocal')}
            </span>
            <button onClick={() => setShowing(null)} className={iconBtn} title={t('close')}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6 text-center">
            <p
              lang={book.lang}
              className={`${display} text-[34px] sm:text-5xl font-bold text-ink leading-snug select-all`}
            >
              {showing.text}
            </p>
            <div className="space-y-1.5">
              <p className="text-lg text-muted">{lang === 'zh' ? showing.zh : showing.en}</p>
              <p className="text-sm text-faint font-mono">{showing.pron}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
