import { useEffect } from 'react';
import {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { AnimatedView } from '../ui/AnimatedPressable';

// Shown while a newer query is in flight but the previous results are still on
// screen; without it, refining a search changes the list with no warning that
// anything was loading.
export function RefiningIndicator({ active, color }: { active: boolean; color: string }) {
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(0.25);

  useEffect(() => {
    if (!active || reducedMotion) {
      opacity.value = active ? 0.6 : 0;
      return;
    }
    opacity.value = withRepeat(
      withTiming(1, { duration: 650, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [active, opacity, reducedMotion]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  // The 2px track is always rendered so results don't shift when it appears.
  return (
    <AnimatedView
      style={[{ height: 2, marginHorizontal: 16, borderRadius: 2, backgroundColor: color }, style]}
    />
  );
}
