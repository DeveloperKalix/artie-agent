import { Easing } from 'react-native';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';

/**
 * Tab content transitions when switching Home, Foresight, Agent, Log, Profile.
 * Uses React Navigation bottom-tabs built-in animations (native driver).
 *
 * - `fade`: cross-fade between scenes (default)
 * - `shift`: slight horizontal shift — set `TAB_ANIMATION_STYLE` to `'shift'` below
 */
export type TabAnimationStyle = 'fade' | 'shift';

/** Change to `'shift'` for a slight horizontal slide between tabs. */
const TAB_ANIMATION_STYLE: TabAnimationStyle = 'fade';

const DURATION_MS = 240;

/** Timing curve for tab cross-fade / shift. */
const easing = Easing.out(Easing.cubic);

/**
 * Spread into `<Tabs screenOptions={{ ...tabTransitionScreenOptions, ... }} />`.
 *
 * sceneStyle sets a white background on every tab scene so the navigator's
 * default black background never bleeds through during cross-fade transitions.
 */
export const tabTransitionScreenOptions: Pick<
  BottomTabNavigationOptions,
  'animation' | 'transitionSpec' | 'sceneStyle'
> = {
  animation: TAB_ANIMATION_STYLE,
  transitionSpec: {
    animation: 'timing',
    config: {
      duration: DURATION_MS,
      easing,
    },
  },
  sceneStyle: { backgroundColor: '#f8fafc' },
};
