import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { LocationWithDetails } from '../types/database';
import { PostPanel } from '../components/posts';

type PostDetailRouteProp = RouteProp<RootStackParamList, 'PostDetail'>;

export interface PostDetailContentProps {
  post: LocationWithDetails;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  headerPaddingTopClass?: string;
}

/**
 * Reusable post details view containing PostPanel and Reviews/Visitors tabs.
 */
export function PostDetailContent({
  post,
  onBack,
  rightAction,
  headerPaddingTopClass = 'pt-12',
}: PostDetailContentProps) {
  const [activeTab, setActiveTab] = useState<'reviews' | 'visitors'>('reviews');

  return (
    <View className="flex-1">
      {/* Top Header / Back Navigation + Right Action */}
      <View
        className={`px-4 ${headerPaddingTopClass} pb-3 flex-row items-center justify-between z-10`}
      >
        {onBack ? (
          <TouchableOpacity
            onPress={onBack}
            activeOpacity={0.7}
            className="flex-row items-center py-1 pr-3"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons name="arrow-left" size={18} color="#171717" />
            <Text className="text-sm font-semibold text-neutral-800 ml-1">
              Back
            </Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}

        {rightAction ? (
          <View>{rightAction}</View>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Original Post Panel */}
        <PostPanel
          item={post}
          avatarUrl={post.profiles?.avatar_url}
          onDeleted={onBack}
        />

        {/* Tab Buttons (Reviews & Visitors) */}
        <View className="flex-row items-center px-1 mb-4 mt-1">
          <TouchableOpacity
            onPress={() => setActiveTab('reviews')}
            className="mr-6 py-1"
            activeOpacity={0.7}
          >
            <Text
              className={`text-base ${
                activeTab === 'reviews'
                  ? 'font-bold text-neutral-900 border-b-2 border-neutral-900 pb-0.5'
                  : 'font-semibold text-neutral-500'
              }`}
            >
              Reviews
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('visitors')}
            className="py-1"
            activeOpacity={0.7}
          >
            <Text
              className={`text-base ${
                activeTab === 'visitors'
                  ? 'font-bold text-neutral-900 border-b-2 border-neutral-900 pb-0.5'
                  : 'font-semibold text-neutral-500'
              }`}
            >
              Visitors
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content Section */}
        {activeTab === 'reviews' ? (
          /* Reviews Section (matching reference layout) */
          <View className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-sm mb-6">
            <View className="flex-row items-center mb-3">
              <View className="w-10 h-10 rounded-full bg-[#8E4141] items-center justify-center mr-3">
                <Text className="text-white text-xs font-bold">R</Text>
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-neutral-800">
                  Name Of Reviewer
                </Text>
                <Text className="text-xs text-neutral-500">
                  {post.address || 'Paranaque, green hilss 314'}
                </Text>
              </View>
            </View>

            <Text className="text-xs text-neutral-700 leading-relaxed mb-3">
              Ang galing ang sarap ang saya. Astig. Ano bayan. Wala nako maisip na sabihin
            </Text>

            {/* Photo Placeholders from reference image */}
            <View className="flex-row gap-2 mb-2">
              <View className="flex-1 h-28 bg-[#DDE5D8] rounded-xl" />
              <View className="flex-1 h-28 bg-[#DDE5D8] rounded-xl" />
            </View>
            <View className="w-full h-28 bg-[#DDE5D8] rounded-xl" />
          </View>
        ) : (
          /* Visitors Section */
          <View className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-sm mb-6">
            <Text className="text-sm font-bold text-neutral-800 mb-3">
              Recent Spot Visitors
            </Text>

            <View className="flex-row items-center justify-between py-2.5 border-b border-neutral-100">
              <View className="flex-row items-center">
                <View className="w-9 h-9 rounded-full bg-[#3B82F6] items-center justify-center mr-3">
                  <Text className="text-white text-xs font-bold">JD</Text>
                </View>
                <View>
                  <Text className="text-xs font-semibold text-neutral-800">
                    John Doe
                  </Text>
                  <Text className="text-[10px] text-neutral-400">
                    Visited 2 hours ago
                  </Text>
                </View>
              </View>
              <View className="bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <Text className="text-[10px] text-emerald-700 font-semibold">
                  Verified Visit
                </Text>
              </View>
            </View>

            <View className="flex-row items-center justify-between py-2.5">
              <View className="flex-row items-center">
                <View className="w-9 h-9 rounded-full bg-[#10B981] items-center justify-center mr-3">
                  <Text className="text-white text-xs font-bold">MR</Text>
                </View>
                <View>
                  <Text className="text-xs font-semibold text-neutral-800">
                    Maria Rider
                  </Text>
                  <Text className="text-[10px] text-neutral-400">
                    Visited yesterday
                  </Text>
                </View>
              </View>
              <View className="bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <Text className="text-[10px] text-emerald-700 font-semibold">
                  Verified Visit
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/**
 * Screen displaying the selected post panel with Reviews and Visitors tabs.
 */
export default function PostDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<PostDetailRouteProp>();
  const { post } = route.params;

  return (
    <View className="flex-1 bg-[#EBE7E5]">
      <StatusBar barStyle="dark-content" backgroundColor="#EBE7E5" />
      <PostDetailContent
        post={post}
        onBack={() => navigation.goBack()}
        headerPaddingTopClass="pt-12"
      />
    </View>
  );
}
