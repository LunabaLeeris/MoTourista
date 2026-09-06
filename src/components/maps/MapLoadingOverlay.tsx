import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

export interface MapLoadingOverlayProps {
  message?: string;
}

/**
 * Full-screen loading indicator displayed while MapLibre initializes.
 * Styled exclusively with Tailwind CSS utility classes.
 */
export default function MapLoadingOverlay({
  message = 'Loading Philippine Map...',
}: MapLoadingOverlayProps) {
  return (
    <View className="absolute inset-0 bg-[#0c1017] items-center justify-center z-10">
      <ActivityIndicator size="large" color="#00d2ff" />
      <Text className="text-slate-400 text-xs font-medium mt-2.5">
        {message}
      </Text>
    </View>
  );
}
