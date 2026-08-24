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
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
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

  // OAuth handler for Google or Facebook
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
        `To use ${provider.toUpperCase()} login locally, ensure OAuth credentials are configured in Supabase. You can also use the email login below for immediate testing!\n\nDetails: ${err.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  // Direct email login/signup for immediate local testing
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
            'Signed up successfully! You can now log in.'
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
      className="flex-1 bg-slate-950"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        className="px-6 py-12 justify-center"
      >
        {/* Header Branding */}
        <View className="items-center mb-8">
          <View className="w-20 h-20 bg-orange-500/20 border-2 border-orange-500 rounded-3xl items-center justify-center mb-4">
            <FontAwesome5 name="motorcycle" size={38} color="#F97316" />
          </View>
          <Text className="text-3xl font-extrabold text-white tracking-wider">
            Mo<Text className="text-orange-500">Tourista</Text>
          </Text>
          <Text className="text-slate-400 text-sm mt-1 font-medium text-center">
            Philippine Motorcycle Adventure & Hotspot Hub
          </Text>
        </View>

        {/* OAuth Buttons */}
        <View className="space-y-3 mb-6">
          {/* Google Login */}
          <TouchableOpacity
            onPress={() => handleOAuthLogin('google')}
            disabled={loading}
            activeOpacity={0.8}
            className="flex-row items-center justify-center bg-white py-3.5 px-4 rounded-xl shadow-sm mb-3"
          >
            <Ionicons name="logo-google" size={20} color="#EA4335" />
            <Text className="text-slate-900 font-bold text-base ml-3">
              Continue with Google
            </Text>
          </TouchableOpacity>

          {/* Facebook Login */}
          <TouchableOpacity
            onPress={() => handleOAuthLogin('facebook')}
            disabled={loading}
            activeOpacity={0.8}
            className="flex-row items-center justify-center bg-[#1877F2] py-3.5 px-4 rounded-xl shadow-sm"
          >
            <Ionicons name="logo-facebook" size={22} color="#FFFFFF" />
            <Text className="text-white font-bold text-base ml-3">
              Continue with Facebook
            </Text>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View className="flex-row items-center my-6">
          <View className="flex-1 h-[1px] bg-slate-800" />
          <Text className="text-slate-500 text-xs font-semibold px-3 uppercase tracking-wider">
            or email login
          </Text>
          <View className="flex-1 h-[1px] bg-slate-800" />
        </View>

        {/* Email/Password Form */}
        <View className="space-y-4">
          <View className="mb-3">
            <Text className="text-slate-300 text-xs font-semibold mb-1.5 uppercase">
              Rider Email
            </Text>
            <View className="flex-row items-center bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-3">
              <Ionicons name="mail-outline" size={18} color="#94A3B8" />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="rider@motourista.ph"
                placeholderTextColor="#64748B"
                keyboardType="email-address"
                autoCapitalize="none"
                className="flex-1 text-white ml-2.5 text-base"
              />
            </View>
          </View>

          <View className="mb-5">
            <Text className="text-slate-300 text-xs font-semibold mb-1.5 uppercase">
              Password
            </Text>
            <View className="flex-row items-center bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-3">
              <Ionicons name="lock-closed-outline" size={18} color="#94A3B8" />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#64748B"
                secureTextEntry
                className="flex-1 text-white ml-2.5 text-base"
              />
            </View>
          </View>

          <TouchableOpacity
            onPress={handleEmailAuth}
            disabled={loading}
            activeOpacity={0.8}
            className="bg-orange-500 py-3.5 rounded-xl items-center justify-center shadow-lg shadow-orange-500/20"
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-white font-bold text-base">
                {isSignUp ? 'Create Rider Account' : 'Sign In'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setIsSignUp(!isSignUp)}
            className="items-center py-2 mt-2"
          >
            <Text className="text-slate-400 text-sm">
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
              <Text className="text-orange-400 font-bold">
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
