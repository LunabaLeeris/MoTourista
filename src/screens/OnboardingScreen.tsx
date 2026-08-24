import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { DriverType, VehicleType } from '../types/database';

interface OnboardingScreenProps {
  userId: string;
  onCompleted: () => void;
}

// [QUESTION] can't this be parsed instead on the database? 
const DRIVER_TYPES: { label: string; value: DriverType; icon: string }[] = [
  { label: 'Student Permit', value: 'student', icon: 'card-bulleted-outline' },
  { label: 'Non-Professional', value: 'non-pro', icon: 'card-account-details-outline' },
  { label: 'Professional', value: 'pro', icon: 'shield-check-outline' },
  { label: 'None / Learning', value: 'none', icon: 'alert-circle-outline' },
];

// [QUESTION] can't this be parsed instead on the database? 
const VEHICLE_TYPES: { label: string; value: VehicleType; icon: string }[] = [
  { label: 'Scooter (Automatic)', value: 'scooter', icon: 'moped' },
  { label: 'Underbone / Semi', value: 'underbone', icon: 'motorbike' },
  { label: 'Backbone / Manual', value: 'backbone_manual', icon: 'motorcycle' },
  { label: 'Maxi Scooter (400cc+)', value: 'maxi_scooter', icon: 'moped' },
  { label: 'Adventure / Dual Sport', value: 'adventure', icon: 'compass-outline' },
  { label: 'Sportbike', value: 'sportbike', icon: 'speedometer' },
  { label: 'Cruiser / Classic', value: 'cruiser', icon: 'car-cruise-control' },
  { label: 'Other', value: 'other', icon: 'dots-horizontal-circle-outline' },
];

