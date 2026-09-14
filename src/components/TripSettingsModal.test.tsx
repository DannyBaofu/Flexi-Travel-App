// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TripSettingsModal } from './TripSettingsModal';
import { I18nProvider } from '../utils/i18n';
import type { Trip } from '../types/travel';

/**
 * The flights section of the organiser's form. What matters is the round
 * trip: a flight typed here comes out of Save in the shape the card reads,
 * with the date already pointing at the right end of the trip so the
 * organiser only has to fill in what the ticket says.
 */

const trip = (over: Partial<Trip> = {}): Trip =>
  ({
    id: 'trip-1',
    title: 'Tokyo',
    destination: 'Tokyo',
    country: 'Japan',
    startDate: '2026-11-17',
    endDate: '2026-11-24',
    coverImage: '',
    currency: 'JPY',
    homeCurrency: 'MYR',
    exchangeRate: 33,
    travelers: [{ id: 't1', name: 'Danny', avatarColor: '#3930DB', isOwner: true, role: 'admin' }],
    days: [],
    expenses: [],
    ideas: [],
    flights: { outbound: { legs: [] }, inbound: { legs: [] } },
    createdAt: '',
    updatedAt: '',
    myRole: 'admin',
    ...over
  }) as Trip;

const renderSettings = (over: Partial<Trip> = {}) => {
  const onSave = vi.fn();
  render(
    <I18nProvider>
      <TripSettingsModal
        isOpen
        onClose={() => {}}
        trip={trip(over)}
        role="admin"
        cloudMode={false}
        onSave={onSave}
        onDeleteTrip={() => {}}
      />
    </I18nProvider>
  );
  return { onSave };
};

afterEach(cleanup);

describe('Trip Settings — flights', () => {
  it('starts with no flights and one add button per direction', () => {
    renderSettings();
    expect(screen.getAllByRole('button', { name: '添加航班' })).toHaveLength(2);
    expect(screen.queryByLabelText('航班号')).not.toBeInTheDocument();
  });

  it('dates a new outbound flight on the trip’s first day and a return on its last', async () => {
    renderSettings();
    const [addOut, addBack] = screen.getAllByRole('button', { name: '添加航班' });
    await userEvent.click(addOut);
    await userEvent.click(addBack);
    const dates = screen.getAllByLabelText('日期') as HTMLInputElement[];
    expect(dates.map(d => d.value)).toEqual(['2026-11-17', '2026-11-24']);
  });

  it('saves what was typed, capitalised and trimmed, in the shape the card reads', async () => {
    const { onSave } = renderSettings();
    await userEvent.click(screen.getAllByRole('button', { name: '添加航班' })[0]);

    await userEvent.type(screen.getByLabelText('航班号'), ' sq 131 ');
    await userEvent.type(screen.getByLabelText('出发地'), 'PEN');
    await userEvent.type(screen.getByLabelText('目的地'), 'SIN');
    await userEvent.type(screen.getByLabelText('起飞时间'), '10:15');
    await userEvent.type(screen.getByLabelText('到达时间'), '11:45');
    await userEvent.type(screen.getAllByLabelText('集合提醒（可选）')[0], '07:00 在值机柜台集合');
    await userEvent.type(screen.getByLabelText('航空公司（可选）'), 'Singapore Airlines');

    await userEvent.click(screen.getByRole('button', { name: '保存设置' }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const saved = onSave.mock.calls[0][0] as Trip;
    expect(saved.flights).toEqual({
      airline: 'Singapore Airlines',
      outbound: {
        note: '07:00 在值机柜台集合',
        legs: [
          expect.objectContaining({
            flightNo: 'SQ 131',
            from: 'PEN',
            to: 'SIN',
            date: '2026-11-17',
            departTime: '10:15',
            arriveTime: '11:45'
          })
        ]
      },
      inbound: { legs: [] }
    });
  });

  it('drops a flight that was added and left blank rather than saving an empty row', async () => {
    const { onSave } = renderSettings();
    await userEvent.click(screen.getAllByRole('button', { name: '添加航班' })[0]);
    await userEvent.click(screen.getByRole('button', { name: '保存设置' }));
    const saved = onSave.mock.calls[0][0] as Trip;
    expect(saved.flights?.outbound.legs).toEqual([]);
  });

  it('removes a flight with the cross on its card', async () => {
    renderSettings({
      flights: {
        outbound: {
          legs: [
            { id: 'l1', flightNo: 'SQ 131', from: 'PEN', to: 'SIN', date: '2026-11-17', departTime: '10:15', arriveTime: '11:45' },
            { id: 'l2', flightNo: 'SQ 634', from: 'SIN', to: 'HND', date: '2026-11-17', departTime: '12:40', arriveTime: '21:55' }
          ]
        },
        inbound: { legs: [] }
      }
    });
    const first = screen.getByText('第 1 段').closest('div')!.parentElement!;
    await userEvent.click(within(first).getByRole('button', { name: '删除这段航班' }));
    const numbers = screen.getAllByLabelText('航班号') as HTMLInputElement[];
    expect(numbers.map(n => n.value)).toEqual(['SQ 634']);
  });
});
