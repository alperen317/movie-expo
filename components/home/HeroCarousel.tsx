import { Dimensions, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { getBackdropUrl } from '../../lib/tmdb/config';
import type { TMDBMovie } from '../../lib/tmdb/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAROUSEL_HEIGHT = 480;

interface HeroCarouselProps {
  movies: TMDBMovie[];
}

export function HeroCarousel({ movies }: HeroCarouselProps) {
  const scrollX = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });

  return (
    <View style={{ height: CAROUSEL_HEIGHT }}>
      <Animated.FlatList
        data={movies}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => String(item.id)}
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => <HeroSlide movie={item} />}
      />
      <HeroDots count={movies.length} scrollX={scrollX} />
    </View>
  );
}

function HeroSlide({ movie }: { movie: TMDBMovie }) {
  const uri = getBackdropUrl(movie.backdrop_path, 'w1280');
  return (
    <View style={{ width: SCREEN_WIDTH, height: CAROUSEL_HEIGHT }}>
      <Image
        source={uri ? { uri } : undefined}
        style={{ width: '100%', height: '100%' }}
        contentFit="cover"
        transition={200}
      />
      <View className="absolute bottom-0 left-0 right-0 bg-black/60 p-4">
        <Text className="text-xl font-sans-bold text-white" numberOfLines={1}>
          {movie.title}
        </Text>
        <Text className="mt-1 text-sm font-sans text-white/80" numberOfLines={2}>
          {movie.overview}
        </Text>
      </View>
    </View>
  );
}

function HeroDots({ count, scrollX }: { count: number; scrollX: SharedValue<number> }) {
  return (
    <View className="absolute bottom-2 w-full flex-row justify-center gap-1.5">
      {Array.from({ length: count }).map((_, index) => (
        <Dot key={index} index={index} scrollX={scrollX} />
      ))}
    </View>
  );
}

function Dot({ index, scrollX }: { index: number; scrollX: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const active = Math.round(scrollX.value / SCREEN_WIDTH) === index;
    return {
      opacity: withTiming(active ? 1 : 0.4),
      width: withTiming(active ? 16 : 6),
    };
  });
  return <Animated.View className="h-1.5 rounded-full bg-white" style={style} />;
}
