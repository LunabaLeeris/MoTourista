import React, { useState, useEffect, useRef } from 'react';
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
  Alert,
  Modal,
  StatusBar,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LocationWithDetails, LocationHeartRow } from '../../types/database';
import { useAuth } from '../../context/AuthContext';
import { deletePost, toggleLocationHeart } from '../../services/postService';
import PostBadge from './PostBadge';

export interface PostPanelProps {
  item: LocationWithDetails;
  avatarUrl?: string | null;
  onPress?: (post: LocationWithDetails) => void;
  onDeleted?: (postId: string) => void;
  onDelete?: (post: LocationWithDetails) => void;
  currentUserId?: string;
  onToggleHeart?: (post: LocationWithDetails) => void;
  isDeleting?: boolean;
  isHearting?: boolean;
}

/**
 * Post card panel matching Post.png reference layout.
 */
export default function PostPanel({
  item,
  avatarUrl,
  onPress,
  onDeleted,
  onDelete,
  currentUserId: propUserId,
  onToggleHeart,
  isDeleting: propIsDeleting,
  isHearting: propIsHearting,
}: PostPanelProps) {
  const { user } = useAuth();
  const currentUserId = propUserId || user?.id || '';

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState(0);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Full-screen image viewer state
  const [isFullScreenVisible, setIsFullScreenVisible] = useState(false);
  const [fullScreenIndex, setFullScreenIndex] = useState(0);
  const fullScreenScrollRef = useRef<ScrollView>(null);

  // Self-contained heart and delete state
  const [hearts, setHearts] = useState<LocationHeartRow[]>(item.location_hearts || []);
  const [isHearting, setIsHearting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setHearts(item.location_hearts || []);
  }, [item.location_hearts]);

  const visitsCount = item.location_visits?.length || 0;
  const isHearted = Boolean(
    currentUserId && hearts.some((h) => h.user_id === currentUserId)
  );
  const heartsCount = hearts.length;
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

  const handleOpenFullScreen = (index: number) => {
    if (images.length === 0) return;
    setFullScreenIndex(index);
    setIsFullScreenVisible(true);
  };

  useEffect(() => {
    if (isFullScreenVisible && images.length > 1) {
      const timer = setTimeout(() => {
        fullScreenScrollRef.current?.scrollTo({
          x: fullScreenIndex * windowWidth,
          animated: false,
        });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isFullScreenVisible]);

  const handleHeartPress = async () => {
    if (onToggleHeart) {
      onToggleHeart(item);
      return;
    }

    if (!currentUserId) {
      Alert.alert('Sign In Required', 'Please sign in to heart location posts.');
      return;
    }

    if (isHearting || propIsHearting) {
      return;
    }

    const prevHearts = hearts;
    const currentlyHearted = prevHearts.some((h) => h.user_id === currentUserId);

    // Optimistically update hearts state
    const nextHearts = currentlyHearted
      ? prevHearts.filter((h) => h.user_id !== currentUserId)
      : [
          ...prevHearts,
          {
            location_id: item.id,
            user_id: currentUserId,
            created_at: new Date().toISOString(),
          },
        ];

    setHearts(nextHearts);
    setIsHearting(true);

    try {
      const { isHearted: serverIsHearted } = await toggleLocationHeart(
        item.id,
        currentUserId
      );

      // Synchronize exact server state
      setHearts((cur) => {
        if (serverIsHearted) {
          return cur.some((h) => h.user_id === currentUserId)
            ? cur
            : [
                ...cur,
                {
                  location_id: item.id,
                  user_id: currentUserId,
                  created_at: new Date().toISOString(),
                },
              ];
        } else {
          return cur.filter((h) => h.user_id !== currentUserId);
        }
      });
    } catch (err: any) {
      console.error('Error toggling location heart:', err);
      setHearts(prevHearts);
      Alert.alert(
        'Action Failed',
        err.message || 'Could not update heart. Please try again.'
      );
    } finally {
      setIsHearting(false);
    }
  };

  const handleDeletePress = () => {
    if (onDelete) {
      onDelete(item);
      return;
    }

    if (item.status_id === 'approved') {
      Alert.alert(
        'Action Not Permitted',
        'Approved posts cannot be deleted directly. Please contact an admin.'
      );
      return;
    }

    Alert.alert(
      'Delete Post',
      `Are you sure you want to delete "${item.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!currentUserId) {
              Alert.alert('Sign In Required', 'Please sign in to delete your post.');
              return;
            }

            try {
              setIsDeleting(true);
              const result = await deletePost(item.id, currentUserId);
              if (result.success) {
                onDeleted?.(item.id);
              } else {
                Alert.alert(
                  'Delete Failed',
                  result.error?.message || 'Could not delete post.'
                );
              }
            } catch (err: any) {
              Alert.alert(
                'Delete Error',
                err.message || 'An unexpected error occurred while deleting.'
              );
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const canShowDelete =
    item.status_id !== 'approved' &&
    (Boolean(onDelete) || (currentUserId && item.created_by === currentUserId));

  return (
    <View className="bg-white rounded-2xl mb-5 overflow-hidden border border-neutral-200 shadow-sm">
      {/* Top Header Row of the Card */}
      <View className="flex-row items-center justify-between p-3 bg-[#E8EDE5]">
        <TouchableOpacity
          activeOpacity={onPress ? 0.7 : 1}
          onPress={() => onPress?.(item)}
          disabled={!onPress}
          className="flex-row items-center flex-1 mr-2"
        >
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
        </TouchableOpacity>

        <View className="flex-row items-center">
          <TouchableOpacity
            activeOpacity={onPress ? 0.7 : 1}
            onPress={() => onPress?.(item)}
            disabled={!onPress}
          >
            <Text className="text-xs text-neutral-600 font-medium mr-2">
              {visitsCount} {visitsCount === 1 ? 'visit' : 'visits'}
            </Text>
          </TouchableOpacity>
          {canShowDelete && (
            <TouchableOpacity
              onPress={handleDeletePress}
              disabled={isDeleting || propIsDeleting}
              className="p-1"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {isDeleting || propIsDeleting ? (
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
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => handleOpenFullScreen(0)}
            className="w-full h-full"
          >
            <Image
              source={{ uri: images[0].image_url }}
              className="w-full h-full"
              resizeMode="cover"
            />
          </TouchableOpacity>
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
              <TouchableOpacity
                key={img.id || idx}
                activeOpacity={0.9}
                onPress={() => handleOpenFullScreen(idx)}
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
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Pagination indicator */}
        {images.length > 1 && (
          <View
            pointerEvents="none"
            className="absolute bottom-2 self-center bg-black/45 px-2.5 py-1 rounded-full flex-row items-center"
          >
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
          <TouchableOpacity
            activeOpacity={onPress ? 0.7 : 1}
            onPress={() => onPress?.(item)}
            disabled={!onPress}
          >
            <PostBadge statusId={item.status_id} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleHeartPress}
            disabled={isHearting || propIsHearting}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="flex-row items-center py-1 px-1.5 rounded-lg active:bg-rose-50"
          >
            <MaterialCommunityIcons
              name={isHearted ? 'heart' : 'heart-outline'}
              size={18}
              color="#E11D48"
            />
            <Text className="text-xs font-semibold text-neutral-700 ml-1">
              {heartsCount} {heartsCount === 1 ? 'heart' : 'hearts'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tags and Description area */}
        <TouchableOpacity
          activeOpacity={onPress ? 0.7 : 1}
          onPress={() => onPress?.(item)}
          disabled={!onPress}
        >
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
        </TouchableOpacity>
      </View>

      {/* Full-screen Image Viewer Modal */}
      {images.length > 0 && (
        <Modal
          visible={isFullScreenVisible}
          transparent={true}
          animationType="fade"
          statusBarTranslucent={true}
          onRequestClose={() => setIsFullScreenVisible(false)}
        >
          <View className="flex-1 bg-black justify-between">
            <StatusBar barStyle="light-content" backgroundColor="#000000" />

            {/* Top Bar with Close button and Index Indicator */}
            <View className="flex-row items-center justify-between px-5 pt-12 pb-3 z-20">
              <TouchableOpacity
                onPress={() => setIsFullScreenVisible(false)}
                activeOpacity={0.7}
                className="w-10 h-10 rounded-full bg-neutral-800/80 items-center justify-center border border-neutral-700"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>

              {images.length > 1 && (
                <View className="bg-neutral-800/80 px-3 py-1.5 rounded-full border border-neutral-700">
                  <Text className="text-white text-xs font-bold tracking-wider">
                    {fullScreenIndex + 1} / {images.length}
                  </Text>
                </View>
              )}

              {/* Spacer to balance header */}
              <View className="w-10 h-10" />
            </View>

            {/* Full-screen Image or Carousel */}
            <View className="flex-1 justify-center items-center">
              {images.length === 1 ? (
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={() => setIsFullScreenVisible(false)}
                  className="w-full h-full justify-center items-center"
                >
                  <Image
                    source={{ uri: images[0].image_url }}
                    style={{ width: windowWidth, height: windowHeight * 0.78 }}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              ) : (
                <ScrollView
                  ref={fullScreenScrollRef}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onScroll={(event) => {
                    const width = event.nativeEvent.layoutMeasurement.width || windowWidth;
                    if (width > 0) {
                      const nextIdx = Math.round(event.nativeEvent.contentOffset.x / width);
                      if (nextIdx >= 0 && nextIdx < images.length && nextIdx !== fullScreenIndex) {
                        setFullScreenIndex(nextIdx);
                      }
                    }
                  }}
                  scrollEventThrottle={16}
                  style={{ width: windowWidth, height: '100%' }}
                >
                  {images.map((img, idx) => (
                    <TouchableOpacity
                      key={img.id || idx}
                      activeOpacity={1}
                      onPress={() => setIsFullScreenVisible(false)}
                      style={{
                        width: windowWidth,
                        height: '100%',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Image
                        source={{ uri: img.image_url }}
                        style={{ width: windowWidth, height: windowHeight * 0.78 }}
                        resizeMode="contain"
                      />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Bottom Caption and Location Info */}
            <View className="px-6 pb-10 pt-3 z-20 bg-neutral-950/80">
              <Text
                numberOfLines={1}
                className="text-white text-base font-bold text-center"
              >
                {item.title}
              </Text>
              {images[fullScreenIndex]?.caption ? (
                <Text
                  numberOfLines={2}
                  className="text-neutral-300 text-xs text-center mt-1"
                >
                  {images[fullScreenIndex].caption}
                </Text>
              ) : item.address ? (
                <Text
                  numberOfLines={1}
                  className="text-neutral-400 text-xs text-center mt-1"
                >
                  {item.address}
                </Text>
              ) : null}
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
