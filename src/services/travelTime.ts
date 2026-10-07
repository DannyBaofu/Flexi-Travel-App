/**
 * How long the hop to the next activity takes, as somebody reads it.
 *
 * The number is whatever the group wrote on the activity — nothing here works
 * it out. A day can cross a border, and the times either side of one are on
 * different clocks, so subtracting one activity's time from the next would put
 * a confident wrong answer between them (07:06 in Malaysia to 07:50 in Thailand
 * is a 1 h 40 min train, not 44 minutes).
 *
 * Past an hour it splits into hours and minutes, because "约 100 分钟" makes the
 * reader do the division standing outside a station.
 */
export function travelTimeLabel(
  minutes: number,
  t: (key: string, params?: Record<string, string | number>) => string
): string {
  const total = Math.max(0, Math.round(minutes));
  if (total < 60) return t('approxMinutes', { n: total });
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? t('approxHours', { h }) : t('approxHoursMinutes', { h, m });
}
