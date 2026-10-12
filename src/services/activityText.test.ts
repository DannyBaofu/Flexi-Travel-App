import { describe, it, expect } from 'vitest';
import { activityText, translationStillFits } from './activityText';
import type { ActivityItem } from '../types/travel';

const activity = (over: Partial<ActivityItem> = {}): ActivityItem => ({
  id: 'a1',
  time: '19:00',
  title: '唐人街夜市晚餐',
  category: 'food',
  locationName: 'T&K Seafood',
  notes: '多数只收现金。',
  transportToNext: { mode: 'taxi', durationMin: 15, note: '叫 3 辆 Grab' },
  ...over
});

const english = {
  title: 'Chinatown night-market dinner',
  notes: 'Most stalls take cash only.',
  transportNote: 'Book 3 Grabs'
};

describe('activityText', () => {
  it('shows what was typed in Chinese, even when English exists', () => {
    const text = activityText(activity({ translationEn: english }), 'zh');
    expect(text).toEqual({ title: '唐人街夜市晚餐', notes: '多数只收现金。', transportNote: '叫 3 辆 Grab' });
  });

  it('shows the English copy in English', () => {
    expect(activityText(activity({ translationEn: english }), 'en')).toEqual(english);
  });

  it('falls back field by field, so a half-translated activity keeps its notes', () => {
    const text = activityText(activity({ translationEn: { title: 'Chinatown dinner' } }), 'en');
    expect(text.title).toBe('Chinatown dinner');
    expect(text.notes).toBe('多数只收现金。');
    expect(text.transportNote).toBe('叫 3 辆 Grab');
  });

  it('shows what was typed in English when nobody translated it', () => {
    expect(activityText(activity(), 'en').title).toBe('唐人街夜市晚餐');
  });

  it('has no hop note without a hop, whatever the translation says', () => {
    const text = activityText(activity({ transportToNext: undefined, translationEn: english }), 'en');
    expect(text.transportNote).toBeUndefined();
  });

  /** Trips from before translations existed wrote the hop as an English/Chinese pair. */
  it('still reads the older note / noteZh pair', () => {
    const old = activity({ transportToNext: { mode: 'bts', durationMin: 10, note: 'BTS to Siam', noteZh: '坐 BTS 到 Siam' } });
    expect(activityText(old, 'zh').transportNote).toBe('坐 BTS 到 Siam');
    expect(activityText(old, 'en').transportNote).toBe('BTS to Siam');
  });
});

describe('translationStillFits', () => {
  it('keeps the English while its original is unchanged', () => {
    expect(translationStillFits(false, '唐人街', '唐人街')).toBe(true);
    expect(translationStillFits(false, ' 唐人街 ', '唐人街')).toBe(true);
  });

  it('drops the English once the original is rewritten', () => {
    expect(translationStillFits(false, '唐人街夜市', '唐人街')).toBe(false);
  });

  it('keeps English typed in the same edit as the rewrite', () => {
    expect(translationStillFits(true, '唐人街夜市', '唐人街')).toBe(true);
  });
});
