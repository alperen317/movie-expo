import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Modal, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  CARD_WIDTH,
  GRID_GAP,
  GRID_PADDING,
  getGridColumns,
  padGridRow,
} from '../../../components/home/MovieCard';
import { InviteModal } from '../../../components/lists/InviteModal';
import { ListItemCard } from '../../../components/lists/ListItemCard';
import { ListNameModal } from '../../../components/lists/ListNameModal';
import { MemberAvatarRow } from '../../../components/lists/MemberAvatarRow';
import { ActionSheetModal } from '../../../components/ui/ActionSheetModal';
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { useThemeColors } from '../../../lib/theme/useThemeColors';
import { BoringAvatar } from '../../../components/ui/BoringAvatar';
import { useAuthStore } from '../../../stores/auth.store';
import { useSharedListsStore } from '../../../stores/sharedLists.store';

// Note: this is the plural `lists/[id]` route (a shared list's detail
// screen) -- not to be confused with the existing singular `list/[source]`
// route, which is an unrelated generic TMDB "view all" browse template.

export default function SharedListDetailScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width: windowWidth } = useWindowDimensions();
  const currentUserId = useAuthStore((state) => state.session?.user?.id);

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);

  const activeList = useSharedListsStore((state) => state.activeList);
  const members = useSharedListsStore((state) => state.members);
  const items = useSharedListsStore((state) => state.items);
  const isDetailLoading = useSharedListsStore((state) => state.isDetailLoading);
  const detailError = useSharedListsStore((state) => state.detailError);
  const openList = useSharedListsStore((state) => state.openList);
  const closeList = useSharedListsStore((state) => state.closeList);
  const renameList = useSharedListsStore((state) => state.renameList);
  const deleteList = useSharedListsStore((state) => state.deleteList);
  const inviteMember = useSharedListsStore((state) => state.inviteMember);
  const regenerateJoinCode = useSharedListsStore((state) => state.regenerateJoinCode);
  const removeMember = useSharedListsStore((state) => state.removeMember);
  const leaveList = useSharedListsStore((state) => state.leaveList);
  const removeItem = useSharedListsStore((state) => state.removeItem);

  useEffect(() => {
    if (!id) return;
    openList(id);
    return () => closeList();
  }, [id, openList, closeList]);

  const memberList = Object.values(members).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const itemList = Object.values(items).sort((a, b) => b.addedAt.localeCompare(a.addedAt));
  const isCreator = Boolean(activeList && currentUserId && activeList.createdBy === currentUserId);
  const myMembership = memberList.find((member) => member.userId === currentUserId);

  const numColumns = getGridColumns(windowWidth);
  const itemGridData = useMemo(() => padGridRow(itemList, numColumns), [itemList, numColumns]);

  const handleDelete = async () => {
    if (!activeList) return;
    await deleteList(activeList.id);
    router.back();
  };

  const handleLeave = () => {
    if (!myMembership) return;
    leaveList(myMembership.membershipId);
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="flex-row items-center gap-3 px-margin-mobile py-stack-md">
        <AnimatedPressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full border border-glass-border bg-background-blur"
        >
          <MaterialIcons name="arrow-back" size={22} color={colors.textPrimary} />
        </AnimatedPressable>
        <Text
          className="flex-1 text-headline-lg-mobile font-sans-bold text-text-primary"
          numberOfLines={1}
        >
          {activeList?.name ?? t('listDetail.fallbackTitle')}
        </Text>
        <AnimatedPressable
          onPress={() => setIsOverflowOpen(true)}
          className="h-10 w-10 items-center justify-center rounded-full border border-glass-border bg-background-blur"
        >
          <MaterialIcons name="more-vert" size={22} color={colors.textPrimary} />
        </AnimatedPressable>
      </View>

      {activeList && (
        <View className="flex-row items-center justify-between px-margin-mobile pb-stack-md">
          <AnimatedPressable
            onPress={() => setIsMembersOpen(true)}
            className="flex-row items-center gap-2"
          >
            <MemberAvatarRow members={memberList} />
            <Text className="font-sans text-caption text-text-secondary">
              {t('listDetail.memberCount', {
                count: memberList.filter((m) => m.status === 'accepted').length,
              })}
            </Text>
          </AnimatedPressable>
          <AnimatedPressable
            onPress={() => setIsInviteOpen(true)}
            className="h-9 w-9 items-center justify-center rounded-full border border-glass-border bg-background-blur"
          >
            <MaterialIcons name="person-add" size={18} color={colors.gold} />
          </AnimatedPressable>
        </View>
      )}

      {isDetailLoading && itemList.length === 0 && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.textPrimary} />
        </View>
      )}

      {detailError && !isDetailLoading && (
        <View className="flex-1 items-center justify-center gap-stack-md px-margin-mobile">
          <Text className="text-center font-sans text-body-md text-text-primary">
            {detailError}
          </Text>
          <AnimatedPressable
            onPress={() => id && openList(id)}
            className="rounded-full border border-glass-border bg-background-blur px-6 py-3"
          >
            <Text className="font-sans-semibold text-primary-container">
              {t('common.tryAgain')}
            </Text>
          </AnimatedPressable>
        </View>
      )}

      {!isDetailLoading && !detailError && itemList.length === 0 && (
        <View className="flex-1 items-center justify-center gap-stack-sm px-margin-mobile">
          <MaterialIcons name="movie-filter" size={32} color={colors.icon} />
          <Text className="text-title-md font-sans-semibold text-text-primary">
            {t('listDetail.emptyTitle')}
          </Text>
          <Text className="text-center font-sans text-body-md text-text-secondary">
            {t('listDetail.emptySubtitle')}
          </Text>
        </View>
      )}

      {!detailError && itemList.length > 0 && (
        <FlatList
          key={numColumns}
          data={itemGridData}
          numColumns={numColumns}
          keyExtractor={(item, index) =>
            item ? `${item.mediaType}-${item.id}` : `filler-${index}`
          }
          renderItem={({ item, index }) =>
            item ? (
              <ListItemCard
                item={item}
                index={index % numColumns}
                onRemove={() => removeItem(item.listId, item.id, item.mediaType)}
              />
            ) : (
              <View style={{ width: CARD_WIDTH }} />
            )
          }
          columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: GRID_GAP }}
          contentContainerStyle={{ paddingHorizontal: GRID_PADDING, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {activeList && (
        <AnimatedPressable
          onPress={() =>
            router.push({ pathname: '/lists/add-items', params: { listId: activeList.id } })
          }
          className="absolute bottom-8 right-6 h-14 w-14 items-center justify-center rounded-full bg-primary-container"
          style={{ elevation: 4, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8 }}
        >
          <MaterialIcons name="add" size={26} color="#3f2e00" />
        </AnimatedPressable>
      )}

      {activeList && (
        <InviteModal
          visible={isInviteOpen}
          joinCode={activeList.joinCode}
          isCreator={isCreator}
          onClose={() => setIsInviteOpen(false)}
          onSubmit={async (email) => {
            await inviteMember(activeList.id, email);
          }}
          onRegenerate={() => regenerateJoinCode(activeList.id)}
        />
      )}

      {activeList && (
        <ListNameModal
          visible={isRenameOpen}
          title={t('listDetail.renameTitle')}
          submitLabel={t('common.save')}
          initialValue={activeList.name}
          onClose={() => setIsRenameOpen(false)}
          onSubmit={async (name) => {
            await renameList(activeList.id, name);
          }}
        />
      )}

      <ActionSheetModal
        visible={isOverflowOpen}
        title={activeList?.name ?? t('listDetail.fallbackTitle')}
        onClose={() => setIsOverflowOpen(false)}
        actions={[
          { label: t('listDetail.rename'), onPress: () => setIsRenameOpen(true) },
          isCreator
            ? {
                label: t('listDetail.deleteList'),
                destructive: true,
                onPress: () => setIsDeleteConfirmOpen(true),
              }
            : {
                label: t('listDetail.leaveList'),
                destructive: true,
                onPress: () => setIsLeaveConfirmOpen(true),
              },
        ]}
      />

      <ActionSheetModal
        visible={isDeleteConfirmOpen}
        title={t('listDetail.deleteList')}
        message={t('listDetail.deleteMessage')}
        onClose={() => setIsDeleteConfirmOpen(false)}
        actions={[{ label: t('listDetail.delete'), destructive: true, onPress: handleDelete }]}
      />

      <ActionSheetModal
        visible={isLeaveConfirmOpen}
        title={t('listDetail.leaveList')}
        message={t('listDetail.leaveMessage')}
        onClose={() => setIsLeaveConfirmOpen(false)}
        actions={[{ label: t('listDetail.leave'), destructive: true, onPress: handleLeave }]}
      />

      <Modal
        visible={isMembersOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsMembersOpen(false)}
      >
        <View className="flex-1 items-center justify-center bg-background/80 px-margin-mobile">
          <View className="w-full max-w-md gap-stack-md rounded-2xl border border-glass-border bg-surface-container-low p-6">
            <View className="flex-row items-center justify-between">
              <Text className="font-sans-bold text-title-md text-text-primary">
                {t('listDetail.members')}
              </Text>
              <AnimatedPressable onPress={() => setIsMembersOpen(false)}>
                <MaterialIcons name="close" size={22} color={colors.icon} />
              </AnimatedPressable>
            </View>
            <View className="gap-3">
              {memberList.map((member) => (
                <View key={member.membershipId} className="flex-row items-center gap-3">
                  <View className="h-9 w-9 overflow-hidden rounded-full border border-glass-border">
                    <BoringAvatar
                      name={member.avatarSeed || member.displayName || member.email}
                      variant={member.avatarVariant}
                      size={36}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="font-sans text-body-md text-text-primary" numberOfLines={1}>
                      {member.displayName || member.email}
                    </Text>
                    {member.status === 'pending' && (
                      <Text className="font-sans text-caption text-text-secondary">
                        {t('listDetail.pending')}
                      </Text>
                    )}
                  </View>
                  {isCreator && member.userId !== currentUserId && (
                    <AnimatedPressable onPress={() => removeMember(member.membershipId)}>
                      <MaterialIcons name="close" size={18} color={colors.error} />
                    </AnimatedPressable>
                  )}
                </View>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
