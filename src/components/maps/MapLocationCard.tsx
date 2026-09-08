import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MapMarker, RouteResult } from '../../types/map';
import { Coordinates } from '../../types/location';
import { getFormattedDistance } from '../../lib/distance';
import { formatRouteDuration } from '../../lib/markers';

export interface MapLocationCardProps {
  location: MapMarker;
  userLocation: Coordinates | null;
  activeRoute: RouteResult | null;
  isRouting: boolean;
  onStartNavigation: () => void;
  onClearNavigation: () => void;
}

/**
 * Bottom card displaying the selected map spot's details and routing actions.
 * Styled using Tailwind CSS utility classes.
 */
export default function MapLocationCard({
  location,
  userLocation,
  activeRoute,
  isRouting,
  onStartNavigation,
  onClearNavigation,
}: MapLocationCardProps) {
  const bottomPaddingClass = Platform.OS === 'ios' ? 'pb-8' : 'pb-5';

  return (
    <View
      className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-[20px] px-5 pt-4.5 ${bottomPaddingClass} shadow-xl elevation-10 z-30`}
    >
      {/* Title & Tag Header */}
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1 flex-row items-center flex-wrap gap-2">
          <Text className="text-lg font-bold text-slate-900">{location.title}</Text>
          {location.tagName && (
            <View className="px-2 py-0.5 bg-rose-100 rounded-md">
              <Text className="text-[11px] font-semibold text-rose-600">
                {location.tagName}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity onPress={onClearNavigation} className="p-1 ml-2">
          <MaterialCommunityIcons name="close" size={20} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* Address */}
      {location.address && (
        <Text className="text-[13px] text-slate-500 mb-3 leading-[18px]" numberOfLines={2}>
          {location.address}
        </Text>
      )}

      {/* Distance & Active Route Duration */}
      <View className="flex-row items-center gap-3 mb-4">
        <View className="flex-row items-center gap-1 bg-sky-50 px-2.5 py-1 rounded-md">
          <MaterialCommunityIcons name="map-marker-distance" size={16} color="#0284c7" />
          <Text className="text-xs font-semibold text-[#0284c7]">
            {getFormattedDistance(userLocation, location)} away
          </Text>
        </View>

        {activeRoute && (
          <View className="flex-row items-center gap-1 bg-green-50 px-2.5 py-1 rounded-md">
            <MaterialCommunityIcons name="motorbike" size={16} color="#16a34a" />
            <Text className="text-xs font-semibold text-[#16a34a]">
              {formatRouteDuration(activeRoute.durationSeconds)}
            </Text>
          </View>
        )}
      </View>

      {/* Action Button: Navigate / End Route */}
      <View className="flex-row gap-2.5">
        {activeRoute ? (
          <TouchableOpacity
            className="flex-1 h-[46px] bg-slate-500 rounded-lg flex-row items-center justify-center shadow-md elevation-4"
            onPress={onClearNavigation}
          >
            <MaterialCommunityIcons
              name="cancel"
              size={18}
              color="#ffffff"
              className="mr-1.5"
            />
            <Text className="text-white text-[15px] font-semibold">End Route</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            className="flex-1 h-[46px] bg-[#e11d48] rounded-lg flex-row items-center justify-center shadow-md elevation-4"
            onPress={onStartNavigation}
            disabled={isRouting}
          >
            {isRouting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <MaterialCommunityIcons
                  name="navigation-variant"
                  size={18}
                  color="#ffffff"
                  className="mr-1.5"
                />
                <Text className="text-white text-[15px] font-semibold">
                  Navigate Route
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
