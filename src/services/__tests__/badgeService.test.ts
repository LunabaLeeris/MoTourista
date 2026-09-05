import {
  fetchBadgesWithProgress,
  checkTagExists,
  isCriteriaTupleValid,
  fetchValidTagIds,
  validateCriteriaTuples,
} from '../badgeService';
import { supabase } from '../../lib/supabase';
import { BadgeRow } from '../../types/database';

// Mock the Supabase client to test badge mapping and business rules in isolation
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('badgeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkTagExists', () => {
    it('returns true immediately for wildcard "*" without querying tags table', async () => {
      const exists = await checkTagExists('*');
      expect(exists).toBe(true);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('returns false for empty or falsy tag_id', async () => {
      expect(await checkTagExists('')).toBe(false);
    });

    it('returns true when tag exists in tags table', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'paresan' }, error: null }),
          }),
        }),
      });

      const exists = await checkTagExists('paresan');
      expect(exists).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('tags');
    });

    it('returns false when tag does not exist in tags table', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const exists = await checkTagExists('unknown_tag');
      expect(exists).toBe(false);
    });
  });

  describe('isCriteriaTupleValid', () => {
    it('returns true when tuple is valid and tag exists', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'coffee_spot' }, error: null }),
          }),
        }),
      });

      const valid = await isCriteriaTupleValid(['coffee_spot', 3]);
      expect(valid).toBe(true);
    });

    it('returns false and logs warning when tag does not exist in tags table', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const valid = await isCriteriaTupleValid(['non_existent', 5]);
      expect(valid).toBe(false);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('tag_id "non_existent" does not exist in tags table')
      );

      warnSpy.mockRestore();
    });

    it('returns false and logs warning for malformed tuple or non-positive threshold', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      expect(await isCriteriaTupleValid('not-a-tuple')).toBe(false);
      expect(await isCriteriaTupleValid(['', 5])).toBe(false);
      expect(await isCriteriaTupleValid(['paresan', 0])).toBe(false);

      warnSpy.mockRestore();
    });
  });

  describe('fetchValidTagIds', () => {
    it('returns Set of tag IDs from database', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: [{ id: 'paresan' }, { id: 'coffee_spot' }],
          error: null,
        }),
      });

      const tags = await fetchValidTagIds();
      expect(tags).toBeInstanceOf(Set);
      expect(tags.has('paresan')).toBe(true);
      expect(tags.has('coffee_spot')).toBe(true);
      expect(tags.has('talyer')).toBe(false);
    });

    it('returns empty Set on database error', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' },
        }),
      });

      const tags = await fetchValidTagIds();
      expect(tags.size).toBe(0);

      warnSpy.mockRestore();
    });
  });

  describe('validateCriteriaTuples', () => {
    it('filters out invalid tags and retains valid tags and wildcard "*"', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: [{ id: 'paresan' }, { id: 'coffee_spot' }],
          error: null,
        }),
      });

      const rawCriteria = [
        ['paresan', 5],
        ['fake_tag', 2],
        ['*', 10],
      ];

      const validated = await validateCriteriaTuples(rawCriteria);
      expect(validated).toEqual([
        ['paresan', 5],
        ['*', 10],
      ]);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('tag_id "fake_tag" does not exist in tags table')
      );

      warnSpy.mockRestore();
    });
  });

  describe('fetchBadgesWithProgress', () => {
    it('returns empty array when userId is empty', async () => {
      const result = await fetchBadgesWithProgress('');
      expect(result).toEqual([]);
    });

    it('maps locked badge with partial progress and dynamically enriches target for breakdown', async () => {
      const mockBadges: Partial<BadgeRow>[] = [
        {
          id: 'pares_warrior',
          title: 'Pares Warrior',
          description: 'Visited 5 paresan spots',
          icon: 'bowl-mix-outline',
          criteria_type: 'tag_visits',
          criteria_data: [['paresan', 5]],
          display_order: 10,
        },
      ];

      const mockProgress = [
        {
          id: 'prog-1',
          user_id: 'user-123',
          badge_id: 'pares_warrior',
          current_progress: 3,
          target_progress: 5,
          progress_percentage: 60,
          is_unlocked: false,
          acquired_at: null,
          is_pinned: false,
          progress_data: [{ tag_id: 'paresan', current: 3 }],
        },
      ];

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'badges') {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: mockBadges, error: null }),
            }),
          };
        }
        if (table === 'user_badge_progress') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: mockProgress, error: null }),
            }),
          };
        }
        if (table === 'tags') {
          return {
            select: jest.fn().mockResolvedValue({
              data: [{ id: 'paresan' }],
              error: null,
            }),
          };
        }
        return { select: jest.fn() };
      });

      const result = await fetchBadgesWithProgress('user-123');

      expect(result).toHaveLength(1);
      const badge = result[0];
      expect(badge.id).toBe('pares_warrior');
      expect(badge.is_unlocked).toBe(false);
      expect(badge.current_progress).toBe(3);
      expect(badge.target_progress).toBe(5);
      expect(badge.progress_percentage).toBe(60);

      // Verify dynamic enrichment: target is dynamically resolved from criteria_data, not stored in DB
      expect(badge.progress_data).toEqual([
        { tag_id: 'paresan', current: 3, target: 5 },
      ]);
    });

    it('correctly handles unlocked badge and pins current_progress to target', async () => {
      const mockBadges: Partial<BadgeRow>[] = [
        {
          id: 'the_beninging',
          title: 'The Beninging',
          description: '10 visits',
          icon: 'flag-checkered',
          criteria_type: 'total_visits',
          criteria_data: [['*', 10]],
          display_order: 10,
        },
      ];

      const mockProgress = [
        {
          id: 'prog-2',
          user_id: 'user-123',
          badge_id: 'the_beninging',
          current_progress: 10,
          target_progress: 10,
          progress_percentage: 100,
          is_unlocked: true,
          acquired_at: '2026-09-05T12:00:00Z',
          is_pinned: true,
          progress_data: [{ tag_id: '*', current: 10 }],
        },
      ];

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'badges') {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: mockBadges, error: null }),
            }),
          };
        }
        if (table === 'user_badge_progress') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: mockProgress, error: null }),
            }),
          };
        }
        if (table === 'tags') {
          return {
            select: jest.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        return { select: jest.fn() };
      });

      const result = await fetchBadgesWithProgress('user-123');

      expect(result).toHaveLength(1);
      const badge = result[0];
      expect(badge.is_unlocked).toBe(true);
      expect(badge.acquired_at).toBe('2026-09-05T12:00:00Z');
      expect(badge.is_pinned).toBe(true);
      expect(badge.current_progress).toBe(10);
      expect(badge.target_progress).toBe(10);
    });

    it('provides safe defaults when a user has no progress row for a badge yet', async () => {
      const mockBadges: Partial<BadgeRow>[] = [
        {
          id: 'coffee_lover',
          title: 'Coffee Lover',
          criteria_type: 'tag_visits',
          criteria_data: [['coffee_spot', 3]],
          display_order: 10,
        },
      ];

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'badges') {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: mockBadges, error: null }),
            }),
          };
        }
        if (table === 'user_badge_progress') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: [], error: null }), // no progress rows
            }),
          };
        }
        if (table === 'tags') {
          return {
            select: jest.fn().mockResolvedValue({
              data: [{ id: 'coffee_spot' }],
              error: null,
            }),
          };
        }
        return { select: jest.fn() };
      });

      const result = await fetchBadgesWithProgress('user-123');

      expect(result).toHaveLength(1);
      const badge = result[0];
      expect(badge.is_unlocked).toBe(false);
      expect(badge.current_progress).toBe(0);
      expect(badge.target_progress).toBe(3);
      expect(badge.progress_percentage).toBe(0);
      expect(badge.acquired_at).toBeNull();
    });
  });
});
