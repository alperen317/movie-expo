import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { FadeIn, FadeOut } from 'react-native-reanimated';

import { AuthBackground } from '../components/auth/AuthBackground';
import { AuthTextInput } from '../components/auth/AuthTextInput';
import { AnimatedPressable, AnimatedView } from '../components/ui/AnimatedPressable';
import { useAuthStore } from '../stores/auth.store';

export default function VerifyOtpScreen() {
  const { purpose, email } = useLocalSearchParams<{
    purpose: 'signup' | 'recovery';
    email: string;
  }>();
  const isRecovery = purpose === 'recovery';

  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mismatch, setMismatch] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const {
    verifySignUpOtp,
    resendSignUpOtp,
    requestPasswordReset,
    verifyPasswordResetOtp,
    isSubmitting,
    error,
  } = useAuthStore();

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const canSubmit =
    code.length === 6 &&
    !isSubmitting &&
    (!isRecovery || (newPassword.length > 0 && confirmPassword.length > 0));

  const handleSubmit = async () => {
    if (isRecovery) {
      if (newPassword !== confirmPassword) {
        setMismatch(true);
        return;
      }
      setMismatch(false);
      const ok = await verifyPasswordResetOtp(email, code, newPassword);
      if (ok) router.replace('/');
      return;
    }
    const ok = await verifySignUpOtp(email, code);
    if (ok) router.replace('/');
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setCooldown(60);
    if (isRecovery) {
      await requestPasswordReset(email);
    } else {
      await resendSignUpOtp(email);
    }
  };

  return (
    <AuthBackground>
      <View className="h-14 w-14 items-center justify-center rounded-full bg-primary-container">
        <MaterialIcons name="mark-email-read" size={28} color="#3f2e00" />
      </View>

      <View className="mt-stack-lg w-full items-center">
        <Text className="text-headline-lg-mobile font-sans-semibold text-text-primary">
          Kodu doğrula
        </Text>
        <Text className="mt-stack-sm text-center font-sans text-body-md text-text-secondary">
          {email} adresine gönderdiğimiz 6 haneli kodu gir
          {isRecovery ? ' ve yeni şifreni belirle.' : '.'}
        </Text>
      </View>

      <View className="mt-stack-lg w-full gap-stack-md">
        <AuthTextInput
          icon="password"
          value={code}
          onChangeText={setCode}
          placeholder="6 haneli kod"
          keyboardType="number-pad"
          maxLength={6}
          textAlign="center"
        />
        {isRecovery && (
          <>
            <AuthTextInput
              icon="lock"
              isPassword
              value={newPassword}
              onChangeText={setNewPassword}
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
          </>
        )}
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
              Doğrula
            </Text>
            <MaterialIcons name="arrow-forward" size={18} color="#3f2e00" />
          </>
        )}
      </AnimatedPressable>

      <AnimatedPressable onPress={handleResend} disabled={cooldown > 0} className="mt-stack-lg">
        <Text className="font-sans text-caption text-text-secondary">
          Kod gelmedi mi?{' '}
          <Text className="font-sans-bold text-text-primary">
            {cooldown > 0 ? `Tekrar gönder (${cooldown}sn)` : 'Tekrar gönder'}
          </Text>
        </Text>
      </AnimatedPressable>
    </AuthBackground>
  );
}
