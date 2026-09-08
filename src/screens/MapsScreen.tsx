import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Alert } from 'react-native';
import {
  MoTouristaMap,
  MapSearchBar,
  MapFloatingControls,
  MapLocationCard,
  MapNewsfeedOverlay,
} from '../components/maps';
import { Coordinates } from '../types/location';
import { DEFAULT_MANILA_COORDINATES } from '../config/mapConfig';
import { getCurrentRiderLocation } from '../services/locationService';
import { fetchApprovedLocations } from '../services/postService';
import { getTags } from '../services/lookupService';
import { calculateRouteToMarkedLocation } from '../services/routingService';
import { TagRow, LocationWithDetails } from '../types/database';
import { MapMarker, MoTouristaMapRef, RouteResult } from '../types/map';
import { filterAndTransformLocations } from '../lib/markers';

/**
 * Main Maps Screen.
 * Composes map rendering, search/filters header, floating controls,
 * newsfeed overlay, and marked location details sheet.
 * Styled using Tailwind CSS utility classes.
 */
export default function MapsScreen() {
  const mapRef = useRef<MoTouristaMapRef>(null);

  // Rider position state.
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Locations and tags data state.
  const [rawLocations, setRawLocations] = useState<LocationWithDetails[]>([]);
  const [tags, setTags] = useState<TagRow[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Map interaction state.
  const [selectedLocation, setSelectedLocation] = useState<MapMarker | null>(null);
  const [activeRoute, setActiveRoute] = useState<RouteResult | null>(null);
  const [isRouting, setIsRouting] = useState(false);

  // View mode: 'map' or 'newsfeed'.
  const [viewMode, setViewMode] = useState<'map' | 'newsfeed'>('map');

  // Load tags and approved locations on component mount.
  useEffect(() => {
    loadInitialData();
    locateRider();
  }, []);

  // Fetch cached tags and approved locations from backend.
  const loadInitialData = async () => {
    try {
      const [fetchedTags, fetchedLocations] = await Promise.all([
        getTags(),
        fetchApprovedLocations(),
      ]);
      setTags(fetchedTags);
      setRawLocations(fetchedLocations);
    } catch (err) {
      console.error('Failed to load initial map data:', err);
    }
  };

  // Obtain current rider GPS coordinates and center camera.
  const locateRider = async () => {
    setIsLocating(true);
    try {
      const location = await getCurrentRiderLocation();
      const coords: Coordinates = {
        latitude: location.latitude,
        longitude: location.longitude,
      };
      setUserLocation(coords);

      // Center map on user coordinates.
      mapRef.current?.flyTo(coords, 14);
    } catch {
      // Fallback to Manila center if permission is not granted.
      setUserLocation(DEFAULT_MANILA_COORDINATES);
      mapRef.current?.flyTo(DEFAULT_MANILA_COORDINATES, 12);
    } finally {
      setIsLocating(false);
    }
  };

  // Filter and convert raw database locations to MapMarker format.
  const markers: MapMarker[] = useMemo(() => {
    return filterAndTransformLocations(rawLocations, {
      query: searchQuery,
      tagId: selectedTagId,
    });
  }, [rawLocations, searchQuery, selectedTagId]);

  // Handle marker selection.
  const handleSelectMarker = (marker: MapMarker) => {
    setSelectedLocation(marker);
    mapRef.current?.flyTo({ latitude: marker.latitude, longitude: marker.longitude }, 15);
  };

  // Handle map tap to deselect marker.
  const handleMapPress = () => {
    if (selectedLocation && !activeRoute) {
      setSelectedLocation(null);
    }
  };

  // Handle "center" red button tap.
  const handleCenterPress = () => {
    if (userLocation) {
      mapRef.current?.recenter();
    } else {
      locateRider();
    }
  };

  // Handle motorcycle route navigation request.
  const handleStartNavigation = async () => {
    if (!selectedLocation) return;

    const origin = userLocation || DEFAULT_MANILA_COORDINATES;
    const destination: Coordinates = {
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
    };

    setIsRouting(true);
    try {
      const route = await calculateRouteToMarkedLocation(origin, destination, true);
      setActiveRoute(route);
      mapRef.current?.drawRoute(route.coordinates);
    } catch (err: any) {
      Alert.alert('Routing Error', err.message || 'Could not calculate motorcycle route.');
    } finally {
      setIsRouting(false);
    }
  };

  // Clear current route and close bottom card.
  const handleClearNavigation = () => {
    setActiveRoute(null);
    setSelectedLocation(null);
    mapRef.current?.clearRoute();
  };

  return (
    <View className="flex-1 bg-[#0c1017] relative">
      {/* Background Map Component */}
      <MoTouristaMap
        ref={mapRef}
        markers={markers}
        userLocation={userLocation}
        selectedMarkerId={selectedLocation?.id}
        onMarkerPress={handleSelectMarker}
        onMapPress={handleMapPress}
      />

      {/* Top Floating Bar: Search Bar & Filters */}
      <MapSearchBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        tags={tags}
        selectedTagId={selectedTagId}
        onSelectTag={setSelectedTagId}
      />

      {/* Floating Action Controls on the Right */}
      <MapFloatingControls
        isLocating={isLocating}
        onCenterPress={handleCenterPress}
        viewMode={viewMode}
        onToggleViewMode={() => setViewMode(viewMode === 'map' ? 'newsfeed' : 'map')}
      />

      {/* Newsfeed List View Overlay */}
      <MapNewsfeedOverlay
        visible={viewMode === 'newsfeed'}
        markers={markers}
        userLocation={userLocation}
        onSelectMarker={(item) => {
          setViewMode('map');
          handleSelectMarker(item);
        }}
        onClose={() => setViewMode('map')}
      />

      {/* Bottom Description Section for Clicked Location */}
      {selectedLocation && viewMode === 'map' && (
        <MapLocationCard
          location={selectedLocation}
          userLocation={userLocation}
          activeRoute={activeRoute}
          isRouting={isRouting}
          onStartNavigation={handleStartNavigation}
          onClearNavigation={handleClearNavigation}
        />
      )}
    </View>
  );
}
