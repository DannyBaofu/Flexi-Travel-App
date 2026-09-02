import type { Trip } from '../types/travel';

export function createNewTrip(title: string, destination: string, country: string, startDate: string, endDate: string, currency: string = 'USD'): Trip {
  // Parse date components explicitly to avoid the UTC-midnight shift of
  // new Date('YYYY-MM-DD') pushing dates a day off in some timezones.
  const parseLocalDate = (iso: string): Date | null => {
    const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(iso);
    if (!match) return null;
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  };
  const validStart = parseLocalDate(startDate);
  const validEnd = parseLocalDate(endDate);
  const start = validStart || new Date();
  let numDays = 3;
  if (validStart && validEnd) {
    const diffTime = Math.abs(validEnd.getTime() - validStart.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    numDays = diffDays < 1 ? 3 : Math.min(diffDays, 30);
  }

  const pad = (n: number) => String(n).padStart(2, '0');

  const days = Array.from({ length: numDays }, (_, i) => {
    const current = new Date(start);
    current.setDate(start.getDate() + i);
    const dayStr = current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const weekday = current.toLocaleDateString('en-US', { weekday: 'long' });

    return {
      id: `day-${i + 1}-${Date.now()}`,
      dayNumber: i + 1,
      dateString: `${current.getFullYear()}-${pad(current.getMonth() + 1)}-${pad(current.getDate())}`,
      dayOfWeek: `${weekday} (${dayStr})`,
      title: '',
      activities: []
    };
  });

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
