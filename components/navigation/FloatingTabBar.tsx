import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTabTrigger } from 'expo-router/ui';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedPressable, AnimatedView } from '../ui/AnimatedPressable';

const TABS: { name: string; icon: React.ComponentProps<typeof MaterialIcons>['name'] }[] = [
  { name: 'index', icon: 'home' },
  { name: 'search', icon: 'search' },
  { name: 'favorites', icon: 'favorite' },
  { name: 'lists', icon: 'groups' },
  { name: 'profile', icon: 'person' },
];

function TabBarButton({
  name,
  icon,
}: {
  name: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
}) {
  const { trigger, triggerProps } = useTabTrigger({ name });
  const isFocused = Boolean(trigger?.isFocused);
  const focusProgress = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    focusProgress.value = withTiming(isFocused ? 1 : 0, { duration: 180 });
  }, [isFocused, focusProgress]);

  const pillStyle = useAnimatedStyle(() => ({
    opacity: focusProgress.value,
    transform: [{ scale: 0.8 + focusProgress.value * 0.2 }],
  }));

  return (
    <AnimatedPressable
      onPress={triggerProps.onPress}
      onLongPress={triggerProps.onLongPress}
      className="h-12 w-12 items-center justify-center rounded-full"
    >
      <AnimatedView
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: 999, backgroundColor: '#f5c451' },
          pillStyle,
        ]}
      />
      <MaterialIcons name={icon} size={24} color={isFocused ? '#3f2e00' : '#A1A1AA'} />
    </AnimatedPressable>
  );
}

export function FloatingTabBar() {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: insets.bottom + 32,
        alignItems: 'center',
      }}
      pointerEvents="box-none"
    >
      <BlurView intensity={40} tint="dark" style={{ borderRadius: 999, overflow: 'hidden' }}>
        <View className="flex-row items-center gap-1 border border-glass-border bg-background-blur p-2">
          {TABS.map((tab) => (
            <TabBarButton key={tab.name} name={tab.name} icon={tab.icon} />
          ))}
        </View>
      </BlurView>
    </View>
  );
}
