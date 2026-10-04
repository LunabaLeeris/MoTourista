import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MapMarker, RouteResult } from '../../types/map';
import { Coordinates } from '../../types/location';
import { LocationWithDetails } from '../../types/database';
import { PostDetailContent } from '../../screens/PostDetailScreen';

export interface MapLocationCardProps {
  location: MapMarker;
  post?: LocationWithDetails | null;
  userLocation: Coordinates | null;
  activeRoute: RouteResult | null;
  isRouting: boolean;
  onStartNavigation: () => void;
  onClearNavigation: () => void;
  onClose?: () => void;
}

/**
 * Bottom drawer displaying the selected map spot's post details,
 * Reviews/Visitors tabs, and top-right navigation action button.
 */
export default function MapLocationCard({
  location,
  post,
  activeRoute,
  isRouting,
  onStartNavigation,
  onClearNavigation,
  onClose,
}: MapLocationCardProps) {
  const handleClose = onClose || onClearNavigation;

  // Build a fallback LocationWithDetails object if full database post was not passed
  const displayPost: LocationWithDetails = (post || {
    id: location.id,
    title: location.title,
    description: '',
    address: location.address || '',
    latitude: location.latitude,
    longitude: location.longitude,
    status_id: location.isApproved ? 'approved' : 'pending',
    created_by: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    location_images: location.imageUrl
      ? [
          {
            id: `${location.id}-img`,
            location_id: location.id,
            image_url: location.imageUrl,
            caption: '',
            display_order: 1,
            created_at: new Date().toISOString(),
          },
        ]
      : [],
    location_tags: location.tagName
      ? [
          {
            location_id: location.id,
            tag_id: location.tagId || 'tag-1',
            description: '',
            created_at: new Date().toISOString(),
            tags: {
              id: location.tagId || 'tag-1',
              name: location.tagName,
              icon: location.tagIcon || 'tag-outline',
              display_order: 1,
              created_at: new Date().toISOString(),
            },
          },
        ]
      : [],
    location_hearts: [],
    location_visits: [],
  }) as LocationWithDetails;

  return (
    <View
      style={{ height: '78%' }}
      className="absolute bottom-0 left-0 right-0 bg-[#EBE7E5] rounded-t-[32px] overflow-hidden shadow-2xl elevation-30 z-40 border-t border-neutral-300"
    >
      {/* Top Drag Handle Indicator */}
      <View className="items-center pt-2.5 pb-0.5">
        <View className="w-10 h-1 bg-neutral-400/60 rounded-full" />
      </View>

      {/* Post Detail Content with Top-Right Navigate Route Button */}
      <PostDetailContent
        post={displayPost}
        onBack={handleClose}
        headerPaddingTopClass="pt-1"
        rightAction={
          <TouchableOpacity
            onPress={activeRoute ? onClearNavigation : onStartNavigation}
            disabled={isRouting}
            activeOpacity={0.8}
            className={`flex-row items-center px-4 py-2 rounded-full shadow-md ${
              activeRoute ? 'bg-slate-700' : 'bg-[#E11D48]'
            }`}
          >
            {isRouting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialCommunityIcons
                  name={activeRoute ? 'cancel' : 'navigation-variant'}
                  size={16}
                  color="#FFFFFF"
                  className="mr-1"
                />
                <Text className="text-white text-xs font-bold ml-1">
                  {activeRoute ? 'End Route' : 'Navigate'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        }
      />
    </View>
  );
}
