import {
  reverseGeocodeCoordinates,
} from '../locationService';

describe('locationService', () => {
  describe('reverseGeocodeCoordinates', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
      globalThis.fetch = originalFetch;
    });

    afterAll(() => {
      globalThis.fetch = originalFetch;
    });

    it('falls back to numeric coordinate string when reverse geocoding returns no result', async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
      }) as any;

      const result = await reverseGeocodeCoordinates(14.5995, 120.9842);
      expect(result).toBe('14.5995, 120.9842');
    });

    it('parses city and region from OpenStreetMap response', async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          address: {
            city: 'Tanay',
            state: 'Rizal',
            country: 'Philippines',
          },
        }),
      }) as any;

      const result = await reverseGeocodeCoordinates(14.5, 121.3);
      expect(result).toBe('Tanay, Rizal');
    });
  });
});
