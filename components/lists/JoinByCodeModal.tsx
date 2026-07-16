import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AnimatedPressable } from '../ui/AnimatedPressable';

interface JoinByCodeModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (code: string) => Promise<void>;
}

export function JoinByCodeModal({ visible, onClose, onSubmit }: JoinByCodeModalProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setCode('');
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    const trimmed = code.trim();
    if (trimmed.length === 0) {
      setError(t('components.joinCode.enterCode'));
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(trimmed);
      setCode('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('components.joinCode.joinFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        className="items-center justify-center bg-background/80 px-margin-mobile"
      >
        <View className="w-full max-w-md gap-stack-md rounded-2xl border border-glass-border bg-surface-container-low p-6">
          <Text className="font-sans-bold text-title-md text-text-primary">
            {t('components.joinCode.title')}
          </Text>
          <Text className="font-sans text-caption text-text-secondary">
            {t('components.joinCode.subtitle')}
          </Text>
          <TextInput
            autoFocus
            value={code}
            onChangeText={(text) => {
              setCode(text.toUpperCase());
              if (error) setError(null);
            }}
            placeholder="e.g. AB3D9FQK"
            placeholderTextColor="#A1A1AA80"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={8}
            onSubmitEditing={handleSubmit}
            returnKeyType="done"
            className="rounded-lg border border-glass-border bg-surface/50 px-4 py-4 text-center font-sans-semibold tracking-widest text-text-primary"
          />
          {error && <Text className="font-sans text-caption text-error">{error}</Text>}
          <View className="flex-row gap-3">
            <AnimatedPressable
              onPress={handleClose}
              className="flex-1 items-center rounded-full border border-glass-border py-3"
            >
              <Text className="font-sans-semibold text-body-md text-text-secondary">
                {t('common.cancel')}
              </Text>
            </AnimatedPressable>
            <AnimatedPressable
              onPress={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 items-center rounded-full bg-primary-container py-3"
            >
              {isSubmitting ? (
                <ActivityIndicator color="#3f2e00" />
              ) : (
                <Text className="font-sans-semibold text-body-md text-on-primary-container">
                  {t('components.joinCode.join')}
                </Text>
              )}
            </AnimatedPressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
