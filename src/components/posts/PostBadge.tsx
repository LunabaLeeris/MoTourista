import React from 'react';
import { View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export interface PostBadgeProps {
  statusId: string;
}

/**
 * Moderation status badge displaying Pending Review, Approved, or Rejected state.
 */
export default function PostBadge({ statusId }: PostBadgeProps) {
  switch (statusId) {
    case 'approved':
      return (
        <View className="flex-row items-center bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-full">
          <MaterialCommunityIcons name="check-circle" size={12} color="#059669" />
          <Text className="text-xs font-semibold text-emerald-800 ml-1">
            Approved
          </Text>
        </View>
      );
    case 'rejected':
      return (
        <View className="flex-row items-center bg-rose-50 border border-rose-300 px-2.5 py-1 rounded-full">
          <MaterialCommunityIcons name="close-circle" size={12} color="#E11D48" />
          <Text className="text-xs font-semibold text-rose-800 ml-1">
            Rejected
          </Text>
        </View>
      );
    case 'pending':
    default:
      return (
        <View className="flex-row items-center bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-full">
          <MaterialCommunityIcons name="clock-outline" size={12} color="#D97706" />
          <Text className="text-xs font-semibold text-amber-800 ml-1">
            Pending Review
          </Text>
        </View>
      );
  }
}
