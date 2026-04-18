import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';

import { tokens } from '@/styles/tokens';

type Props = {
  /** Hollow ring diameter; defaults from tokens */
  ringSize?: number;
};

/**
 * Layered aura: soft teal bloom + hollow ring + small sparkle dots (inverse pulse).
 */
export function AuraGlow({ ringSize = tokens.aura.ringSize }: Props) {
  const { haloContainerSize, bloom, ring, sparkle, shadow, timing, bloomDiameterRatio, ringBorderWidth } =
    tokens.aura;

  const breathe = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: timing.breatheMs,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: timing.breatheMs,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [breathe, timing.breatheMs]);

  const bloomOpacity = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [bloom.opacityMin, bloom.opacityMax],
  });
  const bloomScale = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [bloom.scaleMin, bloom.scaleMax],
  });

  const ringOpacity = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [ring.opacityMin, ring.opacityMax],
  });
  const ringScale = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [ring.scaleMin, ring.scaleMax],
  });

  const sparkleOpacity = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [sparkle.opacityMax, sparkle.opacityMin],
  });

  const bloomDiameter = ringSize * bloomDiameterRatio;
  const bloomOffset = (haloContainerSize - bloomDiameter) / 2;
  const ringOffset = (haloContainerSize - ringSize) / 2;
  const { brandTeal, brandTealLight } = tokens.color;

  const sparkleAngles = [0, 72, 144, 216, 288] as const;

  return (
    <View
      pointerEvents="none"
      style={{ width: haloContainerSize, height: haloContainerSize, position: 'absolute' }}>
      {/* Soft outer bloom (filled) — brings back the “glow” */}
      <Animated.View
        style={{
          position: 'absolute',
          top: bloomOffset,
          left: bloomOffset,
          width: bloomDiameter,
          height: bloomDiameter,
          borderRadius: bloomDiameter / 2,
          backgroundColor: brandTeal,
          opacity: bloomOpacity,
          transform: [{ scale: bloomScale }],
          ...(Platform.OS === 'ios'
            ? {
                shadowColor: brandTeal,
                shadowOffset: shadow.bloom.ios.shadowOffset,
                shadowRadius: shadow.bloom.ios.shadowRadius,
                shadowOpacity: shadow.bloom.ios.shadowOpacity,
              }
            : shadow.bloom.android),
        }}
      />

      {/* Crisp hollow ring */}
      <Animated.View
        style={{
          position: 'absolute',
          top: ringOffset,
          left: ringOffset,
          width: ringSize,
          height: ringSize,
          borderRadius: ringSize / 2,
          borderWidth: ringBorderWidth,
          borderColor: brandTeal,
          backgroundColor: 'transparent',
          opacity: ringOpacity,
          transform: [{ scale: ringScale }],
          ...(Platform.OS === 'ios'
            ? {
                shadowColor: brandTeal,
                shadowOffset: shadow.ring.ios.shadowOffset,
                shadowRadius: shadow.ring.ios.shadowRadius,
                shadowOpacity: shadow.ring.ios.shadowOpacity,
              }
            : shadow.ring.android),
        }}
      />

      {/* Sparkle dots — short twinkle opposite the main pulse */}
      {sparkleAngles.map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const cx = haloContainerSize / 2 + sparkle.orbit * Math.sin(rad) - sparkle.dotSize / 2;
        const cy = haloContainerSize / 2 - sparkle.orbit * Math.cos(rad) - sparkle.dotSize / 2;
        return (
          <Animated.View
            key={deg}
            style={{
              position: 'absolute',
              left: cx,
              top: cy,
              width: sparkle.dotSize,
              height: sparkle.dotSize,
              borderRadius: sparkle.dotSize / 2,
              backgroundColor: brandTealLight,
              opacity: sparkleOpacity,
              ...(Platform.OS === 'ios'
                ? {
                    shadowColor: brandTealLight,
                    shadowOffset: { width: 0, height: 0 },
                    shadowRadius: 6,
                    shadowOpacity: 0.85,
                  }
                : { elevation: 4 }),
            }}
          />
        );
      })}
    </View>
  );
}
