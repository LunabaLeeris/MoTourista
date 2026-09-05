import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { fetchProfileDetails } from '../services/profileService';
import { AuthContextType } from '../types/auth';
import { ProfileWithDetails } from '../types/database';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Authentication provider component that manages rider session and profile state.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileWithDetails | null>(null);
  const [isOnboarded, setIsOnboarded] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Refresh and load user profile with relational lookup data.
  const refreshProfile = async (userId?: string): Promise<ProfileWithDetails | null> => {
    const targetUserId = userId || session?.user?.id;
    if (!targetUserId) {
      setProfile(null);
      setIsOnboarded(false);
      return null;
    }
    const data = await fetchProfileDetails(targetUserId);
    setProfile(data);
    setIsOnboarded(Boolean(data?.is_onboarded));
    return data;
  };

  // Refresh and update user onboarding status (for backward compatibility).
  const refreshOnboardingStatus = async (): Promise<boolean> => {
    const data = await refreshProfile();
    return Boolean(data?.is_onboarded);
  };

  // Sign out the active user and clear session state.
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Failed to sign out user:', error);
    } finally {
      setSession(null);
      setProfile(null);
      setIsOnboarded(false);
    }
  };

  useEffect(() => {
    // Validate active session on startup.
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (error || !user) {
        supabase.auth.signOut();
        setSession(null);
        setProfile(null);
        setIsOnboarded(false);
        setIsLoading(false);
      } else {
        supabase.auth.getSession().then(async ({ data: { session } }) => {
          setSession(session);
          if (session?.user?.id) {
            await refreshProfile(session.user.id);
          }
          setIsLoading(false);
        });
      }
    });

    // Listen for authentication changes.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession?.user?.id) {
        await refreshProfile(newSession.user.id);
      } else {
        setProfile(null);
        setIsOnboarded(false);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      isOnboarded,
      isLoading,
      signOut,
      refreshProfile,
      refreshOnboardingStatus,
      setIsOnboarded,
      setProfile,
    }),
    [session, profile, isOnboarded, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook to consume the authentication context.
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }
  return context;
}
