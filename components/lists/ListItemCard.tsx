import { MaterialIcons } from '@expo/vector-icons';
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
  return (
    <View style={{ position: 'relative' }}>
      <MovieCard item={item} index={index} />
      <AnimatedPressable
        onPress={onRemove}
        className="absolute bottom-2 right-2 h-8 w-8 items-center justify-center rounded-full border border-glass-border bg-background-blur"
      >
        <MaterialIcons name="delete-outline" size={16} color={colors.error} />
      </AnimatedPressable>
    </View>
  );
}
