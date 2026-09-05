import { Database, Tables, TablesInsert, TablesUpdate } from './database.generated';

export type { Database, Tables, TablesInsert, TablesUpdate };

// Type aliases for lookup tables.
export type DriverTypeRow = Tables<'driver_types'>;
export type VehicleTypeRow = Tables<'vehicle_types'>;
export type MotorcycleModelRow = Tables<'motorcycle_models'>;
export type LocationStatusRow = Tables<'location_statuses'>;
export type TagRow = Tables<'tags'>;
export type BadgeRow = Tables<'badges'>;

// Type aliases for core application tables.
export type ProfileRow = Tables<'profiles'>;
export type LocationRow = Tables<'locations'>;
export type LocationImageRow = Tables<'location_images'>;
export type LocationTagRow = Tables<'location_tags'>;
export type LocationHeartRow = Tables<'location_hearts'>;
export type LocationVisitRow = Tables<'location_visits'>;
export type ReviewRow = Tables<'reviews'>;
export type ReviewImageRow = Tables<'review_images'>;

// Extended profile type that includes lookup relations.
export interface ProfileWithDetails extends ProfileRow {
  driver_types?: DriverTypeRow | null;
  vehicle_types?: VehicleTypeRow | null;
  motorcycle_models?: MotorcycleModelRow | null;
  user_badge_progress?: UserBadgeProgressRow[];
}

// Materialized progress per user and badge.
export interface UserBadgeProgressRow {
  id: string;
  user_id: string;
  badge_id: string;
  current_progress: number;
  target_progress: number;
  progress_percentage: number;
  is_unlocked: boolean;
  is_pinned?: boolean;
  acquired_at?: string | null;
  progress_data?: { tag_id: string; current: number; target: number }[] | null;
  created_at?: string;
  updated_at?: string;
}

// Badge definition with user unlock progress and criteria breakdown.
export interface BadgeWithProgress extends BadgeRow {
  is_unlocked: boolean;
  acquired_at?: string | null;
  is_pinned?: boolean;
  current_progress: number;
  target_progress: number;
  progress_percentage?: number;
  progress_data?: { tag_id: string; current: number; target: number }[];
}

// Location tag with joined tag metadata.
export interface LocationTagWithDetails extends LocationTagRow {
  tags?: TagRow | null;
}

// Review with author profile and attached media images.
export interface ReviewWithDetails extends ReviewRow {
  profiles?: ProfileRow | null;
  review_images?: ReviewImageRow[];
}

// Complete location details with images, tags, status, author, hearts, and reviews.
export interface LocationWithDetails extends LocationRow {
  location_statuses?: LocationStatusRow | null;
  profiles?: ProfileRow | null;
  location_images?: LocationImageRow[];
  location_tags?: LocationTagWithDetails[];
  location_hearts?: LocationHeartRow[];
  location_visits?: (LocationVisitRow & { profiles?: ProfileRow | null })[];
  reviews?: ReviewWithDetails[];
}
