// Guard clause to validate that latitude and longitude coordinates are valid geographic numbers.
export function validateCoordinates(latitude: number, longitude: number): void {
  if (
    latitude === undefined ||
    latitude === null ||
    isNaN(latitude) ||
    latitude < -90 ||
    latitude > 90
  ) {
    throw new Error('Valid latitude between -90 and 90 is required.');
  }

  if (
    longitude === undefined ||
    longitude === null ||
    isNaN(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error('Valid longitude between -180 and 180 is required.');
  }
}

// Check whether given coordinates fall within valid geographic boundaries.
export function isValidCoordinates(
  latitude?: number | null,
  longitude?: number | null
): boolean {
  if (
    latitude === undefined ||
    latitude === null ||
    isNaN(latitude) ||
    latitude < -90 ||
    latitude > 90
  ) {
    return false;
  }

  if (
    longitude === undefined ||
    longitude === null ||
    isNaN(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    return false;
  }

  return true;
}