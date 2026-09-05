import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '../lib/supabase';

WebBrowser.maybeCompleteAuthSession();

type OAuthProviders = 'google' | 'facebook';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  // Authenticate the user with Google or Facebook.
  const handleOAuthLogin = async (provider: OAuthProviders) => {
    try {
      setLoading(true);
      const redirectUrl = makeRedirectUri({
        scheme: 'motourista',
        path: 'auth/callback',
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl
        );

        if (result.type === 'success' && result.url) {
          const url = new URL(result.url);
          const searchParams = url.searchParams;
          const hashParams = new URLSearchParams(
            url.hash ? url.hash.replace(/^#/, '') : ''
          );

          const code = searchParams.get('code') || hashParams.get('code');
          if (code) {
            const { error: exchangeError } =
              await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) throw exchangeError;
          } else {
            const accessToken =
              searchParams.get('access_token') || hashParams.get('access_token');
            const refreshToken =
              searchParams.get('refresh_token') || hashParams.get('refresh_token');

            if (accessToken && refreshToken) {
              const { error: sessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              if (sessionError) throw sessionError;
            }
          }
        }
      }
    } catch (err: any) {
      Alert.alert(
        'OAuth Notice',
        `OAuth provider returned an error: ${err.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  // Authenticate the user with an email and a password.
  const handleEmailAuth = async () => {
    if (!email || !password || (isSignUp && !confirmPassword)) {
      Alert.alert('Required Fields', 'Please enter all required fields.');
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      Alert.alert('Password Error', 'Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: {
              full_name: email.split('@')[0],
            },
          },
        });
        if (error) throw error;
        if (!data.session) {
          Alert.alert(
            'Account Created',
            'Signed up successfully. You can now log in.'
          );
          setIsSignUp(false);
          setConfirmPassword('');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      Alert.alert('Authentication Error', err.message || 'Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        keyboardShouldPersistTaps="handled"
        className="p-6 max-w-md w-full self-center"
      >
        {/* Title */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-black mb-1">
            MoTourista
          </Text>
          <Text className="text-sm text-neutral-600">
            {isSignUp ? 'Create an account' : 'Sign in to continue'}
          </Text>
        </View>

        {/* OAuth Buttons */}
        <View className="mb-6">
          <TouchableOpacity
            onPress={() => handleOAuthLogin('google')}
            disabled={loading}
            className="border border-neutral-300 p-3 rounded mb-2 items-center"
          >
            <Text className="text-black font-medium">
              Continue with Google
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleOAuthLogin('facebook')}
            disabled={loading}
            className="border border-neutral-300 p-3 rounded items-center"
          >
            <Text className="text-black font-medium">
              Continue with Facebook
            </Text>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View className="border-b border-neutral-200 mb-6" />

        {/* Form */}
        <View className="mb-4">
          <Text className="text-xs text-neutral-600 mb-1">
            Email
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="email@domain.com"
            placeholderTextColor="#888"
            keyboardType="email-address"
            autoCapitalize="none"
            className="border border-neutral-300 p-3 rounded text-black mb-3"
          />

          <Text className="text-xs text-neutral-600 mb-1">
            Password
          </Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor="#888"
            secureTextEntry
            className="border border-neutral-300 p-3 rounded text-black mb-4"
          />

          {isSignUp && (
            <>
              <Text className="text-xs text-neutral-600 mb-1">
                Confirm Password
              </Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm Password"
                placeholderTextColor="#888"
                secureTextEntry
                className="border border-neutral-300 p-3 rounded text-black mb-4"
              />
            </>
          )}

          <TouchableOpacity
            onPress={handleEmailAuth}
            disabled={loading}
            className="bg-black p-3 rounded items-center justify-center mb-3"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-medium">
                {isSignUp ? 'Sign Up' : 'Sign In'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setIsSignUp(!isSignUp);
              setConfirmPassword('');
            }}
            className="items-center p-2"
          >
            <Text className="text-neutral-700 text-sm">
              {isSignUp
                ? 'Already have an account? Sign In'
                : "Don't have an account? Sign Up"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
