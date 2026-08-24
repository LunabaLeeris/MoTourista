import './global.css';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Session } from '@supabase/supabase-js';
import { supabase } from './src/lib/supabase';
import LoginScreen from './src/screens/LoginScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import ProfilePreviewScreen from './src/screens/ProfilePreviewScreen';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnboarded, setIsOnboarded] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  useEffect(() => {
    // Get the active user session on startup.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        checkOnboardingStatus(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for changes to the authentication state.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        checkOnboardingStatus(session.user.id);
      } else {
        setIsOnboarded(false);
        setIsEditing(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkOnboardingStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_onboarded')
        .eq('id', userId)
        .maybeSingle();

      if (data && !error) {
        setIsOnboarded(Boolean(data.is_onboarded));
      } else {
        setIsOnboarded(false);
      }
    } catch {
      setIsOnboarded(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator color="#000" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView className="flex-1 bg-white">
        <StatusBar style="dark" />
        {!session ? (
          <LoginScreen onLoginSuccess={() => setLoading(true)} />
        ) : !isOnboarded || isEditing ? (
          <OnboardingScreen
            userId={session.user.id}
            onCompleted={() => {
              setIsOnboarded(true);
              setIsEditing(false);
            }}
          />
        ) : (
          <ProfilePreviewScreen
            userId={session.user.id}
            onEditProfile={() => setIsEditing(true)}
            onSignOut={() => setSession(null)}
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
