import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Share,
  Text,
  View,
} from 'react-native';

import { AuthTextInput } from '../auth/AuthTextInput';
import { AnimatedPressable } from '../ui/AnimatedPressable';

interface InviteModalProps {
  visible: boolean;
  joinCode: string;
  isCreator: boolean;
  onClose: () => void;
  onSubmit: (email: string) => Promise<void>;
  onRegenerate: () => Promise<void>;
}

export function InviteModal({
  visible,
  joinCode,
  isCreator,
  onClose,
  onSubmit,
  onRegenerate,
}: InviteModalProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [justCopied, setJustCopied] = useState(false);

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

  const handleCopy = async () => {
    await Clipboard.setStringAsync(joinCode);
    setJustCopied(true);
    setTimeout(() => setJustCopied(false), 2000);
  };

  const handleShare = () => {
    Share.share({ message: `Join my list on Previously — use code ${joinCode}` });
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      await onRegenerate();
    } finally {
      setIsRegenerating(false);
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

          <View className="gap-stack-sm rounded-xl border border-glass-border bg-surface/50 p-4">
            <Text className="font-sans text-caption text-text-secondary">
              Or share this code — anyone with it joins instantly.
            </Text>
            <Text className="text-center font-sans-bold text-headline-lg-mobile tracking-widest text-primary">
              {joinCode}
            </Text>
            <View className="flex-row gap-3">
              <AnimatedPressable
                onPress={handleCopy}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-full border border-glass-border py-2"
              >
                <MaterialIcons
                  name={justCopied ? 'check' : 'content-copy'}
                  size={16}
                  color="#A1A1AA"
                />
                <Text className="font-sans-semibold text-caption text-text-secondary">
                  {justCopied ? 'Copied' : 'Copy'}
                </Text>
              </AnimatedPressable>
              <AnimatedPressable
                onPress={handleShare}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-full border border-glass-border py-2"
              >
                <MaterialIcons name="ios-share" size={16} color="#A1A1AA" />
                <Text className="font-sans-semibold text-caption text-text-secondary">Share</Text>
              </AnimatedPressable>
            </View>
            {isCreator && (
              <AnimatedPressable
                onPress={handleRegenerate}
                disabled={isRegenerating}
                className="self-center"
              >
                <Text className="font-sans text-caption text-text-secondary underline">
                  {isRegenerating ? 'Regenerating…' : 'Regenerate code'}
                </Text>
              </AnimatedPressable>
            )}
          </View>

          <View className="flex-row items-center gap-3">
            <View className="h-px flex-1 bg-glass-border" />
            <Text className="font-sans text-caption text-text-secondary">or invite by email</Text>
            <View className="h-px flex-1 bg-glass-border" />
          </View>

          <Text className="font-sans text-caption text-text-secondary">
            They need an existing Previously account to be added.
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
