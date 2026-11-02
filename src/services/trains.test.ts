import { describe, it, expect } from 'vitest';
import { emptyTrains, hasTrainInfo, tidyTrains } from './trains';
import type { TrainLeg } from '../types/travel';

const leg = (over: Partial<TrainLeg> = {}): TrainLeg => ({
  id: 'train-1',
  trainNo: 'ETS 9421',
  from: 'KL Sentral',
  to: 'Padang Besar',
  date: '2026-11-17',
  departTime: '08:00',
  arriveTime: '13:35',
  ...over
});

describe('hasTrainInfo', () => {
  it('is false for nothing, and for the empty shape a backfilled trip carries', () => {
    expect(hasTrainInfo(undefined)).toBe(false);
    expect(hasTrainInfo(emptyTrains())).toBe(false);
  });

  it('is true for a train in either direction', () => {
    expect(hasTrainInfo({ outbound: { legs: [leg()] }, inbound: { legs: [] } })).toBe(true);
    expect(hasTrainInfo({ outbound: { legs: [] }, inbound: { legs: [leg()] } })).toBe(true);
  });

  it('counts a meeting note on its own', () => {
    expect(
      hasTrainInfo({ outbound: { legs: [], note: '07:30 at KL Sentral' }, inbound: { legs: [] } })
    ).toBe(true);
  });

  it('ignores an operator name with nothing under it', () => {
    expect(hasTrainInfo({ ...emptyTrains(), operator: 'KTM ETS' })).toBe(false);
  });
});

describe('tidyTrains', () => {
  it('drops a train that was added and never filled in', () => {
    const tidy = tidyTrains({
      outbound: { legs: [leg(), leg({ id: 'train-2', trainNo: '', from: '', to: '', departTime: '', arriveTime: '' })] },
      inbound: { legs: [] }
    });
    expect(tidy.outbound.legs.map(l => l.id)).toEqual(['train-1']);
  });

  it('trims every field but keeps the train number as typed, not in capitals', () => {
    const tidy = tidyTrains({
      operator: '  SRT ',
      outbound: { legs: [leg({ trainNo: ' Special Express 46 ', from: ' Padang Besar ', to: 'Bangkok ' })], note: ' ' },
      inbound: { legs: [] }
    });
    expect(tidy.operator).toBe('SRT');
    expect(tidy.outbound.legs[0]).toMatchObject({
      trainNo: 'Special Express 46',
      from: 'Padang Besar',
      to: 'Bangkok'
    });
    expect(tidy.outbound).not.toHaveProperty('note');
  });

  it('leaves no operator key behind when the field was cleared', () => {
    expect(tidyTrains({ ...emptyTrains(), operator: '   ' })).not.toHaveProperty('operator');
  });
});
