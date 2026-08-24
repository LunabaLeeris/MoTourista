import { Platform } from 'react-native';
import * as Location from 'expo-location';

// Coordinate representation for geographic positions.
export interface Coordinates {
  latitude: number;
  longitude: number;
}

// Complete rider location result with geographic coordinates and text address.
export interface LocationResult {
  latitude: number;
  longitude: number;
  readableLocation: string;
}

// Structure of OpenStreetMap reverse geocoding API response.
interface NominatimAddress {
  city?: string;
  town?: string;
  municipality?: string;
  county?: string;
  state?: string;
  region?: string;
  country?: string;
}

interface NominatimResponse {
  address?: NominatimAddress;
  display_name?: string;
}

// Convert coordinates to a readable city and region text string.
export async function reverseGeocodeCoordinates(
  latitude: number,
  longitude: number
): Promise<string> {
  const fallback = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

  if (Platform.OS === 'web') {
    try {
      const endpoint = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`;
      const response = await fetch(endpoint);

      if (response.ok) {
        const data: NominatimResponse = await response.json();
        const address = data.address;

        const city =
          address?.city ||
          address?.town ||
          address?.municipality ||
          address?.county;
        const region = address?.state || address?.region || address?.country;

        const parts = [city, region].filter(Boolean);
        if (parts.length > 0) {
          return parts.join(', ');
        }
      }
    } catch {
      // The function falls back to numeric coordinates if network requests fail.
    }
    return fallback;
  }

  // Native mobile geocoding.
  try {
    const geocode = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });

    if (geocode && geocode.length > 0) {
      const place = geocode[0];
      const parts = [
        place.city || place.subregion || place.district,
        place.region || place.country,
      ].filter(Boolean);

      if (parts.length > 0) {
        return parts.join(', ');
      }
    }
  } catch {
    // The function falls back to numeric coordinates if native geocoder fails.
  }

  return fallback;
}

// Request permission and retrieve current rider GPS location with address.
export async function getCurrentRiderLocation(): Promise<LocationResult> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Location permission was denied by the user.');
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  const { latitude, longitude } = position.coords;
  const readableLocation = await reverseGeocodeCoordinates(latitude, longitude);

  return {
    latitude,
    longitude,
    readableLocation,
  };
}
