import './global.css';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView className="flex-1 bg-white">
        <StatusBar style="dark" />
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
