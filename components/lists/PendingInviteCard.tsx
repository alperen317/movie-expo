import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Text, View } from 'react-native';

import type { PendingInvite } from '../../lib/supabase/sharedLists';
import { AnimatedPressable } from '../ui/AnimatedPressable';

interface PendingInviteCardProps {
  invite: PendingInvite;
  isResponding: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function PendingInviteCard({
  invite,
  isResponding,
  onAccept,
  onDecline,
}: PendingInviteCardProps) {
  const { t } = useTranslation();
  return (
    <View className="gap-3 rounded-xl border border-primary-container/40 bg-primary-container/10 p-4">
      <View>
        <Text className="font-sans-semibold text-body-md text-text-primary" numberOfLines={1}>
          {invite.listName}
        </Text>
        <Text className="font-sans text-caption text-text-secondary">
          {invite.invitedByEmail
            ? t('components.pendingInvite.invitedBy', { email: invite.invitedByEmail })
            : t('components.pendingInvite.invitedYou')}
        </Text>
      </View>
      <View className="flex-row gap-3">
        <AnimatedPressable
          onPress={onDecline}
          disabled={isResponding}
          className="flex-1 items-center rounded-full border border-glass-border py-2.5"
        >
          <Text className="font-sans-semibold text-caption text-text-secondary">
            {t('components.pendingInvite.decline')}
          </Text>
        </AnimatedPressable>
        <AnimatedPressable
          onPress={onAccept}
          disabled={isResponding}
          className="flex-1 items-center rounded-full bg-primary-container py-2.5"
        >
          {isResponding ? (
            <ActivityIndicator size="small" color="#3f2e00" />
          ) : (
            <Text className="font-sans-semibold text-caption text-on-primary-container">
              {t('components.pendingInvite.accept')}
            </Text>
          )}
        </AnimatedPressable>
      </View>
    </View>
  );
}
