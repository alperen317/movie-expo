import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
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
          Privacy Policy
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 64 }}
        showsVerticalScrollIndicator={false}
        className="px-margin-mobile"
      >
        <Text className="font-sans text-caption text-text-secondary">Last updated: July 2026</Text>

        <Section title="What we collect">
          When you create an account, we store your email address, and anything you choose to add to
          your profile: display name and avatar style. We store what you track in the app: your
          watch log (ratings and notes included), episode progress, favorites, and watchlist.
        </Section>

        <Section title="Shared lists">
          If you create or join a shared list, other members can see the list’s contents, who added
          each item, and your profile’s display name/avatar/email. List join codes are only usable
          by people you share them with.
        </Section>

        <Section title="What stays on your device">
          Your recent search history is stored locally on your device only — it’s never sent to our
          servers, and you can clear it at any time from Profile.
        </Section>

        <Section title="Device permissions">
          If you enable episode reminders, we request notification permission to schedule local
          reminders for upcoming episodes. This doesn’t send any data off your device.
        </Section>

        <Section title="Third parties">
          We use Supabase to host our database and handle authentication — your data is stored on
          their infrastructure as our processor. We use TMDB for movie/TV metadata (posters, titles,
          ratings); no personal data is sent to TMDB. If you keep crash reporting enabled in
          Profile, anonymized crash reports may be sent to Sentry to help us fix bugs — you can turn
          this off at any time.
        </Section>

        <Section title="Deleting your data">
          You can permanently delete your account and all associated data at any time from Profile →
          Delete Account. This also deletes any shared lists you own, for every member.
        </Section>

        <Section title="Contact">
          Questions about this policy or your data? Email alialperena@gmail.com.
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}
