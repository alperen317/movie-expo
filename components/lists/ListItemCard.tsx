import { MaterialIcons } from '@expo/vector-icons';
import { View } from 'react-native';

import { MovieCard, type MediaCardItem } from '../home/MovieCard';
import { AnimatedPressable } from '../ui/AnimatedPressable';

interface ListItemCardProps {
  item: MediaCardItem;
  index?: number;
  onRemove: () => void;
}

export function ListItemCard({ item, index, onRemove }: ListItemCardProps) {
  return (
    <View style={{ position: 'relative' }}>
      <MovieCard item={item} index={index} />
      <AnimatedPressable
        onPress={onRemove}
        className="absolute bottom-2 right-2 h-8 w-8 items-center justify-center rounded-full border border-glass-border bg-background-blur"
      >
        <MaterialIcons name="delete-outline" size={16} color="#ffb4ab" />
      </AnimatedPressable>
    </View>
  );
}
