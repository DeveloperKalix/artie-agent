import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, StyleSheet, View } from 'react-native';

import type { ForesightAction } from '@/components/foresight/foresight-types';
import { tokens } from '@/styles/tokens';

const GLOW = 56;
const PAD = 4;

interface RecommendationIconProps {
  action: ForesightAction;
}

export function RecommendationIcon({ action }: RecommendationIconProps) {
  const t = tokens.foresight[action];
  const gradientColors = [...t.gradient] as [string, string, ...string[]];

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.glow}
      />
      {Platform.OS !== 'web' ? (
        <BlurView
          intensity={Platform.OS === 'ios' ? 28 : 22}
          tint="light"
          style={styles.blurHalo}
        />
      ) : (
        <View style={[styles.blurHalo, styles.webHaloFallback]} />
      )}
      <View
        className="items-center justify-center rounded-full shadow-sm"
        style={[
          styles.inner,
          {
            backgroundColor: t.innerBg,
            ...Platform.select({
              ios: {
                shadowColor: '#0f172a',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.12,
                shadowRadius: 3,
              },
              android: { elevation: 2 },
              default: {},
            }),
          },
        ]}>
        <Ionicons name={t.icon} size={22} color={t.iconColor} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: GLOW + PAD * 2,
    height: GLOW + PAD * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    top: PAD,
    left: PAD,
    width: GLOW,
    height: GLOW,
    borderRadius: GLOW / 2,
    opacity: 0.92,
    ...Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.45,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
  blurHalo: {
    position: 'absolute',
    top: PAD + 2,
    left: PAD + 2,
    width: GLOW - 4,
    height: GLOW - 4,
    borderRadius: (GLOW - 4) / 2,
    overflow: 'hidden',
  },
  webHaloFallback: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  inner: {
    width: 40,
    height: 40,
  },
});
