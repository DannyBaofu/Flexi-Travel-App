import React, { useEffect, useState } from 'react';
import { Heart, ShoppingBag, MapPin, Utensils, Hash, Lightbulb, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useI18n } from '../utils/i18n';
import { card, cardFlat, iconBtn } from './ui';

interface Phrase {
  th: string; // Thai script — big, can be shown to locals
  pron: string; // romanized pronunciation
  zh: string;
  en: string;
}

interface PhraseCategory {
  icon: LucideIcon;
  zh: string;
  en: string;
  phrases: Phrase[];
}

const PHRASE_CATEGORIES: PhraseCategory[] = [
  {
    icon: Heart,
    zh: '礼貌用语',
    en: 'Politeness',
    phrases: [
      { th: 'สวัสดีครับ / ค่ะ', pron: 'Sa-wat-dee (krap/ka)', zh: '你好', en: 'Hello' },
      { th: 'ขอบคุณครับ / ค่ะ', pron: 'Khop khun (krap/ka)', zh: '谢谢', en: 'Thank you' },
      { th: 'ขอโทษครับ / ค่ะ', pron: 'Khor thot (krap/ka)', zh: '对不起 / 借过一下', en: 'Sorry / Excuse me' },
      { th: 'ไม่เป็นไร', pron: 'Mai pen rai', zh: '没关系', en: 'No problem / It’s okay' },
      { th: 'ใช่ / ไม่ใช่', pron: 'Chai / Mai chai', zh: '是 / 不是', en: 'Yes / No' }
    ]
  },
  {
    icon: ShoppingBag,
    zh: '购物砍价',
    en: 'Shopping & Bargaining',
    phrases: [
      { th: 'เท่าไหร่ครับ / คะ?', pron: 'Tao-rai (krap/ka)?', zh: '多少钱？', en: 'How much is this?' },
      { th: 'แพงไป', pron: 'Phaeng pai', zh: '太贵了', en: 'Too expensive' },
      { th: 'ลดหน่อยได้ไหม?', pron: 'Lot noi dai mai?', zh: '能便宜一点吗？', en: 'Can you give a cheaper price?' },
      { th: 'เอาอันนี้', pron: 'Ao an nee', zh: '我要这个', en: 'I’ll take this one' },
      { th: 'ดูเฉยๆ', pron: 'Du choei choei', zh: '我只是看看', en: 'Just looking' }
    ]
  },
  {
    icon: MapPin,
    zh: '问路',
    en: 'Directions',
    phrases: [
      { th: '...อยู่ที่ไหน?', pron: '... yoo tee nai?', zh: '……在哪里？（前面接地名）', en: 'Where is ...? (say the place first)' },
      { th: 'ห้องน้ำอยู่ที่ไหน?', pron: 'Hong nam yoo tee nai?', zh: '厕所在哪里？', en: 'Where is the toilet?' },
      { th: 'สถานีรถไฟฟ้าอยู่ที่ไหน?', pron: 'Sa-tha-nee rot-fai-fa yoo tee nai?', zh: 'BTS/MRT 车站在哪里？', en: 'Where is the BTS/MRT station?' },
      { th: 'ไกลไหม?', pron: 'Glai mai?', zh: '远吗？', en: 'Is it far?' },
      { th: 'ช่วยชี้แผนที่ให้หน่อย', pron: 'Chuay chee phaen-tee hai noi', zh: '请帮我在地图上指一下', en: 'Please point it on the map' }
    ]
  },
  {
    icon: Utensils,
    zh: '餐饮点餐',
    en: 'Food & Ordering',
    phrases: [
      { th: 'ไม่เผ็ด', pron: 'Mai phet', zh: '不要辣', en: 'Not spicy' },
      { th: 'เผ็ดนิดหน่อย', pron: 'Phet nit noi', zh: '一点点辣', en: 'A little spicy' },
      { th: 'ไม่ใส่ผักชี', pron: 'Mai sai phak-chee', zh: '不要香菜', en: 'No coriander' },
      { th: 'อร่อยมาก!', pron: 'A-roi mak!', zh: '很好吃！', en: 'Very delicious!' },
      { th: 'เช็คบิลครับ / ค่ะ', pron: 'Check bin (krap/ka)', zh: '买单', en: 'The bill, please' },
      { th: 'ขอน้ำเปล่า', pron: 'Khor nam plao', zh: '要一杯白开水', en: 'Plain water, please' }
    ]
  },
  {
    icon: Hash,
    zh: '数字（砍价必备）',
    en: 'Numbers (for bargaining)',
    phrases: [
      { th: 'หนึ่ง สอง สาม สี่ ห้า', pron: 'Neung, Song, Sam, See, Haa', zh: '1 2 3 4 5', en: '1 2 3 4 5' },
      { th: 'หก เจ็ด แปด เก้า สิบ', pron: 'Hok, Jet, Paet, Gao, Sip', zh: '6 7 8 9 10', en: '6 7 8 9 10' },
      { th: 'ยี่สิบ / ห้าสิบ', pron: 'Yee-sip / Haa-sip', zh: '20 / 50', en: '20 / 50' },
      { th: 'หนึ่งร้อย / ห้าร้อย', pron: 'Neung roi / Haa roi', zh: '100 / 500', en: '100 / 500' },
      { th: 'หนึ่งพัน', pron: 'Neung phan', zh: '1000', en: '1000' }
    ]
  }
];

export const PhrasesTab: React.FC = () => {
  const { lang, t } = useI18n();

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
          <p className="opacity-90">{t('phrasesHint')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PHRASE_CATEGORIES.map((cat) => {
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
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="thai-display text-base font-semibold text-ink">{phrase.th}</div>
                      <div className="text-xs text-muted text-right shrink-0">
                        {lang === 'zh' ? phrase.zh : phrase.en}
                      </div>
                    </div>
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
            <p className="thai-display text-[34px] sm:text-5xl font-bold text-ink leading-snug select-all">
              {showing.th}
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
