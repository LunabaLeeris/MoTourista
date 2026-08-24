import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// When running on a physical phone, 'localhost' points to the phone itself.
// Replace with your computer's local Wi-Fi IP (e.g., http://192.168.1.100:54321) in .env
const fallbackUrl =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:54321'
    : 'http://127.0.0.1:54321';

export const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || fallbackUrl;

export const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDAwMDAwMDAsImV4cCI6MTk1NTU1NTU1NX0.dummy-local-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
