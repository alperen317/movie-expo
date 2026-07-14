import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { FadeIn, FadeOut } from 'react-native-reanimated';

import { AuthBackground } from '../components/auth/AuthBackground';
import { AuthTextInput } from '../components/auth/AuthTextInput';
import { AnimatedPressable, AnimatedView } from '../components/ui/AnimatedPressable';
import { useAuthStore } from '../stores/auth.store';

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mismatch, setMismatch] = useState(false);
  const { signUp, isSubmitting, error, needsEmailConfirmation } = useAuthStore();

  const canSubmit =
    email.length > 0 && password.length > 0 && confirmPassword.length > 0 && !isSubmitting;

  const handleSubmit = () => {
    if (password !== confirmPassword) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    signUp(email, password);
  };

  if (needsEmailConfirmation) {
    return (
      <AuthBackground>
        <View className="h-14 w-14 items-center justify-center rounded-full bg-primary-container">
          <MaterialIcons name="mark-email-read" size={28} color="#3f2e00" />
        </View>
        <Text className="mt-stack-lg text-headline-lg-mobile font-sans-semibold text-text-primary">
          E-postanı kontrol et
        </Text>
        <Text className="mt-stack-sm text-center font-sans text-body-md text-text-secondary">
          {email} adresine bir doğrulama bağlantısı gönderdik. Hesabını onayladıktan sonra giriş
          yapabilirsin.
        </Text>

        <AnimatedPressable onPress={() => router.replace('/login')} className="mt-stack-lg">
          <Text className="font-sans-bold text-primary-container">Giriş ekranına dön</Text>
        </AnimatedPressable>
      </AuthBackground>
    );
  }

  return (
    <AuthBackground>
      <Text className="text-display-xl-mobile uppercase text-primary-container">Previously</Text>

      <View className="mt-stack-lg w-full items-center">
        <Text className="text-headline-lg-mobile font-sans-semibold text-text-primary">
          Hesap oluştur
        </Text>
        <Text className="mt-stack-sm text-center font-sans text-body-md text-text-secondary">
          Previously&apos;e katılmak için bilgilerini gir.
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
          autoComplete="new-password"
        />
        <AuthTextInput
          icon="lock"
          isPassword
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Şifreyi Onayla"
          autoComplete="new-password"
        />
      </View>

      {mismatch && (
        <AnimatedView
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={{ width: '100%' }}
        >
          <Text className="mt-stack-sm font-sans text-sm text-error">Şifreler eşleşmiyor.</Text>
        </AnimatedView>
      )}
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
              Kayıt Ol
            </Text>
            <MaterialIcons name="arrow-forward" size={18} color="#3f2e00" />
          </>
        )}
      </AnimatedPressable>

      <AnimatedPressable onPress={() => router.push('/login')} className="mt-stack-lg">
        <Text className="font-sans text-caption text-text-secondary">
          Zaten hesabın var mı? <Text className="font-sans-bold text-text-primary">Giriş Yap</Text>
        </Text>
      </AnimatedPressable>
    </AuthBackground>
  );
}
