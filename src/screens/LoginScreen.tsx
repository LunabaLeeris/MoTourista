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

interface LoginScreenProps {
  onLoginSuccess?: () => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  // Authenticate the user with Google or Facebook.
  const handleOAuthLogin = async (provider: 'google' | 'facebook') => {
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
          const urlParams = new URL(result.url);
          const hashParams = new URLSearchParams(urlParams.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');

          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            onLoginSuccess?.();
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
    if (!email || !password) {
      Alert.alert('Required Fields', 'Please enter both an email and password.');
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
        if (data.session) {
          onLoginSuccess?.();
        } else {
          Alert.alert(
            'Account Created',
            'Signed up successfully. You can now log in.'
          );
          setIsSignUp(false);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });
        if (error) throw error;
        onLoginSuccess?.();
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
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        className="p-6 justify-center max-w-md w-full self-center"
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
            onPress={() => setIsSignUp(!isSignUp)}
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
