import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import i18n from '../i18n';
import { getTVShowDetails } from '../tmdb/tv';
import { useEpisodeProgressStore } from '../../stores/episodeProgress.store';

const REMINDER_PREFIX = 'episode-';
const REMINDER_WINDOW_DAYS = 7;
const REMINDER_HOUR = 9;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function reminderId(showId: number, seasonNumber: number, episodeNumber: number): string {
  return `${REMINDER_PREFIX}${showId}-${seasonNumber}-${episodeNumber}`;
}

function reminderDate(airDate: string): Date {
  const date = new Date(`${airDate}T00:00:00`);
  date.setHours(REMINDER_HOUR, 0, 0, 0);
  return date;
}

// Schedules reminders using the current permission state only -- never prompts.
// Call requestEpisodeReminderPermission() at a contextual moment (e.g. the
// Calendar screen) to ask for permission for the first time; this function is
// safe to call unconditionally on app launch since it's a no-op until granted.
export async function scheduleUpcomingEpisodeReminders(): Promise<void> {
  // expo-notifications' local scheduling APIs (getAllScheduledNotificationsAsync,
  // scheduleNotificationAsync, etc.) aren't implemented on web at all -- calling
  // them throws "method not available", unlike the graceful no-ops some other
  // Expo modules provide. Skip the whole flow there.
  if (Platform.OS === 'web') return;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  const showIds = useEpisodeProgressStore.getState().showIdsInProgress();
  const now = Date.now();
  const windowEnd = now + REMINDER_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  const candidates = await Promise.all(
    showIds.map(async (showId) => {
      try {
        const show = await getTVShowDetails(showId);
        const next = show.next_episode_to_air;
        if (!next?.air_date) return null;

        const airTime = reminderDate(next.air_date).getTime();
        if (airTime < now || airTime > windowEnd) return null;

        return {
          id: reminderId(showId, next.season_number, next.episode_number),
          title: show.name,
          seasonNumber: next.season_number,
          episodeNumber: next.episode_number,
          airTime,
        };
      } catch {
        return null;
      }
    }),
  );

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((notification) => notification.identifier.startsWith(REMINDER_PREFIX))
      .map((notification) =>
        Notifications.cancelScheduledNotificationAsync(notification.identifier),
      ),
  );

  for (const candidate of candidates) {
    if (!candidate) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: candidate.id,
      content: {
        title: candidate.title,
        body: i18n.t('notifications.episodeAiringBody', {
          season: candidate.seasonNumber,
          episode: candidate.episodeNumber,
        }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: candidate.airTime,
      },
    });
  }
}

// Prompts for notification permission if not already decided, then schedules
// immediately if granted. Call this from a contextual entry point (the
// Calendar screen) rather than at app launch -- an out-of-context permission
// prompt on first open has a much higher decline rate.
export async function requestEpisodeReminderPermission(): Promise<void> {
  if (Platform.OS === 'web') return;

  const { status } = await Notifications.requestPermissionsAsync();
  if (status === 'granted') await scheduleUpcomingEpisodeReminders();
}
