import { describe, it, expect } from 'vitest';
import { mergeRemoteTrip } from './mergeTrip';
import type { ExpenseItem, Trip } from '../types/travel';

const expense = (id: string, amount = 100): ExpenseItem => ({
  id,
  title: id,
  amount,
  currency: 'THB',
  category: 'food',
  date: '2026-09-01',
  paidByTravelerId: 't1',
  splitWithTravelerIds: ['t1', 't2']
});

const trip = (over: Partial<Trip> = {}): Trip =>
  ({
    id: 'trip',
    title: 'Trip',
    destination: 'Bangkok',
    country: 'Thailand',
    startDate: '2026-09-01',
    endDate: '2026-09-03',
    coverImage: '',
    currency: 'THB',
    homeCurrency: 'MYR',
    exchangeRate: 8,
    travelers: [{ id: 't1', name: 'A', avatarColor: '#000' }],
    days: [],
    expenses: [],
    shareSettings: { isPublic: false, isPasswordProtected: false, allowGuestEdits: false },
    createdAt: '',
    updatedAt: '',
    ...over
  }) as Trip;

describe('mergeRemoteTrip', () => {
  it('keeps an expense that never reached the server', () => {
    const local = trip({ expenses: [expense('mine'), expense('shared')] });
    const remote = trip({ expenses: [expense('shared'), expense('theirs')] });

    const merged = mergeRemoteTrip(local, remote);
    const ids = merged.expenses.map(e => e.id).sort();
    expect(ids).toEqual(['mine', 'shared', 'theirs']);
  });

  it('takes the remote version of an expense they both have', () => {
    const local = trip({ expenses: [expense('same', 100)] });
    const remote = trip({ expenses: [expense('same', 250)] });

    const merged = mergeRemoteTrip(local, remote);
    expect(merged.expenses).toHaveLength(1);
    expect(merged.expenses[0].amount).toBe(250);
  });

  it('keeps an unsent activity inside an existing day', () => {
    const act = (id: string) => ({
      id, time: '10:00', title: id, category: 'food' as const, locationName: id
    });
    const local = trip({ days: [{ id: 'd1', dayNumber: 1, dateString: '', dayOfWeek: '', title: '', activities: [act('mine'), act('shared')] }] });
    const remote = trip({ days: [{ id: 'd1', dayNumber: 1, dateString: '', dayOfWeek: '', title: '', activities: [act('shared')] }] });

    const merged = mergeRemoteTrip(local, remote);
    expect(merged.days[0].activities.map(a => a.id).sort()).toEqual(['mine', 'shared']);
  });

  it('keeps a day this browser added that the server has not seen', () => {
    const local = trip({ days: [
      { id: 'd1', dayNumber: 1, dateString: '', dayOfWeek: '', title: '', activities: [] },
      { id: 'd2', dayNumber: 2, dateString: '', dayOfWeek: '', title: 'new', activities: [] }
    ] });
    const remote = trip({ days: [
      { id: 'd1', dayNumber: 1, dateString: '', dayOfWeek: '', title: '', activities: [] }
    ] });

    const merged = mergeRemoteTrip(local, remote);
    expect(merged.days.map(d => d.id)).toEqual(['d1', 'd2']);
  });

  it('takes the rest of the trip from the remote copy', () => {
    const local = trip({ title: 'Old name', exchangeRate: 8 });
    const remote = trip({ title: 'Renamed', exchangeRate: 9 });

    const merged = mergeRemoteTrip(local, remote);
    expect(merged.title).toBe('Renamed');
    expect(merged.exchangeRate).toBe(9);
  });

  it('never lets myRole travel in from the remote copy', () => {
    const local = trip({ myRole: 'member' });
    const remote = trip({ myRole: 'admin' });

    expect(mergeRemoteTrip(local, remote).myRole).toBe('member');
  });
});
