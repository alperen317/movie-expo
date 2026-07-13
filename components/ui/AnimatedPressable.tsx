import { useState } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

// react-native-reanimated >= 4.1.1 regressed NativeWind's cssInterop: components
// created via createAnimatedComponent silently drop every resolved style
// (className AND inline) on native (software-mansion/react-native-reanimated#8329).
// Until that's fixed upstream, never pass className to Animated.* components —
// style them with inline styles only. These re-exports exist for entering/exiting
// animations; keep className off them.
export const AnimatedView = Animated.View;
export const AnimatedText = Animated.Text;

export function AnimatedPressable({
  scaleTo = 0.96,
  style,
  onPressIn,
  onPressOut,
  ...props
}: PressableProps & { scaleTo?: number }) {
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      onPressIn={(e) => {
        setPressed(true);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        onPressOut?.(e);
      }}
      style={[style as StyleProp<ViewStyle>, pressed && { transform: [{ scale: scaleTo }] }]}
      {...props}
    />
  );
}
