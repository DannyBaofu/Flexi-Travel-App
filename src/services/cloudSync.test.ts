import { describe, it, expect, beforeEach } from 'vitest';
import {
  normalizeId,
  isValidId,
  idToEmail,
  emailToId,
  normalizeInviteCode,
  buildInviteUrl,
  parseJoinCodeFromUrl
} from './cloudSync';

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
