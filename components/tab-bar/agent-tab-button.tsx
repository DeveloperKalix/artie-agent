import { Platform, Text, View } from 'react-native';
import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { tokens } from '@/styles/tokens';

/**
 * Elevated center tab for AI agent (audio / text commands).
 */
export function AgentTabButton({ onPress, onPressIn, style, ...rest }: BottomTabBarButtonProps) {
  return (
    <PlatformPressable
      {...rest}
      accessibilityRole="button"
      accessibilityLabel="Ask the AI agent"
      onPress={onPress}
      onPressIn={(e) => {
        if (process.env.EXPO_OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        onPressIn?.(e);
      }}
      style={[
        style,
        {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: -20,
        },
      ]}>
      <View className="items-center">
        <View
          className="h-14 w-14 items-center justify-center rounded-full shadow-lg"
          style={{
            backgroundColor: tokens.color.brandTeal,
            ...Platform.select({
              ios: {
                shadowColor: tokens.color.brandTealDark,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.35,
                shadowRadius: 8,
              },
              android: { elevation: 8 },
              default: {},
            }),
          }}>
          <Ionicons name="sparkles" size={28} color="#fff" />
        </View>
        <Text className="mt-1 text-[10px] font-medium text-slate-500">Ask</Text>
      </View>
    </PlatformPressable>
  );
}
