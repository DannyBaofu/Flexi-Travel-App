import { describe, it, expect } from 'vitest';
import { travelTimeLabel } from './travelTime';

// Echo the key and its params, so each case shows which wording it chose.
const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

describe('travelTimeLabel', () => {
  it('keeps anything under an hour in minutes', () => {
    expect(travelTimeLabel(5, t)).toBe('approxMinutes:{"n":5}');
    expect(travelTimeLabel(59, t)).toBe('approxMinutes:{"n":59}');
  });

  it('says a whole number of hours without a trailing zero minutes', () => {
    expect(travelTimeLabel(60, t)).toBe('approxHours:{"h":1}');
    expect(travelTimeLabel(120, t)).toBe('approxHours:{"h":2}');
  });

  it('splits a long hop into hours and minutes', () => {
    expect(travelTimeLabel(100, t)).toBe('approxHoursMinutes:{"h":1,"m":40}');
  });

  it('rounds a fractional minute rather than printing it', () => {
    expect(travelTimeLabel(59.6, t)).toBe('approxHours:{"h":1}');
    expect(travelTimeLabel(4.4, t)).toBe('approxMinutes:{"n":4}');
  });
});
