import { fetchProfileDetails, upsertProfile } from '../profileService';
import { supabase } from '../../lib/supabase';
import { ProfileWithDetails, TablesInsert } from '../../types/database';

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('profileService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('fetchProfileDetails', () => {
    const mockProfileWithDetails: ProfileWithDetails = {
      id: 'user-123',
      full_name: 'John Doe',
      avatar_url: 'https://cdn.supabase.co/avatars/user-123/avatar.png',
      driver_type_id: 'dt-1',
      vehicle_type_id: 'vt-1',
      motorcycle_model_id: 'mm-1',
      is_onboarded: true,
      latitude: 14.5995,
      longitude: 120.9842,
      location_name: 'Manila',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      driver_types: {
        id: 'dt-1',
        label: 'Weekend Cruiser',
        icon: 'motorcycle',
        display_order: 1,
        created_at: '2026-01-01T00:00:00Z',
      },
      vehicle_types: {
        id: 'vt-1',
        label: 'Scooter',
        icon: 'scooter',
        display_order: 1,
        created_at: '2026-01-01T00:00:00Z',
      },
      motorcycle_models: {
        id: 'mm-1',
        label: 'Click 125i',
        icon: 'honda',
        vehicle_type_id: 'vt-1',
        display_order: 1,
        created_at: '2026-01-01T00:00:00Z',
      },
    };

    it('returns null immediately without querying Supabase if userId is empty', async () => {
      const result = await fetchProfileDetails('');

      expect(result).toBeNull();
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('successfully fetches profile details with relation joins', async () => {
      const maybeSingleMock = jest.fn().mockResolvedValue({
        data: mockProfileWithDetails,
        error: null,
      });
      const eqMock = jest.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as jest.Mock).mockReturnValue({ select: selectMock });

      const result = await fetchProfileDetails('user-123');

      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(selectMock).toHaveBeenCalledWith(
        '*, driver_types (*), vehicle_types (*), motorcycle_models (*)'
      );
      expect(eqMock).toHaveBeenCalledWith('id', 'user-123');
      expect(maybeSingleMock).toHaveBeenCalled();
      expect(result).toEqual(mockProfileWithDetails);
    });

    it('returns null when profile is not found in database', async () => {
      const maybeSingleMock = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });
      const eqMock = jest.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as jest.Mock).mockReturnValue({ select: selectMock });

      const result = await fetchProfileDetails('non-existent-user');

      expect(result).toBeNull();
      expect(console.error).not.toHaveBeenCalled();
    });

    it('logs error and returns null when Supabase returns query error', async () => {
      const dbError = { message: 'Database query timeout' };
      const maybeSingleMock = jest.fn().mockResolvedValue({
        data: null,
        error: dbError,
      });
      const eqMock = jest.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as jest.Mock).mockReturnValue({ select: selectMock });

      const result = await fetchProfileDetails('user-123');

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        'Failed to fetch profile details:',
        'Database query timeout'
      );
    });

    it('catches and logs unexpected exceptions, returning null', async () => {
      const thrownError = new Error('Network connection aborted');
      (supabase.from as jest.Mock).mockImplementation(() => {
        throw thrownError;
      });

      const result = await fetchProfileDetails('user-123');

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        'Unexpected error in fetchProfileDetails:',
        thrownError
      );
    });
  });

  describe('upsertProfile', () => {
    const profilePayload: TablesInsert<'profiles'> = {
      id: 'user-123',
      full_name: 'John Doe',
      is_onboarded: true,
      driver_type_id: 'dt-1',
      vehicle_type_id: 'vt-1',
      motorcycle_model_id: 'mm-1',
    };

    it('successfully upserts profile data and returns success true', async () => {
      const upsertMock = jest.fn().mockResolvedValue({ error: null });
      (supabase.from as jest.Mock).mockReturnValue({ upsert: upsertMock });

      const result = await upsertProfile(profilePayload);

      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(upsertMock).toHaveBeenCalledWith(profilePayload, { onConflict: 'id' });
      expect(result).toEqual({ success: true });
      expect(console.error).not.toHaveBeenCalled();
    });

    it('handles Supabase upsert error, logs error, and returns success false', async () => {
      const dbError = { message: 'Unique constraint violation' };
      const upsertMock = jest.fn().mockResolvedValue({ error: dbError });
      (supabase.from as jest.Mock).mockReturnValue({ upsert: upsertMock });

      const result = await upsertProfile(profilePayload);

      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(upsertMock).toHaveBeenCalledWith(profilePayload, { onConflict: 'id' });
      expect(console.error).toHaveBeenCalledWith('Failed to upsert profile:', 'Unique constraint violation');
      expect(result).toEqual({ success: false, error: dbError });
    });

    it('catches and logs unexpected exceptions, returning success false with error', async () => {
      const thrownError = new Error('Supabase client failed to connect');
      (supabase.from as jest.Mock).mockImplementation(() => {
        throw thrownError;
      });

      const result = await upsertProfile(profilePayload);

      expect(console.error).toHaveBeenCalledWith('Unexpected error in upsertProfile:', thrownError);
      expect(result).toEqual({ success: false, error: thrownError });
    });
  });
});
