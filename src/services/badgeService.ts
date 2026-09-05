import { supabase } from '../lib/supabase';
import { BadgeRow, BadgeWithProgress, UserBadgeProgressRow, UserBadgeRow } from '../types/database';
import {
  parseCriteriaTuples,
  calculateTotalTarget,
  parseProgressData,
} from './badgeCriteriaParser';

/**
 * Retrieve all badges along with the user's precalculated progress from the database.
 * Completely eliminates client-side recalculation and historical visits fetching.
 */
export async function fetchBadgesWithProgress(
  userId: string
): Promise<BadgeWithProgress[]> {
  if (!userId) return [];

  try {
    // Fetch badges definitions, precalculated progress, and legacy unlock records concurrently.
    const [badgesRes, progressRes, userBadgesRes] = await Promise.all([
      supabase
        .from('badges')
        .select('*')
        .order('display_order', { ascending: true }),
      supabase
        .from('user_badge_progress')
        .select('*')
        .eq('user_id', userId),
      supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', userId),
    ]);

    if (badgesRes.error) throw badgesRes.error;

    const badges: BadgeRow[] = badgesRes.data || [];
    const progressRows = (progressRes.data || []) as UserBadgeProgressRow[];
    const userBadges = (userBadgesRes.data || []) as UserBadgeRow[];

    const progressMap = new Map<string, UserBadgeProgressRow>(
      progressRows.map((p) => [p.badge_id, p])
    );
    const legacyUnlockedMap = new Map<string, UserBadgeRow>(
      userBadges.map((ub) => [ub.badge_id, ub])
    );

    // Map each badge into BadgeWithProgress directly from database state.
    const badgesWithProgress: BadgeWithProgress[] = badges.map((badge) => {
      const progress = progressMap.get(badge.id);
      const legacyUnlocked = legacyUnlockedMap.get(badge.id);

      // Parse criteria tuples [[tag_id, threshold], ...] for the target threshold
      const tuples = parseCriteriaTuples(badge.criteria_data);
      const calculatedTarget = calculateTotalTarget(tuples);

      const targetProgress = progress?.target_progress ?? calculatedTarget;
      const isUnlocked = Boolean(progress?.is_unlocked || legacyUnlocked);
      let currentProgress = progress?.current_progress ?? (isUnlocked ? targetProgress : 0);

      if (isUnlocked) {
        currentProgress = Math.max(currentProgress, targetProgress);
      }

      const progressData = parseProgressData(progress?.progress_data);

      return {
        ...badge,
        is_unlocked: isUnlocked,
        acquired_at: progress?.acquired_at || legacyUnlocked?.acquired_at || null,
        is_pinned: progress?.is_pinned || legacyUnlocked?.is_pinned || false,
        current_progress: currentProgress,
        target_progress: targetProgress,
        progress_percentage:
          progress?.progress_percentage ??
          Math.round((currentProgress / targetProgress) * 100),
        progress_data: progressData,
      };
    });

    return badgesWithProgress;
  } catch (error) {
    console.error('Error fetching badges with progress:', error);
    return [];
  }
}