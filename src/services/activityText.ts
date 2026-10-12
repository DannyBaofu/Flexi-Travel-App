import type { ActivityItem } from '../types/travel';
import type { Lang } from '../utils/i18n';

export interface ActivityText {
  title: string;
  notes?: string;
  /** The line between this activity and the next. */
  transportNote?: string;
}

/**
 * What to show for an activity in the current language.
 *
 * Chinese shows what was typed. English shows the English copy where one
 * exists and what was typed everywhere else — field by field, so an activity
 * with an English title but untranslated notes still has notes.
 *
 * The hop note keeps its older pair too: trips written before translations
 * existed carry `note` (English) and `noteZh`, and those still read the way
 * they always did.
 */
export function activityText(activity: ActivityItem, lang: Lang): ActivityText {
  const en = lang === 'en' ? activity.translationEn : undefined;
  const hop = activity.transportToNext;
  const typedHopNote = hop ? (lang === 'zh' ? hop.noteZh || hop.note : hop.note) : undefined;
  return {
    title: en?.title || activity.title,
    notes: en?.notes || activity.notes,
    transportNote: hop ? en?.transportNote || typedHopNote || undefined : undefined
  };
}

/**
 * Whether an English line loaded from the saved activity still belongs to it.
 *
 * Rewriting the Chinese means the old English describes text that is gone, and
 * a confident translation of the wrong thing is worse than showing the Chinese.
 * So a translation survives an edit only if its original did not change — or
 * if somebody typed the English in this same edit, which is them saying it is
 * current.
 */
export function translationStillFits(
  touched: boolean,
  originalNow: string | undefined,
  originalSaved: string | undefined
): boolean {
  return touched || (originalNow ?? '').trim() === (originalSaved ?? '').trim();
}
