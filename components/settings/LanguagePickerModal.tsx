import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Modal, Text, View } from 'react-native';

import { changeLanguagePreference } from '../../lib/i18n';
import type { LanguagePreference } from '../../lib/i18n/languagePreference';
import { useToastStore } from '../../stores/toast.store';
import { AnimatedPressable } from '../ui/AnimatedPressable';

interface LanguagePickerModalProps {
  visible: boolean;
  current: LanguagePreference;
  onClose: () => void;
  onChange: (preference: LanguagePreference) => void;
}

// Language names are shown as endonyms (each in its own language), which is the
// standard convention and stays correct regardless of the active UI language.
const LANGUAGE_ENDONYMS: Record<'en' | 'tr', string> = {
  en: 'English',
  tr: 'Türkçe',
};

export function LanguagePickerModal({
  visible,
  current,
  onClose,
  onChange,
}: LanguagePickerModalProps) {
  const { t } = useTranslation();

  const handleSelect = async (preference: LanguagePreference) => {
    onChange(preference);
    onClose();
    try {
      await changeLanguagePreference(preference);
      useToastStore.getState().show(t('components.languagePicker.updated'), 'check-circle');
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
              {t('components.languagePicker.title')}
            </Text>
            <Text className="font-sans text-body-md text-text-secondary">
              {t('components.languagePicker.subtitle')}
            </Text>
          </View>

          <LanguageRow
            label={t('components.languagePicker.system')}
            hint={t('components.languagePicker.systemHint')}
            selected={current === 'system'}
            onPress={() => handleSelect('system')}
          />
          <LanguageRow
            label={LANGUAGE_ENDONYMS.en}
            selected={current === 'en'}
            onPress={() => handleSelect('en')}
          />
          <LanguageRow
            label={LANGUAGE_ENDONYMS.tr}
            selected={current === 'tr'}
            onPress={() => handleSelect('tr')}
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

function LanguageRow({
  label,
  hint,
  selected,
  onPress,
}: {
  label: string;
  hint?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <AnimatedPressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      className="flex-row items-center gap-3 rounded-xl px-4 py-stack-md"
    >
      <View className="flex-1">
        <Text className="font-sans text-body-md text-text-primary">{label}</Text>
        {hint && <Text className="font-sans text-caption text-text-secondary">{hint}</Text>}
      </View>
      {selected && <MaterialIcons name="check" size={20} color="#f5c451" />}
    </AnimatedPressable>
  );
}
