// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActivityModal } from './ActivityModal';
import { I18nProvider } from '../utils/i18n';
import type { ActivityItem, Trip } from '../types/travel';

/**
 * The "to the next stop" fields. What matters is the round trip: a hop typed
 * here comes out of Save in the shape the line between two activities reads,
 * and an edit that never touched it does not quietly throw it away — which is
 * what this form used to do, because it rebuilt the activity field by field
 * and the hop was not one of the fields.
 */

const trip = {
  id: 'trip-1',
  title: 'Bangkok',
  destination: 'Bangkok',
  country: 'Thailand',
  startDate: '2026-11-05',
  endDate: '2026-11-05',
  coverImage: '',
  currency: 'THB',
  homeCurrency: 'MYR',
  exchangeRate: 8,
  travelers: [],
  days: [{ id: 'd1', dayNumber: 1, dateString: '2026-11-05', dayOfWeek: 'Thursday (Nov 5)', title: '', activities: [] }],
  expenses: [],
  createdAt: '',
  updatedAt: ''
} as Trip;

const van: ActivityItem = {
  id: 'act-van',
  time: '09:00',
  title: '包车往合艾机场',
  category: 'transport',
  locationName: 'Hat Yai International Airport',
  transportToNext: { mode: 'taxi', durationMin: 60, note: '包车直达', costHint: '~1,500 THB' }
};

const renderModal = (activityToEdit: ActivityItem | null = null) => {
  const onSave = vi.fn();
  render(
    <I18nProvider>
      <ActivityModal
        isOpen
        onClose={() => {}}
        onSave={onSave}
        activityToEdit={activityToEdit}
        currentDayId="d1"
        trip={trip}
      />
    </I18nProvider>
  );
  return { onSave, saved: () => onSave.mock.calls[0][1] as ActivityItem };
};

afterEach(cleanup);

describe('ActivityModal — the hop to the next stop', () => {
  it('asks for a travel time only once there is a way of getting there', async () => {
    renderModal();
    expect(screen.queryByLabelText('路上要多久（分钟）')).not.toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText(/怎么去下一站/), 'train');
    expect(screen.getByLabelText('路上要多久（分钟）')).toBeInTheDocument();
  });

  it('saves the hop typed on a new activity', async () => {
    const { onSave, saved } = renderModal();
    await userEvent.type(screen.getByLabelText(/活动名称/), 'KTM Komuter');
    await userEvent.selectOptions(screen.getByLabelText(/怎么去下一站/), 'train');
    await userEvent.type(screen.getByLabelText('路上要多久（分钟）'), '100');
    await userEvent.type(screen.getByLabelText('路线备注'), ' 08:46 到 ');
    await userEvent.click(screen.getByRole('button', { name: '添加活动' }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(saved().transportToNext).toEqual({ mode: 'train', durationMin: 100, note: '08:46 到' });
  });

  it('keeps the hop when an activity is edited without touching it', async () => {
    const { saved } = renderModal(van);
    await userEvent.click(screen.getByRole('button', { name: '保存修改' }));
    // costHint has no field here, so it must ride through untouched too
    expect(saved().transportToNext).toEqual(van.transportToNext);
  });

  it('drops the hop when it is set back to not set', async () => {
    const { saved } = renderModal(van);
    await userEvent.selectOptions(screen.getByLabelText(/怎么去下一站/), '');
    await userEvent.click(screen.getByRole('button', { name: '保存修改' }));
    expect(saved().transportToNext).toBeUndefined();
  });

  it('saves nothing when a way of getting there has no travel time', async () => {
    const { onSave } = renderModal();
    await userEvent.type(screen.getByLabelText(/活动名称/), 'Walk over');
    await userEvent.selectOptions(screen.getByLabelText(/怎么去下一站/), 'walk');
    await userEvent.click(screen.getByRole('button', { name: '添加活动' }));
    expect(onSave).not.toHaveBeenCalled();
  });
});
