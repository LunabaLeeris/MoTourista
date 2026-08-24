import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { Profile } from '../types/database';

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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch {
      // Ignored
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
      <View className="flex-1 bg-slate-950 items-center justify-center">
        <ActivityIndicator size="large" color="#F97316" />
        <Text className="text-slate-400 text-sm mt-3 font-medium">
          Loading Rider Profile...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-slate-950 px-6 py-12">
      {/* Top Bar */}
      <View className="flex-row items-center justify-between mb-8">
        <View className="flex-row items-center">
          <FontAwesome5 name="motorcycle" size={24} color="#F97316" />
          <Text className="text-xl font-extrabold text-white ml-2">
            Mo<Text className="text-orange-500">Tourista</Text>
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleSignOut}
          className="flex-row items-center bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg"
        >
          <Ionicons name="log-out-outline" size={16} color="#EF4444" />
          <Text className="text-red-400 text-xs font-semibold ml-1">Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Profile Card */}
      <View className="bg-slate-900 border border-slate-800 rounded-3xl p-6 items-center shadow-lg mb-6">
        {profile?.avatar_url ? (
          <Image
            source={{ uri: profile.avatar_url }}
            className="w-28 h-28 rounded-full border-4 border-orange-500 mb-4"
          />
        ) : (
          <View className="w-28 h-28 rounded-full bg-slate-800 border-4 border-orange-500 items-center justify-center mb-4">
            <Ionicons name="person" size={54} color="#94A3B8" />
          </View>
        )}

        <Text className="text-2xl font-bold text-white text-center">
          {profile?.full_name || 'Anonymous Rider'}
        </Text>

        <View className="flex-row items-center mt-1">
          <Ionicons name="location-sharp" size={16} color="#F97316" />
          <Text className="text-slate-400 text-sm ml-1">
            {profile?.location_name || 'Philippines'}
          </Text>
        </View>

        {/* Badges / Status row */}
        <View className="flex-row gap-2 mt-4">
          <View className="bg-orange-500/10 border border-orange-500/30 px-3 py-1 rounded-full">
            <Text className="text-orange-400 text-xs font-semibold uppercase">
              {profile?.driver_type || 'Rider'} License
            </Text>
          </View>
          <View className="bg-blue-500/10 border border-blue-500/30 px-3 py-1 rounded-full">
            <Text className="text-blue-400 text-xs font-semibold uppercase">
              {profile?.vehicle_type?.replace('_', ' ') || 'Motorcycle'}
            </Text>
          </View>
        </View>
      </View>

      {/* Rider Info Details */}
      <View className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6 space-y-4">
        <Text className="text-white font-bold text-base mb-2">
          Rider Credentials
        </Text>

        <View className="flex-row items-center justify-between py-2 border-b border-slate-800">
          <Text className="text-slate-400 text-sm">License Type</Text>
          <Text className="text-slate-200 font-semibold text-sm capitalize">
            {profile?.driver_type || 'None'}
          </Text>
        </View>

        <View className="flex-row items-center justify-between py-2 border-b border-slate-800">
          <Text className="text-slate-400 text-sm">Motorcycle Type</Text>
          <Text className="text-slate-200 font-semibold text-sm capitalize">
            {profile?.vehicle_type?.replace('_', ' ') || 'Not specified'}
          </Text>
        </View>

        <View className="flex-row items-center justify-between py-2">
          <Text className="text-slate-400 text-sm">GPS Coordinates</Text>
          <Text className="text-slate-200 font-semibold text-xs">
            {profile?.latitude && profile?.longitude
              ? `${profile.latitude.toFixed(4)}, ${profile.longitude.toFixed(4)}`
              : 'Not calibrated'}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <TouchableOpacity
        onPress={onEditProfile}
        activeOpacity={0.8}
        className="bg-slate-800 border border-slate-700 py-3.5 rounded-xl items-center justify-center flex-row mb-12"
      >
        <Ionicons name="create-outline" size={18} color="#FFFFFF" />
        <Text className="text-white font-semibold text-base ml-2">
          Update Rider Information
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
