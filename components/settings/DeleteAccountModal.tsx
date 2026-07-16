import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, Text, TextInput, View } from 'react-native';

import { deleteAccount } from '../../lib/supabase/account';
import { useAuthStore } from '../../stores/auth.store';
import { useToastStore } from '../../stores/toast.store';
import { AnimatedPressable } from '../ui/AnimatedPressable';

interface DeleteAccountModalProps {
  visible: boolean;
  onClose: () => void;
}

const CONFIRM_WORD = 'DELETE';

export function DeleteAccountModal({ visible, onClose }: DeleteAccountModalProps) {
  const { t } = useTranslation();
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const canConfirm = confirmText.trim().toUpperCase() === CONFIRM_WORD && !isDeleting;

  const handleClose = () => {
    if (isDeleting) return;
    setConfirmText('');
    onClose();
  };

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setIsDeleting(true);
    try {
      await deleteAccount();
      setConfirmText('');
      onClose();
      await useAuthStore.getState().signOut();
      router.replace('/login');
    } catch {
      useToastStore.getState().show(t('toasts.genericError'), 'error-outline');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View className="flex-1 items-center justify-center bg-background/80 px-margin-mobile">
        <View className="w-full max-w-md gap-stack-md rounded-2xl border border-glass-border bg-surface-container-low p-4">
          <Text className="font-sans-bold text-title-md text-text-primary">
            {t('components.deleteAccount.title')}
          </Text>
          <Text className="font-sans text-body-md text-text-secondary">
            {t('components.deleteAccount.body')}
          </Text>
          <Text className="font-sans text-body-md text-text-secondary">
            {t('components.deleteAccount.confirmPrompt', { word: CONFIRM_WORD })}
          </Text>
          <TextInput
            value={confirmText}
            onChangeText={setConfirmText}
            placeholder={CONFIRM_WORD}
            placeholderTextColor="#A1A1AA80"
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!isDeleting}
            className="rounded-lg border border-glass-border bg-surface px-3 py-3 font-sans text-text-primary"
          />
          <AnimatedPressable
            onPress={handleConfirm}
            disabled={!canConfirm}
            className={`items-center rounded-xl px-4 py-stack-md ${canConfirm ? 'bg-error' : 'bg-surface opacity-50'}`}
          >
            {isDeleting ? (
              <ActivityIndicator color="#690005" />
            ) : (
              <Text className="text-center font-sans-semibold text-body-md text-on-error">
                {t('components.deleteAccount.confirmButton')}
              </Text>
            )}
          </AnimatedPressable>
          <AnimatedPressable
            onPress={handleClose}
            disabled={isDeleting}
            className="rounded-xl px-4 py-stack-md"
          >
            <Text className="text-center font-sans-semibold text-body-md text-text-secondary">
              {t('common.cancel')}
            </Text>
          </AnimatedPressable>
        </View>
      </View>
    </Modal>
  );
}
