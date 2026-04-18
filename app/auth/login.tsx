import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { signInWithGoogle } from '@/lib/auth/oauth';
import { AuraGlow } from '@/styles/animations/aura-glow';
import { tokens } from '@/styles/tokens';

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);

  const onGooglePress = async () => {
    setLoading(true);
    try {
      const result = await signInWithGoogle();
      if (!result.ok) {
        const msg = result.error.message;
        if (msg === 'Sign-in was cancelled.') return;
        Alert.alert('Login Error', msg);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert('Login Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white px-8 justify-center">
      <View className="items-center mb-16">
        <View
          className="mb-6 items-center justify-center"
          style={{
            width: tokens.aura.haloContainerSize,
            height: tokens.aura.haloContainerSize,
          }}>
          <AuraGlow />
          <Image
            source={require('../../assets/images/artie-favicon.png')}
            className="h-24 w-24"
            resizeMode="contain"
          />
        </View>

        <Text className="text-4xl font-bold text-slate-900 tracking-tight">Artie</Text>
        <Text className="text-slate-500 text-center mt-2 text-lg px-4">
          Your Agentic Investment Remote
        </Text>
      </View>

      <View className="gap-y-4">
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onGooglePress}
          disabled={loading}
          className="w-full h-16 bg-slate-900 rounded-2xl flex-row items-center justify-center gap-x-3 shadow-sm">
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="logo-google" size={20} color="white" />
              <Text className="text-white font-semibold text-lg">Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          className="w-full h-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50/50"
          onPress={() => Alert.alert('Magic Link', 'Email auth coming soon.')}>
          <Text className="text-slate-600 font-medium">Continue with Email</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
