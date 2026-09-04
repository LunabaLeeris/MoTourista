import { supabase } from '../lib/supabase';
import { BadgeRow, BadgeWithProgress, UserBadgeRow } from '../types/database';

interface BadgeCriteria {
  threshold?: number;
  tag_id?: string;
}

// Retrieve all badges along with the user's progress and unlock state.
export async function fetchBadgesWithProgress(
  userId: string
): Promise<BadgeWithProgress[]> {
  try {
    // Fetch all badges ordered by display order.
    const { data: badgesData, error: badgesError } = await supabase
      .from('badges')
      .select('*')
      .order('display_order', { ascending: true });

    if (badgesError) throw badgesError;
    const badges: BadgeRow[] = badgesData || [];

    // Fetch user's unlocked badges.
    const { data: userBadgesData, error: userBadgesError } = await supabase
      .from('user_badges')
      .select('*')
      .eq('user_id', userId);

    if (userBadgesError) throw userBadgesError;
    const userBadges: UserBadgeRow[] = userBadgesData || [];
    const userBadgesMap = new Map<string, UserBadgeRow>(
      userBadges.map((ub) => [ub.badge_id, ub])
    );

    // Fetch user's visits.
    const { data: visitsData, error: visitsError } = await supabase
      .from('location_visits')
      .select('location_id')
      .eq('user_id', userId);

    if (visitsError) throw visitsError;
    const visits = visitsData || [];
    const totalVisits = visits.length;

    // Map location IDs to their associated tags for tag-specific visit badges.
    const locationIds = Array.from(
      new Set(visits.map((v) => v.location_id).filter(Boolean))
    );

    const locationTagsMap = new Map<string, Set<string>>();
    if (locationIds.length > 0) {
      const { data: tagsData, error: tagsError } = await supabase
        .from('location_tags')
        .select('location_id, tag_id')
        .in('location_id', locationIds);

      if (!tagsError && tagsData) {
        tagsData.forEach((row) => {
          if (!locationTagsMap.has(row.location_id)) {
            locationTagsMap.set(row.location_id, new Set());
          }
          locationTagsMap.get(row.location_id)!.add(row.tag_id);
        });
      }
    }

    //  Calculate progress for each badge.
    const badgesWithProgress: BadgeWithProgress[] = badges.map((badge) => {
      const userBadge = userBadgesMap.get(badge.id);
      const isUnlocked = Boolean(userBadge);

      const criteria = (
        typeof badge.criteria_data === 'object' && badge.criteria_data !== null
          ? badge.criteria_data
          : {}
      ) as BadgeCriteria;

      const targetProgress = Number(criteria.threshold) || 1;
      let currentProgress = 0;

      if (badge.criteria_type === 'total_visits') {
        currentProgress = totalVisits;
      } else if (badge.criteria_type === 'tag_visits' && criteria.tag_id) {
        const tagId = criteria.tag_id;
        let matchingCount = 0;
        for (const locId of locationIds) {
          if (locationTagsMap.get(locId)?.has(tagId)) {
            matchingCount++;
          }
        }
        currentProgress = matchingCount;
      }

      if (isUnlocked) {
        currentProgress = Math.max(currentProgress, targetProgress);
      }

      return {
        ...badge,
        is_unlocked: isUnlocked,
        acquired_at: userBadge?.acquired_at || null,
        is_pinned: userBadge?.is_pinned || false,
        current_progress: currentProgress,
        target_progress: targetProgress,
      };
    });

    return badgesWithProgress;
  } catch (error) {
    console.error('Error fetching badges with progress:', error);
    return [];
  }
}
