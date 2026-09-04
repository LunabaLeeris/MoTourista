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
export type UserBadgeRow = Tables<'user_badges'>;
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
  user_badges?: (UserBadgeRow & { badges?: BadgeRow | null })[];
}

// User badge with joined badge definition.
export interface UserBadgeWithDetails extends UserBadgeRow {
  badges?: BadgeRow | null;
}

// Badge definition with optional user unlock progress.
export interface BadgeWithProgress extends BadgeRow {
  is_unlocked: boolean;
  acquired_at?: string | null;
  is_pinned?: boolean;
  current_progress: number;
  target_progress: number;
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
