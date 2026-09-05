import { supabase } from '../lib/supabase';
import { ProfileWithDetails, TablesInsert } from '../types/database';

export async function fetchProfileDetails(userId: string): Promise<ProfileWithDetails | null> {
  if (!userId) return null;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, driver_types (*), vehicle_types (*), motorcycle_models (*)')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Failed to fetch profile details:', error.message);
      return null;
    }

    return (data as ProfileWithDetails) || null;
  } catch (error) {
    console.error('Unexpected error in fetchProfileDetails:', error);
    return null;
  }
}


export async function upsertProfile(
  profileData: TablesInsert<'profiles'>
): Promise<{ success: boolean; error?: any }> {
  try {
    const { error } = await supabase
      .from('profiles')
      .upsert(profileData, { onConflict: 'id' });

    if (error) {
      console.error('Failed to upsert profile:', error.message);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error in upsertProfile:', error);
    return { success: false, error };
  }
}
