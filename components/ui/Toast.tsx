import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToastStore } from '../../stores/toast.store';

export function Toast() {
  const message = useToastStore((state) => state.message);
  const icon = useToastStore((state) => state.icon);
  const insets = useSafeAreaInsets();

  if (!message) return null;

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: insets.top + 12,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 50,
      }}
    >
      <Animated.View
        key={message}
        entering={FadeInDown.duration(200)}
        exiting={FadeOutUp.duration(200)}
      >
        <BlurView intensity={40} tint="dark" style={{ borderRadius: 999, overflow: 'hidden' }}>
          <View className="flex-row items-center gap-2 border border-glass-border bg-background-blur px-4 py-3">
            {icon && <MaterialIcons name={icon} size={18} color="#f5c451" />}
            <Text className="font-sans-semibold text-body-md text-text-primary">{message}</Text>
          </View>
        </BlurView>
      </Animated.View>
    </View>
  );
}
