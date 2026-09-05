/**
 * Criteria data type representing a 2-length tuple: [tagId, threshold].
 * E.g., ['paresan', 5] or ['*', 10] for total visits.
 */
export type BadgeCriteriaTuple = [tagId: string, threshold: number];

export interface BadgeProgressItem {
  tag_id: string;
  current: number;
  target?: number;
}

/**
 * Parses badge criteria_data into a standardized array of 2-length tuples: [[tag_id, threshold], ...].
 * If validTagIds is provided, skips tuples whose tag_id is not in the tags table (wildcard '*' is always valid).
 * Logs warnings in development when an invalid tuple is skipped.
 */
export function parseCriteriaTuples(
  criteriaData: unknown,
  validTagIds?: Set<string> | string[]
): BadgeCriteriaTuple[] {
  if (!criteriaData) return [];

  const validTagSet = validTagIds
    ? (validTagIds instanceof Set ? validTagIds : new Set(validTagIds))
    : null;

  // Array of 2-length tuples [[tag_id, threshold], ...]
  if (Array.isArray(criteriaData)) {
    const tuples: BadgeCriteriaTuple[] = [];

    for (const item of criteriaData) {
      if (!Array.isArray(item) || item.length < 2) {
        console.warn('[badgeCriteriaParser] Skipping invalid criteria tuple (expected 2-tuple):', item);
        continue;
      }

      const tagId = String(item[0] || '').trim();
      if (!tagId) {
        console.warn('[badgeCriteriaParser] Skipping criteria tuple with empty tag_id:', item);
        continue;
      }

      // Check if tag_id exists in valid tags (wildcard '*' is always valid for milestone total visits)
      if (validTagSet && tagId !== '*' && !validTagSet.has(tagId)) {
        console.warn(
          `[badgeCriteriaParser] Skipping invalid criteria tuple: tag_id "${tagId}" does not exist in tags table.`
        );
        continue;
      }

      const threshold = Math.max(1, Number(item[1]) || 1);
      tuples.push([tagId, threshold]);
    }

    return tuples;
  }

  return [];
}

/**
 * Calculates the total cumulative target threshold across all criteria tuples.
 */
export function calculateTotalTarget(tuples: BadgeCriteriaTuple[]): number {
  if (!tuples.length) return 1;
  return tuples.reduce((sum, [, threshold]) => sum + threshold, 0);
}

/**
 * Safely parses the stored progress_data JSON array from user_badge_progress.
 * Only extracts tag_id and current visit counts.
 */
export function parseProgressData(data: unknown): BadgeProgressItem[] {
  if (!Array.isArray(data)) return [];

  return data.map((item) => {
    if (typeof item === 'object' && item !== null) {
      const raw = item as Record<string, any>;
      return {
        tag_id: String(raw.tag_id || '*'),
        current: Number(raw.current) || 0,
        ...(raw.target !== undefined ? { target: Number(raw.target) } : {}),
      };
    }
    return { tag_id: '*', current: 0 };
  });
}
