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
  const { requestPasswordReset, resetPassword, isSubmitting, error } = useAuthStore();

  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mismatch, setMismatch] = useState(false);

  // Verifying the recovery code signs the user in, so once a session exists the
  // reset has succeeded — send them straight into the app.
  if (session) {
    return <Redirect href="/" />;
  }

  const handleRequest = async () => {
    const ok = await requestPasswordReset(email.trim());
    if (ok) setStep('reset');
  };

  const handleReset = async () => {
    if (password !== confirmPassword) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    await resetPassword(email.trim(), code.trim(), password);
  };

  if (step === 'reset') {
    const canSubmit =
      code.length > 0 && password.length > 0 && confirmPassword.length > 0 && !isSubmitting;

    return (
      <AuthBackground>
        <Text className="text-display-xl-mobile uppercase text-primary-container">Previously</Text>

        <View className="mt-stack-lg w-full items-center">
          <Text className="text-headline-lg-mobile font-sans-semibold text-text-primary">
            Yeni şifre belirle
          </Text>
          <Text className="mt-stack-sm text-center font-sans text-body-md text-text-secondary">
            {email} adresine gönderdiğimiz kodu ve yeni şifreni gir.
          </Text>
        </View>

        <View className="mt-stack-lg w-full gap-stack-md">
          <AuthTextInput
            icon="dialpad"
            value={code}
            onChangeText={setCode}
            placeholder="Doğrulama kodu"
            autoCapitalize="none"
            keyboardType="number-pad"
          />
          <AuthTextInput
            icon="lock"
            isPassword
            value={password}
            onChangeText={setPassword}
            placeholder="Yeni şifre"
            autoComplete="new-password"
          />
          <AuthTextInput
            icon="lock"
            isPassword
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Yeni şifreyi onayla"
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
          onPress={handleReset}
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
                Şifreyi Sıfırla
              </Text>
              <MaterialIcons name="arrow-forward" size={18} color="#3f2e00" />
            </>
          )}
        </AnimatedPressable>

        <AnimatedPressable onPress={() => setStep('request')} className="mt-stack-lg">
          <Text className="font-sans text-caption text-text-secondary">
            Kod gelmedi mi? <Text className="font-sans-bold text-text-primary">Tekrar dene</Text>
          </Text>
        </AnimatedPressable>
      </AuthBackground>
    );
  }

  const canSubmit = email.length > 0 && !isSubmitting;

  return (
    <AuthBackground>
      <Text className="text-display-xl-mobile uppercase text-primary-container">Previously</Text>

      <View className="mt-stack-lg w-full items-center">
        <Text className="text-headline-lg-mobile font-sans-semibold text-text-primary">
          Şifreni mi unuttun?
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
        onPress={handleRequest}
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

      <AnimatedPressable onPress={() => router.replace('/login')} className="mt-stack-lg">
        <Text className="font-sans text-caption text-text-secondary">
          Şifreni hatırladın mı? <Text className="font-sans-bold text-text-primary">Giriş Yap</Text>
        </Text>
      </AnimatedPressable>
    </AuthBackground>
  );
}
