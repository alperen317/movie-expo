import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';

function Section({ title, children }: { title: string; children: string }) {
  return (
    <View className="gap-stack-sm pt-section-gap">
      <Text className="font-sans-semibold text-title-md text-text-primary">{title}</Text>
      <Text className="font-sans text-body-md text-text-secondary">{children}</Text>
    </View>
  );
}

// Draft privacy policy -- not legal advice. Review before store submission
// (retention periods, KVKK/GDPR specifics, etc. are legally consequential
// and shouldn't be taken as final from this draft).
export default function PrivacyPolicyScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="flex-row items-center gap-3 px-margin-mobile py-stack-md">
        <AnimatedPressable
          onPress={() => router.back()}
          hitSlop={8}
          className="h-8 w-8 items-center justify-center"
        >
          <MaterialIcons name="arrow-back" size={22} color="#FFFFFF" />
        </AnimatedPressable>
        <Text className="text-headline-lg-mobile font-sans-bold text-text-primary">
          {t('legal.privacy.title')}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 64 }}
        showsVerticalScrollIndicator={false}
        className="px-margin-mobile"
      >
        <Text className="font-sans text-caption text-text-secondary">{t('legal.lastUpdated')}</Text>

        <Section title={t('legal.privacy.collectTitle')}>{t('legal.privacy.collectBody')}</Section>
        <Section title={t('legal.privacy.sharedTitle')}>{t('legal.privacy.sharedBody')}</Section>
        <Section title={t('legal.privacy.deviceTitle')}>{t('legal.privacy.deviceBody')}</Section>
        <Section title={t('legal.privacy.permissionsTitle')}>
          {t('legal.privacy.permissionsBody')}
        </Section>
        <Section title={t('legal.privacy.thirdPartiesTitle')}>
          {t('legal.privacy.thirdPartiesBody')}
        </Section>
        <Section title={t('legal.privacy.deleteTitle')}>{t('legal.privacy.deleteBody')}</Section>
        <Section title={t('legal.privacy.contactTitle')}>{t('legal.privacy.contactBody')}</Section>
      </ScrollView>
    </SafeAreaView>
  );
}
