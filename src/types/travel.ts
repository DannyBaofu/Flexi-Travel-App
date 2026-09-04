export type ActivityCategory = 
  | 'flight'
  | 'hotel'
  | 'food'
  | 'sightseeing'
  | 'shopping'
  | 'transport'
  | 'nightlife'
  | 'relax'
  | 'other';

// Role of THIS browser's user for a given trip.
// 'admin'  — trip creator/organizer: full control
// 'member' — invited traveler: edits the plan and logs expenses
// 'viewer' — read-only guest
/**
 * `admin` organises the trip, `member` travels on it — those are the two a
 * roster hands out.
 *
 * `viewer` is not a seat anyone is given any more. It is the read-only state
 * the app falls back to: when a trip arrives with no role we can establish,
 * and when the server refuses this account's writes. Keeping it is what lets
 * an unknown role mean "read-only" instead of meaning "member".
 */
export type TripRole = 'admin' | 'member' | 'viewer';

export type TransportMode =
  | 'bts'
  | 'mrt'
  | 'boat'
  | 'taxi'
  | 'walk'
  | 'bus'
  | 'train'
  | 'airportRail';

// Suggested transport from this activity to the NEXT activity in the same day
export interface TransportSuggestion {
  mode: TransportMode;
  durationMin: number; // estimated door-to-door travel time in minutes
  note?: string; // route hint, e.g. "BTS to Saphan Taksin, then blue-flag boat"
  noteZh?: string; // Chinese route hint
  costHint?: string; // e.g. "~45 THB/person"
}

export interface ActivityItem {
  id: string;
  time: string; // e.g. "09:30 AM" or "09:30"
  title: string;
  category: ActivityCategory;
  locationName: string;
  locationAddress?: string;
  googleMapsUrl?: string;
  cost?: number; // in destination currency (e.g. THB)
  currency?: string;
  notes?: string;
  assignedTravelerIds?: string[];
  photoUrl?: string;
  transportToNext?: TransportSuggestion;
}

export interface DaySchedule {
  id: string;
  dayNumber: number; // 1, 2, 3...
  dateString: string; // e.g. "Oct 05" or "2026-10-05"
  dayOfWeek: string; // e.g. "Monday"
  title: string; // e.g. "Arrival & Iconic Temples"
  summary?: string;
  activities: ActivityItem[];
}

export interface Traveler {
  id: string;
  name: string;
  avatarColor: string;
  isOwner?: boolean;
  /**
   * What this seat grants whoever claims it. Absent on travellers added before
   * seats existed — `storage.ts` backfills those to 'member'.
   *
   * This is the *intended* role and nothing more. The trip document is
   * member-writable, so the server clamps it to member/viewer on claim and
   * keeps the enforced role in `trip_members`; 'admin' here is only ever a
   * reflection of a promotion an admin already made.
   */
  role?: TripRole;
}

/** One name on the roster, as offered to somebody holding an invite code. */
export interface TripSeat {
  travelerId: string;
  name: string;
  avatarColor: string;
  role: TripRole;
  claimed: boolean;
  /** Claimed by the account asking — "this is you", not "taken by someone". */
  mine: boolean;
}

/** Who holds a seat on a trip this browser is already a member of. */
export interface SeatClaim {
  travelerId: string;
  role: TripRole;
  isMe: boolean;
}

export interface ExpenseItem {
  id: string;
  title: string;
  amount: number;
  currency: string;
  category: ActivityCategory;
  date: string;
  paidByTravelerId: string;
  splitWithTravelerIds: string[];
}

/**
 * A shared cash pot. Everyone hands the holder the same amount up front, and
 * spending in the covered categories comes out of that pot rather than being
 * settled between people afterwards.
 */
export interface TripKitty {
  enabled: boolean;
  /** Contribution per traveller, in the trip's HOME currency (what they hand over). */
  perPerson: number;
  /** Who is physically holding the money. */
  holderTravelerId?: string;
  /** Spending in these categories draws the pot down. */
  categories: ActivityCategory[];
  /** Travellers who have actually handed their share over. */
  paidInTravelerIds: string[];
}

export interface Trip {
  id: string;
  title: string;
  destination: string;
  country: string;
  startDate: string; // e.g. "2026-10-05"
  endDate: string; // e.g. "2026-10-10"
  coverImage: string;
  currency: string; // e.g. "THB"
  homeCurrency: string; // e.g. "USD" or "SGD" or "MYR"
  exchangeRate: number; // 1 HomeCurrency = X Currency (e.g. 1 USD = 35.5 THB)
  travelers: Traveler[];
  days: DaySchedule[];
  expenses: ExpenseItem[];
  /** Optional shared cash pot. Absent on trips created before it existed. */
  kitty?: TripKitty;
  createdAt: string;
  updatedAt: string;
  // Role of this browser's user for this trip. Always present on a trip that
  // came through `getTrips`, which backfills the ones saved before it was
  // written down — creation and import say admin, the cloud says whatever the
  // membership row enforces. A missing role therefore means "arrived by a path
  // that established none", and `App` reads that as viewer rather than admin.
  myRole?: TripRole;
  // Which traveller on the roster this browser's user is, from the claimed
  // seat. Local-only in exactly the way myRole is, and stripped before storing.
  myTravelerId?: string;
}
