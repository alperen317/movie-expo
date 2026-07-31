import { useEffect } from 'react';
import { View, type DimensionValue } from 'react-native';
import {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { RESULT_ROW_HEIGHT } from './MediaResultRow';
import { AnimatedView } from '../ui/AnimatedPressable';

// Uneven title widths so the placeholder reads as a list of different titles
// rather than a repeating pattern.
const TITLE_WIDTHS: DimensionValue[] = ['72%', '54%', '81%', '46%', '68%', '59%', '76%'];

export function SearchResultSkeleton() {
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(0.75);

  useEffect(() => {
    if (reducedMotion) {
      opacity.value = 0.6;
      return;
    }
    opacity.value = withRepeat(
      withTiming(0.35, { duration: 850, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [opacity, reducedMotion]);

  // AnimatedView is reanimated-backed, so it takes inline styles only; NativeWind
  // silently drops className on those (see CLAUDE.md).
  const pulseStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {TITLE_WIDTHS.map((width) => (
        <AnimatedView
          key={String(width)}
          style={[
            {
              height: RESULT_ROW_HEIGHT,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingHorizontal: 16,
            },
            pulseStyle,
          ]}
        >
          <View
            style={{ width: 56, height: 84 }}
            className="rounded-md bg-surface-container-high"
          />
          <View className="flex-1 gap-2">
            <View style={{ width }} className="h-4 rounded bg-surface-container-high" />
            <View className="h-3 w-2/5 rounded bg-surface-container-high" />
          </View>
          <View className="h-3 w-8 rounded bg-surface-container-high" />
        </AnimatedView>
      ))}
    </View>
  );
}
