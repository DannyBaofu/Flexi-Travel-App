/**
 * Which traveller is *this* browser's owner, per trip.
 *
 * Local-only, like `myRole`: it describes the device, not the trip, so it
 * never touches the Trip shape and needs no storage migration. On a cloud
 * trip it is a mirror of the claimed seat rather than a free choice — the
 * server decides who you are, and this keeps the budget tab in step offline.
 */
const ME_KEY = 'travelsync-me';

export const readMe = (tripId: string): string => {
  try {
    const raw = localStorage.getItem(ME_KEY);
    return raw ? (JSON.parse(raw)[tripId] ?? '') : '';
  } catch {
    return '';
  }
};

export const writeMe = (tripId: string, travelerId: string): void => {
  try {
    const raw = localStorage.getItem(ME_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[tripId] = travelerId;
    localStorage.setItem(ME_KEY, JSON.stringify(map));
  } catch {
    /* storage unavailable — the picker just won't stick */
  }
};
