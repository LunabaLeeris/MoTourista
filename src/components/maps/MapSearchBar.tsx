import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TagRow } from '../../types/database';

export interface MapSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  tags: TagRow[];
  selectedTagId: string | null;
  onSelectTag: (tagId: string | null) => void;
}

/**
 * Top floating search bar and filter controls for the map screen.
 * Styled using Tailwind CSS utility classes.
 */
export default function MapSearchBar({
  searchQuery,
  onSearchChange,
  showFilters,
  onToggleFilters,
  tags,
  selectedTagId,
  onSelectTag,
}: MapSearchBarProps) {
  const topPaddingClass = Platform.OS === 'android' ? 'pt-10' : 'pt-2.5';

  return (
    <SafeAreaView className="absolute top-0 left-0 right-0 z-20">
      <View className={`px-4 ${topPaddingClass}`}>
        <View className="flex-row items-center gap-2.5">
          {/* Search Input Box */}
          <View className="flex-1 h-12 bg-white rounded-md border-[1.5px] border-black flex-row items-center px-3 shadow-md elevation-3">
            <MaterialCommunityIcons
              name="magnify"
              size={20}
              color="#64748b"
              className="mr-2"
            />
            <TextInput
              className="flex-1 h-full text-black text-[15px]"
              placeholder="Search"
              placeholderTextColor="#64748b"
              value={searchQuery}
              onChangeText={onSearchChange}
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => onSearchChange('')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialCommunityIcons
                  name="close-circle"
                  size={18}
                  color="#94a3b8"
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Filters Toggle Button */}
          <TouchableOpacity
            className={`h-12 px-4.5 bg-white rounded-md border-[1.5px] border-black justify-center items-center shadow-md elevation-3 ${
              showFilters ? 'bg-black' : 'bg-white'
            }`}
            onPress={onToggleFilters}
            activeOpacity={0.8}
          >
            <Text
              className={`text-[15px] font-medium ${
                showFilters ? 'text-white' : 'text-black'
              }`}
            >
              Filters
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick Tag Filter Chips Row */}
        {(showFilters || selectedTagId) && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
            className="mt-2.5"
          >
            <TouchableOpacity
              className={`px-3.5 py-1.5 rounded-full border ${
                selectedTagId === null
                  ? 'bg-[#e11d48] border-[#e11d48]'
                  : 'bg-white border-slate-300'
              }`}
              onPress={() => onSelectTag(null)}
            >
              <Text
                className={`text-[13px] ${
                  selectedTagId === null
                    ? 'text-white font-semibold'
                    : 'text-slate-700 font-medium'
                }`}
              >
                All
              </Text>
            </TouchableOpacity>

            {tags.map((tag) => {
              const isActive = selectedTagId === tag.id;
              return (
                <TouchableOpacity
                  key={tag.id}
                  className={`px-3.5 py-1.5 rounded-full border ${
                    isActive
                      ? 'bg-[#e11d48] border-[#e11d48]'
                      : 'bg-white border-slate-300'
                  }`}
                  onPress={() => onSelectTag(isActive ? null : tag.id)}
                >
                  <Text
                    className={`text-[13px] ${
                      isActive
                        ? 'text-white font-semibold'
                        : 'text-slate-700 font-medium'
                    }`}
                  >
                    {tag.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}
