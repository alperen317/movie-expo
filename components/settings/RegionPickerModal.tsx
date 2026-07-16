import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { FlatList, Modal, Text, View } from 'react-native';

import { getDeviceRegion } from '../../lib/tmdb/region';
import { WATCH_REGIONS } from '../../lib/tmdb/regions';
import { useProfileStore } from '../../stores/profile.store';
import { useToastStore } from '../../stores/toast.store';
import { AnimatedPressable } from '../ui/AnimatedPressable';

interface RegionPickerModalProps {
  visible: boolean;
  onClose: () => void;
}

export function RegionPickerModal({ visible, onClose }: RegionPickerModalProps) {
  const { t } = useTranslation();
  const watchRegion = useProfileStore((state) => state.profile?.watchRegion ?? null);
  const updateProfile = useProfileStore((state) => state.updateProfile);
  const deviceRegionCode = getDeviceRegion();
  const deviceRegionName =
    WATCH_REGIONS.find((region) => region.code === deviceRegionCode)?.name ?? deviceRegionCode;

  const handleSelect = async (code: string | null) => {
    onClose();
    try {
      await updateProfile({ watchRegion: code });
      useToastStore.getState().show(t('components.regionPicker.updated'), 'check-circle');
    } catch {
      useToastStore.getState().show(t('toasts.genericError'), 'error-outline');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-background/80 px-margin-mobile">
        <View
          style={{ maxHeight: '70%' }}
          className="w-full max-w-md gap-1 rounded-2xl border border-glass-border bg-surface-container-low p-2"
        >
          <View className="gap-1 px-4 pb-2 pt-3">
            <Text className="font-sans-bold text-title-md text-text-primary">
              {t('profile.watchRegion')}
            </Text>
            <Text className="font-sans text-body-md text-text-secondary">
              {t('components.regionPicker.subtitle')}
            </Text>
          </View>
          <FlatList
            data={WATCH_REGIONS}
            keyExtractor={(region) => region.code}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <RegionRow
                label={t('components.regionPicker.useDeviceRegion', { region: deviceRegionName })}
                selected={watchRegion === null}
                onPress={() => handleSelect(null)}
              />
            }
            renderItem={({ item }) => (
              <RegionRow
                label={item.name}
                selected={watchRegion === item.code}
                onPress={() => handleSelect(item.code)}
              />
            )}
          />
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

function RegionRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <AnimatedPressable
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-xl px-4 py-stack-md"
    >
      <Text className="flex-1 font-sans text-body-md text-text-primary" numberOfLines={1}>
        {label}
      </Text>
      {selected && <MaterialIcons name="check" size={20} color="#f5c451" />}
    </AnimatedPressable>
  );
}
