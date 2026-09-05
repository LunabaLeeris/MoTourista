import { checkOnboardingStatus } from '../authService';
import { supabase } from '../../lib/supabase';

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('checkOnboardingStatus', () => {
    it('returns true when profile exists and is_onboarded is true', async () => {
      const maybeSingleMock = jest.fn().mockResolvedValue({
        data: { is_onboarded: true },
        error: null,
      });
      const eqMock = jest.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as jest.Mock).mockReturnValue({ select: selectMock });

      const result = await checkOnboardingStatus('user-123');

      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(selectMock).toHaveBeenCalledWith('is_onboarded');
      expect(eqMock).toHaveBeenCalledWith('id', 'user-123');
      expect(maybeSingleMock).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('returns false when profile exists and is_onboarded is false', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { is_onboarded: false },
              error: null,
            }),
          }),
        }),
      });

      const result = await checkOnboardingStatus('user-123');

      expect(result).toBe(false);
    });

    it('returns false when is_onboarded is null or undefined', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { is_onboarded: null },
              error: null,
            }),
          }),
        }),
      });

      const result = await checkOnboardingStatus('user-123');

      expect(result).toBe(false);
    });

    it('returns false when profile is not found (data is null)', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      const result = await checkOnboardingStatus('user-123');

      expect(result).toBe(false);
    });

    it('returns false when Supabase returns an error', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Failed to find record' },
            }),
          }),
        }),
      });

      const result = await checkOnboardingStatus('user-123');

      expect(result).toBe(false);
    });

    it('returns false when an unexpected exception is thrown', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockRejectedValue(new Error('Network connection failure')),
          }),
        }),
      });

      const result = await checkOnboardingStatus('user-123');

      expect(result).toBe(false);
    });
  });
});
