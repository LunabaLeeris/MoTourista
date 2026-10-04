import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import { NominatimResponse, LocationResult } from '../types/location'
import { VisitedLocation } from '../types/map';

// Convert coordinates to a readable city and region text string.
export async function reverseGeocodeCoordinates(
  latitude: number,
  longitude: number
): Promise<string> {
  const fallback = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

  // Attempt native reverse geocoding when not running on web.
  if (Platform.OS !== 'web') {
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
      // Fall through to OpenStreetMap geocoder.
    }
  }

  // Network geocoding fallback using OpenStreetMap Nominatim.
  try {
    const endpoint = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`;
    const response = await fetch(endpoint, {
      headers: {
        'User-Agent': 'MoTourista-App/1.0',
      },
    });

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
    // Fall back to numeric coordinates.
  }

  return fallback;
}

// Request permission and retrieve current rider GPS location with address.
export async function getCurrentRiderLocation(): Promise<LocationResult> {
  const isServicesEnabled = await Location.hasServicesEnabledAsync();
  if (!isServicesEnabled) {
    throw new Error(
      'Location is turned off. Please turn on Location in your device settings.'
    );
  }

  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Location permission was denied by the user.');
  }

  let position: Location.LocationObject | null = null;

  try {
    position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
  } catch (error: any) {
    // Attempt to read the last known location if the active request fails.
    try {
      position = await Location.getLastKnownPositionAsync({});
    } catch {
      // Ignore fallback errors.
    }

    if (!position) {
      if (
        error?.message?.includes('LocationServices.API') ||
        error?.message?.includes('SERVICE_INVALID')
      ) {
        throw new Error(
          'Google Play Location Services is unavailable on this device. Please enter your location manually.'
        );
      }
      throw error;
    }
  }

  const { latitude, longitude } = position.coords;
  const readableLocation = await reverseGeocodeCoordinates(latitude, longitude);

  return {
    latitude,
    longitude,
    readableLocation,
  };
}

// Fetch every distinct location the user has visited, newest visit first.
// Repeat visits to the same location are merged into one entry with a visit count.
export async function fetchVisitedLocations(userId: string): Promise<VisitedLocation[]> {
  if (!userId) return [];

  const { data, error } = await supabase
    .from('location_visits')
    .select(
      `
      id,
      visited_at,
      notes,
      locations (
        id,
        title,
        address,
        latitude,
        longitude,
        status_id,
        location_tags (
          tags (
            id,
            name,
            icon
          )
        )
      )
    `
    )
    .eq('user_id', userId)
    .order('visited_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Failed to load visited locations.');
  }

  const byLocation = new Map<string, VisitedLocation>();

  for (const visit of (data as any[]) || []) {
    // The joined location can be returned as an object or a single-item array.
    const loc = Array.isArray(visit.locations) ? visit.locations[0] : visit.locations;
    if (!loc || loc.latitude == null || loc.longitude == null) continue;

    const existing = byLocation.get(loc.id);
    if (existing) {
      // Rows are sorted newest first, so the first one seen is the latest visit.
      existing.visitCount += 1;
      continue;
    }

    const firstTag = loc.location_tags?.[0]?.tags;
    const tag = Array.isArray(firstTag) ? firstTag[0] : firstTag;

    byLocation.set(loc.id, {
      id: loc.id,
      title: loc.title || 'Visited Spot',
      latitude: loc.latitude,
      longitude: loc.longitude,
      tagId: tag?.id,
      tagName: tag?.name,
      tagIcon: tag?.icon,
      address: loc.address || undefined,
      isApproved: loc.status_id === 'approved',
      latestVisitId: visit.id,
      latestVisitedAt: visit.visited_at,
      visitCount: 1,
      notes: visit.notes || undefined,
    });
  }

  return Array.from(byLocation.values());
}