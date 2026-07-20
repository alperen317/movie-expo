import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Text, View } from 'react-native';

import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { useSharedListsStore } from '../../../stores/sharedLists.store';

export default function JoinByLinkScreen() {
  const { t } = useTranslation();
  const { code } = useLocalSearchParams<{ code: string }>();
  const joinListByCode = useSharedListsStore((state) => state.joinListByCode);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    joinListByCode(code)
      .then((list) => {
        if (!cancelled) router.replace({ pathname: '/lists/[id]', params: { id: list.id } });
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t('components.joinCode.joinFailed'));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [code, joinListByCode, t]);

  return (
    <View className="flex-1 items-center justify-center gap-stack-md bg-background px-margin-mobile">
      {error ? (
        <>
          <Text className="text-center font-sans text-body-md text-text-primary">{error}</Text>
          <AnimatedPressable
            onPress={() => router.replace('/')}
            className="rounded-full border border-glass-border bg-background-blur px-6 py-3"
          >
            <Text className="font-sans-semibold text-primary-container">
              {t('components.joinCode.backToApp')}
            </Text>
          </AnimatedPressable>
        </>
      ) : (
        <ActivityIndicator color="#ffffff" />
      )}
    </View>
  );
}
