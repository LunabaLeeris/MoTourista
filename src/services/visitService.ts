import { supabase } from '../lib/supabase';
import { LocationRow, LocationVisitRow } from '../types/database';

export interface SimulatedVisitParams {
  userId: string;
  tagIds: string[];
  notes?: string;
}

export interface SimulatedVisitResult {
  location: LocationRow;
  visit: LocationVisitRow;
  tagIds: string[];
}

/**
 * Simulates visiting a location with the specified tags.
 * Bypasses manual location creation by creating a lightweight test location,
 * linking the selected tags, and recording the visit in location_visits.
 * This directly fires the database trigger 'on_location_visit_awarded'.
 */
export async function recordSimulatedVisit({
  userId,
  tagIds,
  notes,
}: SimulatedVisitParams): Promise<SimulatedVisitResult> {
  if (!userId) {
    throw new Error('User ID is required to record a visit.');
  }

  const timestamp = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // 1. Create lightweight test location
  const { data: locationData, error: locationError } = await supabase
    .from('locations')
    .insert({
      title: `Test Location (${timestamp})`,
      description: 'Automated test location for badge simulation',
      address: 'Simulated Test Hotspot',
      latitude: 14.5995,
      longitude: 120.9842,
      status_id: 'pending',
      created_by: userId,
    })
    .select()
    .single();

  if (locationError || !locationData) {
    throw new Error(locationError?.message || 'Failed to create simulated test location.');
  }

  // 2. Attach selected tags to the location
  if (tagIds.length > 0) {
    const locationTags = tagIds.map((tagId) => ({
      location_id: locationData.id,
      tag_id: tagId,
    }));

    const { error: tagsError } = await supabase
      .from('location_tags')
      .insert(locationTags);

    if (tagsError) {
      console.error('Error linking location tags:', tagsError);
      // We still proceed with recording the visit so the user can test
    }
  }

  // 3. Record the visit in location_visits
  // The PostgreSQL trigger on_location_visit_awarded will automatically run
  // evaluate_rider_badges() and calculate_user_badge_progress().
  const { data: visitData, error: visitError } = await supabase
    .from('location_visits')
    .insert({
      location_id: locationData.id,
      user_id: userId,
      visited_at: new Date().toISOString(),
      notes: notes || `Test visit with tags: ${tagIds.join(', ') || 'None'}`,
    })
    .select()
    .single();

  if (visitError || !visitData) {
    throw new Error(visitError?.message || 'Failed to record location visit.');
  }

  return {
    location: locationData,
    visit: visitData,
    tagIds,
  };
}

/**
 * Fetches recent location visits for the user with joined location title and details.
 */
export async function fetchRecentVisits(userId: string, limit = 5): Promise<LocationVisitRow[]> {
  if (!userId) return [];

  const { data, error } = await supabase
    .from('location_visits')
    .select('*')
    .eq('user_id', userId)
    .order('visited_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching recent visits:', error);
    return [];
  }

  return data || [];
}
