import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';

export interface MapFloatingControlsProps {
  isLocating: boolean;
  onCenterPress: () => void;
  viewMode: 'map' | 'newsfeed';
  onToggleViewMode: () => void;
}

/**
 * Floating right-side map actions: GPS recenter button and newsfeed/map toggle button.
 * Styled using Tailwind CSS utility classes.
 */
export default function MapFloatingControls({
  isLocating,
  onCenterPress,
  viewMode,
  onToggleViewMode,
}: MapFloatingControlsProps) {
  return (
    <View className="absolute right-4.5 bottom-[240px] items-center gap-3.5 z-25">
      {/* Red Circular Center Button */}
      <TouchableOpacity
        className="w-[68px] h-[68px] rounded-full bg-[#ef233c] justify-center items-center shadow-lg elevation-6"
        onPress={onCenterPress}
        activeOpacity={0.85}
      >
        {isLocating ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Text className="text-white text-sm font-medium">center</Text>
        )}
      </TouchableOpacity>

      {/* Red Pill Newsfeed View Button */}
      <TouchableOpacity
        className={`px-3.5 py-2.5 rounded-lg justify-center items-center shadow-lg elevation-6 ${
          viewMode === 'newsfeed' ? 'bg-[#0f172a]' : 'bg-[#ef233c]'
        }`}
        onPress={onToggleViewMode}
        activeOpacity={0.85}
      >
        <Text className="text-white text-xs font-medium">
          {viewMode === 'map' ? 'newsfeed view' : 'map view'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
