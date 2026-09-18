import React, { useRef, useState } from 'react';
import { Plus, Circle, CheckCircle2, Trash2, CalendarPlus, Lightbulb } from 'lucide-react';
import type { Trip, TripIdea, ActivityCategory, TripRole } from '../types/travel';
import { categoryMetaMap } from '../utils/categoryHelpers';
import { useI18n } from '../utils/i18n';
import { readMe } from '../services/me';
import { card, cardFlat, iconBtnSolid, btnSecondarySm, input, label } from './ui';

/**
 * The draft list.
 *
 * Everything here is in service of one measurement: how long it takes to get
 * a thought out of somebody's head and onto the shared list. Type, Enter,
 * type, Enter — the field keeps focus, so a burst of eight places is eight
 * lines of typing and nothing else. Pasting eight lines out of the group chat
 * is one gesture.
 *
 * The single row of chips is the whole navigation, and it does two jobs on
 * purpose: it filters the list, and it is the bucket that whatever you type
 * goes into. One control for "which kind am I working on right now" beats a
 * filter row plus a tag picker, and the input is labelled with the bucket it
 * adds to so the second job is never silent.
 *
 * No day, no time, no cost, no map link. An idea that has to be filled in is
 * an idea that does not get written down, and the activity form is right
 * there for the moment it becomes a plan.
 */

interface IdeasViewProps {
  trip: Trip;
  onUpdateTrip: (updatedTrip: Trip) => void;
  onOfferUndo: (tripId: string, message: string, restore: (current: Trip) => Trip) => void;
  /** Hand this idea to the activity form, prefilled. */
  onPlanIdea: (idea: TripIdea) => void;
  role: TripRole;
}

/**
 * The buckets a wishlist actually needs — where to eat, what to see, where to
 * wander, where to go at night, where to do nothing. Flights, hotels and
 * taxis are logistics: they belong to a day, never to a maybe.
 *
 * They are `ActivityCategory` values rather than a taxonomy of their own, so
 * an idea keeps its kind when it turns into an activity, and the icons and
 * spine tones are the ones the itinerary already trained everyone on.
 */
const IDEA_BUCKETS: ActivityCategory[] = [
  'food',
  'sightseeing',
  'shopping',
  'nightlife',
  'relax',
  'other'
];

/** Same 44px action button the itinerary rows use. */
const actionBtn =
  'w-11 h-11 inline-flex items-center justify-center rounded-control text-muted ' +
  'hover:text-ink hover:bg-mist transition';

/** Two people typing the same place should not produce two rows. */
const normalise = (text: string) => text.trim().replace(/\s+/g, ' ').toLowerCase();

