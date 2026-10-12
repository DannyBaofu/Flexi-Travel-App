import type { ActivityItem, DaySchedule } from '../types/travel';

/**
 * Put a saved activity on its day: replace it where it already is, or move it
 * there from another day.
 *
 * Changing the day in the edit form used to append the activity to the new
 * day and leave it on the old one too. A moved activity also loses its hop to
 * the next stop, because that described the next activity on the day it left.
 */
export function placeActivity(days: DaySchedule[], dayId: string, activity: ActivityItem): DaySchedule[] {
  const moved = days.some(d => d.id !== dayId && d.activities.some(a => a.id === activity.id));
  const placed: ActivityItem = moved
    ? {
        ...activity,
        transportToNext: undefined,
        translationEn: activity.translationEn && { ...activity.translationEn, transportNote: undefined }
      }
    : activity;

  return days.map(day => {
    const at = day.activities.findIndex(a => a.id === activity.id);
    if (day.id !== dayId) {
      return at >= 0 ? { ...day, activities: day.activities.filter(a => a.id !== activity.id) } : day;
    }
    if (at < 0) return { ...day, activities: [...day.activities, placed] };
    const activities = [...day.activities];
    activities[at] = placed;
    return { ...day, activities };
  });
}
