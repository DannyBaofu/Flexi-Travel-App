import { describe, it, expect } from 'vitest';
import { describePlace, mapsUrlFor } from './placeSearch';

describe('describePlace', () => {
  it('leads with the venue name and puts the address underneath', () => {
    const place = describePlace({
      geometry: { coordinates: [100.4917, 13.7563] },
      properties: {
        name: 'Krua Apsorn',
        housenumber: '169',
        street: 'Dinso Road',
        city: 'Bangkok',
        country: 'Thailand',
        osm_type: 'N',
        osm_id: 1
      }
    });
    expect(place?.name).toBe('Krua Apsorn');
    expect(place?.address).toBe('169 Dinso Road, Bangkok, Thailand');
    expect(place?.lat).toBe(13.7563);
    expect(place?.lon).toBe(100.4917);
  });

  it('falls back to the street when a result has no name', () => {
    const place = describePlace({
      geometry: { coordinates: [100.5, 13.75] },
      properties: { housenumber: '9', street: 'Rama I Road', city: 'Bangkok' }
    });
    expect(place?.name).toBe('9 Rama I Road');
    expect(place?.address).toBe('Bangkok');
  });

  it('never repeats the name inside the address line', () => {
    const place = describePlace({
      geometry: { coordinates: [100.5, 13.75] },
      properties: { name: 'Bangkok', city: 'Bangkok', country: 'Thailand' }
    });
    expect(place?.name).toBe('Bangkok');
    expect(place?.address).toBe('Thailand');
  });

  it('rejects a feature with no coordinates or no usable label', () => {
    expect(describePlace({ properties: { name: 'Nowhere' } })).toBeNull();
    expect(describePlace({ geometry: { coordinates: [1, 2] }, properties: {} })).toBeNull();
  });
});

describe('mapsUrlFor', () => {
  it('pins the exact coordinates rather than re-searching the name', () => {
    const url = mapsUrlFor({ id: 'x', name: 'Wat Arun', address: '', lat: 13.7437, lon: 100.4889 });
    expect(url).toBe('https://www.google.com/maps/search/?api=1&query=13.7437,100.4889');
  });
});
