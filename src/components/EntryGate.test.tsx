// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EntryGate } from './EntryGate';
import { I18nProvider } from '../utils/i18n';

/**
 * This screen is the app's front door, and the thing it must not get wrong is
 * offering to start a trip to somebody who is not the organiser. That is how a
 * friend sent the bare domain ended up admin of an empty trip, looking to
 * everyone like they had been handed the keys to the real one.
 */

const renderGate = (over: Partial<React.ComponentProps<typeof EntryGate>> = {}) => {
  const props = {
    code: '',
    onCodeChange: vi.fn(),
    onSubmitCode: vi.fn((e: React.FormEvent) => e.preventDefault()),
    error: null,
    joining: false,
    isOrganiser: false,
    cloudEnabled: true,
    signedIn: false,
    onCreateTrip: vi.fn(),
    onSignIn: vi.fn(),
    onSignOut: vi.fn(),
    ...over
  };
  render(
    <I18nProvider>
      <EntryGate {...props} />
    </I18nProvider>
  );
  return props;
};

const createButton = () => screen.queryByRole('button', { name: /create your first trip/i });
const joinButton = () => screen.getByRole('button', { name: /join trip/i });

beforeEach(() => {
  // Chinese is the app default; pin English so these assertions read as the
  // behaviour they are checking rather than as translated strings.
  localStorage.clear();
  localStorage.setItem('travelsync-lang', 'en');
});

// Testing Library only auto-cleans with vitest globals, which are off here.
afterEach(cleanup);

describe('EntryGate — the visitor', () => {
  it('offers no way to start a trip', () => {
    renderGate();
    expect(createButton()).toBeNull();
  });

  it('asks for a code and nothing else', () => {
    renderGate();
    expect(screen.getByLabelText(/invite code/i)).toBeTruthy();
    expect(joinButton()).toBeTruthy();
  });

  it('reveals nothing about the trip before the code is right', () => {
    // The roster and the trip title come back from invite_roster, which needs
    // the code. Nothing on this screen should pre-empt that.
    renderGate();
    expect(screen.queryByText(/roster|traveller|travelers/i)).toBeNull();
  });

  it('points an organiser at their own door', async () => {
    const props = renderGate();
    await userEvent.click(screen.getByRole('button', { name: /sign in and create a trip/i }));
    expect(props.onSignIn).toHaveBeenCalled();
  });

  it('will not submit an empty code', () => {
    renderGate({ code: '   ' });
    expect(joinButton()).toHaveProperty('disabled', true);
  });

  it('submits the code that was typed', async () => {
    const props = renderGate({ code: 'AB3F7K' });
    await userEvent.click(joinButton());
    expect(props.onSubmitCode).toHaveBeenCalled();
  });

  it('shows why a code did not work', () => {
    renderGate({ error: 'That invite link is not valid any more.' });
    expect(screen.getByText(/not valid any more/i)).toBeTruthy();
  });
});

describe('EntryGate — a guest who opened an invite link', () => {
  it('still gets no create button once signed in anonymously', () => {
    // App passes isOrganiser=false for an anonymous account. Signed in is not
    // the same as being the organiser, and this is the case that caused the
    // original confusion.
    renderGate({ signedIn: true, isOrganiser: false });
    expect(createButton()).toBeNull();
  });
});

describe('EntryGate — the organiser', () => {
  it('gets the create button', () => {
    renderGate({ isOrganiser: true, signedIn: true });
    expect(createButton()).toBeTruthy();
  });

  it('can still join somebody else’s trip by code', () => {
    renderGate({ isOrganiser: true, signedIn: true });
    expect(joinButton()).toBeTruthy();
  });

  it('keeps one primary button: create, with join beside it as secondary', () => {
    renderGate({ isOrganiser: true, signedIn: true });
    expect(createButton()!.className).toContain('bg-brand');
    expect(joinButton().className).not.toContain('bg-brand');
  });

  it('offers the way out rather than the way in', async () => {
    const props = renderGate({ isOrganiser: true, signedIn: true });
    expect(screen.queryByRole('button', { name: /sign in and create a trip/i })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /sign out/i }));
    expect(props.onSignOut).toHaveBeenCalled();
  });
});

describe('EntryGate — a build with no cloud backend', () => {
  it('offers the create button, because local trips are all it can do', () => {
    // isCloudEnabled folds to false without the Supabase keys, and App passes
    // isOrganiser=true there. Hiding the button would leave nothing behind it.
    renderGate({ isOrganiser: true, cloudEnabled: false, signedIn: false });
    expect(createButton()).toBeTruthy();
  });

  it('offers no sign-in, because there is nothing to sign in to', () => {
    renderGate({ isOrganiser: true, cloudEnabled: false, signedIn: false });
    expect(screen.queryByRole('button', { name: /sign in/i })).toBeNull();
  });
});
