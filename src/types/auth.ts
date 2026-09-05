import { Session, User } from '@supabase/supabase-js';
import { ProfileWithDetails } from './database';

// Type definitions for authentication and onboarding services.

export interface OnboardingCheckResult {
  isOnboarded: boolean;
  errorMessage?: string;
}

export interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: ProfileWithDetails | null;
  isOnboarded: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: (userId?: string) => Promise<ProfileWithDetails | null>;
  refreshOnboardingStatus: () => Promise<boolean>;
  setIsOnboarded: (value: boolean) => void;
  setProfile: React.Dispatch<React.SetStateAction<ProfileWithDetails | null>>;
}