export const IdeasView: React.FC<IdeasViewProps> = ({
  trip,
  onUpdateTrip,
  onOfferUndo,
  onPlanIdea,
  role
}) => {
  const { lang, t } = useI18n();
  // Writing down where the group might go is planning, and planning belongs
  // to everyone on the trip. Only a viewer is held back.
  const canEdit = role !== 'viewer';

  const ideas = trip.ideas ?? [];

  const [bucket, setBucket] = useState<ActivityCategory | 'all'>('all');
  const [draft, setDraft] = useState('');
  /** Named rather than boolean: the hint repeats the line that already exists. */
  const [duplicateOf, setDuplicateOf] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [showPlanned, setShowPlanned] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // On a cloud trip the claimed seat wins; offline, the budget tab's answer to
  // the same question stands in.
  const meId = trip.myTravelerId || readMe(trip.id);

  const bucketLabel = (cat: ActivityCategory) => {
    const meta = categoryMetaMap[cat];
    return lang === 'zh' ? meta.labelZh : meta.label.split(' ')[0];
  };

  const authorName = (travelerId?: string) => {
    if (!travelerId) return null;
    return trip.travelers.find(tv => tv.id === travelerId)?.name ?? null;
  };

  const authorColor = (travelerId?: string) =>
    trip.travelers.find(tv => tv.id === travelerId)?.avatarColor;

  const saveIdeas = (next: TripIdea[]) => onUpdateTrip({ ...trip, ideas: next });

  /**
   * Add every non-empty line, skipping anything already on the list.
   *
   * Lines, plural, because the realistic way a group collects ideas is eight
   * of them sitting in a chat thread — pasting that in should produce eight
   * rows, not one row with newlines flattened out of it.
   */
  const addLines = (lines: string[]) => {
    if (!canEdit) return;

    const seen = new Set(ideas.map(idea => normalise(idea.text)));
    const stamp = Date.now();
    const fresh: TripIdea[] = [];
    let firstDuplicate: string | null = null;

    lines.forEach(raw => {
      const text = raw.trim();
      if (!text) return;
      const key = normalise(text);
      if (seen.has(key)) {
        firstDuplicate = firstDuplicate ?? text;
        return;
      }
      seen.add(key);
      fresh.push({
        id: `idea-${stamp}-${fresh.length}`,
        text,
        category: bucket === 'all' ? 'other' : bucket,
        addedByTravelerId: meId || undefined,
        createdAt: new Date(stamp).toISOString()
      });
    });

    setDuplicateOf(firstDuplicate);
    if (fresh.length === 0) return;

    saveIdeas([...ideas, ...fresh]);
    setDraft('');
    // The whole point of this tab: the next idea needs no tap to start.
    inputRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addLines([draft]);
  };

  /**
   * A single-line input drops the newlines out of pasted text, so intercept
   * the paste and treat each line as its own idea.
   */
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text/plain') || e.clipboardData.getData('text');
    if (!pasted.includes('\n')) return;
    e.preventDefault();
    addLines(pasted.split('\n'));
  };

  const togglePlanned = (idea: TripIdea) => {
    if (!canEdit) return;
    saveIdeas(ideas.map(i => (i.id === idea.id ? { ...i, planned: !i.planned } : i)));
  };

  const setIdeaCategory = (ideaId: string, category: ActivityCategory) => {
    if (!canEdit) return;
    saveIdeas(ideas.map(i => (i.id === ideaId ? { ...i, category } : i)));
  };

  const openEditor = (idea: TripIdea) => {
    if (!canEdit) return;
    if (editingId === idea.id) {
      setEditingId(null);
      return;
    }
    setEditingId(idea.id);
    setEditText(idea.text);
  };

  const commitEdit = (idea: TripIdea) => {
    const text = editText.trim();
    if (text && text !== idea.text) {
      saveIdeas(ideas.map(i => (i.id === idea.id ? { ...i, text } : i)));
    }
    setEditingId(null);
  };

  const handleDelete = (idea: TripIdea) => {
    if (!canEdit) return;
    const position = ideas.findIndex(i => i.id === idea.id);
    setEditingId(null);
    saveIdeas(ideas.filter(i => i.id !== idea.id));

    onOfferUndo(trip.id, t('deletedIdea', { name: idea.text }), current => {
      const live = current.ideas ?? [];
      if (live.some(i => i.id === idea.id)) return current;
      const restored = [...live];
      restored.splice(Math.min(position, restored.length), 0, idea);
      return { ...current, ideas: restored };
    });
  };

  const inBucket = ideas.filter(idea => bucket === 'all' || idea.category === bucket);
  const plannedCount = inBucket.filter(idea => idea.planned).length;

  // Still-open ideas first, newest at the top so a burst of typing shows up
  // right under the field. Within one paste, id order keeps the pasted order.
  const visible = (showPlanned ? inBucket : inBucket.filter(idea => !idea.planned))
    .slice()
    .sort((a, b) => {
      if (!!a.planned !== !!b.planned) return a.planned ? 1 : -1;
      if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });

  // min-w-11 as well as min-h-11: padding alone leaves the shortest label
  // ("All", against 全部) a 39px-wide target, and the floor is both dimensions.
  const chip = (on: boolean) =>
    `px-3 py-1.5 min-h-11 min-w-11 rounded-full text-xs font-medium shrink-0 flex items-center justify-center gap-1.5 transition ${
      on ? 'bg-brand-tint text-brand' : 'bg-mist text-muted hover:text-ink'
    }`;

  return (
    <div className="space-y-4">
      {/* Which kind am I working on — and the way in */}
      <div className={`${card} p-3 sm:p-4`}>
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none -mx-3 px-3 sm:-mx-4 sm:px-4">
          <button onClick={() => setBucket('all')} className={chip(bucket === 'all')}>
            {t('all')}
          </button>
          {IDEA_BUCKETS.map(cat => {
            const Icon = categoryMetaMap[cat].icon;
            return (
              <button
                key={cat}
                onClick={() => setBucket(bucket === cat ? 'all' : cat)}
                className={chip(bucket === cat)}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{bucketLabel(cat)}</span>
              </button>
            );
          })}
        </div>

        {canEdit && (
          <form onSubmit={handleSubmit} className="mt-3 pt-3 border-t border-hairline">
            {/* Says where what you type will land, so the chips above can do
                double duty without ever changing anything silently. */}
            <label className={label} htmlFor="idea-input">
              {bucket === 'all' ? t('ideaAddAny') : t('ideaAddTo', { bucket: bucketLabel(bucket) })}
            </label>
            <div className="flex items-center gap-2">
              <input
                id="idea-input"
                ref={inputRef}
                type="text"
                value={draft}
                onChange={e => {
                  setDraft(e.target.value);
                  setDuplicateOf(null);
                }}
                onPaste={handlePaste}
                autoComplete="off"
                className={input}
              />
              <button
                type="submit"
                disabled={draft.trim() === ''}
                className={`${iconBtnSolid} disabled:opacity-50 disabled:cursor-not-allowed`}
                title={t('ideaAdd')}
                aria-label={t('ideaAdd')}
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            {duplicateOf && (
              <p className="text-[11px] text-gilt mt-1.5" role="status">
                {t('ideaAlreadyThere', { name: duplicateOf })}
              </p>
            )}
          </form>
        )}
      </div>

      {/* The list */}
      <div className={`${card} p-3 sm:p-4`}>
        <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-hairline">
          <span className="text-xs text-muted">
            {inBucket.length === 1 ? t('ideaCountOne') : t('ideaCount', { n: inBucket.length })}
            {plannedCount > 0 && ` · ${t('ideaPlannedCount', { n: plannedCount })}`}
          </span>
          {plannedCount > 0 && (
            <button
              onClick={() => setShowPlanned(v => !v)}
              className="shrink-0 text-xs font-semibold text-brand hover:underline min-h-11 px-1"
            >
              {showPlanned ? t('ideaHidePlanned') : t('ideaShowPlanned')}
            </button>
          )}
        </div>

        <div className="mt-2.5 space-y-1.5">
          {visible.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-hairline rounded-card">
              <Lightbulb className="w-5 h-5 text-faint mx-auto mb-2" aria-hidden="true" />
              <p className="text-sm text-muted max-w-xs mx-auto leading-relaxed">
                {ideas.length === 0 ? t('ideaEmpty') : t('ideaEmptyFiltered')}
              </p>
            </div>
          ) : (
            visible.map(idea => {
              const meta = categoryMetaMap[idea.category] || categoryMetaMap.other;
              const Icon = meta.icon;
              const isEditing = editingId === idea.id;
              const author = authorName(idea.addedByTravelerId);

              const body = (
                <>
                  <span
                    className={`w-[3px] rounded-full shrink-0 self-stretch min-h-[24px] ${meta.spine}`}
                    aria-hidden="true"
                  />
                  <Icon className="w-4 h-4 shrink-0 text-muted mt-px" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-sm leading-snug break-words ${
                        idea.planned ? 'text-faint line-through' : 'text-ink font-medium'
                      }`}
                    >
                      {idea.text}
                    </span>
                    {author && (
                      <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-faint">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: authorColor(idea.addedByTravelerId) }}
                          aria-hidden="true"
                        />
                        <span className="truncate">{t('ideaAddedBy', { name: author })}</span>
                      </span>
                    )}
                  </span>
                </>
              );

              return (
                <div key={idea.id} className={`${cardFlat} overflow-hidden`}>
                  <div className="flex items-start gap-1 pr-2">
                    {/* Dealt with, or not. One tap, no panel to open. */}
                    <button
                      onClick={() => togglePlanned(idea)}
                      disabled={!canEdit}
                      aria-pressed={!!idea.planned}
                      title={idea.planned ? t('ideaMarkUnplanned') : t('ideaMarkPlanned')}
                      className="w-11 h-11 shrink-0 inline-flex items-center justify-center rounded-control text-faint hover:text-brand hover:bg-mist disabled:hover:bg-transparent disabled:hover:text-faint transition"
                    >
                      {idea.planned ? (
                        <CheckCircle2 className="w-5 h-5 text-brand" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>

                    {canEdit ? (
                      <button
                        onClick={() => openEditor(idea)}
                        aria-expanded={isEditing}
                        className="flex-1 min-w-0 min-h-11 py-2.5 flex items-start gap-2 text-left"
                      >
                        {body}
                      </button>
                    ) : (
                      <div className="flex-1 min-w-0 py-2.5 flex items-start gap-2">{body}</div>
                    )}
                  </div>

                  {isEditing && (
                    <div className="px-3 pb-3 pt-2.5 border-t border-hairline space-y-3">
                      <div>
                        <label className={label} htmlFor={`idea-text-${idea.id}`}>
                          {t('ideaText')}
                        </label>
                        <input
                          id={`idea-text-${idea.id}`}
                          type="text"
                          value={editText}
                          autoFocus
                          onChange={e => setEditText(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              commitEdit(idea);
                            }
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          className={input}
                        />
                      </div>

                      <div>
                        <span className={label} id={`idea-bucket-${idea.id}`}>
                          {t('ideaBucket')}
                        </span>
                        {/* One scrolling row, like the one at the top of the
                            tab. Wrapped, six 44px chips cost three rows of a
                            phone screen for a panel that is only ever open a
                            few seconds. */}
                        <div
                          className="flex items-center gap-1.5 overflow-x-auto scrollbar-none -mx-3 px-3"
                          role="group"
                          aria-labelledby={`idea-bucket-${idea.id}`}
                        >
                          {IDEA_BUCKETS.map(cat => {
                            const CatIcon = categoryMetaMap[cat].icon;
                            const on = idea.category === cat;
                            return (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => setIdeaCategory(idea.id, cat)}
                                aria-pressed={on}
                                className={chip(on)}
                              >
                                <CatIcon className="w-3.5 h-3.5" />
                                <span>{bucketLabel(cat)}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onPlanIdea(idea)}
                            className={btnSecondarySm}
                          >
                            <CalendarPlus className="w-3.5 h-3.5" /> {t('ideaPlanIt')}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(idea)}
                            className={`${actionBtn} hover:text-clay hover:bg-clay-tint`}
                            title={t('ideaDelete')}
                            aria-label={t('ideaDelete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => commitEdit(idea)}
                          className={btnSecondarySm}
                        >
                          {t('ideaSaveEdit')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
