import { describe, it, expect } from 'vitest';
import { phrasebookFor } from './phrasebooks';

describe('phrasebookFor', () => {
  it('gives a yen trip the Japanese book', () => {
    expect(phrasebookFor('JPY').lang).toBe('ja');
    expect(phrasebookFor(' jpy ').lang).toBe('ja');
  });

  it('keeps the Thai book for every other trip', () => {
    expect(phrasebookFor('THB').lang).toBe('th');
    expect(phrasebookFor('MYR').lang).toBe('th');
    expect(phrasebookFor(undefined).lang).toBe('th');
  });

  it('fills in every phrase', () => {
    for (const currency of ['JPY', 'THB']) {
      for (const cat of phrasebookFor(currency).categories) {
        expect(cat.phrases.length).toBeGreaterThan(0);
        for (const p of cat.phrases) {
          expect(p.text && p.pron && p.zh && p.en, p.text).toBeTruthy();
        }
      }
    }
  });
});
