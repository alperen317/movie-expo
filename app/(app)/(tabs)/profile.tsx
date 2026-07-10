import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthStore } from '../../../stores/auth.store';

export default function ProfileScreen() {
  const signOut = useAuthStore((state) => state.signOut);

  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-background px-margin-mobile">
      <MaterialIcons name="person" size={32} color="#A1A1AA" />
      <Text className="mt-stack-md text-title-md font-sans-semibold text-text-primary">
        Profile
      </Text>
      <Text className="mt-stack-sm text-center font-sans text-body-md text-text-secondary">
        Yakında burada olacak.
      </Text>

      <Pressable onPress={signOut} className="mt-stack-lg rounded-full border border-glass-border px-6 py-3">
        <Text className="font-sans-semibold text-primary-container">Çıkış Yap</Text>
      </Pressable>
    </SafeAreaView>
  );
}
