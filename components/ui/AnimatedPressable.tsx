import { cssInterop } from 'nativewind';
import { Pressable, type PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const Base = Animated.createAnimatedComponent(Pressable);
cssInterop(Base, { className: 'style' });

// Animated.View/Text aren't pre-registered by NativeWind (they come from
// react-native-reanimated, not react-native), so className silently no-ops
// on them unless explicitly registered here.
cssInterop(Animated.View, { className: 'style' });
cssInterop(Animated.Text, { className: 'style' });

export const AnimatedView = Animated.View;
export const AnimatedText = Animated.Text;

export function AnimatedPressable({
  scaleTo = 0.96,
  style,
  onPressIn,
  onPressOut,
  ...props
}: PressableProps & { scaleTo?: number }) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Base
      onPressIn={(e) => {
        scale.value = withTiming(scaleTo, { duration: 100 });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withTiming(1, { duration: 150 });
        onPressOut?.(e);
      }}
      style={[style, animatedStyle]}
      {...props}
    />
  );
}