export default function OnboardingScreen({ userId, onCompleted }: OnboardingScreenProps) {
  const [fullName, setFullName] = useState('');
  const [locationName, setLocationName] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [driverType, setDriverType] = useState<DriverType>('non-pro');
  const [vehicleType, setVehicleType] = useState<VehicleType>('scooter');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    loadExistingProfile();
  }, []);

  const loadExistingProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data && !error) {
        if (data.full_name) setFullName(data.full_name);
        if (data.avatar_url) setAvatarUri(data.avatar_url);
        if (data.location_name) setLocationName(data.location_name);
        if (data.driver_type) setDriverType(data.driver_type);
        if (data.vehicle_type) setVehicleType(data.vehicle_type);
      }
    } catch {
      // The function ignores errors during initial setup.
    }
  };

  // Select a photo from the camera or the gallery.
  const handlePickPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please allow gallery access to select a rider photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch (err: any) {
      Alert.alert('Image Picker Error', err.message);
    }
  };

  // Get the current GPS location.
  const handleGetCurrentLocation = async () => {
    try {
      setLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Denied',
          'Please allow location access to auto-detect your current rider base.'
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude: lat, longitude: lng } = location.coords;
      setLatitude(lat);
      setLongitude(lng);

      // Convert coordinates to a city and province name.
      const geocode = await Location.reverseGeocodeAsync({
        latitude: lat,
        longitude: lng,
      });

      if (geocode && geocode.length > 0) {
        const place = geocode[0];
        const readableLocation = [
          place.city || place.subregion || place.district,
          place.region || place.country,
        ]
          .filter(Boolean)
          .join(', ');

        setLocationName(readableLocation || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      } else {
        setLocationName(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      }
    } catch (err: any) {
      Alert.alert('Location Error', `Could not fetch GPS location: ${err.message}`);
    } finally {
      setLocating(false);
    }
  };

  // Save the rider profile and finish onboarding.
  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      Alert.alert('Missing Name', 'Please enter your rider full name.');
      return;
    }

    try {
      setLoading(true);

      let uploadedAvatarUrl = avatarUri;

      // Update the profile table in the database.
      const { error } = await supabase.from('profiles').upsert({
        id: userId,
        full_name: fullName.trim(),
        avatar_url: uploadedAvatarUrl,
        location_name: locationName.trim() || 'Philippines',
        latitude: latitude,
        longitude: longitude,
        driver_type: driverType,
        vehicle_type: vehicleType,
        is_onboarded: true,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      Alert.alert('Profile Complete!', 'Welcome to MoTourista Philippines!');
      onCompleted();
    } catch (err: any) {
      Alert.alert('Save Error', err.message || 'Failed to save rider information.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-slate-950"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        className="px-6 py-10"
      >
        {/* Header section */}
        <View className="mb-6">
          <Text className="text-2xl font-extrabold text-white">
            Rider <Text className="text-orange-500">Information</Text>
          </Text>
          <Text className="text-slate-400 text-sm mt-1">
            Complete your profile to start logging Philippine motorcycle hotspots!
          </Text>
        </View>

        {/* Photo selection section */}
        <View className="items-center mb-6">
          <TouchableOpacity
            onPress={handlePickPhoto}
            activeOpacity={0.8}
            className="relative"
          >
            {avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                className="w-24 h-24 rounded-full border-2 border-orange-500"
              />
            ) : (
              <View className="w-24 h-24 rounded-full bg-slate-900 border-2 border-dashed border-slate-700 items-center justify-center">
                <Ionicons name="camera-outline" size={32} color="#94A3B8" />
              </View>
            )}
            <View className="absolute bottom-0 right-0 bg-orange-500 rounded-full p-2 border-2 border-slate-950">
              <Ionicons name="pencil" size={14} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <Text className="text-slate-400 text-xs mt-2 font-medium">
            Upload Rider Photo
          </Text>
        </View>

        {/* Rider full name */}
        <View className="mb-4">
          <Text className="text-slate-300 text-xs font-semibold mb-1.5 uppercase">
            Rider Full Name *
          </Text>
          <View className="flex-row items-center bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-3">
            <Ionicons name="person-outline" size={18} color="#94A3B8" />
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="e.g. Juan dela Cruz"
              placeholderTextColor="#64748B"
              className="flex-1 text-white ml-2.5 text-base"
            />
          </View>
        </View>

        {/* Rider GPS location */}
        <View className="mb-5">
          <Text className="text-slate-300 text-xs font-semibold mb-1.5 uppercase">
            Rider Location Base
          </Text>
          <View className="flex-row items-center bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 mb-2">
            <Ionicons name="location-outline" size={18} color="#94A3B8" />
            <TextInput
              value={locationName}
              onChangeText={setLocationName}
              placeholder="e.g. Antipolo, Rizal"
              placeholderTextColor="#64748B"
              className="flex-1 text-white ml-2.5 text-base"
            />
          </View>
          <TouchableOpacity
            onPress={handleGetCurrentLocation}
            disabled={locating}
            activeOpacity={0.7}
            className="flex-row items-center justify-center bg-slate-800/80 border border-slate-700 py-2.5 px-4 rounded-xl"
          >
            {locating ? (
              <ActivityIndicator size="small" color="#F97316" />
            ) : (
              <>
                <Ionicons name="navigate-circle-outline" size={18} color="#F97316" />
                <Text className="text-orange-400 font-semibold text-xs ml-2">
                  Use Current GPS Location
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Driver license type */}
        <View className="mb-5">
          <Text className="text-slate-300 text-xs font-semibold mb-2 uppercase">
            Driver License Type
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {DRIVER_TYPES.map((type) => {
              const isSelected = driverType === type.value;
              return (
                <TouchableOpacity
                  key={type.value}
                  onPress={() => setDriverType(type.value)}
                  activeOpacity={0.7}
                  className={`flex-row items-center px-3.5 py-2.5 rounded-xl border ${isSelected
                      ? 'bg-orange-500/20 border-orange-500'
                      : 'bg-slate-900 border-slate-800'
                    }`}
                >
                  <MaterialCommunityIcons
                    name={type.icon as any}
                    size={16}
                    color={isSelected ? '#F97316' : '#94A3B8'}
                  />
                  <Text
                    className={`ml-2 text-xs font-semibold ${isSelected ? 'text-orange-400' : 'text-slate-400'
                      }`}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Primary vehicle type */}
        <View className="mb-8">
          <Text className="text-slate-300 text-xs font-semibold mb-2 uppercase">
            Primary Vehicle Type
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {VEHICLE_TYPES.map((v) => {
              const isSelected = vehicleType === v.value;
              return (
                <TouchableOpacity
                  key={v.value}
                  onPress={() => setVehicleType(v.value)}
                  activeOpacity={0.7}
                  className={`flex-row items-center px-3 py-2.5 rounded-xl border ${isSelected
                      ? 'bg-orange-500/20 border-orange-500'
                      : 'bg-slate-900 border-slate-800'
                    }`}
                >
                  <MaterialCommunityIcons
                    name={v.icon as any}
                    size={16}
                    color={isSelected ? '#F97316' : '#94A3B8'}
                  />
                  <Text
                    className={`ml-2 text-xs font-semibold ${isSelected ? 'text-orange-400' : 'text-slate-400'
                      }`}
                  >
                    {v.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Form submission button */}
        <TouchableOpacity
          onPress={handleSaveProfile}
          disabled={loading}
          activeOpacity={0.8}
          className="bg-orange-500 py-3.5 rounded-xl items-center justify-center shadow-lg shadow-orange-500/20 mb-8"
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-white font-bold text-base">
              Complete Setup & Enter MoTourista
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
