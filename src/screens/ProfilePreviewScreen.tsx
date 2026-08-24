import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { ProfileWithDetails } from '../types/database';

interface ProfilePreviewScreenProps {
  userId: string;
  onEditProfile: () => void;
  onSignOut: () => void;
}

export default function ProfilePreviewScreen({
  userId,
  onEditProfile,
  onSignOut,
}: ProfilePreviewScreenProps) {
  const [profile, setProfile] = useState<ProfileWithDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*, driver_types (*), vehicle_types (*)')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      setProfile(data as ProfileWithDetails);
    } catch {
      // The function ignores errors during profile retrieval.
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    onSignOut();
  };

  if (loading) {
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

        <View className="flex-row justify-between py-2">
          <Text className="text-xs text-neutral-500">Coordinates</Text>
          <Text className="text-xs text-black">
            {profile?.latitude && profile?.longitude
              ? `${profile.latitude.toFixed(4)}, ${profile.longitude.toFixed(4)}`
              : 'None'}
          </Text>
        </View>
      </View>

      {/* Action Button */}
      <TouchableOpacity
        onPress={onEditProfile}
        className="border border-black p-3 rounded items-center justify-center mb-8"
      >
        <Text className="text-sm font-medium text-black">
          Edit Information
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
