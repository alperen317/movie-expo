import { MaterialIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DeleteAccountModal } from '../../../components/settings/DeleteAccountModal';
import { LanguagePickerModal } from '../../../components/settings/LanguagePickerModal';
import { RegionPickerModal } from '../../../components/settings/RegionPickerModal';
import { ThemePickerModal } from '../../../components/settings/ThemePickerModal';
import { ActionSheetModal } from '../../../components/ui/ActionSheetModal';
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { BoringAvatar } from '../../../components/ui/BoringAvatar';
import { TmdbLogo } from '../../../components/ui/TmdbLogo';
import {
  getStoredLanguagePreference,
  type LanguagePreference,
} from '../../../lib/i18n/languagePreference';
import { clearRecentSearches } from '../../../lib/storage/recentSearches';
import { getStoredThemePreference, type ThemePreference } from '../../../lib/theme/themePreference';
import { useThemeColors } from '../../../lib/theme/useThemeColors';
import { isCrashReportingEnabled, setCrashReportingEnabled } from '../../../lib/telemetry/sentry';
import { WATCH_REGIONS } from '../../../lib/tmdb/regions';
import { useAuthStore } from '../../../stores/auth.store';
import { useListsStore } from '../../../stores/lists.store';
import { useProfileStore } from '../../../stores/profile.store';
import { useToastStore } from '../../../stores/toast.store';
import { dedupeWatchLog, useWatchLogStore } from '../../../stores/watchLog.store';

