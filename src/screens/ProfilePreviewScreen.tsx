import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../types/navigation';
import { BadgeWithProgress } from '../types/database';
import { fetchBadgesWithProgress } from '../services/badgeService';
import { MoTouristaMap } from '../components/maps';
import { MoTouristaMapRef, VisitedLocation } from '../types/map';
import { fetchVisitedLocations } from '../services/locationService';
import VisitedLocationsList from '../components/profile/VisitedLocationsList';

// Sample reviews published by this rider for testing
const SAMPLE_USER_REVIEWS = [
  {
    id: 'rev-1',
    locationName: 'Marilaque Mountain Pass Overlook',
    address: 'Tanay, Rizal',
    rating: 5,
    date: '2 days ago',
    comment:
      'Smooth asphalt with scenic winding mountain views! Best time to ride is early morning around 6 AM to beat the crowd. Make sure your tires have good grip.',
    likesCount: 14,
    images: ['#C7D2FE', '#E0E7FF'],
  },
  {
    id: 'rev-2',
    locationName: 'Kaybiang Tunnel Pitstop',
    address: 'Ternate - Nasugbu Highway, Cavite',
    rating: 4,
    date: '1 week ago',
    comment:
      'Iconic tunnel and great coastal sea views right after exiting. Road has a few patches under maintenance so watch your corner speed.',
    likesCount: 8,
    images: ['#DDE5D8', '#E2E8F0'],
  },
  {
    id: 'rev-3',
    locationName: 'Tagaytay Ridge Pares & Grill',
    address: 'Tagaytay, Cavite',
    rating: 5,
    date: '2 weeks ago',
    comment:
      'Warm hot bulalo and pares with a cool mountain breeze. Plenty of motorcycle parking available and very rider-friendly staff.',
    likesCount: 21,
    images: ['#FEE2E2'],
  },
];

