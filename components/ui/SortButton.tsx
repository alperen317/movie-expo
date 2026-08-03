import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native';

import { AnimatedPressable } from './AnimatedPressable';
import { useThemeColors } from '../../lib/theme/useThemeColors';

// The button sits next to a flex-1 media-type control, so any change in its
// intrinsic width resizes that control too -- picking a longer sort label made
// the whole filter row twitch. Pinning the width keeps the row still.
const SORT_BUTTON_WIDTH = 116;

export function SortButton({
  label,
  onPress,
  compact = false,
}: {
  label: string;
  onPress: () => void;
  // Icon-only, no pinned width: the search screen's filter row grows a
  // fourth "People" segment when a query also matches people, and that plus
  // this button's usual 116px left too little room for the "TV Series"
  // segment label on a narrow phone. Dropping the label here is what buys
  // that room back without shortening the segment label itself.
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  if (compact) {
    return (
      <AnimatedPressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={t('a11y.openSortMenu')}
        accessibilityValue={{ text: label }}
        className="h-9 w-9 items-center justify-center rounded-full border border-glass-border bg-surface-container-low"
      >
        <MaterialIcons name="sort" size={16} color={colors.textSecondary} />
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('a11y.openSortMenu')}
      accessibilityValue={{ text: label }}
      style={{ width: SORT_BUTTON_WIDTH }}
      className="h-9 flex-row items-center gap-1 rounded-full border border-glass-border bg-surface-container-low px-3"
    >
      <MaterialIcons name="sort" size={16} color={colors.textSecondary} />
      <Text
        className="flex-1 font-sans-semibold text-caption text-text-secondary"
        numberOfLines={1}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}
