import { Text, View } from 'react-native';

import { AnimatedPressable } from '../ui/AnimatedPressable';

export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View className="mb-stack-md flex-row items-center justify-between px-margin-mobile">
      <Text className="text-title-md font-sans-semibold text-text-primary">{title}</Text>
      {action && (
        <AnimatedPressable onPress={action.onPress} accessibilityRole="button" hitSlop={8}>
          <Text className="font-sans-bold text-label-caps uppercase text-text-secondary">
            {action.label}
          </Text>
        </AnimatedPressable>
      )}
    </View>
  );
}
