import { MaterialIcons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { FadeIn, FadeOut } from 'react-native-reanimated';

import { AuthBackground } from '../components/auth/AuthBackground';
import { AuthTextInput } from '../components/auth/AuthTextInput';
import { AnimatedPressable, AnimatedView } from '../components/ui/AnimatedPressable';
import { useAuthStore } from '../stores/auth.store';

export default function ForgotPasswordScreen() {
  const session = useAuthStore((state) => state.session);
  const { requestPasswordReset, isSubmitting, error } = useAuthStore();
  const [email, setEmail] = useState('');

  const canSubmit = email.length > 0 && !isSubmitting;

  if (session) {
    return <Redirect href="/" />;
  }

  const handleSubmit = async () => {
    const ok = await requestPasswordReset(email);
    if (ok) {
      router.push({ pathname: '/verify-otp', params: { purpose: 'recovery', email } });
    }
  };

  return (
    <AuthBackground>
      <View className="h-14 w-14 items-center justify-center rounded-full bg-primary-container">
        <MaterialIcons name="lock-reset" size={28} color="#3f2e00" />
      </View>

      <View className="mt-stack-lg w-full items-center">
        <Text className="text-headline-lg-mobile font-sans-semibold text-text-primary">
          Şifreni sıfırla
        </Text>
        <Text className="mt-stack-sm text-center font-sans text-body-md text-text-secondary">
          E-posta adresini gir, sana bir doğrulama kodu gönderelim.
        </Text>
      </View>

      <View className="mt-stack-lg w-full gap-stack-md">
        <AuthTextInput
          icon="email"
          value={email}
          onChangeText={setEmail}
          placeholder="E-posta"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
        />
      </View>

      {error && (
        <AnimatedView
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={{ width: '100%' }}
        >
          <Text className="mt-stack-sm font-sans text-sm text-error">{error}</Text>
        </AnimatedView>
      )}

      <AnimatedPressable
        onPress={handleSubmit}
        disabled={!canSubmit}
        style={{
          shadowColor: '#F5C451',
          shadowOpacity: 0.35,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 0 },
          elevation: 8,
        }}
        className={`mt-stack-lg w-full flex-row items-center justify-center gap-2 rounded-full bg-primary-container py-4 ${
          canSubmit ? '' : 'opacity-50'
        }`}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#3f2e00" />
        ) : (
          <>
            <Text className="font-sans-bold uppercase tracking-wide text-on-primary-container">
              Kod Gönder
            </Text>
            <MaterialIcons name="arrow-forward" size={18} color="#3f2e00" />
          </>
        )}
      </AnimatedPressable>

      <AnimatedPressable onPress={() => router.back()} className="mt-stack-lg">
        <Text className="font-sans text-caption text-text-secondary">
          <Text className="font-sans-bold text-text-primary">Giriş ekranına dön</Text>
        </Text>
      </AnimatedPressable>
    </AuthBackground>
  );
}
