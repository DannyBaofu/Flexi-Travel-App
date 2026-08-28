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
// 'member' — invited traveler: basic edits (activities, checklist ticks, expenses)
// 'viewer' — read-only guest
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
  thaiAddress?: string; // Local language taxi card address (e.g. Thai)
  googleMapsUrl?: string;
  cost?: number; // in destination currency (e.g. THB)
  currency?: string;
  notes?: string;
  booked?: boolean;
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

export interface ChecklistItem {
  id: string;
  category: 'Essentials' | 'Documents & Money' | 'Electronics' | 'Clothes' | 'Toiletries & Medicine' | 'Bangkok Specific';
  title: string;
  completed: boolean;
  assignedTo?: string;
}

export interface TaxiCard {
  id: string;
  nameEnglish: string;
  nameThai: string;
  thaiAddress: string;
  nearestStation?: string; // BTS / MRT station
  noteForDriver?: string;
}

export interface ShareSettings {
  isPublic: boolean;
  isPasswordProtected: boolean;
  passcodeHash?: string; // Simple encoded hash for PIN
  allowGuestEdits: boolean; // Read-only vs Collaborative
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
  checklist: ChecklistItem[];
  taxiCards: TaxiCard[];
  shareSettings: ShareSettings;
  createdAt: string;
  updatedAt: string;
  // Role of this browser's user for this trip. Undefined = locally created = admin.
  // Set when a trip arrives via a share link, from the link's permission level.
  myRole?: TripRole;
}
