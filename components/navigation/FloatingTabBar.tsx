import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTabTrigger } from 'expo-router/ui';
import { useColorScheme } from 'nativewind';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedPressable, AnimatedView } from '../ui/AnimatedPressable';
import { useThemeColors } from '../../lib/theme/useThemeColors';
import { useSharedListsStore } from '../../stores/sharedLists.store';

const TABS: {
  name: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  labelKey: string;
}[] = [
  { name: 'index', icon: 'home', labelKey: 'a11y.tabHome' },
  { name: 'search', icon: 'search', labelKey: 'a11y.tabSearch' },
  { name: 'favorites', icon: 'favorite', labelKey: 'a11y.tabFavorites' },
  { name: 'lists', icon: 'groups', labelKey: 'a11y.tabLists' },
  { name: 'profile', icon: 'person', labelKey: 'a11y.tabProfile' },
];

function TabBarButton({
  name,
  icon,
  labelKey,
  badgeCount,
}: {
  name: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  labelKey: string;
  badgeCount?: number;
}) {
  const colors = useThemeColors();
  const { t } = useTranslation();
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

  const label = badgeCount
    ? t('a11y.tabWithBadge', { label: t(labelKey), count: badgeCount })
    : t('a11y.tab', { label: t(labelKey) });

  return (
    <AnimatedPressable
      onPress={triggerProps.onPress}
      onLongPress={triggerProps.onLongPress}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: isFocused }}
      className="h-14 w-14 items-center justify-center rounded-full"
    >
      <AnimatedView
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: 999, backgroundColor: '#f5c451' },
          pillStyle,
        ]}
      />
      <MaterialIcons name={icon} size={26} color={isFocused ? '#3f2e00' : colors.icon} />
      {Boolean(badgeCount) && (
        <View
          pointerEvents="none"
          className="absolute right-2 top-2 min-w-[18px] items-center justify-center rounded-full bg-error px-1"
          style={{ height: 18 }}
        >
          <Text className="font-sans-bold text-[11px] text-on-error">
            {badgeCount! > 9 ? '9+' : badgeCount}
          </Text>
        </View>
      )}
    </AnimatedPressable>
  );
}

export function FloatingTabBar() {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const pendingInviteCount = useSharedListsStore(
    (state) => Object.keys(state.pendingInvites).length,
  );

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
      <BlurView
        intensity={40}
        tint={colorScheme === 'light' ? 'light' : 'dark'}
        style={{ borderRadius: 999, overflow: 'hidden' }}
      >
        <View className="flex-row items-center gap-2 border border-glass-border bg-background-blur p-2.5">
          {TABS.map((tab) => (
            <TabBarButton
              key={tab.name}
              name={tab.name}
              icon={tab.icon}
              labelKey={tab.labelKey}
              badgeCount={tab.name === 'lists' ? pendingInviteCount : undefined}
            />
          ))}
        </View>
      </BlurView>
    </View>
  );
}