export default function ProfilePreviewScreen() {
  const { user, profile, isLoading, signOut } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const effectiveUserId = user?.id || '';

  const [badges, setBadges] = useState<BadgeWithProgress[]>([]);
  const [selectedBadge, setSelectedBadge] = useState<BadgeWithProgress | null>(null);
  const [loadingBadges, setLoadingBadges] = useState(true);
  const [activeSection, setActiveSection] = useState<'maps' | 'reviews' | null>('maps');
  const [mapViewMode, setMapViewMode] = useState<'map' | 'list'>('map');
  const [visitedLocations, setVisitedLocations] = useState<VisitedLocation[]>([]);
  const [loadingVisits, setLoadingVisits] = useState(false);
  const [visitsError, setVisitsError] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<{ latitude: number; longitude: number; zoom: number }>({
    latitude: 12.8797,
    longitude: 121.774,
    zoom: 5.2,
  });
  const mapRef = useRef<MoTouristaMapRef>(null);

  useFocusEffect(
    useCallback(() => {
      if (effectiveUserId) {
        loadBadges();
        loadVisitedLocations();
      }
    }, [effectiveUserId])
  );

  const loadVisitedLocations = async () => {
    if (!effectiveUserId) return;
    try {
      setLoadingVisits(true);
      setVisitsError(null);
      const locations = await fetchVisitedLocations(effectiveUserId);
      setVisitedLocations(locations);
    } catch (err: any) {
      console.error('Error loading visited locations:', err);
      setVisitsError(err?.message || 'Could not load visited locations.');
    } finally {
      setLoadingVisits(false);
    }
  };

  const handleViewOnMap = (location: VisitedLocation) => {
    setMapCenter({ latitude: location.latitude, longitude: location.longitude, zoom: 14 });
    setMapViewMode('map');
  };

  const loadBadges = async () => {
    try {
      setLoadingBadges(true);
      const userBadges = await fetchBadgesWithProgress(effectiveUserId);
      setBadges(userBadges);
    } catch {
      // The function ignores errors during badge retrieval.
    } finally {
      setLoadingBadges(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handleEditProfile = () => {
    navigation.navigate('EditProfile');
  };

  if (isLoading && !profile) {
    return (
      <View className="flex-1 bg-white items-center justify-center p-6">
        <ActivityIndicator color="#000" />
        <Text className="text-sm text-neutral-600 mt-2">
          Loading profile...
        </Text>
      </View>
    );
  }

  const driverLabel = profile?.driver_types?.label || 'None';
  const vehicleLabel = profile?.vehicle_types?.label || 'Not specified';
  const motorcycleModelLabel = profile?.motorcycle_models?.label || 'Not specified';
  const unlockedCount = badges.filter((b) => b.is_unlocked).length;

  return (
    <ScrollView
      className="flex-1 bg-white p-6 max-w-md w-full self-center"
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View className="flex-row items-center justify-between mb-6 pb-3 border-b border-neutral-200">
        <Text className="text-xl font-bold text-black">
          Rider Profile
        </Text>
        <TouchableOpacity
          onPress={handleSignOut}
          className="border border-neutral-300 px-3 py-1.5 rounded"
        >
          <Text className="text-xs text-black">Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Photo Preview */}
      <View className="items-center mb-6">
        {profile?.avatar_url ? (
          <Image
            source={{ uri: profile.avatar_url }}
            className="w-24 h-24 rounded border border-neutral-300 mb-2"
          />
        ) : (
          <View className="w-24 h-24 rounded border border-neutral-300 items-center justify-center mb-2">
            <Text className="text-xs text-neutral-400">No Photo</Text>
          </View>
        )}
        <Text className="text-lg font-bold text-black">
          {profile?.full_name || 'No Name'}
        </Text>
        <Text className="text-xs text-neutral-600">
          {profile?.location_name || 'No Location'}
        </Text>
      </View>

      {/* Profile Details List */}
      <View className="border border-neutral-200 rounded p-4 mb-6">
        <View className="flex-row justify-between py-2 border-b border-neutral-100">
          <Text className="text-xs text-neutral-500">License Type</Text>
          <Text className="text-xs font-medium text-black">{driverLabel}</Text>
        </View>

        <View className="flex-row justify-between py-2 border-b border-neutral-100">
          <Text className="text-xs text-neutral-500">Vehicle Type</Text>
          <Text className="text-xs font-medium text-black">{vehicleLabel}</Text>
        </View>

        <View className="flex-row justify-between py-2 border-b border-neutral-100">
          <Text className="text-xs text-neutral-500">Motorcycle Model</Text>
          <Text className="text-xs font-medium text-black">{motorcycleModelLabel}</Text>
        </View>

        <View className="flex-row justify-between py-2">
          <Text className="text-xs text-neutral-500">Coordinates</Text>
          <Text className="text-xs text-black">
            {profile?.latitude && profile?.longitude
              ? `${profile.latitude.toFixed(4)}, ${profile.longitude.toFixed(4)}`
              : 'None'}
          </Text>
        </View>
      </View>

      {/* Badges Section */}
      <View className="mb-6">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-sm font-bold text-black uppercase tracking-wider">
            Badges & Achievements
          </Text>
          <Text className="text-xs text-neutral-500">
            {unlockedCount} / {badges.length} Unlocked
          </Text>
        </View>

        {loadingBadges ? (
          <View className="border border-neutral-200 rounded p-4 items-center justify-center">
            <ActivityIndicator size="small" color="#000" />
            <Text className="text-xs text-neutral-500 mt-2">
              Loading badges...
            </Text>
          </View>
        ) : badges.length === 0 ? (
          <View className="border border-neutral-200 rounded p-4 items-center">
            <Text className="text-xs text-neutral-400">
              No badges available yet.
            </Text>
          </View>
        ) : (
          <View className="flex-row flex-wrap justify-between gap-y-4">
            {badges.map((badge) => {
              const progressRatio = Math.min(
                1,
                badge.current_progress / badge.target_progress
              );
              const progressPercentage = Math.round(progressRatio * 100);

              return (
                <TouchableOpacity
                  key={badge.id}
                  onPress={() => setSelectedBadge(badge)}
                  activeOpacity={0.7}
                  className="w-[22%] items-center"
                >
                  <View
                    className={`w-14 h-14 rounded-xl items-center justify-center border ${badge.is_unlocked
                      ? 'bg-black border-black shadow-sm'
                      : 'bg-neutral-100 border-neutral-200'
                      }`}
                  >
                    <MaterialCommunityIcons
                      name={(badge.icon || 'trophy-outline') as any}
                      size={26}
                      color={badge.is_unlocked ? '#ffffff' : '#737373'}
                    />
                  </View>

                  {/* Small Progress Bar */}
                  <View className="w-12 h-1.5 bg-neutral-200 rounded-full overflow-hidden mt-1.5">
                    <View
                      className={`h-full rounded-full ${badge.is_unlocked ? 'bg-black' : 'bg-neutral-600'
                        }`}
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* Action Button */}
      <TouchableOpacity
        onPress={handleEditProfile}
        className="border border-black p-3 rounded items-center justify-center mb-3"
      >
        <Text className="text-sm font-medium text-black">
          Edit Information
        </Text>
      </TouchableOpacity>

      {/* Rider Actions: Maps & Reviews Buttons */}
      <View className="flex-row gap-3 mb-6">
        <TouchableOpacity
          onPress={() => setActiveSection((prev) => (prev === 'maps' ? null : 'maps'))}
          className={`flex-1 p-3.5 rounded-xl flex-row items-center justify-center shadow-sm ${
            activeSection === 'maps'
              ? 'bg-black'
              : 'border border-neutral-300 bg-neutral-50'
          }`}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="map-marker-path"
            size={18}
            color={activeSection === 'maps' ? '#ffffff' : '#000000'}
          />
          <Text
            className={`text-sm font-semibold ml-2 ${
              activeSection === 'maps' ? 'text-white' : 'text-black'
            }`}
          >
            Maps
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveSection((prev) => (prev === 'reviews' ? null : 'reviews'))}
          className={`flex-1 p-3.5 rounded-xl flex-row items-center justify-center shadow-sm ${
            activeSection === 'reviews'
              ? 'bg-black'
              : 'border border-neutral-300 bg-neutral-50'
          }`}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="comment-text-outline"
            size={18}
            color={activeSection === 'reviews' ? '#ffffff' : '#000000'}
          />
          <Text
            className={`text-sm font-semibold ml-2 ${
              activeSection === 'reviews' ? 'text-white' : 'text-black'
            }`}
          >
            Reviews
          </Text>
        </TouchableOpacity>
      </View>

      {/* Inline Section Content */}
      {activeSection === 'maps' && (
        <View className="mb-8">
          {/* Maps Section Header with Map / List Toggle */}
          <View className="flex-row items-center justify-between mb-3">
            <View>
              <Text className="text-sm font-bold text-black uppercase tracking-wider">
                Visited Locations
              </Text>
              <Text className="text-xs text-neutral-500">
                {visitedLocations.length} {visitedLocations.length === 1 ? 'spot' : 'spots'} visited in the Philippines
              </Text>
            </View>

            {/* Toggle: Map View vs List View */}
            <View className="flex-row bg-neutral-100 p-1 rounded-xl border border-neutral-200">
              <TouchableOpacity
                onPress={() => setMapViewMode('map')}
                className={`flex-row items-center px-3.5 py-2 rounded-lg ${
                  mapViewMode === 'map' ? 'bg-black' : 'bg-transparent'
                }`}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons
                  name="map"
                  size={15}
                  color={mapViewMode === 'map' ? '#ffffff' : '#525252'}
                />
                <Text
                  className={`text-xs ml-1.5 font-bold ${
                    mapViewMode === 'map' ? 'text-white' : 'text-neutral-600'
                  }`}
                >
                  Map View
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setMapViewMode('list')}
                className={`flex-row items-center px-3.5 py-2 rounded-lg ${
                  mapViewMode === 'list' ? 'bg-black' : 'bg-transparent'
                }`}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons
                  name="format-list-bulleted"
                  size={15}
                  color={mapViewMode === 'list' ? '#ffffff' : '#525252'}
                />
                <Text
                  className={`text-xs ml-1.5 font-bold ${
                    mapViewMode === 'list' ? 'text-white' : 'text-neutral-600'
                  }`}
                >
                  List View
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Conditional: Map View or List View */}
          {mapViewMode === 'map' ? (
            /* Interactive Philippines Map - Full Width & Height */
            <View className="-mx-6 h-[520px] bg-[#0c1017] border-y border-neutral-800 relative mb-4">
              <MoTouristaMap
                ref={mapRef}
                markers={visitedLocations}
                initialCenter={{ latitude: mapCenter.latitude, longitude: mapCenter.longitude }}
                initialZoom={mapCenter.zoom}
              />

              {/* Floating Top Right Recenter Philippines Button */}
              <TouchableOpacity
                onPress={() => {
                  setMapCenter({ latitude: 12.8797, longitude: 121.774, zoom: 5.2 });
                  mapRef.current?.flyTo({ latitude: 12.8797, longitude: 121.774 }, 5.2);
                }}
                className="absolute top-4 right-4 bg-[#131926]/90 border border-neutral-700/80 px-3 py-2 rounded-xl flex-row items-center shadow-lg backdrop-blur-md"
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="earth" size={16} color="#38bdf8" />
                <Text className="text-xs font-semibold text-white ml-1.5">
                  Philippines
                </Text>
              </TouchableOpacity>

              {/* Bottom Floating Stats Banner */}
              <View className="absolute bottom-4 left-4 right-4 bg-[#131926]/95 border border-neutral-700/80 rounded-2xl p-3.5 shadow-xl backdrop-blur-md">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <View className="w-9 h-9 rounded-full bg-rose-600/20 border border-rose-500/40 items-center justify-center mr-3">
                      <MaterialCommunityIcons name="map-marker-check" size={20} color="#f43f5e" />
                    </View>
                    <View>
                      <Text className="text-xs font-bold text-white">
                        Philippine Visited Map
                      </Text>
                      <Text className="text-[10px] text-neutral-400">
                        {visitedLocations.length} locations visited across the archipelago
                      </Text>
                    </View>
                  </View>

                  <View className="bg-rose-500/20 px-2.5 py-1 rounded-full border border-rose-500/30">
                    <Text className="text-[10px] font-semibold text-rose-400">
                      Active Rider
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ) : (
            <VisitedLocationsList
              locations={visitedLocations}
              loading={loadingVisits}
              error={visitsError}
              onViewOnMap={handleViewOnMap}
              onRetry={loadVisitedLocations}
            />
          )}
        </View>
      )}

      {activeSection === 'reviews' && (
        <View className="mb-8">
          <View className="flex-row items-center justify-between mb-3">
            <View>
              <Text className="text-sm font-bold text-black uppercase tracking-wider">
                My Reviews
              </Text>
              <Text className="text-xs text-neutral-500">
                {SAMPLE_USER_REVIEWS.length} published reviews
              </Text>
            </View>
            <View className="bg-neutral-100 px-2.5 py-1 rounded-full border border-neutral-200">
              <Text className="text-[10px] font-bold text-neutral-700">
                Rider Feedback
              </Text>
            </View>
          </View>

          {/* Reviews List */}
          {SAMPLE_USER_REVIEWS.map((review) => (
            <View
              key={review.id}
              className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-sm mb-3.5"
            >
              {/* Review Header: Location & Date */}
              <View className="flex-row items-start justify-between mb-1.5">
                <View className="flex-1 mr-2">
                  <Text className="text-sm font-bold text-neutral-900">
                    {review.locationName}
                  </Text>
                  <View className="flex-row items-center mt-0.5">
                    <MaterialCommunityIcons
                      name="map-marker-outline"
                      size={12}
                      color="#737373"
                    />
                    <Text className="text-[11px] text-neutral-500 ml-1">
                      {review.address}
                    </Text>
                  </View>
                </View>
                <Text className="text-[10px] text-neutral-400">
                  {review.date}
                </Text>
              </View>

              {/* Star Rating */}
              <View className="flex-row items-center mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <MaterialCommunityIcons
                    key={star}
                    name={star <= review.rating ? 'star' : 'star-outline'}
                    size={14}
                    color="#F59E0B"
                  />
                ))}
                <Text className="text-xs font-bold text-neutral-800 ml-1.5">
                  {review.rating}.0
                </Text>
              </View>

              {/* Review Comment */}
              <Text className="text-xs text-neutral-700 leading-relaxed mb-3">
                {review.comment}
              </Text>

              {/* Photo Thumbnails */}
              {review.images && review.images.length > 0 && (
                <View className="flex-row gap-2 mb-2.5">
                  {review.images.map((colorBg, idx) => (
                    <View
                      key={idx}
                      className="w-16 h-16 rounded-xl items-center justify-center border border-neutral-200"
                      style={{ backgroundColor: colorBg }}
                    >
                      <MaterialCommunityIcons
                        name="image-outline"
                        size={18}
                        color="#4B5563"
                      />
                    </View>
                  ))}
                </View>
              )}

              {/* Footer: Helpful Count */}
              <View className="flex-row items-center justify-between pt-2 border-t border-neutral-100">
                <View className="flex-row items-center">
                  <MaterialCommunityIcons
                    name="thumb-up-outline"
                    size={13}
                    color="#059669"
                  />
                  <Text className="text-[11px] text-neutral-600 ml-1">
                    {review.likesCount} riders found helpful
                  </Text>
                </View>

                <View className="bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <Text className="text-[9px] text-emerald-700 font-semibold">
                    Verified Visit
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Badge Details Modal */}
      <Modal
        visible={selectedBadge !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedBadge(null)}
      >
        <Pressable
          className="flex-1 bg-black/60 justify-center items-center p-6"
          onPress={() => setSelectedBadge(null)}
        >
          {selectedBadge && (
            <Pressable
              className="bg-white rounded-2xl p-6 w-full max-w-sm border border-neutral-200 items-center"
              onPress={(e) => e.stopPropagation()}
            >
              {/* Badge Icon */}
              <View
                className={`w-20 h-20 rounded-2xl items-center justify-center border mb-4 ${selectedBadge.is_unlocked
                  ? 'bg-black border-black'
                  : 'bg-neutral-100 border-neutral-200'
                  }`}
              >
                <MaterialCommunityIcons
                  name={(selectedBadge.icon || 'trophy-outline') as any}
                  size={42}
                  color={selectedBadge.is_unlocked ? '#ffffff' : '#737373'}
                />
              </View>

              {/* Badge Title */}
              <Text className="text-lg font-bold text-black text-center mb-1">
                {selectedBadge.title}
              </Text>

              {/* Status Badge */}
              {selectedBadge.is_unlocked ? (
                <View className="bg-black px-2.5 py-0.5 rounded-full mb-3">
                  <Text className="text-[11px] font-semibold text-white">
                    Unlocked
                  </Text>
                </View>
              ) : (
                <View className="bg-neutral-200 px-2.5 py-0.5 rounded-full mb-3">
                  <Text className="text-[11px] font-medium text-neutral-700">
                    In Progress
                  </Text>
                </View>
              )}

              {/* Badge Description */}
              <Text className="text-xs text-neutral-600 text-center mb-5 leading-5">
                {selectedBadge.description}
              </Text>

              {/* Progress Card */}
              <View className="w-full bg-neutral-50 rounded-xl p-3.5 border border-neutral-200 mb-5">
                <View className="flex-row justify-between items-center mb-1.5">
                  <Text className="text-xs text-neutral-500">Progress</Text>
                  <Text className="text-xs font-semibold text-black">
                    {selectedBadge.current_progress} / {selectedBadge.target_progress} (
                    {Math.min(
                      100,
                      Math.round(
                        (selectedBadge.current_progress /
                          selectedBadge.target_progress) *
                        100
                      )
                    )}
                    %)
                  </Text>
                </View>

                {/* Progress Bar */}
                <View className="h-2 bg-neutral-200 rounded-full overflow-hidden">
                  <View
                    className="h-full bg-black rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          (selectedBadge.current_progress /
                            selectedBadge.target_progress) *
                          100
                        )
                      )}%`,
                    }}
                  />
                </View>

                {selectedBadge.is_unlocked && selectedBadge.acquired_at && (
                  <Text className="text-[10px] text-neutral-400 mt-2 text-center">
                    Acquired on{' '}
                    {new Date(selectedBadge.acquired_at).toLocaleDateString()}
                  </Text>
                )}
              </View>

              {/* Close Button */}
              <TouchableOpacity
                onPress={() => setSelectedBadge(null)}
                className="bg-black py-3 rounded-xl items-center w-full"
              >
                <Text className="text-white font-medium text-sm">Close</Text>
              </TouchableOpacity>
            </Pressable>
          )}
        </Pressable>
      </Modal>
    </ScrollView>
  );
}
