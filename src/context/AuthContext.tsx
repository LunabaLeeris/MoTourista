import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { checkOnboardingStatus } from '../services/authService';
import { AuthContextType } from '../types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Authentication provider component that manages rider session and profile state.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isOnboarded, setIsOnboarded] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Refresh and update user onboarding status.
  const refreshOnboardingStatus = async (): Promise<boolean> => {
    if (!session?.user?.id) {
      setIsOnboarded(false);
      return false;
    }
    const status = await checkOnboardingStatus(session.user.id);
    setIsOnboarded(status);
    return status;
  };

  // Sign out the active user and clear session state.
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Failed to sign out user:', error);
    } finally {
      setSession(null);
      setIsOnboarded(false);
    }
  };

  useEffect(() => {
    // Validate active session on startup.
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (error || !user) {
        supabase.auth.signOut();
        setSession(null);
        setIsLoading(false);
      } else {
        supabase.auth.getSession().then(({ data: { session } }) => {
          setSession(session);
          if (session) {
            checkOnboardingStatus(session.user.id).then((status) => {
              setIsOnboarded(status);
              setIsLoading(false);
            });
          } else {
            setIsLoading(false);
          }
        });
      }
    });

    // Listen for authentication changes.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        checkOnboardingStatus(newSession.user.id).then((status) => {
          setIsOnboarded(status);
          setIsLoading(false);
        });
      } else {
        setIsOnboarded(false);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      isOnboarded,
      isLoading,
      signOut,
      refreshOnboardingStatus,
      setIsOnboarded,
    }),
    [session, isOnboarded, isLoading]
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
