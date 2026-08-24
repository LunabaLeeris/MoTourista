import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// [QUESTION] do we need these fallbacks? ugly just throw an error to show that 
// the public supabase key is not defined
const fallbackUrl =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:54321'
    : 'http://127.0.0.1:54321';

export const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || fallbackUrl;

// [CHANGE] remove that default, wtf
export const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// [QUESTION] what exactly does this do? does this handle the jwt tokens and all?
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
