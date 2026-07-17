import { useTranslation } from 'react-i18next';
import { Modal, Text, View } from 'react-native';

import { AnimatedPressable } from './AnimatedPressable';

export interface ActionSheetAction {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

interface ActionSheetModalProps {
  visible: boolean;
  title?: string;
  message?: string;
  actions: ActionSheetAction[];
  onClose: () => void;
}

// RN's Alert.alert (used for confirm/action-sheet style prompts elsewhere in
// this app) silently renders nothing on web — see the note in profile.tsx's
// handleSignOut. This is the cross-platform replacement: a real in-app modal
// that works identically on web and native.
export function ActionSheetModal({
  visible,
  title,
  message,
  actions,
  onClose,
}: ActionSheetModalProps) {
  const { t } = useTranslation();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-background/80 px-margin-mobile">
        <View className="w-full max-w-md gap-1 rounded-2xl border border-glass-border bg-surface-container-low p-2">
          {(title || message) && (
            <View className="gap-1 px-4 pb-2 pt-3">
              {title && (
                <Text className="font-sans-bold text-title-md text-text-primary" numberOfLines={1}>
                  {title}
                </Text>
              )}
              {message && (
                <Text className="font-sans text-body-md text-text-secondary">{message}</Text>
              )}
            </View>
          )}
          {actions.map((action) => (
            <AnimatedPressable
              key={action.label}
              onPress={() => {
                onClose();
                action.onPress();
              }}
              className="rounded-xl px-4 py-stack-md"
            >
              <Text
                className={`text-center font-sans-semibold text-body-md ${
                  action.destructive ? 'text-error' : 'text-text-primary'
                }`}
              >
                {action.label}
              </Text>
            </AnimatedPressable>
          ))}
          <AnimatedPressable onPress={onClose} className="rounded-xl px-4 py-stack-md">
            <Text className="text-center font-sans-semibold text-body-md text-text-secondary">
              {t('common.cancel')}
            </Text>
          </AnimatedPressable>
        </View>
      </View>
    </Modal>
  );
}
