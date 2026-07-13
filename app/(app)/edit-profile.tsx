import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedPressable } from '../../components/ui/AnimatedPressable';
import { BoringAvatar } from '../../components/ui/BoringAvatar';
import { AVATAR_VARIANTS, AvatarVariant } from '../../lib/avatar/generate';
import { useAuthStore } from '../../stores/auth.store';
import { useProfileStore } from '../../stores/profile.store';
import { useToastStore } from '../../stores/toast.store';

export default function EditProfileScreen() {
  const email = useAuthStore((state) => state.session?.user?.email ?? '');
  const profile = useProfileStore((state) => state.profile);
  const updateProfile = useProfileStore((state) => state.updateProfile);

  const [name, setName] = useState(profile?.displayName ?? '');
  const [variant, setVariant] = useState<AvatarVariant>(profile?.avatarVariant ?? 'beam');
  const [isSaving, setIsSaving] = useState(false);

  const seed = name.trim().length > 0 ? name.trim() : email;

  const handleRandomizeVariant = () => {
    const options = AVATAR_VARIANTS.filter((option) => option !== variant);
    setVariant(options[Math.floor(Math.random() * options.length)]);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile({ displayName: name.trim().length > 0 ? name.trim() : null, avatarVariant: variant });
      useToastStore.getState().show('Profile updated', 'check-circle');
      router.back();
    } catch {
      useToastStore.getState().show('Something went wrong. Please try again.', 'error-outline');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="flex-row items-center gap-3 px-margin-mobile py-stack-md">
        <AnimatedPressable
          onPress={() => router.back()}
          hitSlop={8}
          className="h-8 w-8 items-center justify-center"
        >
          <MaterialIcons name="arrow-back" size={22} color="#FFFFFF" />
        </AnimatedPressable>
        <Text className="text-headline-lg-mobile font-sans-bold text-text-primary">Edit Profile</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        className="flex-1 px-margin-mobile"
      >
        <View className="items-center gap-stack-md pt-stack-lg">
          <View className="relative">
            <BoringAvatar name={seed} variant={variant} size={112} />
            <AnimatedPressable
              onPress={handleRandomizeVariant}
              hitSlop={8}
              className="absolute -bottom-1 -right-1 h-10 w-10 items-center justify-center rounded-full border-2 border-background bg-primary-container"
              style={{ elevation: 4, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8 }}
            >
              <MaterialIcons name="shuffle" size={18} color="#3f2e00" />
            </AnimatedPressable>
          </View>
        </View>

        <View className="gap-stack-sm pt-section-gap">
          <Text className="font-sans-semibold text-body-md text-text-primary">Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={email}
            placeholderTextColor="#A1A1AA80"
            autoCapitalize="words"
            className="rounded-lg border border-glass-border bg-surface px-3 py-3 font-sans text-text-primary"
          />
        </View>

        <View className="gap-stack-sm pt-section-gap">
          <Text className="font-sans-semibold text-body-md text-text-primary">Style</Text>
          <View className="flex-row flex-wrap gap-stack-sm">
            {AVATAR_VARIANTS.map((variantOption) => {
              const isSelected = variantOption === variant;
              return (
                <AnimatedPressable
                  key={variantOption}
                  onPress={() => setVariant(variantOption)}
                  className={`items-center justify-center rounded-full border-2 p-1 ${
                    isSelected ? 'border-primary' : 'border-transparent'
                  }`}
                >
                  <BoringAvatar name={seed} variant={variantOption} size={56} />
                </AnimatedPressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 border-t border-glass-border bg-background px-margin-mobile pb-stack-lg pt-stack-md">
        <AnimatedPressable
          onPress={handleSave}
          disabled={isSaving}
          className="items-center justify-center rounded-xl bg-primary-container py-stack-md"
        >
          <Text className="font-sans-semibold text-body-md text-on-primary-container">
            {isSaving ? 'Saving…' : 'Save'}
          </Text>
        </AnimatedPressable>
      </View>
    </SafeAreaView>
  );
}
