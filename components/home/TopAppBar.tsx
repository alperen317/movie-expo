import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { BoringAvatar } from '../ui/BoringAvatar';
import { useAuthStore } from '../../stores/auth.store';
import { useProfileStore } from '../../stores/profile.store';

export function TopAppBar() {
  const email = useAuthStore((state) => state.session?.user?.email ?? '');
  const profile = useProfileStore((state) => state.profile);
  const avatarSeed = profile?.avatarSeed || profile?.displayName || email;

  return (
    <View className="h-20 flex-row items-center justify-between border-b border-glass-border bg-background-blur px-margin-mobile">
      <Pressable hitSlop={8}>
        <MaterialIcons name="menu" size={28} color="#ffe4af" />
      </Pressable>

      <Text className="text-display-xl-mobile uppercase text-primary">Cinephile</Text>

      <Pressable
        hitSlop={8}
        onPress={() => router.push('/edit-profile')}
        className="h-10 w-10 overflow-hidden rounded-full border border-glass-border"
      >
        <BoringAvatar name={avatarSeed} variant={profile?.avatarVariant ?? 'beam'} size={40} />
      </Pressable>
    </View>
  );
}
