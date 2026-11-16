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

describe('ActivityModal — the English copy', () => {
  const translated: ActivityItem = {
    ...van,
    notes: '司机在车站出口等',
    translationEn: { title: 'Van to Hat Yai Airport', notes: 'The driver waits at the station exit', transportNote: 'Straight to the airport' }
  };

  it('keeps the English folded away until asked for', async () => {
    renderModal();
    expect(screen.queryByLabelText('英文名称')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /英文版/ }));
    expect(screen.getByLabelText('英文名称')).toBeInTheDocument();
  });

  it('saves English typed alongside a new activity', async () => {
    const { saved } = renderModal();
    await userEvent.type(screen.getByLabelText(/活动名称/), '唐人街晚餐');
    await userEvent.selectOptions(screen.getByLabelText(/怎么去下一站/), 'taxi');
    await userEvent.type(screen.getByLabelText('路上要多久（分钟）'), '15');
    await userEvent.type(screen.getByLabelText('路线备注'), '叫 Grab');
    await userEvent.click(screen.getByRole('button', { name: /英文版/ }));
    await userEvent.type(screen.getByLabelText('英文名称'), 'Chinatown dinner');
    await userEvent.type(screen.getByLabelText('英文路线备注'), 'Book a Grab');
    await userEvent.click(screen.getByRole('button', { name: '添加活动' }));
    expect(saved().translationEn).toEqual({ title: 'Chinatown dinner', transportNote: 'Book a Grab' });
  });

  it('opens with the English showing when there is some, and keeps it through an untouched edit', async () => {
    const { saved } = renderModal(translated);
    expect(screen.getByLabelText('英文名称')).toHaveValue('Van to Hat Yai Airport');
    await userEvent.click(screen.getByRole('button', { name: '保存修改' }));
    expect(saved().translationEn).toEqual(translated.translationEn);
  });

  /** A translation of text that is gone is worse than showing the Chinese. */
  it('drops the English for whatever Chinese was rewritten, and only that', async () => {
    const { saved } = renderModal(translated);
    const title = screen.getByLabelText(/活动名称/);
    await userEvent.clear(title);
    await userEvent.type(title, '包车去合艾机场（改）');
    await userEvent.click(screen.getByRole('button', { name: '保存修改' }));
    expect(saved().translationEn).toEqual({
      notes: 'The driver waits at the station exit',
      transportNote: 'Straight to the airport'
    });
  });

  it('keeps English rewritten in the same edit as its Chinese', async () => {
    const { saved } = renderModal(translated);
    const title = screen.getByLabelText(/活动名称/);
    await userEvent.clear(title);
    await userEvent.type(title, '包车去机场');
    const english = screen.getByLabelText('英文名称');
    await userEvent.clear(english);
    await userEvent.type(english, 'Van to the airport');
    await userEvent.click(screen.getByRole('button', { name: '保存修改' }));
    expect(saved().translationEn?.title).toBe('Van to the airport');
  });

  it('drops the English route note along with the hop', async () => {
    const { saved } = renderModal(translated);
    await userEvent.selectOptions(screen.getByLabelText(/怎么去下一站/), '');
    await userEvent.click(screen.getByRole('button', { name: '保存修改' }));
    expect(saved().translationEn?.transportNote).toBeUndefined();
    expect(saved().translationEn?.title).toBe('Van to Hat Yai Airport');
  });
});

describe('ActivityModal — a side stop', () => {
  it('saves a new activity as a main stop unless the box is ticked', async () => {
    const { onSave } = renderModal();
    await userEvent.type(screen.getByLabelText(/活动名称|Activity/), '增上寺');
    await userEvent.click(screen.getByRole('button', { name: /添加活动/ }));
    expect(onSave.mock.calls[0][1].side).toBeUndefined();
  });

  it('saves the tick, and shows it again when the activity is edited', async () => {
    const { onSave } = renderModal({ ...van, side: true });
    const box = screen.getByRole('checkbox');
    expect((box as HTMLInputElement).checked).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: /保存/ }));
    expect(onSave.mock.calls[0][1].side).toBe(true);
  });

  it('saves a tick made on a new activity', async () => {
    const { onSave } = renderModal();
    await userEvent.type(screen.getByLabelText(/活动名称|Activity/), '御朱印');
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: /添加活动/ }));
    expect(onSave.mock.calls[0][1].side).toBe(true);
  });
});
