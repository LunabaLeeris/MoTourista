import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { TagRow } from '../types/database';
import { getTags } from '../services/lookupService';
import {
  getCurrentRiderLocation,
  validateCoordinates,
} from '../services/locationService';
import { createPost, PostImageInput } from '../services/postService';
import { pickImageFromLibrary } from '../services/imageService';

export default function CreatePostScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const effectiveUserId = user?.id || '';

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [latitudeStr, setLatitudeStr] = useState('');
  const [longitudeStr, setLongitudeStr] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<PostImageInput[]>([]);

  // UI / Status states
  const [availableTags, setAvailableTags] = useState<TagRow[]>([]);
  const [loadingTags, setLoadingTags] = useState(true);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      setLoadingTags(true);
      const tags = await getTags();
      setAvailableTags(tags);
    } catch (err: any) {
      console.error('Error loading tags:', err);
    } finally {
      setLoadingTags(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    try {
      setLocating(true);
      const loc = await getCurrentRiderLocation();
      setLatitudeStr(loc.latitude.toString());
      setLongitudeStr(loc.longitude.toString());
      if (loc.readableLocation && !address.trim()) {
        setAddress(loc.readableLocation);
      }
    } catch (err: any) {
      Alert.alert('Location Notice', err.message || 'Could not obtain GPS location.');
    } finally {
      setLocating(false);
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handlePickPhoto = async () => {
    try {
      const picked = await pickImageFromLibrary({ aspect: [4, 3] });
      if (picked) {
        setSelectedImages((prev) => [...prev, picked]);
      }
    } catch (err: any) {
      Alert.alert('Photo Notice', err.message || 'Could not pick image.');
    }
  };

  const handleRemovePhoto = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!effectiveUserId) {
      Alert.alert('Session Expired', 'Please log in to submit a post.');
      return;
    }

    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please provide a title for the location.');
      return;
    }

    const lat = parseFloat(latitudeStr);
    const lon = parseFloat(longitudeStr);

    try {
      validateCoordinates(lat, lon);
    } catch (coordErr: any) {
      Alert.alert('Invalid Coordinates', coordErr.message || 'Please provide valid coordinates.');
      return;
    }

    if (!selectedTagIds || selectedTagIds.length === 0) {
      Alert.alert('Missing Tags', 'Please select at least one tag for this location.');
      return;
    }

    if (!selectedImages || selectedImages.length === 0) {
      Alert.alert('Missing Photo', 'Please add at least one photo for this location.');
      return;
    }

    try {
      setSubmitting(true);
      await createPost({
        userId: effectiveUserId,
        title: title.trim(),
        description: description.trim() || undefined,
        address: address.trim() || undefined,
        latitude: lat,
        longitude: lon,
        tagIds: selectedTagIds,
        images: selectedImages,
      });

      Alert.alert(
        'Post Submitted',
        'Your location post has been submitted for moderation. Once approved, it will appear on the public map.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err: any) {
      Alert.alert('Submission Error', err.message || 'Failed to submit post.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      {/* Top Header */}
      <View className="flex-row items-center justify-between px-5 pt-12 pb-4 border-b border-neutral-200">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="flex-row items-center p-1"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons name="chevron-left" size={24} color="#000000" />
          <Text className="text-sm font-semibold text-black ml-1">Back</Text>
        </TouchableOpacity>
        <Text className="text-base font-bold text-neutral-900">
          Create Post
        </Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView
        className="flex-1 px-5 py-4"
        contentContainerStyle={{ paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title Input */}
        <View className="mb-4">
          <Text className="text-xs font-bold text-neutral-800 uppercase tracking-wide mb-1">
            Location Title *
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Marilaque Highway Coffee Stop"
            placeholderTextColor="#9CA3AF"
            className="border border-neutral-300 rounded-xl px-4 py-3 text-sm text-black bg-neutral-50 focus:bg-white focus:border-black"
          />
        </View>

        {/* Description Input */}
        <View className="mb-4">
          <Text className="text-xs font-bold text-neutral-800 uppercase tracking-wide mb-1">
            Description
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the spot, road conditions, parking, amenities, or highlights..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            className="border border-neutral-300 rounded-xl px-4 py-3 text-sm text-black bg-neutral-50 focus:bg-white focus:border-black min-h-20"
          />
        </View>

        {/* Address Input */}
        <View className="mb-4">
          <Text className="text-xs font-bold text-neutral-800 uppercase tracking-wide mb-1">
            Address / Landmark
          </Text>
          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder="e.g. Sitio Mayagay, Sampaloc, Tanay, Rizal"
            placeholderTextColor="#9CA3AF"
            className="border border-neutral-300 rounded-xl px-4 py-3 text-sm text-black bg-neutral-50 focus:bg-white focus:border-black"
          />
        </View>

        {/* GPS Coordinates Section */}
        <View className="mb-5 bg-neutral-50 border border-neutral-200 rounded-2xl p-4">
          <View className="flex-row items-center justify-between mb-3">
            <View>
              <Text className="text-xs font-bold text-neutral-800 uppercase tracking-wide">
                Coordinates *
              </Text>
              <Text className="text-xs text-neutral-500">
                Used to pin this hotspot on the map
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleUseCurrentLocation}
              disabled={locating}
              className="flex-row items-center bg-black px-3 py-1.5 rounded-full"
            >
              {locating ? (
                <ActivityIndicator size="small" color="#ffffff" className="mr-1" />
              ) : (
                <MaterialCommunityIcons
                  name="crosshairs-gps"
                  size={14}
                  color="#ffffff"
                  className="mr-1"
                />
              )}
              <Text className="text-xs font-semibold text-white ml-1">
                {locating ? 'Locating...' : 'Use Current'}
              </Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Text className="text-[11px] font-medium text-neutral-600 mb-1">
                Latitude
              </Text>
              <TextInput
                value={latitudeStr}
                onChangeText={setLatitudeStr}
                placeholder="14.5995"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                className="border border-neutral-300 rounded-xl px-3 py-2 text-sm text-black bg-white"
              />
            </View>
            <View className="flex-1">
              <Text className="text-[11px] font-medium text-neutral-600 mb-1">
                Longitude
              </Text>
              <TextInput
                value={longitudeStr}
                onChangeText={setLongitudeStr}
                placeholder="120.9842"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                className="border border-neutral-300 rounded-xl px-3 py-2 text-sm text-black bg-white"
              />
            </View>
          </View>
        </View>

        {/* Hotspot Tags Section */}
        <View className="mb-5">
          <Text className="text-xs font-bold text-neutral-800 uppercase tracking-wide mb-1">
            Tags / Categories *
          </Text>
          <Text className="text-xs text-neutral-500 mb-2.5">
            Select at least one category that applies to this location
          </Text>

          {loadingTags ? (
            <ActivityIndicator size="small" color="#000000" />
          ) : (
            <View className="flex-row flex-wrap gap-2">
              {availableTags.map((tag) => {
                const isSelected = selectedTagIds.includes(tag.id);
                return (
                  <TouchableOpacity
                    key={tag.id}
                    onPress={() => toggleTag(tag.id)}
                    className={`flex-row items-center px-3 py-1.5 rounded-full border ${
                      isSelected
                        ? 'bg-black border-black'
                        : 'bg-white border-neutral-300'
                    }`}
                  >
                    <MaterialCommunityIcons
                      name={(tag.icon as any) || 'tag-outline'}
                      size={14}
                      color={isSelected ? '#ffffff' : '#404040'}
                      className="mr-1"
                    />
                    <Text
                      className={`text-xs font-medium ml-1 ${
                        isSelected ? 'text-white' : 'text-neutral-800'
                      }`}
                    >
                      {tag.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Photo Upload Section */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-2">
            <View>
              <Text className="text-xs font-bold text-neutral-800 uppercase tracking-wide">
                Location Photos *
              </Text>
              <Text className="text-xs text-neutral-500">
                Add at least one photo for other riders to preview
              </Text>
            </View>

            <TouchableOpacity
              onPress={handlePickPhoto}
              className="flex-row items-center border border-neutral-300 bg-white px-3 py-1.5 rounded-full"
            >
              <MaterialCommunityIcons
                name="image-plus"
                size={16}
                color="#000000"
                className="mr-1"
              />
              <Text className="text-xs font-semibold text-black ml-1">
                Add Photo
              </Text>
            </TouchableOpacity>
          </View>

          {selectedImages.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mt-2 flex-row"
            >
              {selectedImages.map((img, idx) => (
                <View key={idx} className="relative mr-3 w-28 h-28 rounded-xl overflow-hidden border border-neutral-200">
                  <Image
                    source={{ uri: img.uri }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    onPress={() => handleRemovePhoto(idx)}
                    className="absolute top-1 right-1 bg-black/70 rounded-full w-6 h-6 items-center justify-center"
                  >
                    <MaterialCommunityIcons name="close" size={14} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          ) : (
            <TouchableOpacity
              onPress={handlePickPhoto}
              className="border border-dashed border-neutral-300 rounded-2xl py-6 items-center justify-center bg-neutral-50"
            >
              <MaterialCommunityIcons
                name="camera-plus-outline"
                size={28}
                color="#737373"
              />
              <Text className="text-xs text-neutral-500 mt-1 font-medium">
                Tap to pick a photo from gallery
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Moderation Notice Alert Box */}
        <View className="flex-row items-start bg-blue-50 border border-blue-200 rounded-xl p-3.5 mb-6">
          <MaterialCommunityIcons
            name="shield-check-outline"
            size={18}
            color="#1D4ED8"
            className="mr-2"
          />
          <Text className="text-xs text-blue-900 flex-1 leading-relaxed ml-2">
            All submitted location posts undergo review by administrators. Approved locations will be verified and displayed on the public Philippines map.
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting}
          className="bg-black py-4 rounded-xl items-center justify-center shadow-sm"
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text className="text-sm font-bold text-white tracking-wide uppercase">
              Submit Location Post
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
