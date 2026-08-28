import type { Trip } from '../types/travel';
import { bangkokDefaultTrip } from './bangkokTrip';

export function createNewTrip(title: string, destination: string, country: string, startDate: string, endDate: string, currency: string = 'USD'): Trip {
  // Parse date components explicitly to avoid the UTC-midnight shift of
  // new Date('YYYY-MM-DD') pushing dates a day off in some timezones.
  const parseLocalDate = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y || 2026, (m || 1) - 1, d || 1);
  };
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  const numDays = isNaN(diffDays) || diffDays < 1 ? 3 : Math.min(diffDays, 30);

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
      title: i === 0 ? 'Arrival & Exploration' : i === numDays - 1 ? 'Departure' : `Day ${i + 1} Adventure`,
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
    homeCurrency: 'USD',
    exchangeRate: 1,
    travelers: [
      { id: 't1', name: 'You (Organizer)', avatarColor: '#10b981', isOwner: true }
    ],
    shareSettings: {
      isPublic: true,
      isPasswordProtected: false,
      allowGuestEdits: true
    },
    days,
    expenses: [],
    checklist: [
      { id: 'c-1', category: 'Documents & Money', title: 'Passport (valid > 6 months)', completed: false },
      { id: 'c-2', category: 'Documents & Money', title: 'Flight tickets & boarding passes', completed: false },
      { id: 'c-3', category: 'Documents & Money', title: 'Hotel booking confirmations', completed: false },
      { id: 'c-4', category: 'Electronics', title: 'Phone charger & portable power bank', completed: false },
      { id: 'c-5', category: 'Clothes', title: 'Appropriate travel clothing & comfortable shoes', completed: false }
    ],
    taxiCards: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export const initialTrips: Trip[] = [bangkokDefaultTrip];
