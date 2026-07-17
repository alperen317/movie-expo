import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { useThemeColors } from '../../../lib/theme/useThemeColors';

function Section({ title, children }: { title: string; children: string }) {
  return (
    <View className="gap-stack-sm pt-section-gap">
      <Text className="font-sans-semibold text-title-md text-text-primary">{title}</Text>
      <Text className="font-sans text-body-md text-text-secondary">{children}</Text>
    </View>
  );
}

// Draft terms of use -- not legal advice. Review before store submission.
export default function TermsOfUseScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="flex-row items-center gap-3 px-margin-mobile py-stack-md">
        <AnimatedPressable
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.back')}
          className="h-8 w-8 items-center justify-center"
        >
          <MaterialIcons name="arrow-back" size={22} color={colors.textPrimary} />
        </AnimatedPressable>
        <Text className="text-headline-lg-mobile font-sans-bold text-text-primary">
          {t('legal.terms.title')}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 64 }}
        showsVerticalScrollIndicator={false}
        className="px-margin-mobile"
      >
        <Text className="font-sans text-caption text-text-secondary">{t('legal.lastUpdated')}</Text>

        <Section title={t('legal.terms.usingTitle')}>{t('legal.terms.usingBody')}</Section>
        <Section title={t('legal.terms.accountsTitle')}>{t('legal.terms.accountsBody')}</Section>
        <Section title={t('legal.terms.attributionTitle')}>
          {t('legal.terms.attributionBody')}
        </Section>
        <Section title={t('legal.terms.warrantyTitle')}>{t('legal.terms.warrantyBody')}</Section>
        <Section title={t('legal.terms.changesTitle')}>{t('legal.terms.changesBody')}</Section>
        <Section title={t('legal.terms.contactTitle')}>{t('legal.terms.contactBody')}</Section>
      </ScrollView>
    </SafeAreaView>
  );
}
