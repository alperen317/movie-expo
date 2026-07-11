import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CARD_WIDTH } from '../../../components/home/MovieCard';
import { InviteModal } from '../../../components/lists/InviteModal';
import { ListItemCard } from '../../../components/lists/ListItemCard';
import { ListNameModal } from '../../../components/lists/ListNameModal';
import { MemberAvatarRow } from '../../../components/lists/MemberAvatarRow';
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { getInitials } from '../../../lib/utils/initials';
import { useAuthStore } from '../../../stores/auth.store';
import { useSharedListsStore } from '../../../stores/sharedLists.store';

// Note: this is the plural `lists/[id]` route (a shared list's detail
// screen) -- not to be confused with the existing singular `list/[source]`
// route, which is an unrelated generic TMDB "view all" browse template.

const GRID_GAP = 16;
const GRID_PADDING = 16;

export default function SharedListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width: windowWidth } = useWindowDimensions();
  const currentUserId = useAuthStore((state) => state.session?.user?.id);

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isMembersOpen, setIsMembersOpen] = useState(false);

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

  const numColumns = Math.max(
    2,
    Math.floor((windowWidth - GRID_PADDING * 2 + GRID_GAP) / (CARD_WIDTH + GRID_GAP)),
  );

  const handleDelete = () => {
    if (!activeList) return;
    Alert.alert('Delete List', 'This removes it for everyone. This can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteList(activeList.id);
          router.back();
        },
      },
    ]);
  };

  const handleLeave = () => {
    if (!myMembership) return;
    Alert.alert('Leave List', 'You’ll need a new invite to rejoin.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: () => leaveList(myMembership.membershipId),
      },
    ]);
  };

  const handleOverflowPress = () => {
    if (isCreator) {
      Alert.alert(activeList?.name ?? 'List', undefined, [
        { text: 'Rename', onPress: () => setIsRenameOpen(true) },
        { text: 'Delete List', style: 'destructive', onPress: handleDelete },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else {
      Alert.alert(activeList?.name ?? 'List', undefined, [
        { text: 'Rename', onPress: () => setIsRenameOpen(true) },
        { text: 'Leave List', style: 'destructive', onPress: handleLeave },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="flex-row items-center gap-3 px-margin-mobile py-stack-md">
        <AnimatedPressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full border border-glass-border bg-background-blur"
        >
          <MaterialIcons name="arrow-back" size={22} color="#FFFFFF" />
        </AnimatedPressable>
        <Text
          className="flex-1 text-headline-lg-mobile font-sans-bold text-text-primary"
          numberOfLines={1}
        >
          {activeList?.name ?? 'List'}
        </Text>
        <AnimatedPressable
          onPress={handleOverflowPress}
          className="h-10 w-10 items-center justify-center rounded-full border border-glass-border bg-background-blur"
        >
          <MaterialIcons name="more-vert" size={22} color="#FFFFFF" />
        </AnimatedPressable>
      </View>

      {activeList && (
        <View className="flex-row items-center justify-between px-margin-mobile pb-stack-md">
          <AnimatedPressable onPress={() => setIsMembersOpen(true)} className="flex-row items-center gap-2">
            <MemberAvatarRow members={memberList} />
            <Text className="font-sans text-caption text-text-secondary">
              {memberList.filter((m) => m.status === 'accepted').length} member
              {memberList.filter((m) => m.status === 'accepted').length === 1 ? '' : 's'}
            </Text>
          </AnimatedPressable>
          <AnimatedPressable
            onPress={() => setIsInviteOpen(true)}
            className="h-9 w-9 items-center justify-center rounded-full border border-glass-border bg-background-blur"
          >
            <MaterialIcons name="person-add" size={18} color="#f5c451" />
          </AnimatedPressable>
        </View>
      )}

      {isDetailLoading && itemList.length === 0 && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#ffffff" />
        </View>
      )}

      {detailError && !isDetailLoading && (
        <View className="flex-1 items-center justify-center gap-stack-md px-margin-mobile">
          <Text className="text-center font-sans text-body-md text-text-primary">{detailError}</Text>
          <AnimatedPressable
            onPress={() => id && openList(id)}
            className="rounded-full border border-glass-border bg-background-blur px-6 py-3"
          >
            <Text className="font-sans-semibold text-primary-container">Try Again</Text>
          </AnimatedPressable>
        </View>
      )}

      {!isDetailLoading && !detailError && itemList.length === 0 && (
        <View className="flex-1 items-center justify-center gap-stack-sm px-margin-mobile">
          <MaterialIcons name="movie-filter" size={32} color="#A1A1AA" />
          <Text className="text-title-md font-sans-semibold text-text-primary">No titles yet</Text>
          <Text className="text-center font-sans text-body-md text-text-secondary">
            Add a movie or show to get this list started.
          </Text>
        </View>
      )}

      {!detailError && itemList.length > 0 && (
        <FlatList
          key={numColumns}
          data={itemList}
          numColumns={numColumns}
          keyExtractor={(item) => `${item.mediaType}-${item.id}`}
          renderItem={({ item, index }) => (
            <ListItemCard
              item={item}
              index={index % numColumns}
              onRemove={() => removeItem(item.listId, item.id, item.mediaType)}
            />
          )}
          columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: GRID_GAP }}
          contentContainerStyle={{ paddingHorizontal: GRID_PADDING, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {activeList && (
        <AnimatedPressable
          onPress={() => router.push({ pathname: '/lists/add-items', params: { listId: activeList.id } })}
          className="absolute bottom-8 right-6 h-14 w-14 items-center justify-center rounded-full bg-primary-container"
          style={{ elevation: 4, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8 }}
        >
          <MaterialIcons name="add" size={26} color="#3f2e00" />
        </AnimatedPressable>
      )}

      <InviteModal
        visible={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        onSubmit={async (email) => {
          if (activeList) await inviteMember(activeList.id, email);
        }}
      />

      {activeList && (
        <ListNameModal
          visible={isRenameOpen}
          title="Rename List"
          submitLabel="Save"
          initialValue={activeList.name}
          onClose={() => setIsRenameOpen(false)}
          onSubmit={async (name) => {
            await renameList(activeList.id, name);
          }}
        />
      )}

      <Modal
        visible={isMembersOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsMembersOpen(false)}
      >
        <View className="flex-1 items-center justify-center bg-background/80 px-margin-mobile">
          <View className="w-full max-w-md gap-stack-md rounded-2xl border border-glass-border bg-surface-container-low p-6">
            <View className="flex-row items-center justify-between">
              <Text className="font-sans-bold text-title-md text-text-primary">Members</Text>
              <AnimatedPressable onPress={() => setIsMembersOpen(false)}>
                <MaterialIcons name="close" size={22} color="#A1A1AA" />
              </AnimatedPressable>
            </View>
            <View className="gap-3">
              {memberList.map((member) => (
                <View key={member.membershipId} className="flex-row items-center gap-3">
                  <View className="h-9 w-9 items-center justify-center rounded-full border border-glass-border bg-surface-container-high">
                    <Text className="font-sans-bold text-[11px] text-primary-container">
                      {getInitials(member.email)}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-sans text-body-md text-text-primary" numberOfLines={1}>
                      {member.email}
                    </Text>
                    {member.status === 'pending' && (
                      <Text className="font-sans text-caption text-text-secondary">Pending</Text>
                    )}
                  </View>
                  {isCreator && member.userId !== currentUserId && (
                    <AnimatedPressable onPress={() => removeMember(member.membershipId)}>
                      <MaterialIcons name="close" size={18} color="#ffb4ab" />
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
