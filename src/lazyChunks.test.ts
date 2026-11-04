import { describe, it, expect } from 'vitest';

/**
 * The background download only covers the parts it lists. This finds every
 * `lazy(() => import(...))` in the source and checks each one is listed, so
 * a new lazy dialog cannot quietly become the next thing that crashes offline.
 *
 * The source is read through Vite's own glob rather than `fs`, because the
 * build type-checks test files too and this project carries no Node types.
 */

const sources = import.meta.glob(['./**/*.ts', './**/*.tsx', '!./**/*.test.*'], {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>;

/** "./components/ItineraryView.tsx" + "./DayMap" → "components/DayMap" */
const resolveFrom = (file: string, spec: string): string => {
  const parts = file.replace(/^\.\//, '').split('/').slice(0, -1);
  for (const seg of spec.split('/')) {
    if (seg === '.') continue;
    if (seg === '..') parts.pop();
    else parts.push(seg);
  }
  return parts.join('/').replace(/\.tsx?$/, '');
};

const importsIn = (file: string, pattern: RegExp): string[] =>
  [...sources[file].matchAll(pattern)].map(m => resolveFrom(file, m[1]));

describe('lazyChunkLoaders', () => {
  const lazyTargets = Object.keys(sources).flatMap(file =>
    importsIn(file, /lazy\(\s*\(\)\s*=>\s*import\(\s*'([^']+)'/g)
  );
  const listed = importsIn('./lazyChunks.ts', /import\(\s*'([^']+)'/g);

  it('finds the lazy parts it is meant to guard', () => {
    // If this drops to zero the pattern stopped matching, not the code
    expect(new Set(lazyTargets).size).toBeGreaterThanOrEqual(8);
  });

  it('lists every lazy part for the background download', () => {
    const missing = [...new Set(lazyTargets)].filter(target => !listed.includes(target));
    expect(missing).toEqual([]);
  });
});
