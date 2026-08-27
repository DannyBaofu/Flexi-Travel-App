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
}
