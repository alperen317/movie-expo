import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { AnimatedPressable } from '../ui/AnimatedPressable';

export function ImportPromptCard() {
  return (
    <View className="mt-section-gap px-margin-mobile">
      <View className="gap-stack-sm rounded-2xl border border-glass-border bg-surface-container-low p-stack-md">
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-full bg-primary-container">
            <MaterialIcons name="file-upload" size={20} color="#3f2e00" />
          </View>
          <Text className="flex-1 font-sans-semibold text-title-md text-text-primary">
            New here?
          </Text>
        </View>
        <Text className="font-sans text-body-md text-text-secondary">
          Import your TV Time or Letterboxd history to pick up right where you left off.
        </Text>
        <AnimatedPressable
          onPress={() => router.push('/import')}
          className="items-center rounded-full bg-primary-container py-stack-sm"
        >
          <Text className="font-sans-semibold text-body-md text-on-primary-container">
            Import Now
          </Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}
