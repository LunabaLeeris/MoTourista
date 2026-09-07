import { Coordinates } from '../types/location';
import { isValidCoordinates } from './locationValidator';
import { PHILIPPINES_BOUNDS } from '../config/mapConfig';

/**
 * Check whether coordinates stay inside Philippine geographic boundaries.
 */
export function isWithinPhilippines(latitude: number, longitude: number): boolean {
  if (!isValidCoordinates(latitude, longitude)) {
    return false;
  }

  const { minLatitude, maxLatitude, minLongitude, maxLongitude } = PHILIPPINES_BOUNDS;
  return (
    latitude >= minLatitude &&
    latitude <= maxLatitude &&
    longitude >= minLongitude &&
    longitude <= maxLongitude
  );
}

/**
 * Clamp coordinates to stay inside Philippine geographic boundaries.
 */
export function clampToPhilippines(coords: Coordinates): Coordinates {
  const { minLatitude, maxLatitude, minLongitude, maxLongitude } = PHILIPPINES_BOUNDS;

  return {
    latitude: Math.min(Math.max(coords.latitude, minLatitude), maxLatitude),
    longitude: Math.min(Math.max(coords.longitude, minLongitude), maxLongitude),
  };
}
