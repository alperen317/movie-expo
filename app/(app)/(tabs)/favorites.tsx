import { MaterialIcons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FavoritesScreen() {
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-background px-margin-mobile">
      <MaterialIcons name="favorite" size={32} color="#A1A1AA" />
      <Text className="mt-stack-md text-title-md font-sans-semibold text-text-primary">
        Favorites
      </Text>
      <Text className="mt-stack-sm text-center font-sans text-body-md text-text-secondary">
        Yakında burada olacak.
      </Text>
    </SafeAreaView>
  );
}