function formatMemberSince(dateString: string | undefined, language: string): string {
  if (!dateString) return '';
  const locale = language === 'tr' ? 'tr-TR' : 'en-US';
  return new Date(dateString).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const { height: windowHeight } = useWindowDimensions();
  const colors = useThemeColors();

  const session = useAuthStore((state) => state.session);
  const signOut = useAuthStore((state) => state.signOut);

  const favorites = useListsStore((state) => state.favorites);
  const watchlist = useListsStore((state) => state.watchlist);
  const fetchFavorites = useListsStore((state) => state.fetchFavorites);
  const fetchWatchlist = useListsStore((state) => state.fetchWatchlist);

  const watchLogEntries = useWatchLogStore((state) => state.entries);
  const fetchWatchLog = useWatchLogStore((state) => state.fetchWatchLog);

  const profile = useProfileStore((state) => state.profile);
  const fetchProfile = useProfileStore((state) => state.fetchProfile);

  useEffect(() => {
    fetchFavorites();
    fetchWatchlist();
    fetchWatchLog();
    fetchProfile();
  }, [fetchFavorites, fetchWatchlist, fetchWatchLog, fetchProfile]);

  const [crashReportingEnabled, setCrashReportingEnabledState] = useState(true);
  useEffect(() => {
    isCrashReportingEnabled().then(setCrashReportingEnabledState);
  }, []);

  const handleToggleCrashReporting = async () => {
    const next = !crashReportingEnabled;
    setCrashReportingEnabledState(next);
    await setCrashReportingEnabled(next);
    if (next) {
      useToastStore.getState().show(t('profile.crashRestart'), 'info-outline');
    }
  };

  const email = session?.user?.email ?? '';
  const avatarSeed = profile?.avatarSeed || profile?.displayName || email;
  const memberSince = formatMemberSince(session?.user?.created_at, i18n.language);
  const favoritesCount = Object.keys(favorites).length;
  const watchlistCount = Object.keys(watchlist).length;
  const watchedCount = dedupeWatchLog(watchLogEntries).length;

  const [isClearHistoryConfirmOpen, setIsClearHistoryConfirmOpen] = useState(false);
  const [isRegionPickerOpen, setIsRegionPickerOpen] = useState(false);
  const [isLanguagePickerOpen, setIsLanguagePickerOpen] = useState(false);
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);

  const [languagePreference, setLanguagePreference] = useState<LanguagePreference>('system');
  useEffect(() => {
    getStoredLanguagePreference().then(setLanguagePreference);
  }, []);
  const languageLabel =
    languagePreference === 'system'
      ? t('components.languagePicker.system')
      : languagePreference === 'tr'
        ? 'Türkçe'
        : 'English';

  const [themePreference, setThemePreference] = useState<ThemePreference>('system');
  useEffect(() => {
    getStoredThemePreference().then(setThemePreference);
  }, []);
  const themeLabel =
    themePreference === 'light'
      ? t('components.themePicker.light')
      : themePreference === 'dark'
        ? t('components.themePicker.dark')
        : t('components.themePicker.system');
  const watchRegionLabel = profile?.watchRegion
    ? (WATCH_REGIONS.find((region) => region.code === profile.watchRegion)?.name ??
      profile.watchRegion)
    : t('profile.deviceDefault');

  const handleSignOut = () => {
    // NOTE: React Native's Alert.alert is unsupported on web (renders nothing),
    // so gating sign-out behind it makes the button appear dead in the web build.
    // Sign out directly for a reliable cross-platform flow.
    signOut();
  };

  return (
    <SafeAreaView edges={['top']} style={{ height: windowHeight }} className="bg-background">
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-margin-mobile pb-stack-md pt-stack-sm">
          <Text className="text-headline-lg-mobile font-sans-bold text-text-primary">
            {t('profile.title')}
          </Text>
        </View>

        <View className="items-center gap-stack-sm px-margin-mobile pb-section-gap">
          <AnimatedPressable
            onPress={() => router.push('/edit-profile')}
            className="h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-glass-border"
          >
            <BoringAvatar name={avatarSeed} variant={profile?.avatarVariant ?? 'beam'} size={96} />
          </AnimatedPressable>
          <Text className="font-sans-semibold text-title-md text-text-primary">
            {profile?.displayName || email}
          </Text>
          {memberSince.length > 0 && (
            <Text className="font-sans text-body-md text-text-secondary">
              {t('profile.memberSince', { date: memberSince })}
            </Text>
          )}
        </View>

        <View className="mb-section-gap flex-row gap-gutter px-margin-mobile">
          <AnimatedPressable
            onPress={() => router.push({ pathname: '/favorites', params: { tab: 'favorites' } })}
            className="flex-1 items-center gap-1 rounded-xl border border-glass-border bg-surface-container-low py-stack-md"
          >
            <Text className="text-headline-lg-mobile font-sans-bold text-text-primary">
              {favoritesCount}
            </Text>
            <Text className="font-sans text-caption text-text-secondary">
              {t('common.favorites')}
            </Text>
          </AnimatedPressable>
          <AnimatedPressable
            onPress={() => router.push({ pathname: '/favorites', params: { tab: 'watchlist' } })}
            className="flex-1 items-center gap-1 rounded-xl border border-glass-border bg-surface-container-low py-stack-md"
          >
            <Text className="text-headline-lg-mobile font-sans-bold text-text-primary">
              {watchlistCount}
            </Text>
            <Text className="font-sans text-caption text-text-secondary">
              {t('common.watchlist')}
            </Text>
          </AnimatedPressable>
          <AnimatedPressable
            onPress={() => router.push({ pathname: '/favorites', params: { tab: 'watched' } })}
            className="flex-1 items-center gap-1 rounded-xl border border-glass-border bg-surface-container-low py-stack-md"
          >
            <Text className="text-headline-lg-mobile font-sans-bold text-text-primary">
              {watchedCount}
            </Text>
            <Text className="font-sans text-caption text-text-secondary">
              {t('common.watched')}
            </Text>
          </AnimatedPressable>
        </View>

        <View className="mb-section-gap px-margin-mobile">
          <View className="overflow-hidden rounded-xl border border-glass-border bg-surface-container-low">
            <AnimatedPressable
              onPress={() => router.push('/stats')}
              className="flex-row items-center gap-3 px-4 py-stack-md"
            >
              <MaterialIcons name="bar-chart" size={20} color={colors.icon} />
              <Text className="flex-1 font-sans text-body-md text-text-primary">
                {t('profile.statistics')}
              </Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.icon} />
            </AnimatedPressable>
            <View className="h-px bg-glass-border" />
            <AnimatedPressable
              onPress={() => router.push('/calendar')}
              className="flex-row items-center gap-3 px-4 py-stack-md"
            >
              <MaterialIcons name="calendar-today" size={20} color={colors.icon} />
              <Text className="flex-1 font-sans text-body-md text-text-primary">
                {t('profile.upcomingEpisodes')}
              </Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.icon} />
            </AnimatedPressable>
            <View className="h-px bg-glass-border" />
            <AnimatedPressable
              onPress={() => router.push('/import')}
              className="flex-row items-center gap-3 px-4 py-stack-md"
            >
              <MaterialIcons name="file-upload" size={20} color={colors.icon} />
              <Text className="flex-1 font-sans text-body-md text-text-primary">
                {t('profile.importFrom')}
              </Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.icon} />
            </AnimatedPressable>
            <View className="h-px bg-glass-border" />
            <AnimatedPressable
              onPress={() => setIsRegionPickerOpen(true)}
              className="flex-row items-center gap-3 px-4 py-stack-md"
            >
              <MaterialIcons name="public" size={20} color={colors.icon} />
              <Text className="flex-1 font-sans text-body-md text-text-primary">
                {t('profile.watchRegion')}
              </Text>
              <Text className="font-sans text-caption text-text-secondary">{watchRegionLabel}</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.icon} />
            </AnimatedPressable>
            <View className="h-px bg-glass-border" />
            <AnimatedPressable
              onPress={() => setIsLanguagePickerOpen(true)}
              className="flex-row items-center gap-3 px-4 py-stack-md"
            >
              <MaterialIcons name="language" size={20} color={colors.icon} />
              <Text className="flex-1 font-sans text-body-md text-text-primary">
                {t('profile.language')}
              </Text>
              <Text className="font-sans text-caption text-text-secondary">{languageLabel}</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.icon} />
            </AnimatedPressable>
            <View className="h-px bg-glass-border" />
            <AnimatedPressable
              onPress={() => setIsThemePickerOpen(true)}
              className="flex-row items-center gap-3 px-4 py-stack-md"
            >
              <MaterialIcons name="brightness-6" size={20} color={colors.icon} />
              <Text className="flex-1 font-sans text-body-md text-text-primary">
                {t('profile.theme')}
              </Text>
              <Text className="font-sans text-caption text-text-secondary">{themeLabel}</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.icon} />
            </AnimatedPressable>
            <View className="h-px bg-glass-border" />
            <AnimatedPressable
              onPress={handleToggleCrashReporting}
              className="flex-row items-center gap-3 px-4 py-stack-md"
            >
              <MaterialIcons name="bug-report" size={20} color={colors.icon} />
              <Text className="flex-1 font-sans text-body-md text-text-primary">
                {t('profile.shareCrashReports')}
              </Text>
              {crashReportingEnabled && (
                <MaterialIcons name="check" size={20} color={colors.gold} />
              )}
            </AnimatedPressable>
            <View className="h-px bg-glass-border" />
            <AnimatedPressable
              onPress={() => setIsClearHistoryConfirmOpen(true)}
              className="flex-row items-center gap-3 px-4 py-stack-md"
            >
              <MaterialIcons name="history" size={20} color={colors.icon} />
              <Text className="flex-1 font-sans text-body-md text-text-primary">
                {t('profile.clearSearchHistory')}
              </Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.icon} />
            </AnimatedPressable>
            <View className="h-px bg-glass-border" />
            <AnimatedPressable
              onPress={() => router.push('/legal/privacy')}
              className="flex-row items-center gap-3 px-4 py-stack-md"
            >
              <MaterialIcons name="privacy-tip" size={20} color={colors.icon} />
              <Text className="flex-1 font-sans text-body-md text-text-primary">
                {t('profile.privacyPolicy')}
              </Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.icon} />
            </AnimatedPressable>
            <View className="h-px bg-glass-border" />
            <AnimatedPressable
              onPress={() => router.push('/legal/terms')}
              className="flex-row items-center gap-3 px-4 py-stack-md"
            >
              <MaterialIcons name="description" size={20} color={colors.icon} />
              <Text className="flex-1 font-sans text-body-md text-text-primary">
                {t('profile.termsOfUse')}
              </Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.icon} />
            </AnimatedPressable>
            <View className="h-px bg-glass-border" />
            <AnimatedPressable
              onPress={handleSignOut}
              className="flex-row items-center gap-3 px-4 py-stack-md"
            >
              <MaterialIcons name="logout" size={20} color={colors.error} />
              <Text className="flex-1 font-sans text-body-md text-error">
                {t('profile.signOut')}
              </Text>
            </AnimatedPressable>
            <View className="h-px bg-glass-border" />
            <AnimatedPressable
              onPress={() => setIsDeleteAccountOpen(true)}
              className="flex-row items-center gap-3 px-4 py-stack-md"
            >
              <MaterialIcons name="delete-forever" size={20} color={colors.error} />
              <Text className="flex-1 font-sans text-body-md text-error">
                {t('profile.deleteAccount')}
              </Text>
            </AnimatedPressable>
          </View>
        </View>

        <Text className="text-center font-sans text-caption text-text-secondary">
          {Constants.expoConfig?.name ?? 'Previously'} v{Constants.expoConfig?.version ?? '1.0.0'}
        </Text>

        {/* TMDB API terms require this attribution notice. */}
        <Pressable
          onPress={() =>
            Linking.openURL('https://www.themoviedb.org/').catch(() => {
              useToastStore.getState().show(t('toasts.couldNotOpenLink'), 'error-outline');
            })
          }
          className="mt-stack-sm items-center px-margin-mobile"
        >
          <TmdbLogo width={80} />
          <Text className="mt-1 text-center font-sans text-caption text-text-secondary">
            {t('profile.tmdbAttribution')}
          </Text>
          <Text
            className="mt-1 text-center font-sans-semibold text-caption"
            style={{ color: '#01b4e4' }}
          >
            themoviedb.org
          </Text>
        </Pressable>
      </ScrollView>

      <ActionSheetModal
        visible={isClearHistoryConfirmOpen}
        title={t('profile.clearSearchHistory')}
        message={t('profile.clearHistoryMessage')}
        onClose={() => setIsClearHistoryConfirmOpen(false)}
        actions={[
          { label: t('common.clear'), destructive: true, onPress: () => clearRecentSearches() },
        ]}
      />

      <RegionPickerModal
        visible={isRegionPickerOpen}
        onClose={() => setIsRegionPickerOpen(false)}
      />

      <LanguagePickerModal
        visible={isLanguagePickerOpen}
        current={languagePreference}
        onChange={setLanguagePreference}
        onClose={() => setIsLanguagePickerOpen(false)}
      />

      <ThemePickerModal
        visible={isThemePickerOpen}
        current={themePreference}
        onChange={setThemePreference}
        onClose={() => setIsThemePickerOpen(false)}
      />

      <DeleteAccountModal
        visible={isDeleteAccountOpen}
        onClose={() => setIsDeleteAccountOpen(false)}
      />
    </SafeAreaView>
  );
}
