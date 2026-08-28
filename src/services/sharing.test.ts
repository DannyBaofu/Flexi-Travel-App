import { describe, it, expect } from 'vitest';
import { resolveShareRole, hashPin, type SharePayload } from './sharing';
import type { Trip } from '../types/travel';

const dummyTrip = { id: 't1' } as Trip;

function payload(overrides: Partial<SharePayload>): SharePayload {
  return {
    version: 2,
    trip: dummyTrip,
    readOnly: false,
    requiresPin: false,
    createdAt: new Date().toISOString(),
    ...overrides
  };
}

describe('resolveShareRole', () => {
  it('honors an explicit role on v2 links', () => {
    expect(resolveShareRole(payload({ role: 'admin' }))).toBe('admin');
    expect(resolveShareRole(payload({ role: 'member' }))).toBe('member');
    expect(resolveShareRole(payload({ role: 'viewer' }))).toBe('viewer');
  });

  it('maps legacy read-only links to viewer', () => {
    expect(resolveShareRole(payload({ role: undefined, readOnly: true }))).toBe('viewer');
  });

  it('maps legacy collaborative links to member, never admin', () => {
    expect(resolveShareRole(payload({ role: undefined, readOnly: false }))).toBe('member');
  });

  it('ignores garbage role values', () => {
    expect(resolveShareRole(payload({ role: 'owner' as never, readOnly: true }))).toBe('viewer');
  });
});

describe('hashPin', () => {
  it('is deterministic for the same pin', () => {
    expect(hashPin('2026')).toBe(hashPin('2026'));
  });

  it('differs for different pins', () => {
    expect(hashPin('2026')).not.toBe(hashPin('2027'));
  });
});
