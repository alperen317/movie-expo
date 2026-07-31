import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Modal, Text, View } from 'react-native';

import { AnimatedPressable } from './AnimatedPressable';
import { useThemeColors } from '../../lib/theme/useThemeColors';

export interface ActionSheetAction {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  // Marks the row as the current choice when the sheet stands in for a
  // single-select picker (sort order, view mode). The checkmark is absolutely
  // positioned so it can't push the label off center.
  selected?: boolean;
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
  const colors = useThemeColors();
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
              accessibilityRole="button"
              accessibilityState={action.selected ? { selected: true } : undefined}
              className="rounded-xl px-4 py-stack-md"
            >
              <Text
                className={`text-center font-sans-semibold text-body-md ${
                  action.destructive
                    ? 'text-error'
                    : action.selected
                      ? 'text-primary-container'
                      : 'text-text-primary'
                }`}
              >
                {action.label}
              </Text>
              {action.selected && (
                <View
                  pointerEvents="none"
                  className="absolute bottom-0 right-4 top-0 justify-center"
                >
                  <MaterialIcons name="check" size={18} color={colors.gold} />
                </View>
              )}
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
