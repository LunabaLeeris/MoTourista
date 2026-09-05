import { supabase } from '../lib/supabase';
import { BadgeRow, BadgeWithProgress, UserBadgeProgressRow } from '../types/database';
import {
  BadgeCriteriaTuple,
  parseCriteriaTuples,
  calculateTotalTarget,
  parseProgressData,
} from './badgeCriteriaParser';

/**
 * Checks if a specific tag_id exists in the tags table.
 * Wildcard '*' is reserved for milestone total visits and is always valid.
 */
export async function checkTagExists(tagId: string): Promise<boolean> {
  if (!tagId) return false;
  if (tagId === '*') return true;

  try {
    const res = await supabase
      .from('tags')
      .select('id')
      .eq('id', tagId)
      .maybeSingle();

    if (!res || res.error) {
      if (res?.error) {
        console.warn(`[badgeService] Error checking tag "${tagId}":`, res.error.message);
      }
      return false;
    }

    return Boolean(res.data);
  } catch (err) {
    console.warn(`[badgeService] Exception checking tag "${tagId}":`, err);
    return false;
  }
}

/**
 * Checks if a single criteria tuple is valid:
 * - Tuple format is [string, number] with threshold >= 1.
 * - tag_id exists in tags table or is wildcard '*'.
 * Logs a warning in development when an invalid tuple is detected.
 */
export async function isCriteriaTupleValid(tuple: unknown): Promise<boolean> {
  if (!Array.isArray(tuple) || tuple.length < 2) {
    console.warn('[badgeService] Invalid criteria tuple format (expected 2-tuple):', tuple);
    return false;
  }

  const tagId = String(tuple[0] || '').trim();
  const threshold = Number(tuple[1]);

  if (!tagId) {
    console.warn('[badgeService] Criteria tuple has empty tag_id:', tuple);
    return false;
  }

  if (isNaN(threshold) || threshold < 1) {
    console.warn(`[badgeService] Criteria tuple threshold must be >= 1 for tag "${tagId}":`, tuple[1]);
    return false;
  }

  const exists = await checkTagExists(tagId);
  if (!exists) {
    console.warn(`[badgeService] Skipping invalid criteria tuple: tag_id "${tagId}" does not exist in tags table.`);
    return false;
  }

  return true;
}

/**
 * Retrieves the set of all valid tag IDs from the database tags table.
 */
export async function fetchValidTagIds(): Promise<Set<string>> {
  try {
    const res = await supabase.from('tags').select('id');
    if (!res || res.error) {
      if (res?.error) {
        console.warn('[badgeService] Error fetching valid tag IDs:', res.error.message);
      }
      return new Set<string>();
    }
    return new Set(((res.data as Array<{ id: string }>) || []).map((row) => row.id));
  } catch (err) {
    console.warn('[badgeService] Exception fetching valid tag IDs:', err);
    return new Set<string>();
  }
}

/**
 * Validates criteria tuples against the database tags table.
 * Tuples referencing non-existent tags are skipped and logged as warnings.
 */
export async function validateCriteriaTuples(
  criteriaData: unknown
): Promise<BadgeCriteriaTuple[]> {
  const validTagIds = await fetchValidTagIds();
  return parseCriteriaTuples(criteriaData, validTagIds.size > 0 ? validTagIds : undefined);
}

/**
 * Retrieve all badges along with the user's precalculated progress from the database.
 * Completely eliminates client-side recalculation and historical visits fetching.
 */
export async function fetchBadgesWithProgress(
  userId: string
): Promise<BadgeWithProgress[]> {
  if (!userId) return [];

  try {
    // Fetch badges definitions, precalculated user progress, and valid tag IDs concurrently.
    const [badgesRes, progressRes, validTagIds] = await Promise.all([
      supabase
        .from('badges')
        .select('*')
        .order('display_order', { ascending: true }),
      supabase
        .from('user_badge_progress')
        .select('*')
        .eq('user_id', userId),
      fetchValidTagIds(),
    ]);

    if (badgesRes.error) throw badgesRes.error;

    const badges: BadgeRow[] = badgesRes.data || [];
    const progressRows = (progressRes.data || []) as UserBadgeProgressRow[];

    const progressMap = new Map<string, UserBadgeProgressRow>(
      progressRows.map((p) => [p.badge_id, p])
    );

    // Map each badge into BadgeWithProgress directly from database state.
    const badgesWithProgress: BadgeWithProgress[] = badges.map((badge) => {
      const progress = progressMap.get(badge.id);

      // Parse criteria tuples [[tag_id, threshold], ...] for the target threshold.
      // Skips any tuple with an invalid tag_id if validTagIds were loaded.
      const tuples = parseCriteriaTuples(
        badge.criteria_data,
        validTagIds.size > 0 ? validTagIds : undefined
      );
      const calculatedTarget = calculateTotalTarget(tuples);

      const targetProgress = progress?.target_progress ?? calculatedTarget;
      const isUnlocked = Boolean(progress?.is_unlocked);
      let currentProgress = progress?.current_progress ?? (isUnlocked ? targetProgress : 0);

      if (isUnlocked) {
        currentProgress = Math.max(currentProgress, targetProgress);
      }

      // Resolve target for each criteria tag dynamically from badge.criteria_data
      const criteriaMap = new Map<string, number>(tuples);
      const progressData = parseProgressData(progress?.progress_data).map((item) => ({
        tag_id: item.tag_id,
        current: item.current,
        target: criteriaMap.get(item.tag_id) ?? targetProgress,
      }));

      return {
        ...badge,
        is_unlocked: isUnlocked,
        acquired_at: progress?.acquired_at || null,
        is_pinned: progress?.is_pinned || false,
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