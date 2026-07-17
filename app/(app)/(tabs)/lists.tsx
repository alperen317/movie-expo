import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { JoinByCodeModal } from '../../../components/lists/JoinByCodeModal';
import { ListCard } from '../../../components/lists/ListCard';
import { ListNameModal } from '../../../components/lists/ListNameModal';
import { PendingInviteCard } from '../../../components/lists/PendingInviteCard';
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { useThemeColors } from '../../../lib/theme/useThemeColors';
import { useSharedListsStore } from '../../../stores/sharedLists.store';

export default function ListsScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const myLists = useSharedListsStore((state) => state.myLists);
  const isMyListsLoading = useSharedListsStore((state) => state.isMyListsLoading);
  const myListsError = useSharedListsStore((state) => state.myListsError);
  const fetchMyLists = useSharedListsStore((state) => state.fetchMyLists);

  const pendingInvites = useSharedListsStore((state) => state.pendingInvites);
  const fetchPendingInvites = useSharedListsStore((state) => state.fetchPendingInvites);

  const createList = useSharedListsStore((state) => state.createList);
  const joinListByCode = useSharedListsStore((state) => state.joinListByCode);
  const respondToInvite = useSharedListsStore((state) => state.respondToInvite);

  useEffect(() => {
    fetchMyLists();
    fetchPendingInvites();
  }, [fetchMyLists, fetchPendingInvites]);

  const invites = Object.values(pendingInvites).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  const lists = Object.values(myLists).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const handleRespond = async (membershipId: string, accept: boolean) => {
    setRespondingId(membershipId);
    try {
      await respondToInvite(membershipId, accept);
    } catch {
      // Toast already shown by the store action.
    } finally {
      setRespondingId(null);
    }
  };

  const refetch = () => {
    fetchMyLists();
    fetchPendingInvites();
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="flex-row items-center justify-between px-margin-mobile py-stack-md">
        <Text className="text-headline-lg-mobile font-sans-bold text-text-primary">
          {t('lists.title')}
        </Text>
        <View className="flex-row gap-2">
          <AnimatedPressable
            onPress={() => setIsJoinOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.joinByCode')}
            className="h-10 w-10 items-center justify-center rounded-full border border-glass-border bg-background-blur"
          >
            <MaterialIcons name="key" size={20} color={colors.gold} />
          </AnimatedPressable>
          <AnimatedPressable
            onPress={() => setIsCreateOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.createList')}
            className="h-10 w-10 items-center justify-center rounded-full border border-glass-border bg-background-blur"
          >
            <MaterialIcons name="add" size={22} color={colors.gold} />
          </AnimatedPressable>
        </View>
      </View>

      {isMyListsLoading && lists.length === 0 && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.textPrimary} />
        </View>
      )}

      {myListsError && !isMyListsLoading && (
        <View className="flex-1 items-center justify-center gap-stack-md px-margin-mobile">
          <Text className="text-center font-sans text-body-md text-text-primary">
            {myListsError}
          </Text>
          <AnimatedPressable
            onPress={refetch}
            className="rounded-full border border-glass-border bg-background-blur px-6 py-3"
          >
            <Text className="font-sans-semibold text-primary-container">
              {t('common.tryAgain')}
            </Text>
          </AnimatedPressable>
        </View>
      )}

      {!myListsError && !isMyListsLoading && lists.length === 0 && invites.length === 0 && (
        <View className="flex-1 items-center justify-center gap-stack-sm px-margin-mobile">
          <MaterialIcons name="groups" size={32} color={colors.icon} />
          <Text className="text-title-md font-sans-semibold text-text-primary">
            {t('lists.emptyTitle')}
          </Text>
          <Text className="text-center font-sans text-body-md text-text-secondary">
            {t('lists.emptySubtitle')}
          </Text>
        </View>
      )}

      {!myListsError && (lists.length > 0 || invites.length > 0) && (
        <FlatList
          data={lists}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ListCard list={item} />}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListHeaderComponent={
            invites.length > 0 ? (
              <View className="mb-stack-lg gap-stack-md">
                <Text className="font-sans-semibold text-caption uppercase tracking-wide text-text-secondary">
                  {t('lists.pendingInvites')}
                </Text>
                <View className="gap-3">
                  {invites.map((invite) => (
                    <PendingInviteCard
                      key={invite.membershipId}
                      invite={invite}
                      isResponding={respondingId === invite.membershipId}
                      onAccept={() => handleRespond(invite.membershipId, true)}
                      onDecline={() => handleRespond(invite.membershipId, false)}
                    />
                  ))}
                </View>
                {lists.length > 0 && (
                  <Text className="mt-stack-sm font-sans-semibold text-caption uppercase tracking-wide text-text-secondary">
                    {t('lists.yourLists')}
                  </Text>
                )}
              </View>
            ) : null
          }
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isMyListsLoading}
        />
      )}

      <ListNameModal
        visible={isCreateOpen}
        title={t('lists.newListTitle')}
        submitLabel={t('common.create')}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={async (name) => {
          await createList(name);
        }}
      />

      <JoinByCodeModal
        visible={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
        onSubmit={async (code) => {
          const list = await joinListByCode(code);
          router.push({ pathname: '/lists/[id]', params: { id: list.id } });
        }}
      />
    </SafeAreaView>
  );
}
