import { getLookupOptions, getTags, clearLookupCache } from '../lookupService';
import { supabase } from '../../lib/supabase';
import { DriverTypeRow, VehicleTypeRow, MotorcycleModelRow, TagRow } from '../../types/database';

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('lookupService', () => {
  const mockDriverTypes: DriverTypeRow[] = [
    {
      id: 'dt-1',
      label: 'Weekend Cruiser',
      icon: 'motorcycle',
      display_order: 1,
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'dt-2',
      label: 'Daily Commuter',
      icon: 'commute',
      display_order: 2,
      created_at: '2026-01-01T00:00:00Z',
    },
  ];

  const mockVehicleTypes: VehicleTypeRow[] = [
    {
      id: 'vt-1',
      label: 'Underbone',
      icon: 'moped',
      display_order: 1,
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'vt-2',
      label: 'Scooter',
      icon: 'scooter',
      display_order: 2,
      created_at: '2026-01-01T00:00:00Z',
    },
  ];

  const mockMotorcycleModels: MotorcycleModelRow[] = [
    {
      id: 'mm-1',
      label: 'Click 125i',
      icon: 'honda',
      vehicle_type_id: 'vt-2',
      display_order: 1,
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'mm-2',
      label: 'Sniper 155',
      icon: 'yamaha',
      vehicle_type_id: 'vt-1',
      display_order: 2,
      created_at: '2026-01-01T00:00:00Z',
    },
  ];

  const mockTags: TagRow[] = [
    {
      id: 'tag-1',
      name: 'Scenic View',
      icon: 'mountain',
      display_order: 1,
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'tag-2',
      name: 'Curvy Roads',
      icon: 'road',
      display_order: 2,
      created_at: '2026-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    clearLookupCache();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getLookupOptions', () => {
    function setupMockTables(overrides?: {
      driverError?: any;
      vehicleError?: any;
      motorcycleError?: any;
      driverData?: DriverTypeRow[];
      vehicleData?: VehicleTypeRow[];
      motorcycleData?: MotorcycleModelRow[];
    }) {
      const mockOrderDriver = jest.fn().mockResolvedValue({
        data:
          overrides?.driverData !== undefined
            ? overrides.driverData
            : overrides?.driverError
            ? null
            : mockDriverTypes,
        error: overrides?.driverError || null,
      });
      const mockOrderVehicle = jest.fn().mockResolvedValue({
        data:
          overrides?.vehicleData !== undefined
            ? overrides.vehicleData
            : overrides?.vehicleError
            ? null
            : mockVehicleTypes,
        error: overrides?.vehicleError || null,
      });
      const mockOrderMotorcycle = jest.fn().mockResolvedValue({
        data:
          overrides?.motorcycleData !== undefined
            ? overrides.motorcycleData
            : overrides?.motorcycleError
            ? null
            : mockMotorcycleModels,
        error: overrides?.motorcycleError || null,
      });

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'driver_types') {
          return {
            select: jest.fn().mockReturnValue({
              order: mockOrderDriver,
            }),
          };
        }
        if (table === 'vehicle_types') {
          return {
            select: jest.fn().mockReturnValue({
              order: mockOrderVehicle,
            }),
          };
        }
        if (table === 'motorcycle_models') {
          return {
            select: jest.fn().mockReturnValue({
              order: mockOrderMotorcycle,
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      });

      return { mockOrderDriver, mockOrderVehicle, mockOrderMotorcycle };
    }

    it('fetches driver types, vehicle types, and motorcycle models in parallel', async () => {
      const { mockOrderDriver, mockOrderVehicle, mockOrderMotorcycle } = setupMockTables();

      const options = await getLookupOptions();

      expect(supabase.from).toHaveBeenCalledWith('driver_types');
      expect(supabase.from).toHaveBeenCalledWith('vehicle_types');
      expect(supabase.from).toHaveBeenCalledWith('motorcycle_models');

      expect(mockOrderDriver).toHaveBeenCalledWith('display_order', { ascending: true });
      expect(mockOrderVehicle).toHaveBeenCalledWith('display_order', { ascending: true });
      expect(mockOrderMotorcycle).toHaveBeenCalledWith('display_order', { ascending: true });

      expect(options.driverTypes).toEqual(mockDriverTypes);
      expect(options.vehicleTypes).toEqual(mockVehicleTypes);
      expect(options.motorcycleModels).toEqual(mockMotorcycleModels);
    });

    it('caches lookup options in memory for subsequent calls', async () => {
      setupMockTables();

      const firstCall = await getLookupOptions();
      expect(supabase.from).toHaveBeenCalledTimes(3);

      const secondCall = await getLookupOptions();
      // Should return cached results without querying Supabase again
      expect(supabase.from).toHaveBeenCalledTimes(3);
      expect(secondCall).toBe(firstCall);
    });

    it('bypasses cache and refetches when forceRefresh is true', async () => {
      setupMockTables();

      const firstCall = await getLookupOptions();
      expect(supabase.from).toHaveBeenCalledTimes(3);

      const refreshedCall = await getLookupOptions(true);
      // Supabase should have been called 3 more times (6 total)
      expect(supabase.from).toHaveBeenCalledTimes(6);
      expect(refreshedCall).toEqual(firstCall);
    });

    it('handles query error on driver types gracefully and logs error', async () => {
      const errorObj = { message: 'Failed to fetch driver types' };
      setupMockTables({ driverError: errorObj });

      const options = await getLookupOptions();

      expect(console.error).toHaveBeenCalledWith('Error fetching driver types:', errorObj);
      expect(options.driverTypes).toEqual([]);
      expect(options.vehicleTypes).toEqual(mockVehicleTypes);
      expect(options.motorcycleModels).toEqual(mockMotorcycleModels);
    });

    it('handles query error on vehicle types gracefully and logs error', async () => {
      const errorObj = { message: 'Failed to fetch vehicle types' };
      setupMockTables({ vehicleError: errorObj });

      const options = await getLookupOptions();

      expect(console.error).toHaveBeenCalledWith('Error fetching vehicle types:', errorObj);
      expect(options.driverTypes).toEqual(mockDriverTypes);
      expect(options.vehicleTypes).toEqual([]);
      expect(options.motorcycleModels).toEqual(mockMotorcycleModels);
    });

    it('handles query error on motorcycle models gracefully and logs error', async () => {
      const errorObj = { message: 'Failed to fetch motorcycle models' };
      setupMockTables({ motorcycleError: errorObj });

      const options = await getLookupOptions();

      expect(console.error).toHaveBeenCalledWith('Error fetching motorcycle models:', errorObj);
      expect(options.driverTypes).toEqual(mockDriverTypes);
      expect(options.vehicleTypes).toEqual(mockVehicleTypes);
      expect(options.motorcycleModels).toEqual([]);
    });

    it('does not cache when both driverTypes and vehicleTypes are empty', async () => {
      setupMockTables({ driverData: [], vehicleData: [] });

      await getLookupOptions();
      expect(supabase.from).toHaveBeenCalledTimes(3);

      // Second call should query Supabase again since nothing qualified for caching
      await getLookupOptions();
      expect(supabase.from).toHaveBeenCalledTimes(6);
    });
  });

  describe('getTags', () => {
    function setupMockTags(overrides?: { data?: TagRow[] | null; error?: any }) {
      const mockOrder = jest.fn().mockResolvedValue({
        data: overrides?.data !== undefined ? overrides.data : mockTags,
        error: overrides?.error || null,
      });

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'tags') {
          return {
            select: jest.fn().mockReturnValue({
              order: mockOrder,
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      });

      return { mockOrder };
    }

    it('fetches tags ordered by display_order', async () => {
      const { mockOrder } = setupMockTags();

      const tags = await getTags();

      expect(supabase.from).toHaveBeenCalledWith('tags');
      expect(mockOrder).toHaveBeenCalledWith('display_order', { ascending: true });
      expect(tags).toEqual(mockTags);
    });

    it('caches tags in memory for subsequent calls', async () => {
      setupMockTags();

      const firstCall = await getTags();
      expect(supabase.from).toHaveBeenCalledTimes(1);

      const secondCall = await getTags();
      expect(supabase.from).toHaveBeenCalledTimes(1);
      expect(secondCall).toBe(firstCall);
    });

    it('bypasses tag cache when forceRefresh is true', async () => {
      setupMockTags();

      await getTags();
      expect(supabase.from).toHaveBeenCalledTimes(1);

      await getTags(true);
      expect(supabase.from).toHaveBeenCalledTimes(2);
    });

    it('handles query error on tags gracefully, logs error, and returns empty array', async () => {
      const errorObj = { message: 'Database error fetching tags' };
      setupMockTags({ error: errorObj, data: null });

      const tags = await getTags();

      expect(console.error).toHaveBeenCalledWith('Error fetching tags:', errorObj);
      expect(tags).toEqual([]);
    });

    it('does not cache when tags array is empty', async () => {
      setupMockTags({ data: [] });

      await getTags();
      expect(supabase.from).toHaveBeenCalledTimes(1);

      // Should query again because empty array is not cached
      await getTags();
      expect(supabase.from).toHaveBeenCalledTimes(2);
    });
  });

  describe('clearLookupCache', () => {
    it('clears both lookup options and tags caches', async () => {
      // Mock both tables
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: mockDriverTypes, error: null }),
        }),
      });

      await getLookupOptions();
      await getTags();
      expect(supabase.from).toHaveBeenCalledTimes(4); // 3 for lookup options, 1 for tags

      // Next calls would normally be cached
      await getLookupOptions();
      await getTags();
      expect(supabase.from).toHaveBeenCalledTimes(4);

      // Clear the cache
      clearLookupCache();

      // Calls after clear should query Supabase again
      await getLookupOptions();
      await getTags();
      expect(supabase.from).toHaveBeenCalledTimes(8);
    });
  });
});
