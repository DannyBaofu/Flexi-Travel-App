import type { ActivityItem, ExpenseItem, Trip } from '../types/travel';

/**
 * Reconciling a remote trip with unsent local work.
 *
 * The whole trip is stored as one JSON document, so a remote update carries
 * *everything* — accepting it wholesale while you still have an edit that never
 * reached the server throws that edit away, silently. That is the app's worst
 * failure: you log a dinner on bad wifi, someone else saves an hour later, and
 * your dinner disappears from your own phone.
 *
 * So: when local is clean, take the remote copy as-is — it is authoritative and
 * it correctly reflects other people's deletions. Only when local has unsent
 * changes do we merge, and then we err towards keeping work rather than losing
 * it. That can resurrect something another person deleted in the same window,
 * which is the right side to fail on: a reappearing row is visible and easy to
 * delete again, a vanished one is neither.
 */

function mergeById<T extends { id: string }>(remote: T[], local: T[]): T[] {
  const seen = new Set(remote.map(item => item.id));
  const localOnly = local.filter(item => !seen.has(item.id));
  return localOnly.length > 0 ? [...localOnly, ...remote] : remote;
}

export function mergeRemoteTrip(local: Trip, remote: Trip): Trip {
  const localDays = local.days ?? [];

  const days = (remote.days ?? []).map(remoteDay => {
    const localDay = localDays.find(d => d.id === remoteDay.id);
    if (!localDay) return remoteDay;

    const activities = mergeById<ActivityItem>(
      remoteDay.activities ?? [],
      localDay.activities ?? []
    );
    return activities === remoteDay.activities ? remoteDay : { ...remoteDay, activities };
  });

  // A day this browser added that the remote has not seen yet
  const remoteDayIds = new Set(days.map(d => d.id));
  const extraDays = localDays.filter(d => !remoteDayIds.has(d.id));

  return {
    ...remote,
    days: extraDays.length > 0 ? [...days, ...extraDays] : days,
    expenses: mergeById<ExpenseItem>(remote.expenses ?? [], local.expenses ?? []),
    // Local-only: describes this browser's permission, never travels
    myRole: local.myRole
  };
}
