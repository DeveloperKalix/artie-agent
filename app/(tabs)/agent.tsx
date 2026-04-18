import { useState } from 'react';
import { Image, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { tokens } from '@/styles/tokens';
import { AuraGlow } from '@/styles/animations/aura-glow';

export default function AgentScreen() {
  const [text, setText] = useState('');

  const isEmpty = text.trim().length === 0;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <View className="flex-1 px-6 pt-4">
        <Text className="text-2xl font-bold text-slate-900">Agent</Text>
        <Text className="mt-1 text-slate-500">Send audio or text to your AI assistant.</Text>

        {/* Empty state — Artie favicon with aura */}
        {isEmpty && (
          <View className="flex-1 items-center justify-center">
            <View
              className="items-center justify-center"
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
            <Text className="mt-6 text-base font-medium text-slate-700">What can I help with?</Text>
            <Text className="mt-1 text-sm text-slate-400">Type a message or tap the mic below.</Text>
          </View>
        )}

        {/* Input bar — always anchored to bottom */}
        <View className={`${isEmpty ? '' : 'flex-1 justify-end'} pb-4`}>
          <View className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <TextInput
              className="min-h-[100px] px-3 py-2 text-base text-slate-900"
              placeholder="Type a command or question…"
              placeholderTextColor="#94a3b8"
              multiline
              value={text}
              onChangeText={setText}
              textAlignVertical="top"
            />
            <View className="mt-3 flex-row items-center justify-between border-t border-slate-100 pt-3">
              <TouchableOpacity
                className="h-12 w-12 items-center justify-center rounded-full bg-slate-100"
                activeOpacity={0.7}
                accessibilityLabel="Record voice"
                onPress={() => {}}>
                <Ionicons name="mic" size={24} color="#475569" />
              </TouchableOpacity>
              <TouchableOpacity
                className="ml-3 h-12 flex-1 flex-row items-center justify-center rounded-xl px-4"
                style={{ backgroundColor: tokens.color.brandTeal }}
                activeOpacity={0.85}
                onPress={() => {}}>
                <Text className="font-semibold text-white">Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
