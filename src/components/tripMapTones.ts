/**
 * The colour each day takes on the whole-trip map.
 *
 * Five tones out of the existing token set, picked because white text on each
 * clears AA (brand 8.0, gilt 5.8, clay 6.6, muted 6.3, ink 18.0) — the number
 * in the pin has to stay readable. A sixth day goes round again: the number
 * in the pin, not the hue, is what says which day it is, so two days sharing
 * a tone is a smaller problem than a new colour the theme does not have.
 *
 * Kept out of TripMap so the card can colour its list without pulling Leaflet
 * into the main bundle. The class names are written out in full because
 * Tailwind only generates classes it can find as literal strings.
 */
export interface DayTone {
  /** Background class for a disc in the list under the map, or in the pin. */
  bg: string;
  /** The theme variable behind it, for the map's lines, which take a colour value. */
  cssVar: string;
}

const TONES: DayTone[] = [
  { bg: 'bg-brand', cssVar: '--color-brand' },
  { bg: 'bg-gilt', cssVar: '--color-gilt' },
  { bg: 'bg-clay', cssVar: '--color-clay' },
  { bg: 'bg-muted', cssVar: '--color-muted' },
  { bg: 'bg-ink', cssVar: '--color-ink' }
];

export const dayTone = (dayNumber: number): DayTone =>
  TONES[(Math.max(1, Math.floor(dayNumber)) - 1) % TONES.length];
