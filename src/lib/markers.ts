import { LocationWithDetails } from '../types/database';
import { MapMarker } from '../types/map';

export interface LocationFilterOptions {
  query?: string;
  tagId?: string | null;
}

/**
 * Check if a location matches the search text in title or address.
 */
export function matchesLocationSearch(loc: LocationWithDetails, query?: string): boolean {
  if (!query || query.trim().length === 0) {
    return true;
  }

  const cleanQuery = query.trim().toLowerCase();
  const matchTitle = loc.title?.toLowerCase().includes(cleanQuery);
  const matchAddress = loc.address?.toLowerCase().includes(cleanQuery);

  return Boolean(matchTitle || matchAddress);
}

/**
 * Check if a location contains the specified tag identifier.
 */
export function matchesLocationTag(loc: LocationWithDetails, tagId?: string | null): boolean {
  if (!tagId) {
    return true;
  }

  return Boolean(
    loc.location_tags?.some(
      (lt) => lt.tag_id === tagId || lt.tags?.id === tagId
    )
  );
}

/**
 * Convert a database location record into a map marker model.
 */
export function locationToMapMarker(loc: LocationWithDetails): MapMarker {
  const firstTag = loc.location_tags?.[0]?.tags;
  const firstImage = loc.location_images?.[0]?.image_url;

  return {
    id: loc.id,
    title: loc.title,
    latitude: loc.latitude,
    longitude: loc.longitude,
    tagId: firstTag?.id,
    tagName: firstTag?.name,
    tagIcon: firstTag?.icon,
    address: loc.address || undefined,
    imageUrl: firstImage || undefined,
    isApproved: loc.status_id === 'approved',
  };
}

/**
 * Filter database locations by search query and tag category.
 */
export function filterLocations(
  locations: LocationWithDetails[],
  options: LocationFilterOptions
): LocationWithDetails[] {
  const { query, tagId } = options;

  return locations.filter((loc) => {
    return matchesLocationSearch(loc, query) && matchesLocationTag(loc, tagId);
  });
}

/**
 * Filter locations and convert matching items to map markers.
 */
export function filterAndTransformLocations(
  locations: LocationWithDetails[],
  options: LocationFilterOptions
): MapMarker[] {
  return filterLocations(locations, options).map(locationToMapMarker);
}

/**
 * Format duration in seconds into a clean minute display string.
 */
export function formatRouteDuration(durationSeconds: number): string {
  const minutes = Math.round(durationSeconds / 60);
  if (minutes < 60) {
    return `${minutes} mins`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours} hr ${remainingMinutes} mins` : `${hours} hr`;
}
