import { Coordinates } from './locationService';
import { isWithinPhilippines } from '../lib/locationRestrictions';
import { calculateHaversineDistance } from '../lib/distance';
import { RouteResult } from '../types/map';

export interface RoutingProvider {
  calculateRoute(
    origin: Coordinates,
    destination: Coordinates
  ): Promise<RouteResult>;
}

export class OsrmRoutingProvider implements RoutingProvider {
  async calculateRoute(
    origin: Coordinates,
    destination: Coordinates
  ): Promise<RouteResult> {
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MoTourista-Motorcycle-App/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Routing request failed with status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      throw new Error('No route found between coordinates.');
    }

    const route = data.routes[0];
    const coordinates: Coordinates[] = route.geometry.coordinates.map(
      (coord: [number, number]) => ({
        latitude: coord[1],
        longitude: coord[0],
      })
    );

    return {
      coordinates,
      distanceMeters: route.distance,
      durationSeconds: route.duration,
      summary: route.legs?.[0]?.summary,
    };
  }
}

// Active routing provider instance.
let activeProvider: RoutingProvider = new OsrmRoutingProvider();

// Set a custom routing provider such as self-hosted Valhalla.
export function setRoutingProvider(provider: RoutingProvider): void {
  activeProvider = provider;
}

/**
 * Calculates a motorcycle route from the rider current position to a marked destination.
 * Navigation is restricted strictly to marked locations within the Philippines.
 */
export async function calculateRouteToMarkedLocation(
  riderLocation: Coordinates,
  destinationLocation: Coordinates,
  isMarkedLocation = true
): Promise<RouteResult> {
  if (!isMarkedLocation) {
    throw new Error('Navigation is permitted only to marked locations.');
  }

  if (!isWithinPhilippines(destinationLocation.latitude, destinationLocation.longitude)) {
    throw new Error('Destination is outside the Philippine territory.');
  }

  try {
    return await activeProvider.calculateRoute(riderLocation, destinationLocation);
  } catch (error) {
    console.warn('Network routing failed. Generating straight path fallback.', error);

    // Fallback straight path if network is unavailable.
    return {
      coordinates: [riderLocation, destinationLocation],
      distanceMeters: calculateHaversineDistance(riderLocation, destinationLocation),
      durationSeconds: 0,
      summary: 'Direct line fallback',
    };
  }
}

