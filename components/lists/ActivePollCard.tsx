import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { AnimatedPressable } from '../ui/AnimatedPressable';
import { getPosterUrl } from '../../lib/tmdb/config';
import type { PollCandidate, SharedListItem } from '../../lib/supabase/sharedLists';
import { useThemeColors } from '../../lib/theme/useThemeColors';

interface ActivePollCardProps {
  deadline: string;
  candidates: { candidate: PollCandidate; item: SharedListItem }[];
  onVote: (candidateId: string) => void;
}

function formatRemaining(deadlineIso: string, t: TFunction): string {
  const diffMs = new Date(deadlineIso).getTime() - Date.now();
  if (diffMs <= 0) return t('components.activePoll.closed');
  const minutes = Math.ceil(diffMs / 60000);
  if (minutes < 60) return t('components.activePoll.remainingMinutes', { count: minutes });
  const hours = Math.ceil(minutes / 60);
  if (hours < 24) return t('components.activePoll.remainingHours', { count: hours });
  const days = Math.ceil(hours / 24);
  return t('components.activePoll.remainingDays', { count: days });
}

export function ActivePollCard({ deadline, candidates, onVote }: ActivePollCardProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  const isClosed = new Date(deadline).getTime() <= Date.now();
  const totalVotes = candidates.reduce((sum, c) => sum + c.candidate.voteCount, 0);
  const maxVotes = Math.max(0, ...candidates.map((c) => c.candidate.voteCount));

  return (
    <View className="mx-margin-mobile mb-stack-md gap-stack-sm rounded-2xl border border-glass-border bg-surface-container-low p-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <MaterialIcons name="how-to-vote" size={18} color={colors.gold} />
          <Text className="font-sans-bold text-body-md text-text-primary">
            {isClosed ? t('components.activePoll.resultsTitle') : t('components.activePoll.title')}
          </Text>
        </View>
        <Text className="font-sans text-caption text-text-secondary">
          {formatRemaining(deadline, t)}
        </Text>
      </View>

      <View className="gap-2">
        {candidates.map(({ candidate, item }) => {
          const isWinner = isClosed && maxVotes > 0 && candidate.voteCount === maxVotes;
          const percent = totalVotes > 0 ? Math.round((candidate.voteCount / totalVotes) * 100) : 0;
          const posterUri = getPosterUrl(item.posterPath, 'w185');

          return (
            <AnimatedPressable
              key={candidate.id}
              onPress={() => !isClosed && onVote(candidate.id)}
              disabled={isClosed}
              accessibilityRole="button"
              accessibilityState={{ selected: candidate.myVote }}
              accessibilityLabel={t(
                isClosed ? (isWinner ? 'a11y.pollWinner' : 'a11y.pollResult') : 'a11y.castPollVote',
                { title: item.title, count: candidate.voteCount },
              )}
              className={`flex-row items-center gap-3 rounded-xl border p-2 ${
                candidate.myVote
                  ? 'border-primary-container bg-primary-container/10'
                  : 'border-glass-border'
              }`}
            >
              <Image
                source={posterUri ? { uri: posterUri } : undefined}
                style={{ width: 32, height: 48, borderRadius: 6 }}
                contentFit="cover"
              />
              <View className="flex-1 gap-1">
                <View className="flex-row items-center gap-1">
                  {isWinner && <Text className="text-[12px]">🏆</Text>}
                  <Text
                    className="flex-1 font-sans-semibold text-caption text-text-primary"
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <Text className="font-sans text-[11px] text-text-secondary">
                    {t('components.activePoll.voteCount', { count: candidate.voteCount })}
                  </Text>
                </View>
                <View className="h-1.5 overflow-hidden rounded-full bg-surface">
                  <View
                    className={isWinner ? undefined : 'bg-primary-container'}
                    style={{
                      height: '100%',
                      borderRadius: 999,
                      width: `${percent}%`,
                      backgroundColor: isWinner ? colors.gold : undefined,
                    }}
                  />
                </View>
              </View>
              {candidate.myVote && (
                <MaterialIcons name="check-circle" size={16} color={colors.gold} />
              )}
            </AnimatedPressable>
          );
        })}
      </View>
    </View>
  );
}
