import { MapBounds } from '../types/map';
import { Coordinates } from '../types/location';

// Geographic boundary coordinate limits for the Philippines.
export const PHILIPPINES_BOUNDS = {
  minLatitude: 4.5,
  maxLatitude: 21.5,
  minLongitude: 116.0,
  maxLongitude: 127.0,
};

// Map camera bounding box with margin around the Philippine archipelago.
// Uses [longitude, latitude] coordinate format.
export const PHILIPPINES_CAMERA_BOUNDS: MapBounds = {
  southWest: [114.0, 4.0],
  northEast: [128.5, 21.5],
};

// Default coordinates for Manila city center.
export const DEFAULT_MANILA_COORDINATES: Coordinates = {
  latitude: 14.5995,
  longitude: 120.9842,
};

export type TileProviderType = 'openfreemap' | 'carto_dark' | 'maptiler' | 'stadia' | 'osm';

export interface MapConfig {
  provider: TileProviderType;
  // Optional API key for commercial tile providers.
  apiKey?: string;
  // Custom style URL if user specifies their own style JSON.
  customStyleUrl?: string;
  // Camera limits for the Philippines.
  bounds: MapBounds;
  zoom: {
    min: number;
    max: number;
    default: number;
  };
}

// Current active map configuration.
export const ACTIVE_MAP_CONFIG: MapConfig = {
  provider: 'openfreemap',
  bounds: PHILIPPINES_CAMERA_BOUNDS,
  zoom: {
    min: 5.0,
    max: 17.0,
    default: 12.0,
  },
};


// Returns style specification or style URL for MapLibre GL.
export function getMapStyleUrl(config: MapConfig = ACTIVE_MAP_CONFIG): string {
  if (config.customStyleUrl) {
    return config.customStyleUrl;
  }

  const mapTilerKey = process.env.EXPO_PUBLIC_MAPTILER_API_KEY || config.apiKey;
  const stadiaKey = process.env.EXPO_PUBLIC_STADIA_API_KEY || config.apiKey;

  switch (config.provider) {
    case 'maptiler':
      if (!mapTilerKey) {
        console.warn('MapTiler key missing. Falling back to open dark style.');
        return 'https://tiles.openfreemap.org/styles/dark';
      }
      return `https://api.maptiler.com/maps/ch-dark/style.json?key=${mapTilerKey}`;

    case 'stadia':
      if (!stadiaKey) {
        console.warn('Stadia key missing. Falling back to open dark style.');
        return 'https://tiles.openfreemap.org/styles/dark';
      }
      return `https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json?api_key=${stadiaKey}`;

    case 'openfreemap':
      // OpenFreeMap vector dark theme. Requires zero API keys.
      return 'https://tiles.openfreemap.org/styles/dark';

    case 'carto_dark':
    default:
      // Minimal high-contrast dark style. Requires zero API keys.
      return 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
  }
}
