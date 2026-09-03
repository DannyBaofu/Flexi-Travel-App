import { describe, it, expect, beforeEach } from 'vitest';
import {
  normalizeId,
  isValidId,
  idToEmail,
  emailToId,
  normalizeInviteCode,
  buildInviteUrl,
  parseJoinCodeFromUrl,
  mergeSeats
} from './cloudSync';
import type { Traveler, SeatClaim } from '../types/travel';

describe('account IDs', () => {
  it('lowercases and trims what the traveller typed', () => {
    expect(normalizeId('  Danny  ')).toBe('danny');
    expect(idToEmail(' Danny ')).toBe('danny@travellor.app');
  });

  it('accepts the shapes an organizer would hand out', () => {
    expect(isValidId('danny')).toBe(true);
    expect(isValidId('poh.hock')).toBe(true);
    expect(isValidId('friend_02')).toBe(true);
    expect(isValidId('AhMing')).toBe(true); // normalized before checking
  });

  it('rejects IDs that would break the email mapping', () => {
    expect(isValidId('ab')).toBe(false); // too short
    expect(isValidId('a'.repeat(21))).toBe(false); // too long
    expect(isValidId('has space')).toBe(false);
    expect(isValidId('has@at')).toBe(false);
    expect(isValidId('_leading')).toBe(false);
    expect(isValidId('')).toBe(false);
  });

  it('round-trips an ID through the internal email and back', () => {
    expect(emailToId(idToEmail('danny'))).toBe('danny');
  });

  it('leaves a genuine outside email alone', () => {
    expect(emailToId('someone@gmail.com')).toBe('someone@gmail.com');
    expect(emailToId(null)).toBe('');
    expect(emailToId(undefined)).toBe('');
  });
});

// Minimal window.location so these tests run without a DOM
const location = { origin: 'https://travellor.vercel.app', pathname: '/', hash: '' };
(globalThis as unknown as { window: { location: typeof location } }).window = { location };

function setLocation(pathname: string, hash = '') {
  location.pathname = pathname;
  location.hash = hash;
}

describe('invite links', () => {
  beforeEach(() => setLocation('/'));

  it('builds a short path-style link, not a hash link', () => {
    const url = buildInviteUrl('AB3F7K');
    expect(url).toBe('https://travellor.vercel.app/j/AB3F7K');
    // The whole point of the change: this has to stay tiny enough for a QR code.
    expect(url.length).toBeLessThan(50);
  });

  it('reads the code back off the invite path', () => {
    setLocation('/j/AB3F7K');
    expect(parseJoinCodeFromUrl()).toBe('AB3F7K');
  });

  it('tolerates a trailing slash and lowercase typing', () => {
    setLocation('/j/ab3f7k/');
    expect(parseJoinCodeFromUrl()).toBe('AB3F7K');
  });

  it('still honours invite links already sent out with #join=', () => {
    setLocation('/', '#join=AB3F7K');
    expect(parseJoinCodeFromUrl()).toBe('AB3F7K');
  });

  it('does not mistake an ordinary page or a snapshot link for an invite', () => {
    setLocation('/');
    expect(parseJoinCodeFromUrl()).toBeNull();

    setLocation('/', '#share=N4IgxgrgtgpgLg');
    expect(parseJoinCodeFromUrl()).toBeNull();

    setLocation('/j/');
    expect(parseJoinCodeFromUrl()).toBeNull();

    setLocation('/journal/entry');
    expect(parseJoinCodeFromUrl()).toBeNull();
  });

  it('normalizes a code a friend typed by hand', () => {
    expect(normalizeInviteCode(' ab3f7k ')).toBe('AB3F7K');
  });
});

describe('mergeSeats', () => {
  const roster: Traveler[] = [
    { id: 't1', name: 'Danny', avatarColor: '#3930DB', role: 'admin' },
    { id: 't2', name: 'Wei Ming', avatarColor: '#B42318', role: 'viewer' },
    { id: 't3', name: 'Ah Fong', avatarColor: '#0F766E' }
  ];

  it('marks a seat taken, and says which one is mine', () => {
    const claims: SeatClaim[] = [
      { travelerId: 't1', role: 'admin', isMe: true },
      { travelerId: 't2', role: 'member', isMe: false }
    ];
    const seats = mergeSeats(roster, claims);

    expect(seats.map(s => s.claimed)).toEqual([true, true, false]);
    expect(seats.map(s => s.mine)).toEqual([true, false, false]);
  });

  it('reports the role the server enforces, not the one the document intends', () => {
    // t2's seat says 'viewer', but whoever holds it was promoted to member.
    // Showing the document's intention here would tell an admin they had
    // restricted somebody they had not.
    const seats = mergeSeats(roster, [{ travelerId: 't2', role: 'member', isMe: false }]);
    expect(seats.find(s => s.travelerId === 't2')!.role).toBe('member');
  });

  it('falls back to the seat, then to member, when nobody holds it', () => {
    const seats = mergeSeats(roster, []);
    expect(seats.find(s => s.travelerId === 't2')!.role).toBe('viewer');
    // No role on the traveller at all — an older trip, before seats existed.
    expect(seats.find(s => s.travelerId === 't3')!.role).toBe('member');
  });

  it('survives a trip with no travellers rather than throwing', () => {
    expect(mergeSeats([], [])).toEqual([]);
  });
});
