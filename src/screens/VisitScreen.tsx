import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  TextInput,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { TagRow, BadgeWithProgress } from '../types/database';
import { getTags } from '../services/lookupService';
import { recordSimulatedVisit } from '../services/visitService';
import { fetchBadgesWithProgress } from '../services/badgeService';

export default function VisitScreen() {
  const { user } = useAuth();
  const effectiveUserId = user?.id || '';

  const [tags, setTags] = useState<TagRow[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(true);
  const [notes, setNotes] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [badges, setBadges] = useState<BadgeWithProgress[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Load available tags and current badge progress
  const loadData = async () => {
    try {
      setLoadingInitial(true);
      const [fetchedTags, fetchedBadges] = await Promise.all([
        getTags(),
        effectiveUserId ? fetchBadgesWithProgress(effectiveUserId) : Promise.resolve([]),
      ]);
      setTags(fetchedTags);
      setBadges(fetchedBadges);
    } catch (err: any) {
      console.error('Error loading visit test data:', err);
    } finally {
      setLoadingInitial(false);
    }
  };

  // Reload data when the screen gains focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [effectiveUserId])
  );

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleSelectAll = () => {
    setSelectedTagIds(tags.map((t) => t.id));
  };

  const handleClearAll = () => {
    setSelectedTagIds([]);
  };

  const handleRecordVisit = async () => {
    if (!effectiveUserId) {
      setErrorMessage('User session not found. Please log in.');
      return;
    }

    try {
      setIsRecording(true);
      setErrorMessage(null);
      setFeedbackMessage(null);

      const result = await recordSimulatedVisit({
        userId: effectiveUserId,
        tagIds: selectedTagIds,
        notes: notes.trim() || undefined,
      });

      // Refresh badges to reflect the trigger calculation
      const updatedBadges = await fetchBadgesWithProgress(effectiveUserId);
      setBadges(updatedBadges);

      const tagCount = selectedTagIds.length;
      const tagText = tagCount > 0 ? `${tagCount} tag(s)` : 'no tags';
      setFeedbackMessage(
        `Visit recorded successfully for "${result.location.title}" with ${tagText}. Badges updated.`
      );
      setNotes('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to record simulated visit.');
    } finally {
      setIsRecording(false);
    }
  };

  if (loadingInitial) {
    return (
      <View className="flex-1 bg-white items-center justify-center p-6">
        <ActivityIndicator color="#000" />
        <Text className="text-sm text-neutral-600 mt-2">Loading test screen...</Text>
      </View>
    );
  }

  const selectedCount = selectedTagIds.length;
  const unlockedCount = badges.filter((b) => b.is_unlocked).length;

  return (
    <ScrollView
      className="flex-1 bg-white p-6 max-w-md w-full self-center"
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View className="mb-6 pb-3 border-b border-neutral-200">
        <Text className="text-xl font-bold text-black">Visit Simulator</Text>
        <Text className="text-xs text-neutral-600 mt-1">
          Simulate location visits to test automated badge progression triggers.
        </Text>
      </View>

      {/* Success / Error Feedback */}
      {feedbackMessage && (
        <View className="bg-neutral-100 border border-black rounded p-3 mb-4">
          <View className="flex-row items-center">
            <MaterialCommunityIcons name="check-circle" size={18} color="#000" />
            <Text className="text-xs font-semibold text-black ml-2 flex-1">
              {feedbackMessage}
            </Text>
          </View>
        </View>
      )}

      {errorMessage && (
        <View className="bg-neutral-100 border border-neutral-400 rounded p-3 mb-4">
          <View className="flex-row items-center">
            <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#000" />
            <Text className="text-xs text-black ml-2 flex-1">{errorMessage}</Text>
          </View>
        </View>
      )}

      {/* Tag Selection Dropdown Section */}
      <View className="border border-neutral-200 rounded p-4 mb-6">
        <TouchableOpacity
          onPress={() => setIsDropdownOpen(!isDropdownOpen)}
          activeOpacity={0.7}
          className="flex-row justify-between items-center"
        >
          <View>
            <Text className="text-sm font-bold text-black">Location Tags</Text>
            <Text className="text-xs text-neutral-500">
              {selectedCount === 0
                ? 'No tags selected (counts toward total visits only)'
                : `${selectedCount} tag${selectedCount > 1 ? 's' : ''} selected`}
            </Text>
          </View>
          <Text className="text-sm text-neutral-600">{isDropdownOpen ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {isDropdownOpen && (
          <View className="mt-3 pt-3 border-t border-neutral-100">
            {/* Quick action buttons */}
            <View className="flex-row justify-end mb-2 gap-x-2">
              <TouchableOpacity
                onPress={handleSelectAll}
                className="px-2.5 py-1 rounded border border-neutral-300"
              >
                <Text className="text-[11px] text-black">Select All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleClearAll}
                className="px-2.5 py-1 rounded border border-neutral-300"
              >
                <Text className="text-[11px] text-neutral-600">Clear</Text>
              </TouchableOpacity>
            </View>

            {/* Checkbox list */}
            {tags.map((tag) => {
              const isChecked = selectedTagIds.includes(tag.id);
              return (
                <TouchableOpacity
                  key={tag.id}
                  onPress={() => toggleTag(tag.id)}
                  activeOpacity={0.7}
                  className={`flex-row items-center justify-between py-2.5 px-3 rounded mb-1.5 border ${
                    isChecked
                      ? 'bg-neutral-50 border-black'
                      : 'bg-white border-neutral-200'
                  }`}
                >
                  <View className="flex-row items-center flex-1 pr-2">
                    <MaterialCommunityIcons
                      name={(tag.icon || 'tag-outline') as any}
                      size={18}
                      color={isChecked ? '#000000' : '#737373'}
                      style={{ marginRight: 8 }}
                    />
                    <Text
                      className={`text-xs ${
                        isChecked ? 'font-bold text-black' : 'text-neutral-800'
                      }`}
                    >
                      {tag.name}
                    </Text>
                  </View>

                  <MaterialCommunityIcons
                    name={isChecked ? 'checkbox-marked' : 'checkbox-blank-outline'}
                    size={20}
                    color={isChecked ? '#000000' : '#a3a3a3'}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* Optional Notes Input */}
      <View className="mb-6">
        <Text className="text-xs font-medium text-neutral-700 mb-1">
          Visit Notes (Optional)
        </Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="e.g. Afternoon ride at Marilaque"
          placeholderTextColor="#a3a3a3"
          className="border border-neutral-300 p-3 rounded text-sm text-black bg-white"
        />
      </View>

      {/* Primary Action Button */}
      <TouchableOpacity
        onPress={handleRecordVisit}
        disabled={isRecording}
        activeOpacity={0.8}
        className={`p-3.5 rounded items-center justify-center mb-8 ${
          isRecording ? 'bg-neutral-800' : 'bg-black'
        }`}
      >
        {isRecording ? (
          <View className="flex-row items-center">
            <ActivityIndicator size="small" color="#ffffff" />
            <Text className="text-sm font-semibold text-white ml-2">
              Recording Visit...
            </Text>
          </View>
        ) : (
          <Text className="text-sm font-semibold text-white">Record Visit</Text>
        )}
      </TouchableOpacity>

      {/* Live Badge Progress Preview */}
      <View className="mb-8 border-t border-neutral-200 pt-6">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-sm font-bold text-black uppercase tracking-wider">
            Badge Progress Overview
          </Text>
          <Text className="text-xs text-neutral-500">
            {unlockedCount} / {badges.length} Unlocked
          </Text>
        </View>

        {badges.map((badge) => {
          const ratio = Math.min(1, badge.current_progress / badge.target_progress);
          const percent = Math.round(ratio * 100);

          return (
            <View
              key={badge.id}
              className={`p-3 rounded mb-2 border ${
                badge.is_unlocked
                  ? 'bg-neutral-50 border-black'
                  : 'bg-white border-neutral-200'
              }`}
            >
              <View className="flex-row items-center justify-between mb-1.5">
                <View className="flex-row items-center flex-1 pr-2">
                  <MaterialCommunityIcons
                    name={(badge.icon || 'trophy-outline') as any}
                    size={20}
                    color={badge.is_unlocked ? '#000000' : '#737373'}
                    style={{ marginRight: 8 }}
                  />
                  <Text
                    className={`text-xs ${
                      badge.is_unlocked ? 'font-bold text-black' : 'text-neutral-800'
                    }`}
                  >
                    {badge.title}
                  </Text>
                </View>

                <View className="flex-row items-center">
                  <Text className="text-xs font-medium text-black">
                    {badge.current_progress} / {badge.target_progress}
                  </Text>
                  {badge.is_unlocked && (
                    <Text className="text-[10px] font-bold text-black ml-1.5 bg-neutral-200 px-1.5 py-0.5 rounded">
                      UNLOCKED
                    </Text>
                  )}
                </View>
              </View>

              {/* Progress bar */}
              <View className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                <View
                  className={`h-full rounded-full ${
                    badge.is_unlocked ? 'bg-black' : 'bg-neutral-600'
                  }`}
                  style={{ width: `${percent}%` }}
                />
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
