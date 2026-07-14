import { useState } from 'react';
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

interface ListNameModalProps {
  visible: boolean;
  title: string;
  submitLabel: string;
  initialValue?: string;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
}

export function ListNameModal({
  visible,
  title,
  submitLabel,
  initialValue = '',
  onClose,
  onSubmit,
}: ListNameModalProps) {
  const [name, setName] = useState(initialValue);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setName(initialValue);
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      setError('Give your list a name.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(trimmed);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
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
          <Text className="font-sans-bold text-title-md text-text-primary">{title}</Text>
          <TextInput
            autoFocus
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (error) setError(null);
            }}
            placeholder="e.g. Movies to watch together"
            placeholderTextColor="#A1A1AA80"
            maxLength={60}
            className="rounded-lg border border-glass-border bg-surface/50 px-4 py-4 font-sans text-text-primary"
            onSubmitEditing={handleSubmit}
            returnKeyType="done"
          />
          {error && <Text className="font-sans text-caption text-error">{error}</Text>}
          <View className="flex-row gap-3">
            <AnimatedPressable
              onPress={handleClose}
              className="flex-1 items-center rounded-full border border-glass-border py-3"
            >
              <Text className="font-sans-semibold text-body-md text-text-secondary">Cancel</Text>
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
                  {submitLabel}
                </Text>
              )}
            </AnimatedPressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
