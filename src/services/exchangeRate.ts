// Live mid-market exchange rates from free, keyless APIs.
// Wise's own API requires an account token (unusable from a browser app),
// but these sources publish the same mid-market rate Wise is based on.

const CACHE_KEY = 'travelsync_fx_cache_v1';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

interface CacheEntry {
  rate: number;
  at: number;
}

function readCache(key: string): number | null {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') as Record<string, CacheEntry>;
    const hit = cache[key];
    if (hit && typeof hit.rate === 'number' && Date.now() - hit.at < CACHE_TTL_MS) {
      return hit.rate;
    }
  } catch { /* corrupt cache — ignore */ }
  return null;
}

function writeCache(key: string, rate: number): void {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') as Record<string, CacheEntry>;
    cache[key] = { rate, at: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch { /* storage unavailable — ignore */ }
}

// Returns how many units of `dest` one unit of `home` buys, or null when
// offline / unsupported currency. Cached for 12h per pair.
export async function fetchLiveRate(home: string, dest: string): Promise<number | null> {
  if (!home || !dest || home === dest) return null;
  const cacheKey = `${home}_${dest}`;
  const cached = readCache(cacheKey);
  if (cached) return cached;

  let rate: number | null = null;

  // Primary: open.er-api.com — 160+ currencies, daily updates, CORS-open
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${encodeURIComponent(home)}`);
    const json = await res.json();
    const value = json?.rates?.[dest];
    if (typeof value === 'number' && value > 0) rate = value;
  } catch { /* try fallback */ }

  // Fallback: Frankfurter (ECB reference rates, ~30 major currencies)
  if (!rate) {
    try {
      const res = await fetch(
        `https://api.frankfurter.dev/v1/latest?base=${encodeURIComponent(home)}&symbols=${encodeURIComponent(dest)}`
      );
      const json = await res.json();
      const value = json?.rates?.[dest];
      if (typeof value === 'number' && value > 0) rate = value;
    } catch { /* offline */ }
  }

  if (rate) writeCache(cacheKey, rate);
  return rate;
}
