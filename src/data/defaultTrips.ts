import type { Trip } from '../types/travel';
import { buildDays } from '../services/tripDays';

export function createNewTrip(
  title: string,
  destination: string,
  country: string,
  startDate: string,
  endDate: string,
  currency: string = 'USD'
): Trip {
  // Day generation lives in tripDays.ts so that creating a trip and editing its
  // dates later build days exactly the same way.
  const days = buildDays(startDate, endDate);

  return {
    id: `trip-${Date.now()}`,
    title,
    destination,
    country,
    startDate,
    endDate,
    coverImage: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1600&q=80',
    currency,
    homeCurrency: 'MYR',
    exchangeRate: 1,
    travelers: [
      { id: 't1', name: 'You (Organizer)', avatarColor: '#3930DB', isOwner: true }
    ],
    shareSettings: {
      isPublic: true,
      isPasswordProtected: false,
      allowGuestEdits: true
    },
    days,
    expenses: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

// No seeded trips: a fresh browser starts empty and the user creates the first trip.
export const initialTrips: Trip[] = [];
