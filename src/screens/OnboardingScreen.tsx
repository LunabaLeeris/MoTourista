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
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { DriverTypeRow, VehicleTypeRow } from '../types/database';

interface OnboardingScreenProps {
  userId: string;
  onCompleted: () => void;
}

export default function OnboardingScreen({ userId, onCompleted }: OnboardingScreenProps) {
  const [fullName, setFullName] = useState('');
  const [locationName, setLocationName] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [driverTypes, setDriverTypes] = useState<DriverTypeRow[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleTypeRow[]>([]);
  const [selectedDriverTypeId, setSelectedDriverTypeId] = useState<string | null>(null);
  const [selectedVehicleTypeId, setSelectedVehicleTypeId] = useState<string | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [fetchingOptions, setFetchingOptions] = useState(true);

  useEffect(() => {
    loadLookupOptionsAndProfile();
  }, []);

  const loadLookupOptionsAndProfile = async () => {
    try {
      setFetchingOptions(true);

      // Fetch driver types from the database.
      const { data: dTypes } = await supabase
        .from('driver_types')
        .select('*')
        .order('display_order', { ascending: true });

      if (dTypes && dTypes.length > 0) {
        setDriverTypes(dTypes);
        setSelectedDriverTypeId(dTypes[0].id);
      }

      // Fetch vehicle types from the database.
      const { data: vTypes } = await supabase
        .from('vehicle_types')
        .select('*')
        .order('display_order', { ascending: true });

      if (vTypes && vTypes.length > 0) {
        setVehicleTypes(vTypes);
        setSelectedVehicleTypeId(vTypes[0].id);
      }

      // Load existing rider profile if available.
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profile) {
        if (profile.full_name) setFullName(profile.full_name);
        if (profile.avatar_url) setAvatarUri(profile.avatar_url);
        if (profile.location_name) setLocationName(profile.location_name);
        if (profile.latitude) setLatitude(profile.latitude);
        if (profile.longitude) setLongitude(profile.longitude);
        if (profile.driver_type_id) setSelectedDriverTypeId(profile.driver_type_id);
        if (profile.vehicle_type_id) setSelectedVehicleTypeId(profile.vehicle_type_id);
      }
    } catch {
      // The function ignores errors during initial data load.
    } finally {
      setFetchingOptions(false);
    }
  };

  // Select a photo from the camera or the gallery.
  const handlePickPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please allow gallery access to select a photo.');
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
          'Please allow location access to get your current coordinates.'
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
      Alert.alert('Location Error', `Could not get GPS location: ${err.message}`);
    } finally {
      setLocating(false);
    }
  };

  // Save the rider profile and finish onboarding.
  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      Alert.alert('Missing Name', 'Please enter your name.');
      return;
    }

    try {
      setLoading(true);

      // Update the profile table in the database.
      const { error } = await supabase.from('profiles').upsert({
        id: userId,
        full_name: fullName.trim(),
        avatar_url: avatarUri,
        location_name: locationName.trim() || 'Philippines',
        latitude: latitude,
        longitude: longitude,
        driver_type_id: selectedDriverTypeId,
        vehicle_type_id: selectedVehicleTypeId,
        is_onboarded: true,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      onCompleted();
    } catch (err: any) {
      Alert.alert('Save Error', err.message || 'Failed to save information.');
    } finally {
      setLoading(false);
    }
  };

  if (fetchingOptions) {
    return (
      <View className="flex-1 bg-white items-center justify-center p-6">
        <ActivityIndicator color="#000" />
        <Text className="text-sm text-neutral-600 mt-2">
          Loading options...
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        className="p-6 max-w-md w-full self-center"
      >
        {/* Title */}
        <View className="mb-6">
          <Text className="text-xl font-bold text-black mb-1">
            Rider Profile Setup
          </Text>
          <Text className="text-xs text-neutral-600">
            Fill in your rider details below.
          </Text>
        </View>

        {/* Photo selection */}
        <View className="mb-4">
          <Text className="text-xs font-medium text-neutral-700 mb-1">
            Photo
          </Text>
          <TouchableOpacity
            onPress={handlePickPhoto}
            className="border border-neutral-300 p-3 rounded items-center justify-center"
          >
            {avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                className="w-20 h-20 rounded mb-2"
              />
            ) : null}
            <Text className="text-sm text-black">
              {avatarUri ? 'Change Photo' : 'Select Photo'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Name input */}
        <View className="mb-4">
          <Text className="text-xs font-medium text-neutral-700 mb-1">
            Name
          </Text>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder="Full Name"
            placeholderTextColor="#888"
            className="border border-neutral-300 p-3 rounded text-black"
          />
        </View>

        {/* Location input */}
        <View className="mb-4">
          <Text className="text-xs font-medium text-neutral-700 mb-1">
            Location
          </Text>
          <TextInput
            value={locationName}
            onChangeText={setLocationName}
            placeholder="City / Province"
            placeholderTextColor="#888"
            className="border border-neutral-300 p-3 rounded text-black mb-2"
          />
          <TouchableOpacity
            onPress={handleGetCurrentLocation}
            disabled={locating}
            className="border border-neutral-300 p-2 rounded items-center"
          >
            {locating ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text className="text-xs text-black">
                Use Current Location
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Driver Type selector */}
        <View className="mb-4">
          <Text className="text-xs font-medium text-neutral-700 mb-1">
            Driver Type
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {driverTypes.map((type) => {
              const isSelected = selectedDriverTypeId === type.id;
              return (
                <TouchableOpacity
                  key={type.id}
                  onPress={() => setSelectedDriverTypeId(type.id)}
                  className={`border p-2 rounded ${
                    isSelected
                      ? 'border-black bg-neutral-100'
                      : 'border-neutral-300'
                  }`}
                >
                  <Text
                    className={`text-xs ${
                      isSelected ? 'font-bold text-black' : 'text-neutral-700'
                    }`}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Vehicle Type selector */}
        <View className="mb-6">
          <Text className="text-xs font-medium text-neutral-700 mb-1">
            Vehicle Type
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {vehicleTypes.map((v) => {
              const isSelected = selectedVehicleTypeId === v.id;
              return (
                <TouchableOpacity
                  key={v.id}
                  onPress={() => setSelectedVehicleTypeId(v.id)}
                  className={`border p-2 rounded ${
                    isSelected
                      ? 'border-black bg-neutral-100'
                      : 'border-neutral-300'
                  }`}
                >
                  <Text
                    className={`text-xs ${
                      isSelected ? 'font-bold text-black' : 'text-neutral-700'
                    }`}
                  >
                    {v.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleSaveProfile}
          disabled={loading}
          className="bg-black p-3 rounded items-center justify-center mb-6"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-medium">
              Save Profile
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
