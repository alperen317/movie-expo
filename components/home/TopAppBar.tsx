import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';

const AVATAR_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuD6iagr9INugbsYNXHuHuC1SYMoFD5qj4u8Z4e307wv7JolNiANBEFqUitzN6ScCozklNUhqaIFZpCraOjrP3nSw99a-ExnpS3VgtHjAwM67EBidPFG8rH0eFBEeEP_elZIAKzuc-XbfLQO23H5wI7tEDH9oJesTw2RbPxInOTFqixAhNhueraucG0Bw2flxsqa_wA9pD0xvl1N4BNEs9HbQ67blrnD8Oh5NkgKsh4w22wOFDe8TwPH';

export function TopAppBar() {
  return (
    <View className="h-20 flex-row items-center justify-between border-b border-glass-border bg-background-blur px-margin-mobile">
      <Pressable hitSlop={8}>
        <MaterialIcons name="menu" size={28} color="#ffe4af" />
      </Pressable>

      <Text className="text-display-xl-mobile uppercase text-primary">Cinephile</Text>

      <Pressable
        hitSlop={8}
        className="h-10 w-10 overflow-hidden rounded-full border border-glass-border"
      >
        <Image
          source={{ uri: AVATAR_IMAGE }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
        />
      </Pressable>
    </View>
  );
}
