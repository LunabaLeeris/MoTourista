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
 * Handles both the new tuple array format and fallback legacy objects.
 */
export function parseCriteriaTuples(criteriaData: unknown): BadgeCriteriaTuple[] {
  if (!criteriaData) return [];

  // New format: Array of 2-length tuples [[tag_id, threshold], ...]
  if (Array.isArray(criteriaData)) {
    const tuples: BadgeCriteriaTuple[] = [];

    for (const item of criteriaData) {
      if (Array.isArray(item) && item.length >= 2) {
        const tagId = String(item[0] || '').trim();
        const threshold = Math.max(1, Number(item[1]) || 1);
        if (tagId) {
          tuples.push([tagId, threshold]);
        }
      }
    }

    return tuples;
  }

  // Fallback: Legacy object format {"tag_id": "...", "threshold": N}
  if (typeof criteriaData === 'object' && criteriaData !== null) {
    const raw = criteriaData as Record<string, any>;
    const threshold = Math.max(1, Number(raw.threshold) || 1);
    const tagId = typeof raw.tag_id === 'string' && raw.tag_id.trim() ? raw.tag_id.trim() : '*';
    return [[tagId, threshold]];
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
