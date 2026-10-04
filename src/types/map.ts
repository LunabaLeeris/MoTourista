import { Coordinates } from "./location";

// Geographic boundary box with south-west and north-east coordinates [longitude, latitude].
export interface MapBounds {
  southWest: [number, number];
  northEast: [number, number];
}

// Representation of a marked location on the map.
export interface MapMarker {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  tagId?: string;
  tagName?: string;
  tagIcon?: string;
  address?: string;
  imageUrl?: string;
  isApproved?: boolean;
}

// A location a user has visited, with details of their most recent visit.
export interface VisitedLocation extends MapMarker {
  latestVisitId: string;
  latestVisitedAt: string;
  visitCount: number;
  notes?: string;
}

// Result of a calculated route polyline with distance and duration.
export interface RouteResult {
  coordinates: Coordinates[];
  distanceMeters: number;
  durationSeconds: number;
  summary?: string;
}

// Imperative controls exposed by the map component.
export interface MoTouristaMapRef {
  flyTo: (coords: Coordinates, zoom?: number) => void;
  recenter: () => void;
  fitBounds: (coordinates: Coordinates[]) => void;
  drawRoute: (coordinates: Coordinates[]) => void;
  clearRoute: () => void;
}

// Props accepted by the MoTouristaMap facade component.
export interface MoTouristaMapProps {
  markers?: MapMarker[];
  userLocation?: Coordinates | null;
  initialCenter?: Coordinates;
  initialZoom?: number;
  selectedMarkerId?: string | null;
  onMarkerPress?: (marker: MapMarker) => void;
  onMapPress?: () => void;
  onMapReady?: () => void;
  style?: object;
}
