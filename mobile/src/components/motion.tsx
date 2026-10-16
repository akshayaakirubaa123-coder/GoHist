import { useEffect } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  FadeInDown,
  interpolateColor,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** A soft spring used across the app, so every movement feels the same. */
export const SPRING = { damping: 18, stiffness: 220, mass: 0.8 };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type PressableScaleProps = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** How far it shrinks while held down. */
  scaleTo?: number;
};

/**
 * A Pressable that dips slightly while pressed and springs back on release,
 * so taps feel physical. Stays still when the phone asks for reduced motion.
 */
export function PressableScale({ style, scaleTo = 0.96, onPressIn, onPressOut, ...props }: PressableScaleProps) {
  const reduceMotion = useReducedMotion();
  const pressed = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - pressed.value * 0.15,
    transform: [{ scale: reduceMotion ? 1 : 1 - pressed.value * (1 - scaleTo) }],
  }));

  return (
    <AnimatedPressable
      {...props}
      onPressIn={(event) => {
        pressed.value = withTiming(1, { duration: 90 });
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        pressed.value = withSpring(0, SPRING);
        onPressOut?.(event);
      }}
      style={[style, animatedStyle]}
    />
  );
}

/** A background that fades between two theme colours, for chips and toggles. */
export function useThemeColorTransition(active: boolean, from: ThemeColor, to: ThemeColor) {
  const theme = useTheme();
  const progress = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    progress.value = withTiming(active ? 1 : 0, { duration: 180 });
  }, [active, progress]);
  const fromColor = theme[from];
  const toColor = theme[to];
  return useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [fromColor, toColor]),
  }));
}

/**
 * How rows in a list arrive: rising in one after another. Only the first
 * screenful is staggered, so long lists don't keep you waiting.
 */
export function listItemEntering(index: number) {
  return FadeInDown.duration(260)
    .delay(Math.min(index, 8) * 35)
    .reduceMotion(ReduceMotion.System);
}
