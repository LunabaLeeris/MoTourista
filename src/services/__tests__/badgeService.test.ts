import { fetchBadgesWithProgress } from '../badgeService';
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
