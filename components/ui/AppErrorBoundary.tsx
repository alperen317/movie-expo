import { MaterialIcons } from '@expo/vector-icons';
import * as Sentry from '@sentry/react-native';
import type { ErrorBoundaryProps } from 'expo-router';
import { useEffect } from 'react';
import { Text, View } from 'react-native';

import i18n from '../../lib/i18n';
import { useThemeColors } from '../../lib/theme/useThemeColors';
import { AnimatedPressable } from './AnimatedPressable';

// Re-exported as `ErrorBoundary` from app/_layout.tsx, which makes expo-router
// render it in place of the whole app when a render throws. Two consequences
// shape what this component may use:
//   - The root layout is what failed, so nothing it provides is mounted --
//     no SafeAreaProvider (hence plain padding, not useSafeAreaInsets).
//   - Strings come from the i18n singleton rather than useTranslation(): the
//     boundary should not depend on React context to render its own message.
export function AppErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const colors = useThemeColors();

  // Sentry no-ops when the DSN is unset or the user opted out of crash
  // reporting, so this needs no extra guard. A caught render error never
  // reaches the global handler, so without this it would go unreported.
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <View className="flex-1 items-center justify-center gap-stack-md bg-background px-margin-mobile">
      <MaterialIcons name="error-outline" size={40} color={colors.error} />
      <Text className="text-center text-title-md font-sans-semibold text-text-primary">
        {i18n.t('common.somethingWrong')}
      </Text>
      <Text className="text-center font-sans text-body-md text-text-secondary">
        {i18n.t('common.errorBoundaryBody')}
      </Text>
      {/* The raw message is developer-facing noise in a release build, but it
          is the whole point of the screen while developing. */}
      {__DEV__ && (
        <Text className="text-center font-sans text-caption text-text-secondary">
          {error.message}
        </Text>
      )}
      <AnimatedPressable
        onPress={retry}
        accessibilityRole="button"
        className="rounded-full border border-glass-border bg-background-blur px-6 py-3"
      >
        <Text className="font-sans-semibold text-primary-container">
          {i18n.t('common.tryAgain')}
        </Text>
      </AnimatedPressable>
    </View>
  );
}
