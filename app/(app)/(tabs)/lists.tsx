import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ListCard } from '../../../components/lists/ListCard';
import { ListNameModal } from '../../../components/lists/ListNameModal';
import { PendingInviteCard } from '../../../components/lists/PendingInviteCard';
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { useSharedListsStore } from '../../../stores/sharedLists.store';

export default function ListsScreen() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const myLists = useSharedListsStore((state) => state.myLists);
  const isMyListsLoading = useSharedListsStore((state) => state.isMyListsLoading);
  const myListsError = useSharedListsStore((state) => state.myListsError);
  const fetchMyLists = useSharedListsStore((state) => state.fetchMyLists);

  const pendingInvites = useSharedListsStore((state) => state.pendingInvites);
  const fetchPendingInvites = useSharedListsStore((state) => state.fetchPendingInvites);

  const createList = useSharedListsStore((state) => state.createList);
  const respondToInvite = useSharedListsStore((state) => state.respondToInvite);

  useEffect(() => {
    fetchMyLists();
    fetchPendingInvites();
  }, [fetchMyLists, fetchPendingInvites]);

  const invites = Object.values(pendingInvites).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const lists = Object.values(myLists).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const handleRespond = async (membershipId: string, accept: boolean) => {
    setRespondingId(membershipId);
    try {
      await respondToInvite(membershipId, accept);
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
        <Text className="text-headline-lg-mobile font-sans-bold text-text-primary">Lists</Text>
        <AnimatedPressable
          onPress={() => setIsCreateOpen(true)}
          className="h-10 w-10 items-center justify-center rounded-full border border-glass-border bg-background-blur"
        >
          <MaterialIcons name="add" size={22} color="#f5c451" />
        </AnimatedPressable>
      </View>

      {isMyListsLoading && lists.length === 0 && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#ffffff" />
        </View>
      )}

      {myListsError && !isMyListsLoading && (
        <View className="flex-1 items-center justify-center gap-stack-md px-margin-mobile">
          <Text className="text-center font-sans text-body-md text-text-primary">{myListsError}</Text>
          <AnimatedPressable
            onPress={refetch}
            className="rounded-full border border-glass-border bg-background-blur px-6 py-3"
          >
            <Text className="font-sans-semibold text-primary-container">Try Again</Text>
          </AnimatedPressable>
        </View>
      )}

      {!myListsError && !isMyListsLoading && lists.length === 0 && invites.length === 0 && (
        <View className="flex-1 items-center justify-center gap-stack-sm px-margin-mobile">
          <MaterialIcons name="groups" size={32} color="#A1A1AA" />
          <Text className="text-title-md font-sans-semibold text-text-primary">No shared lists yet</Text>
          <Text className="text-center font-sans text-body-md text-text-secondary">
            Create a list and invite a friend to start building it together.
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
                  Pending Invites
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
                    Your Lists
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
        title="New Shared List"
        submitLabel="Create"
        onClose={() => setIsCreateOpen(false)}
        onSubmit={async (name) => {
          await createList(name);
        }}
      />
    </SafeAreaView>
  );
}
