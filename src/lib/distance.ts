import { Coordinates } from "../types/location";

// Earth radius constants.
const EARTH_RADIUS_METERS = 6371e3;
const EARTH_RADIUS_KM = 6371;

/**
 * Calculate the great-circle distance between two geographic coordinates with the Haversine formula.
 * Returns distance in meters by default or kilometers when requested.
 */
export function calculateHaversineDistance(
  origin: Coordinates,
  destination: Coordinates,
  unit: 'meters' | 'km' = 'meters'
): number {
  const rad = Math.PI / 180;
  const lat1 = origin.latitude * rad;
  const lat2 = destination.latitude * rad;
  const deltaLat = (destination.latitude - origin.latitude) * rad;
  const deltaLon = (destination.longitude - origin.longitude) * rad;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  if (unit === 'km') {
    return EARTH_RADIUS_KM * c;
  }

  return Math.round(EARTH_RADIUS_METERS * c);
}

/**
 * Format distance in meters into a readable string with meters or kilometers.
 * Shows meters when distance is under one kilometer.
 */
export function formatDistance(distanceMeters: number): string {
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)} m`;
  }
  const km = distanceMeters / 1000;
  return `${km.toFixed(1)} km`;
}

/**
 * Calculate and format the distance between two coordinate points.
 * Returns an empty string when either coordinate is missing.
 */
export function getFormattedDistance(
  origin?: Coordinates | null,
  destination?: Coordinates | null
): string {
  if (!origin || !destination) {
    return '';
  }

  const meters = calculateHaversineDistance(origin, destination, 'meters');
  return formatDistance(meters);
}
