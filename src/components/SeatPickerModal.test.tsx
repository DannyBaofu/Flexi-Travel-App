// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SeatPickerModal } from './SeatPickerModal';
import { I18nProvider } from '../utils/i18n';
import type { TripSeat } from '../types/travel';

/**
 * This modal is the whole join flow, and the thing it must never get wrong is
 * letting somebody take a name that is already somebody else's.
 */

const seat = (over: Partial<TripSeat> = {}): TripSeat => ({
  travelerId: 't1',
  name: 'Danny',
  avatarColor: '#3930DB',
  role: 'member',
  claimed: false,
  mine: false,
  ...over
});

const renderPicker = (seats: TripSeat[], over: { busySeatId?: string | null } = {}) => {
  const onPick = vi.fn();
  const onCancel = vi.fn();
  render(
    <I18nProvider>
      <SeatPickerModal
        isOpen
        tripTitle="Bangkok"
        seats={seats}
        busySeatId={over.busySeatId ?? null}
        error={null}
        onPick={onPick}
        onCancel={onCancel}
      />
    </I18nProvider>
  );
  return { onPick, onCancel };
};

const seatButton = (name: string) =>
  screen.getByText(name).closest('button') as HTMLButtonElement;

beforeEach(() => {
  // Chinese is the app default; pin English so these assertions read as the
  // behaviour they are checking rather than as translated strings.
  localStorage.clear();
  localStorage.setItem('travelsync-lang', 'en');
});

// Testing Library only auto-cleans with vitest globals, which are off here.
afterEach(cleanup);

describe('SeatPickerModal', () => {
  it('claims the name that was tapped', async () => {
    const { onPick } = renderPicker([
      seat(),
      seat({ travelerId: 't2', name: 'Wei Ming' })
    ]);

    await userEvent.click(seatButton('Wei Ming'));
    expect(onPick).toHaveBeenCalledWith('t2');
  });

  it('will not hand over a name somebody else already holds', () => {
    renderPicker([seat({ travelerId: 't2', name: 'Wei Ming', claimed: true })]);
    expect(seatButton('Wei Ming').disabled).toBe(true);
  });

  it('still shows a taken name, so a latecomer can see it was taken', () => {
    renderPicker([seat({ name: 'Danny', claimed: true })]);
    expect(screen.getByText('Danny')).toBeTruthy();
    expect(screen.getByText('Taken')).toBeTruthy();
  });

  it('lets you carry on with the seat you already hold', async () => {
    const { onPick } = renderPicker([
      seat({ travelerId: 't3', name: 'Ah Fong', claimed: true, mine: true })
    ]);

    expect(seatButton('Ah Fong').disabled).toBe(false);
    await userEvent.click(seatButton('Ah Fong'));
    expect(onPick).toHaveBeenCalledWith('t3');
  });

  it('explains an empty roster instead of showing a blank list', () => {
    renderPicker([]);
    expect(screen.getByText(/has not added any names/i)).toBeTruthy();
  });

  it('takes no second tap while a claim is in flight', () => {
    renderPicker(
      [seat(), seat({ travelerId: 't2', name: 'Wei Ming' })],
      { busySeatId: 't1' }
    );

    expect(seatButton('Wei Ming').disabled).toBe(true);
  });

  it('does not announce what each seat grants — that is between them and the organiser', () => {
    renderPicker([
      seat({ name: 'Danny', role: 'member' }),
      seat({ travelerId: 't2', name: 'Grandma', role: 'viewer' })
    ]);

    expect(screen.queryByText('Can edit')).toBeNull();
    expect(screen.queryByText('View only')).toBeNull();
  });
});
