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