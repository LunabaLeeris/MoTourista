import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../types/navigation';
import { LocationWithDetails } from '../types/database';
import { fetchUserPosts, deletePost, PostSortOption } from '../services/postService';
import { PostPanel } from '../components/posts';

export default function PostsScreen() {
  const { user, profile } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const effectiveUserId = user?.id || '';

  const [posts, setPosts] = useState<LocationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<PostSortOption>('newest');
  const [isSortModalVisible, setIsSortModalVisible] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

  // Load user posts from Supabase.
  const loadPosts = async (sortOption = sortBy, isSilent = false) => {
    if (!effectiveUserId) {
      setLoading(false);
      return;
    }

    try {
      if (!isSilent) {
        setLoading(true);
      }
      const data = await fetchUserPosts(effectiveUserId, sortOption);
      setPosts(data);
    } catch (err: any) {
      console.error('Error loading posts:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Reload data when the screen gains focus.
  useFocusEffect(
    useCallback(() => {
      loadPosts(sortBy);
    }, [effectiveUserId, sortBy])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadPosts(sortBy, true);
  };

  const handleSortChange = (newSort: PostSortOption) => {
    setSortBy(newSort);
    setIsSortModalVisible(false);
    loadPosts(newSort);
  };

  const handleDeletePost = (post: LocationWithDetails) => {
    if (post.status_id === 'approved') {
      Alert.alert(
        'Action Not Permitted',
        'Approved posts cannot be deleted directly. Please contact an admin.'
      );
      return;
    }

    Alert.alert(
      'Delete Post',
      `Are you sure you want to delete "${post.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingPostId(post.id);
              const result = await deletePost(post.id, effectiveUserId);
              if (result.success) {
                setPosts((prev) => prev.filter((p) => p.id !== post.id));
              } else {
                Alert.alert(
                  'Delete Failed',
                  result.error?.message || 'Could not delete post.'
                );
              }
            } finally {
              setDeletingPostId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-[#EBE7E5]">
      {/* Screen Top Bar */}
      <View className="flex-row items-center justify-between px-5 pt-12 pb-4 bg-[#EBE7E5]">
        <Text className="text-2xl font-bold text-neutral-900">
          My posts
        </Text>
        <TouchableOpacity
          onPress={() => setIsSortModalVisible(true)}
          className="flex-row items-center px-3 py-1.5 rounded-full bg-white/70 border border-neutral-300"
        >
          <Text className="text-sm font-semibold text-neutral-800 mr-1">
            Sort by
          </Text>
          <MaterialCommunityIcons name="chevron-down" size={16} color="#404040" />
        </TouchableOpacity>
      </View>

      {/* Main Post List */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#000000" />
          <Text className="text-xs text-neutral-600 mt-2">
            Loading your posts...
          </Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PostPanel
              item={item}
              avatarUrl={profile?.avatar_url}
              isDeleting={deletingPostId === item.id}
              onDelete={handleDeletePost}
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 90 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#000000']}
            />
          }
          ListEmptyComponent={
            <View className="items-center justify-center py-16 px-6">
              <MaterialCommunityIcons
                name="map-marker-plus-outline"
                size={54}
                color="#A3A3A3"
              />
              <Text className="text-base font-bold text-neutral-800 mt-3">
                No location posts yet
              </Text>
              <Text className="text-xs text-neutral-500 text-center mt-1 mb-5">
                Share your favorite scenic loops, coffee stops, and eateries with fellow riders.
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('CreatePost')}
                style={{ backgroundColor: '#16A34A' }}
                className="px-5 py-2.5 rounded-full shadow-sm"
              >
                <Text className="text-white text-xs font-bold">
                  Create First Post
                </Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Floating Action Button (FAB) for Adding a Post */}
      <TouchableOpacity
        onPress={() => navigation.navigate('CreatePost')}
        activeOpacity={0.85}
        style={{
          position: 'absolute',
          bottom: 24,
          right: 20,
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: '#16A34A',
          alignItems: 'center',
          justifyContent: 'center',
          elevation: 5,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
        }}
      >
        <MaterialCommunityIcons name="plus" size={32} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Sort Options Modal */}
      <Modal
        visible={isSortModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsSortModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setIsSortModalVisible(false)}
          className="flex-1 bg-black/40 justify-center items-center p-4"
        >
          <View className="bg-white rounded-2xl w-full max-w-xs p-4 shadow-lg">
            <Text className="text-base font-bold text-neutral-900 mb-3">
              Sort Posts
            </Text>

            <TouchableOpacity
              onPress={() => handleSortChange('newest')}
              className={`p-3 rounded-xl mb-1 ${
                sortBy === 'newest' ? 'bg-neutral-100' : ''
              }`}
            >
              <Text
                className={`text-sm ${
                  sortBy === 'newest'
                    ? 'font-bold text-black'
                    : 'text-neutral-700'
                }`}
              >
                Newest First
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSortChange('oldest')}
              className={`p-3 rounded-xl mb-1 ${
                sortBy === 'oldest' ? 'bg-neutral-100' : ''
              }`}
            >
              <Text
                className={`text-sm ${
                  sortBy === 'oldest'
                    ? 'font-bold text-black'
                    : 'text-neutral-700'
                }`}
              >
                Oldest First
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSortChange('title')}
              className={`p-3 rounded-xl mb-1 ${
                sortBy === 'title' ? 'bg-neutral-100' : ''
              }`}
            >
              <Text
                className={`text-sm ${
                  sortBy === 'title' ? 'font-bold text-black' : 'text-neutral-700'
                }`}
              >
                Title (A-Z)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSortChange('status')}
              className={`p-3 rounded-xl ${
                sortBy === 'status' ? 'bg-neutral-100' : ''
              }`}
            >
              <Text
                className={`text-sm ${
                  sortBy === 'status'
                    ? 'font-bold text-black'
                    : 'text-neutral-700'
                }`}
              >
                Status (Pending, Approved)
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
