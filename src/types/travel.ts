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

/**
 * One line somebody typed into the draft list before anybody decided which
 * day it lands on — a place to go, something to eat, somewhere to play, a
 * view worth the trip out.
 *
 * Deliberately thin, and deliberately *not* half an activity. The draft is a
 * dumping ground that has to keep up with typing, so an idea is a line of
 * text and a bucket. It never links to an activity either: turning one into a
 * plan copies its text and category into the activity form and leaves the
 * idea behind, marked `planned`. A link would mean answering "what happens to
 * the idea when the activity moves day, or gets deleted?" — questions a
 * wishlist should never have to have.
 */
export interface TripIdea {
  id: string;
  /** What was typed. One line; long ones wrap rather than getting a notes field. */
  text: string;
  /** Same taxonomy an activity uses, so promoting one needs no mapping. */
  category: ActivityCategory;
  /** Whose idea it was, when this browser knows which seat it holds. */
  addedByTravelerId?: string;
  createdAt: string;
  /** Dealt with — in the schedule, or handled some other way. Sinks to the bottom. */
  planned?: boolean;
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

/**
 * One flight, as it reads off the booking: number, where from, where to, and
 * the local clock time at each end.
 *
 * Times are the airport's own local time, exactly as printed on the ticket,
 * and nothing here converts between zones — so a leg's duration is *not*
 * derivable from its two times and the card does not pretend it is. What can
 * be worked out honestly is the wait between two legs, because both clocks
 * are the same airport's.
 */
export interface FlightLeg {
  id: string;
  /** e.g. "SQ 131". Free text: the airline is whatever the prefix says. */
  flightNo: string;
  /** Airport or city, as typed — "PEN", "Penang". */
  from: string;
  to: string;
  /** YYYY-MM-DD, local to the departure airport. */
  date: string;
  /** HH:MM, 24h. Either may be blank while the booking is still being typed in. */
  departTime: string;
  arriveTime: string;
}

/** Every leg in one direction, plus where the group is meeting first. */
export interface FlightJourney {
  legs: FlightLeg[];
  /** "07:00 at the check-in counter" — the organiser's one line to the group. */
  note?: string;
}

/**
 * The trip's flights, written once by the organiser and read by everyone.
 * Part of the trip document, so it syncs like the days do. Absent on trips
 * saved before it existed — `getTrips` backfills an empty one.
 */
export interface TripFlights {
  /** Optional heading for the card; the flight numbers already say who flies it. */
  airline?: string;
  outbound: FlightJourney;
  inbound: FlightJourney;
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
  /**
   * The draft list: everything the group wants to do, before any of it has a
   * day or a time. Part of the trip document, so it syncs and merges like the
   * days and the expenses do. Absent on trips saved before it existed —
   * `getTrips` backfills an empty list.
   */
  ideas?: TripIdea[];
  /** Optional shared cash pot. Absent on trips created before it existed. */
  kitty?: TripKitty;
  /** Flights out and back, set by the organiser in Trip Settings. */
  flights?: TripFlights;
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
