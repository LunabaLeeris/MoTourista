import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LocationWithDetails } from '../../types/database';
import PostBadge from './PostBadge';

export interface PostPanelProps {
  item: LocationWithDetails;
  avatarUrl?: string | null;
  isDeleting?: boolean;
  onDelete?: (post: LocationWithDetails) => void;
}

/**
 * Post card panel matching Post.png reference layout.
 */
export default function PostPanel({
  item,
  avatarUrl,
  isDeleting = false,
  onDelete,
}: PostPanelProps) {
  const { width: windowWidth } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState(0);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const visitsCount = item.location_visits?.length || 0;
  const heartsCount = item.location_hearts?.length || 0;
  const images = item.location_images || [];
  const tags = item.location_tags || [];
  const displayedTags = tags.slice(0, 4);
  const overflowTagsCount = tags.length - displayedTags.length;

  const cardImageWidth = containerWidth || windowWidth - 32;

  const handleContainerLayout = (e: any) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0 && Math.abs(width - containerWidth) > 1) {
      setContainerWidth(width);
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const width = event.nativeEvent.layoutMeasurement.width || cardImageWidth;
    if (width > 0) {
      const offsetX = event.nativeEvent.contentOffset.x;
      const nextIndex = Math.round(offsetX / width);
      if (nextIndex !== activeImageIndex && nextIndex >= 0 && nextIndex < images.length) {
        setActiveImageIndex(nextIndex);
      }
    }
  };

  return (
    <View className="bg-white rounded-2xl mb-5 overflow-hidden border border-neutral-200 shadow-sm">
      {/* Top Header Row of the Card */}
      <View className="flex-row items-center justify-between p-3 bg-[#E8EDE5]">
        <View className="flex-row items-center flex-1 mr-2">
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              className="w-10 h-10 rounded-full mr-3 bg-neutral-300"
            />
          ) : (
            <View className="w-10 h-10 rounded-full bg-[#8E4141] items-center justify-center mr-3">
              <Text className="text-white text-xs font-bold">
                {(item.title.charAt(0) || 'M').toUpperCase()}
              </Text>
            </View>
          )}
          <View className="flex-1">
            <Text
              numberOfLines={1}
              className="text-sm font-semibold text-neutral-800"
            >
              {item.address || item.title}
            </Text>
            <Text numberOfLines={1} className="text-xs text-neutral-500">
              {item.title}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center">
          <Text className="text-xs text-neutral-600 font-medium mr-2">
            {visitsCount} {visitsCount === 1 ? 'visit' : 'visits'}
          </Text>
          {item.status_id !== 'approved' && onDelete && (
            <TouchableOpacity
              onPress={() => onDelete(item)}
              disabled={isDeleting}
              className="p-1"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#E11D48" />
              ) : (
                <MaterialCommunityIcons
                  name="trash-can-outline"
                  size={18}
                  color="#737373"
                />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Large Media Image Area */}
      <View
        onLayout={handleContainerLayout}
        className="relative bg-[#DCE5D8] h-52 items-center justify-center overflow-hidden"
      >
        {images.length === 0 ? (
          <View className="items-center justify-center">
            <MaterialCommunityIcons
              name="image-outline"
              size={48}
              color="#8A9D84"
            />
            <Text className="text-xs text-neutral-500 mt-1">
              No photo uploaded
            </Text>
          </View>
        ) : images.length === 1 ? (
          <Image
            source={{ uri: images[0].image_url }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <ScrollView
            horizontal
            pagingEnabled
            nestedScrollEnabled={true}
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            style={{ width: '100%', height: '100%' }}
          >
            {images.map((img, idx) => (
              <View
                key={img.id || idx}
                style={{
                  width: cardImageWidth,
                  height: '100%',
                }}
              >
                <Image
                  source={{ uri: img.image_url }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              </View>
            ))}
          </ScrollView>
        )}

        {/* Pagination indicator */}
        {images.length > 1 && (
          <View className="absolute bottom-2 self-center bg-black/45 px-2.5 py-1 rounded-full flex-row items-center">
            {images.length <= 6 ? (
              <View className="flex-row items-center">
                {images.map((_, idx) => (
                  <View
                    key={idx}
                    style={{
                      width: idx === activeImageIndex ? 7 : 5,
                      height: idx === activeImageIndex ? 7 : 5,
                      borderRadius: 4,
                      backgroundColor:
                        idx === activeImageIndex
                          ? '#FFFFFF'
                          : 'rgba(255, 255, 255, 0.45)',
                      marginHorizontal: 2.5,
                    }}
                  />
                ))}
              </View>
            ) : (
              <Text className="text-white text-xs font-bold tracking-wider">
                {activeImageIndex + 1} / {images.length}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Bottom Details Row */}
      <View className="p-3 bg-white">
        {/* Status and Hearts Row */}
        <View className="flex-row items-center justify-between mb-2">
          <PostBadge statusId={item.status_id} />
          <View className="flex-row items-center">
            <MaterialCommunityIcons
              name="heart-outline"
              size={16}
              color="#E11D48"
              className="mr-1"
            />
            <Text className="text-xs font-semibold text-neutral-700 ml-1">
              {heartsCount} {heartsCount === 1 ? 'heart' : 'hearts'}
            </Text>
          </View>
        </View>

        {/* Tags Pills Row */}
        {tags.length > 0 && (
          <View className="flex-row flex-wrap items-center gap-1.5 mb-2">
            {displayedTags.map((t) => (
              <View
                key={t.tag_id}
                className="bg-white border border-neutral-800 rounded-full px-2.5 py-0.5"
              >
                <Text className="text-xs text-neutral-800 font-medium">
                  {t.tags?.name || t.tag_id}
                </Text>
              </View>
            ))}
            {overflowTagsCount > 0 && (
              <Text className="text-xs text-neutral-500 font-medium ml-1">
                +{overflowTagsCount} more
              </Text>
            )}
          </View>
        )}

        {/* Description Text */}
        {item.description ? (
          <Text className="text-xs text-neutral-800 leading-relaxed">
            {item.description}
          </Text>
        ) : (
          <Text className="text-xs text-neutral-400 italic">
            No description provided.
          </Text>
        )}
      </View>
    </View>
  );
}
