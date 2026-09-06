import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MoTouristaMap from '../components/maps/MoTouristaMap';
import { Coordinates, getCurrentRiderLocation, DEFAULT_MANILA_COORDINATES } from '../services/locationService';
import { fetchApprovedLocations } from '../services/postService';
import { getTags } from '../services/lookupService';
import { calculateRouteToMarkedLocation } from '../services/routingService';
import { TagRow, LocationWithDetails } from '../types/database';
import { MapMarker, MoTouristaMapRef, RouteResult } from '../types/map';
import { getFormattedDistance } from '../lib/distance';
import { filterAndTransformLocations, formatRouteDuration } from '../lib/markers';

/**
 * Main Maps Screen.
 * Faithful to wireframe design with top search and filters bar,
 * full-screen background map bounded to the Philippines,
 * red center button, red newsfeed view toggle button,
 * and bottom clicked location description sheet with motorcycle navigation.
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
    <View style={styles.container}>
      {/* Background Map Component */}
      <MoTouristaMap
        ref={mapRef}
        markers={markers}
        userLocation={userLocation}
        selectedMarkerId={selectedLocation?.id}
        onMarkerPress={handleSelectMarker}
        onMapPress={handleMapPress}
        style={styles.map}
      />

      {/* Top Floating Bar: Search Bar & Filters */}
      <SafeAreaView style={styles.topSafeArea}>
        <View style={styles.topControlsContainer}>
          <View style={styles.searchBarRow}>
            {/* Search Input Box */}
            <View style={styles.searchInputWrapper}>
              <MaterialCommunityIcons name="magnify" size={20} color="#64748b" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search"
                placeholderTextColor="#64748b"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <MaterialCommunityIcons name="close-circle" size={18} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>

            {/* Filters Button */}
            <TouchableOpacity
              style={[styles.filtersButton, showFilters && styles.filtersButtonActive]}
              onPress={() => setShowFilters(!showFilters)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filtersButtonText, showFilters && styles.filtersButtonTextActive]}>
                Filters
              </Text>
            </TouchableOpacity>
          </View>

          {/* Quick Tag Filter Chips Row (from cached tags) */}
          {(showFilters || selectedTagId) && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tagChipsList}
              style={styles.tagChipsScrollView}
            >
              <TouchableOpacity
                style={[styles.tagChip, selectedTagId === null && styles.tagChipActive]}
                onPress={() => setSelectedTagId(null)}
              >
                <Text style={[styles.tagChipText, selectedTagId === null && styles.tagChipTextActive]}>
                  All
                </Text>
              </TouchableOpacity>

              {tags.map((tag) => {
                const isActive = selectedTagId === tag.id;
                return (
                  <TouchableOpacity
                    key={tag.id}
                    style={[styles.tagChip, isActive && styles.tagChipActive]}
                    onPress={() => setSelectedTagId(isActive ? null : tag.id)}
                  >
                    <Text style={[styles.tagChipText, isActive && styles.tagChipTextActive]}>
                      {tag.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      </SafeAreaView>

      {/* Floating Action Controls on the Right */}
      <View style={styles.floatingControls}>
        {/* Red Circular Center Button */}
        <TouchableOpacity
          style={styles.centerButton}
          onPress={handleCenterPress}
          activeOpacity={0.85}
        >
          {isLocating ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.centerButtonText}>center</Text>
          )}
        </TouchableOpacity>

        {/* Red Pill Newsfeed View Button */}
        <TouchableOpacity
          style={[styles.newsfeedButton, viewMode === 'newsfeed' && styles.newsfeedButtonActive]}
          onPress={() => setViewMode(viewMode === 'map' ? 'newsfeed' : 'map')}
          activeOpacity={0.85}
        >
          <Text style={styles.newsfeedButtonText}>
            {viewMode === 'map' ? 'newsfeed view' : 'map view'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Newsfeed List View Modal / Overlay */}
      {viewMode === 'newsfeed' && (
        <View style={styles.newsfeedOverlay}>
          <View style={styles.newsfeedHeader}>
            <Text style={styles.newsfeedTitle}>Nearby Approved Spots</Text>
            <TouchableOpacity onPress={() => setViewMode('map')}>
              <MaterialCommunityIcons name="close" size={24} color="#000000" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={markers}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.newsfeedListContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No approved spots found.</Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.newsfeedCard}
                onPress={() => {
                  setViewMode('map');
                  handleSelectMarker(item);
                }}
              >
                <View style={styles.newsfeedCardHeader}>
                  <Text style={styles.newsfeedCardTitle}>{item.title}</Text>
                  {item.tagName && (
                    <View style={styles.tagBadge}>
                      <Text style={styles.tagBadgeText}>{item.tagName}</Text>
                    </View>
                  )}
                </View>

                {item.address ? (
                  <Text style={styles.newsfeedCardAddress} numberOfLines={1}>
                    {item.address}
                  </Text>
                ) : null}

                <View style={styles.newsfeedCardFooter}>
                  <Text style={styles.newsfeedCardDistance}>
                    {getFormattedDistance(userLocation, item)} away
                  </Text>
                  <Text style={styles.viewOnMapText}>View on map →</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Bottom Description Section for Clicked Location */}
      {selectedLocation && viewMode === 'map' && (
        <View style={styles.descriptionCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleContainer}>
              <Text style={styles.cardTitle}>{selectedLocation.title}</Text>
              {selectedLocation.tagName && (
                <View style={styles.cardTagBadge}>
                  <Text style={styles.cardTagText}>{selectedLocation.tagName}</Text>
                </View>
              )}
            </View>

            <TouchableOpacity onPress={handleClearNavigation} style={styles.cardCloseButton}>
              <MaterialCommunityIcons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {selectedLocation.address && (
            <Text style={styles.cardAddress} numberOfLines={2}>
              {selectedLocation.address}
            </Text>
          )}

          <View style={styles.cardInfoRow}>
            <View style={styles.distanceBadge}>
              <MaterialCommunityIcons name="map-marker-distance" size={16} color="#0284c7" />
              <Text style={styles.distanceText}>
                {getFormattedDistance(userLocation, selectedLocation)} away
              </Text>
            </View>

            {activeRoute && (
              <View style={styles.routeBadge}>
                <MaterialCommunityIcons name="motorbike" size={16} color="#16a34a" />
                <Text style={styles.routeDurationText}>
                  {formatRouteDuration(activeRoute.durationSeconds)}
                </Text>
              </View>
            )}
          </View>

          {/* Action Button: Navigate */}
          <View style={styles.cardActionRow}>
            {activeRoute ? (
              <TouchableOpacity
                style={[styles.navigateButton, styles.stopNavigateButton]}
                onPress={handleClearNavigation}
              >
                <MaterialCommunityIcons name="cancel" size={18} color="#ffffff" style={styles.buttonIcon} />
                <Text style={styles.navigateButtonText}>End Route</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.navigateButton}
                onPress={handleStartNavigation}
                disabled={isRouting}
              >
                {isRouting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="navigation-variant" size={18} color="#ffffff" style={styles.buttonIcon} />
                    <Text style={styles.navigateButtonText}>Navigate Route</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

// [CHANGE] ugly, we use tailwind 
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c1017',
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  topSafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  topControlsContainer: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInputWrapper: {
    flex: 1,
    height: 48,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#000000',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    color: '#000000',
    fontSize: 15,
    fontWeight: '400',
  },
  filtersButton: {
    height: 48,
    paddingHorizontal: 18,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  filtersButtonActive: {
    backgroundColor: '#000000',
  },
  filtersButtonText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '500',
  },
  filtersButtonTextActive: {
    color: '#ffffff',
  },
  tagChipsScrollView: {
    marginTop: 10,
  },
  tagChipsList: {
    gap: 8,
    paddingVertical: 2,
  },
  tagChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  tagChipActive: {
    backgroundColor: '#e11d48',
    borderColor: '#e11d48',
  },
  tagChipText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  tagChipTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  floatingControls: {
    position: 'absolute',
    right: 18,
    bottom: 240,
    alignItems: 'center',
    gap: 14,
    zIndex: 25,
  },
  centerButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#ef233c',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  centerButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  newsfeedButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#ef233c',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  newsfeedButtonActive: {
    backgroundColor: '#0f172a',
  },
  newsfeedButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  descriptionCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 30,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  cardTagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#fee2e2',
    borderRadius: 6,
  },
  cardTagText: {
    fontSize: 11,
    color: '#e11d48',
    fontWeight: '600',
  },
  cardCloseButton: {
    padding: 4,
    marginLeft: 8,
  },
  cardAddress: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 12,
    lineHeight: 18,
  },
  cardInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  distanceText: {
    fontSize: 12,
    color: '#0284c7',
    fontWeight: '600',
  },
  routeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  routeDurationText: {
    fontSize: 12,
    color: '#16a34a',
    fontWeight: '600',
  },
  cardActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  navigateButton: {
    flex: 1,
    height: 46,
    backgroundColor: '#e11d48',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#e11d48',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  stopNavigateButton: {
    backgroundColor: '#64748b',
  },
  buttonIcon: {
    marginRight: 6,
  },
  navigateButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  newsfeedOverlay: {
    position: 'absolute',
    top: 130,
    left: 16,
    right: 16,
    bottom: 20,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    zIndex: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 12,
  },
  newsfeedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 10,
  },
  newsfeedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  newsfeedListContent: {
    gap: 10,
    paddingBottom: 20,
  },
  newsfeedCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  newsfeedCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  newsfeedCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    flex: 1,
  },
  tagBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  tagBadgeText: {
    fontSize: 11,
    color: '#e11d48',
    fontWeight: '600',
  },
  newsfeedCardAddress: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
  },
  newsfeedCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  newsfeedCardDistance: {
    fontSize: 12,
    color: '#0284c7',
    fontWeight: '500',
  },
  viewOnMapText: {
    fontSize: 12,
    color: '#e11d48',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
  },
});
