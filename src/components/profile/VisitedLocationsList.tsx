import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { VisitedLocation } from '../../types/map';

interface VisitedLocationsListProps {
  locations: VisitedLocation[];
  loading?: boolean;
  error?: string | null;
  onViewOnMap: (location: VisitedLocation) => void;
  onRetry?: () => void;
}

function formatVisitDate(iso: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Lists every location a user has visited.
 * Rendered in the profile Maps section when List View is selected.
 */
export default function VisitedLocationsList({
  locations,
  loading = false,
  error = null,
  onViewOnMap,
  onRetry,
}: VisitedLocationsListProps) {
  return (
    <View className="mb-4">
      <View className="flex-row items-center justify-between px-1 mb-2">
        <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
          All Visited Locations ({locations.length})
        </Text>
        <Text className="text-[11px] text-neutral-400">Sorted by latest visit</Text>
      </View>

      {loading ? (
        <View className="p-8 items-center justify-center">
          <ActivityIndicator size="small" color="#000" />
          <Text className="text-xs text-neutral-500 mt-2">Loading visited locations...</Text>
        </View>
      ) : error ? (
        <View className="p-8 bg-neutral-50 rounded-2xl border border-neutral-200 items-center justify-center">
          <MaterialCommunityIcons name="alert-circle-outline" size={32} color="#9ca3af" />
          <Text className="text-xs text-neutral-500 mt-2 font-medium text-center">{error}</Text>
          {onRetry && (
            <TouchableOpacity
              onPress={onRetry}
              className="mt-3 bg-black px-4 py-2 rounded-lg"
              activeOpacity={0.7}
            >
              <Text className="text-xs font-semibold text-white">Try again</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : locations.length === 0 ? (
        <View className="p-8 bg-neutral-50 rounded-2xl border border-neutral-200 items-center justify-center">
          <MaterialCommunityIcons name="map-marker-off" size={32} color="#9ca3af" />
          <Text className="text-xs text-neutral-500 mt-2 font-medium">
            No visited locations recorded yet.
          </Text>
        </View>
      ) : (
        locations.map((spot) => (
          <View
            key={spot.id}
            className="bg-white rounded-2xl p-4 border border-neutral-200 mb-3"
          >
            <View className="flex-row items-start justify-between mb-2">
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 items-center justify-center mr-3">
                  <MaterialCommunityIcons name="map-marker" size={22} color="#e11d48" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-neutral-900" numberOfLines={1}>
                    {spot.title}
                  </Text>
                  <Text className="text-xs text-neutral-500 mt-0.5" numberOfLines={1}>
                    {spot.address || 'Philippines'}
                  </Text>
                </View>
              </View>

              {spot.tagName ? (
                <View className="bg-neutral-100 px-2.5 py-1 rounded-full border border-neutral-200">
                  <Text className="text-[10px] font-semibold text-neutral-700">
                    {spot.tagName}
                  </Text>
                </View>
              ) : null}
            </View>

            <View className="flex-row items-center mb-1">
              <MaterialCommunityIcons name="calendar-check-outline" size={12} color="#6b7280" />
              <Text className="text-[11px] text-neutral-500 ml-1">
                {formatVisitDate(spot.latestVisitedAt)}
                {spot.visitCount > 1 ? ` · ${spot.visitCount} visits` : ''}
              </Text>
            </View>

            <View className="flex-row items-center justify-between pt-2.5 border-t border-neutral-100 mt-1">
              <View className="flex-row items-center">
                <MaterialCommunityIcons name="crosshairs-gps" size={12} color="#6b7280" />
                <Text className="text-[11px] text-neutral-500 ml-1">
                  {spot.latitude.toFixed(4)}°, {spot.longitude.toFixed(4)}°
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => onViewOnMap(spot)}
                className="flex-row items-center bg-black px-3.5 py-1.5 rounded-lg"
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="map-search" size={14} color="#ffffff" />
                <Text className="text-xs font-semibold text-white ml-1.5">View on Map</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </View>
  );
}
