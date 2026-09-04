import { Session, User } from '@supabase/supabase-js';

// Type definitions for authentication and onboarding services.

export interface OnboardingCheckResult {
  isOnboarded: boolean;
  errorMessage?: string;
}

export interface AuthContextType {
  session: Session | null;
  user: User | null;
  isOnboarded: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshOnboardingStatus: () => Promise<boolean>;
  setIsOnboarded: (value: boolean) => void;
}
