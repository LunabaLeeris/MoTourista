import React, { useEffect, useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../types/navigation';
import { BadgeWithProgress } from '../types/database';
import { fetchBadgesWithProgress } from '../services/badgeService';

export default function ProfilePreviewScreen() {
  const { user, profile, isLoading, signOut } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const effectiveUserId = user?.id || '';

  const [badges, setBadges] = useState<BadgeWithProgress[]>([]);
  const [selectedBadge, setSelectedBadge] = useState<BadgeWithProgress | null>(null);
  const [loadingBadges, setLoadingBadges] = useState(true);

  useEffect(() => {
    if (effectiveUserId) {
      loadBadges();
    }
  }, [effectiveUserId]);

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
    <ScrollView className="flex-1 bg-white p-6 max-w-md w-full self-center">
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
        className="border border-black p-3 rounded items-center justify-center mb-8"
      >
        <Text className="text-sm font-medium text-black">
          Edit Information
        </Text>
      </TouchableOpacity>

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
