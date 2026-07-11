import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Text, View } from 'react-native';

import { AuthTextInput } from '../auth/AuthTextInput';
import { AnimatedPressable } from '../ui/AnimatedPressable';

interface InviteModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (email: string) => Promise<void>;
}

export function InviteModal({ visible, onClose, onSubmit }: InviteModalProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setEmail('');
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (trimmed.length === 0) {
      setError('Enter an email address.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(trimmed);
      setEmail('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invite.');
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
          <Text className="font-sans-bold text-title-md text-text-primary">Invite a Friend</Text>
          <Text className="font-sans text-caption text-text-secondary">
            They need an existing CineLux account to be added.
          </Text>
          <AuthTextInput
            icon="alternate-email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (error) setError(null);
            }}
            placeholder="friend@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
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
                  Send Invite
                </Text>
              )}
            </AnimatedPressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
