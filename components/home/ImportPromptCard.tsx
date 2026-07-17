import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { AnimatedPressable } from '../ui/AnimatedPressable';

export function ImportPromptCard() {
  const { t } = useTranslation();
  return (
    <View className="mt-section-gap px-margin-mobile">
      <View className="gap-stack-sm rounded-2xl border border-glass-border bg-surface-container-low p-stack-md">
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-full bg-primary-container">
            <MaterialIcons name="file-upload" size={20} color="#3f2e00" />
          </View>
          <Text className="flex-1 font-sans-semibold text-title-md text-text-primary">
            {t('home.importPrompt.title')}
          </Text>
        </View>
        <Text className="font-sans text-body-md text-text-secondary">
          {t('home.importPrompt.body')}
        </Text>
        <AnimatedPressable
          onPress={() => router.push('/import')}
          className="items-center rounded-full bg-primary-container py-stack-sm"
        >
          <Text className="font-sans-semibold text-body-md text-on-primary-container">
            {t('home.importPrompt.cta')}
          </Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}
