import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Text, View } from 'react-native';
import { FadeIn, FadeOut } from 'react-native-reanimated';

import { AuthBackground } from '../components/auth/AuthBackground';
import { AuthTextInput } from '../components/auth/AuthTextInput';
import { AnimatedPressable, AnimatedView } from '../components/ui/AnimatedPressable';
import { useAuthStore } from '../stores/auth.store';

export default function SignUpScreen() {
  const { t } = useTranslation();
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [mismatch, setMismatch] = useState(false);
  const { signUp, verifySignUpOtp, resendSignUpOtp, isSubmitting, error, needsEmailConfirmation } =
    useAuthStore();

  useEffect(() => {
    if (needsEmailConfirmation) setStep('otp');
  }, [needsEmailConfirmation]);

  const handleSubmit = () => {
    if (password !== confirmPassword) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    signUp(email, password);
  };

  const handleVerify = async () => {
    const ok = await verifySignUpOtp(email, code);
    if (ok) router.replace('/');
  };

  const handleResend = () => {
    resendSignUpOtp(email);
  };

  if (step === 'otp') {
    const canVerify = code.length > 0 && !isSubmitting;

    return (
      <AuthBackground>
        <View className="h-14 w-14 items-center justify-center rounded-full bg-primary-container">
          <MaterialIcons name="mark-email-read" size={28} color="#3f2e00" />
        </View>

        <View className="mt-stack-lg w-full items-center">
          <Text className="text-headline-lg-mobile font-sans-semibold text-text-primary">
            {t('auth.signUp.otpTitle')}
          </Text>
          <Text className="mt-stack-sm text-center font-sans text-body-md text-text-secondary">
            {t('auth.signUp.otpSubtitle', { email })}
          </Text>
        </View>

        <View className="mt-stack-lg w-full gap-stack-md">
          <AuthTextInput
            icon="dialpad"
            value={code}
            onChangeText={setCode}
            placeholder={t('auth.forgotPassword.code')}
            autoCapitalize="none"
            keyboardType="number-pad"
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
          onPress={handleVerify}
          disabled={!canVerify}
          style={{
            shadowColor: '#F5C451',
            shadowOpacity: 0.35,
            shadowRadius: 20,
            shadowOffset: { width: 0, height: 0 },
            elevation: 8,
          }}
          className={`mt-stack-lg w-full flex-row items-center justify-center gap-2 rounded-full bg-primary-container py-4 ${
            canVerify ? '' : 'opacity-50'
          }`}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#3f2e00" />
          ) : (
            <>
              <Text className="font-sans-bold uppercase tracking-wide text-on-primary-container">
                {t('auth.signUp.otpSubmit')}
              </Text>
              <MaterialIcons name="arrow-forward" size={18} color="#3f2e00" />
            </>
          )}
        </AnimatedPressable>

        <AnimatedPressable onPress={handleResend} className="mt-stack-lg">
          <Text className="font-sans text-caption text-text-secondary">
            {t('auth.forgotPassword.noCode')}{' '}
            <Text className="font-sans-bold text-text-primary">{t('auth.signUp.otpResend')}</Text>
          </Text>
        </AnimatedPressable>
      </AuthBackground>
    );
  }

  const canSubmit =
    email.length > 0 && password.length > 0 && confirmPassword.length > 0 && !isSubmitting;

  return (
    <AuthBackground>
      <Text className="text-display-xl-mobile uppercase text-primary-container">Previously</Text>

      <View className="mt-stack-lg w-full items-center">
        <Text className="text-headline-lg-mobile font-sans-semibold text-text-primary">
          {t('auth.signUp.title')}
        </Text>
        <Text className="mt-stack-sm text-center font-sans text-body-md text-text-secondary">
          {t('auth.signUp.subtitle')}
        </Text>
      </View>

      <View className="mt-stack-lg w-full gap-stack-md">
        <AuthTextInput
          icon="email"
          value={email}
          onChangeText={setEmail}
          placeholder={t('auth.email')}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
        />
        <AuthTextInput
          icon="lock"
          isPassword
          value={password}
          onChangeText={setPassword}
          placeholder={t('auth.password')}
          autoComplete="new-password"
        />
        <AuthTextInput
          icon="lock"
          isPassword
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder={t('auth.signUp.confirmPassword')}
          autoComplete="new-password"
        />
      </View>

      {mismatch && (
        <AnimatedView
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={{ width: '100%' }}
        >
          <Text className="mt-stack-sm font-sans text-sm text-error">
            {t('auth.signUp.passwordMismatch')}
          </Text>
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
              {t('auth.signUp.submit')}
            </Text>
            <MaterialIcons name="arrow-forward" size={18} color="#3f2e00" />
          </>
        )}
      </AnimatedPressable>

      <AnimatedPressable onPress={() => router.push('/login')} className="mt-stack-lg">
        <Text className="font-sans text-caption text-text-secondary">
          {t('auth.signUp.haveAccount')}{' '}
          <Text className="font-sans-bold text-text-primary">{t('auth.signUp.signInLink')}</Text>
        </Text>
      </AnimatedPressable>
    </AuthBackground>
  );
}
