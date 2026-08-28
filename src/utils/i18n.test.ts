import { describe, it, expect } from 'vitest';
import { translateWeekday } from './i18n';

describe('translateWeekday', () => {
  it('translates English weekday names to Chinese', () => {
    expect(translateWeekday('Monday (5th)', 'zh')).toBe('星期一 (5th)');
    expect(translateWeekday('Saturday (10th)', 'zh')).toBe('星期六 (10th)');
    expect(translateWeekday('Sunday (Nov 1)', 'zh')).toBe('星期日 (Nov 1)');
  });

  it('leaves strings untouched in English mode', () => {
    expect(translateWeekday('Monday (5th)', 'en')).toBe('Monday (5th)');
  });

  it('leaves unknown strings untouched', () => {
    expect(translateWeekday('Día uno', 'zh')).toBe('Día uno');
  });
});
