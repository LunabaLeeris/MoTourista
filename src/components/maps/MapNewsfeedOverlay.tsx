import React from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MapMarker } from '../../types/map';
import { Coordinates } from '../../types/location';
import { getFormattedDistance } from '../../lib/distance';

export interface MapNewsfeedOverlayProps {
  visible: boolean;
  markers: MapMarker[];
  userLocation: Coordinates | null;
  onSelectMarker: (marker: MapMarker) => void;
  onClose: () => void;
}

/**
 * Overlay modal listing nearby approved spots.
 * Styled using Tailwind CSS utility classes.
 */
export default function MapNewsfeedOverlay({
  visible,
  markers,
  userLocation,
  onSelectMarker,
  onClose,
}: MapNewsfeedOverlayProps) {
  if (!visible) return null;

  return (
    <View className="absolute top-[130px] left-4 right-4 bottom-5 bg-white rounded-2xl p-4 z-40 shadow-2xl elevation-12">
      {/* Header */}
      <View className="flex-row justify-between items-center pb-3 border-b border-slate-100 mb-2.5">
        <Text className="text-base font-bold text-slate-900">Nearby Approved Spots</Text>
        <TouchableOpacity onPress={onClose}>
          <MaterialCommunityIcons name="close" size={24} color="#000000" />
        </TouchableOpacity>
      </View>

      {/* Spots List */}
      <FlatList
        data={markers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="items-center justify-center py-10">
            <Text className="text-slate-400 text-sm">No approved spots found.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            className="bg-slate-50 rounded-lg p-3 border border-slate-200 mb-2.5"
            onPress={() => onSelectMarker(item)}
            activeOpacity={0.75}
          >
            <View className="flex-row justify-between items-center mb-1">
              <Text className="text-[15px] font-semibold text-slate-900 flex-1">
                {item.title}
              </Text>
              {item.tagName && (
                <View className="bg-rose-100 px-2 py-0.5 rounded ml-1.5">
                  <Text className="text-[11px] font-semibold text-rose-600">
                    {item.tagName}
                  </Text>
                </View>
              )}
            </View>

            {item.address ? (
              <Text className="text-xs text-slate-500 mb-2" numberOfLines={1}>
                {item.address}
              </Text>
            ) : null}

            <View className="flex-row justify-between items-center">
              <Text className="text-xs text-sky-600 font-medium">
                {getFormattedDistance(userLocation, item)} away
              </Text>
              <Text className="text-xs text-rose-600 font-semibold">
                View on map →
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
