import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { MovieCard, type MediaCardItem } from '../home/MovieCard';
import { AnimatedPressable } from '../ui/AnimatedPressable';
import { useThemeColors } from '../../lib/theme/useThemeColors';

interface ListItemCardProps {
  item: MediaCardItem;
  index?: number;
  onRemove: () => void;
}

export function ListItemCard({ item, index, onRemove }: ListItemCardProps) {
  const colors = useThemeColors();
  const { t } = useTranslation();
  return (
    <View style={{ position: 'relative' }}>
      <MovieCard item={item} index={index} />
      <AnimatedPressable
        onPress={onRemove}
        accessibilityRole="button"
        accessibilityLabel={t('a11y.removeFromList', { title: item.title })}
        className="absolute bottom-2 right-2 h-8 w-8 items-center justify-center rounded-full border border-glass-border bg-background-blur"
      >
        <MaterialIcons name="delete-outline" size={16} color={colors.error} />
      </AnimatedPressable>
    </View>
  );
}
