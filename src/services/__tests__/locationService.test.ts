import {
  reverseGeocodeCoordinates,
  fetchVisitedLocations,
} from '../locationService';
import { supabase } from '../../lib/supabase';

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

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

  describe('fetchVisitedLocations', () => {
    const mockQuery = (result: { data: any; error: any }) => {
      const order = jest.fn().mockResolvedValue(result);
      const eq = jest.fn().mockReturnValue({ order });
      const select = jest.fn().mockReturnValue({ eq });
      (supabase.from as jest.Mock).mockReturnValue({ select });
      return { select, eq, order };
    };

    it('returns an empty list without querying when user id is missing', async () => {
      const result = await fetchVisitedLocations('');
      expect(result).toEqual([]);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('maps visits to locations, merging repeat visits and skipping invalid rows', async () => {
      const { eq, order } = mockQuery({
        data: [
          {
            id: 'v3',
            visited_at: '2026-03-01T00:00:00Z',
            notes: 'latest',
            locations: {
              id: 'loc-1',
              title: 'Kaybiang Tunnel',
              address: 'Ternate, Cavite',
              latitude: 14.28,
              longitude: 120.59,
              status_id: 'approved',
              location_tags: [{ tags: { id: 't1', name: 'Attraction', icon: 'tunnel' } }],
            },
          },
          {
            id: 'v2',
            visited_at: '2026-02-01T00:00:00Z',
            notes: null,
            locations: { id: 'loc-2', title: 'Pending Spot', latitude: 17.1, longitude: 120.5, status_id: 'pending', location_tags: [] },
          },
          {
            id: 'v1',
            visited_at: '2026-01-01T00:00:00Z',
            notes: null,
            locations: { id: 'loc-1', title: 'Kaybiang Tunnel', latitude: 14.28, longitude: 120.59, status_id: 'approved', location_tags: [] },
          },
          { id: 'v0', visited_at: '2025-12-01T00:00:00Z', notes: null, locations: null },
        ],
        error: null,
      });

      const result = await fetchVisitedLocations('user-1');

      expect(supabase.from).toHaveBeenCalledWith('location_visits');
      expect(eq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(order).toHaveBeenCalledWith('visited_at', { ascending: false });
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'loc-1',
        title: 'Kaybiang Tunnel',
        tagName: 'Attraction',
        isApproved: true,
        latestVisitId: 'v3',
        latestVisitedAt: '2026-03-01T00:00:00Z',
        visitCount: 2,
        notes: 'latest',
      });
      expect(result[1]).toMatchObject({ id: 'loc-2', isApproved: false, visitCount: 1 });
    });

    it('throws when the query fails', async () => {
      mockQuery({ data: null, error: { message: 'boom' } });
      await expect(fetchVisitedLocations('user-1')).rejects.toThrow('boom');
    });
  });
});
