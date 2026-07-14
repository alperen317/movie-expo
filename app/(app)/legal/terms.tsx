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

// Draft terms of use -- not legal advice. Review before store submission.
export default function TermsOfUseScreen() {
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
          Terms of Use
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 64 }}
        showsVerticalScrollIndicator={false}
        className="px-margin-mobile"
      >
        <Text className="font-sans text-caption text-text-secondary">Last updated: July 2026</Text>

        <Section title="Using Previously">
          Previously is a free, personal watch-tracking app for movies and TV shows. You’re
          responsible for the accounts you create and the content you add to shared lists. Don’t use
          the app to upload content you don’t have the right to share, or to harass other users.
        </Section>

        <Section title="Shared lists and accounts">
          Anyone with a list’s join code can join it. You’re responsible for who you share a code
          with. List owners can remove members from lists they own; leaving or deleting your account
          removes you from lists you don’t own.
        </Section>

        <Section title="Content and attribution">
          This product uses the TMDB API but is not endorsed or certified by TMDB. Movie and show
          data, including streaming availability, is provided by TMDB and JustWatch and may not
          always be accurate or up to date.
        </Section>

        <Section title="No warranty">
          Previously is provided “as is,” without warranty of any kind. We don’t guarantee the app
          will be uninterrupted, error-free, or that your data will never be lost — back up anything
          irreplaceable (e.g. via the export options available in the app).
        </Section>

        <Section title="Changes">
          We may update these terms as the app changes. Continuing to use the app after an update
          means you accept the revised terms.
        </Section>

        <Section title="Contact">Questions about these terms? Email alialperena@gmail.com.</Section>
      </ScrollView>
    </SafeAreaView>
  );
}
