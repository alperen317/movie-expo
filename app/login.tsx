import { MaterialIcons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { FadeIn, FadeOut } from 'react-native-reanimated';

import { AuthBackground } from '../components/auth/AuthBackground';
import { AuthTextInput } from '../components/auth/AuthTextInput';
import { AnimatedPressable, AnimatedView } from '../components/ui/AnimatedPressable';
import { useAuthStore } from '../stores/auth.store';

export default function LoginScreen() {
  const session = useAuthStore((state) => state.session);
  const { signIn, isSubmitting, error } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const canSubmit = email.length > 0 && password.length > 0 && !isSubmitting;

  if (session) {
    return <Redirect href="/" />;
  }

  return (
    <AuthBackground>
      <Text className="text-display-xl-mobile uppercase text-primary-container">CineLux</Text>

      <View className="mt-stack-lg w-full items-center">
        <Text className="text-headline-lg-mobile font-sans-semibold text-text-primary">
          Tekrar hoş geldin
        </Text>
        <Text className="mt-stack-sm text-center font-sans text-body-md text-text-secondary">
          Sinematik dünyana giriş yap.
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
        <AuthTextInput
          icon="lock"
          isPassword
          value={password}
          onChangeText={setPassword}
          placeholder="Şifre"
          autoComplete="password"
        />
      </View>

      <View className="mt-stack-md w-full flex-row items-center justify-between">
        <Pressable
          onPress={() => setRememberMe((value) => !value)}
          className="flex-row items-center gap-2"
        >
          <View
            className={`h-5 w-5 items-center justify-center rounded border ${
              rememberMe
                ? 'border-primary-container bg-primary-container'
                : 'border-glass-border bg-surface'
            }`}
          >
            {rememberMe && <MaterialIcons name="check" size={16} color="#3f2e00" />}
          </View>
          <Text className="font-sans text-caption text-text-secondary">Beni hatırla</Text>
        </Pressable>

        <Text className="font-sans text-caption text-primary-container">Şifremi unuttum</Text>
      </View>

      {error && (
        <AnimatedView
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={{ width: '100%' }}>
          <Text className="mt-stack-sm font-sans text-sm text-error">{error}</Text>
        </AnimatedView>
      )}

      <AnimatedPressable
        onPress={() => signIn(email, password)}
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
              Giriş Yap
            </Text>
            <MaterialIcons name="arrow-forward" size={18} color="#3f2e00" />
          </>
        )}
      </AnimatedPressable>

      <AnimatedPressable onPress={() => router.push('/sign-up')} className="mt-stack-lg">
        <Text className="font-sans text-caption text-text-secondary">
          Hesabın yok mu? <Text className="font-sans-bold text-text-primary">Kayıt Ol</Text>
        </Text>
      </AnimatedPressable>
    </AuthBackground>
  );
}
