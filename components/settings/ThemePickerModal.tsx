import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Modal, Text, View } from 'react-native';

import { changeThemePreference, type ThemePreference } from '../../lib/theme/themePreference';
import { useThemeColors } from '../../lib/theme/useThemeColors';
import { useToastStore } from '../../stores/toast.store';
import { AnimatedPressable } from '../ui/AnimatedPressable';

interface ThemePickerModalProps {
  visible: boolean;
  current: ThemePreference;
  onClose: () => void;
  onChange: (preference: ThemePreference) => void;
}

export function ThemePickerModal({ visible, current, onClose, onChange }: ThemePickerModalProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  const handleSelect = async (preference: ThemePreference) => {
    onChange(preference);
    onClose();
    try {
      await changeThemePreference(preference);
      useToastStore.getState().show(t('components.themePicker.updated'), 'check-circle');
    } catch {
      useToastStore.getState().show(t('toasts.genericError'), 'error-outline');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-background/80 px-margin-mobile">
        <View className="w-full max-w-md gap-1 rounded-2xl border border-glass-border bg-surface-container-low p-2">
          <View className="gap-1 px-4 pb-2 pt-3">
            <Text className="font-sans-bold text-title-md text-text-primary">
              {t('components.themePicker.title')}
            </Text>
            <Text className="font-sans text-body-md text-text-secondary">
              {t('components.themePicker.subtitle')}
            </Text>
          </View>

          <ThemeRow
            icon="phone-iphone"
            label={t('components.themePicker.system')}
            hint={t('components.themePicker.systemHint')}
            selected={current === 'system'}
            checkColor={colors.gold}
            onPress={() => handleSelect('system')}
          />
          <ThemeRow
            icon="light-mode"
            label={t('components.themePicker.light')}
            selected={current === 'light'}
            checkColor={colors.gold}
            onPress={() => handleSelect('light')}
          />
          <ThemeRow
            icon="dark-mode"
            label={t('components.themePicker.dark')}
            selected={current === 'dark'}
            checkColor={colors.gold}
            onPress={() => handleSelect('dark')}
          />

          <AnimatedPressable
            onPress={onClose}
            accessibilityRole="button"
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

function ThemeRow({
  icon,
  label,
  hint,
  selected,
  checkColor,
  onPress,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  hint?: string;
  selected: boolean;
  checkColor: string;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  return (
    <AnimatedPressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      className="flex-row items-center gap-3 rounded-xl px-4 py-stack-md"
    >
      <MaterialIcons name={icon} size={20} color={colors.icon} />
      <View className="flex-1">
        <Text className="font-sans text-body-md text-text-primary">{label}</Text>
        {hint && <Text className="font-sans text-caption text-text-secondary">{hint}</Text>}
      </View>
      {selected && <MaterialIcons name="check" size={20} color={checkColor} />}
    </AnimatedPressable>
  );
}
