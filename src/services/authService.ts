import { supabase } from '../lib/supabase';

export async function checkOnboardingStatus(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('is_onboarded')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Failed to query user onboarding status:', error.message);
      return false;
    }

    return Boolean(data?.is_onboarded);
  } catch (error) {
    console.error('Unexpected error while checking onboarding status:', error);
    return false;
  }
}
