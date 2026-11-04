import { Train, TramFront, Ship, Car, Bus, Footprints } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { TransportMode } from '../types/travel';

// Transport mode → icon and i18n key, shared by the schedule's hop lines and
// the organiser's routes card. Which Google travel mode each one opens lives
// with the rest of the geography in `geo.ts`.
export const transportModeMeta: Record<TransportMode, { icon: LucideIcon; tKey: string }> = {
  bts: { icon: TramFront, tKey: 'mode_bts' },
  mrt: { icon: Train, tKey: 'mode_mrt' },
  boat: { icon: Ship, tKey: 'mode_boat' },
  taxi: { icon: Car, tKey: 'mode_taxi' },
  walk: { icon: Footprints, tKey: 'mode_walk' },
  bus: { icon: Bus, tKey: 'mode_bus' },
  train: { icon: Train, tKey: 'mode_train' },
  airportRail: { icon: Train, tKey: 'mode_airportRail' }
};

// A link to Google's transit view. It is a tap target in its own right, so it
// carries the 44px floor itself.
export const directionsLink =
  'inline-flex items-center gap-1 min-h-11 px-1 -mx-1 text-brand hover:underline shrink-0';
