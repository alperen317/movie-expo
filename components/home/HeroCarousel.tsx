import { useCallback, useEffect, useRef } from 'react';
import { useWindowDimensions, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { HeroSection } from './HeroSection';
import type { TMDBMovie } from '../../lib/tmdb/types';

const AUTOPLAY_INTERVAL = 5000;

function Dot({
  index,
  scrollX,
  width,
}: {
  index: number;
  scrollX: SharedValue<number>;
  width: number;
}) {
  const style = useAnimatedStyle(() => {
    const input = [(index - 1) * width, index * width, (index + 1) * width];
    return {
      width: interpolate(scrollX.value, input, [6, 20, 6], Extrapolation.CLAMP),
      opacity: interpolate(scrollX.value, input, [0.4, 1, 0.4], Extrapolation.CLAMP),
    };
  });
  return (
    <Animated.View style={[{ height: 6, borderRadius: 3, backgroundColor: '#f5c451' }, style]} />
  );
}

export function HeroCarousel({ movies }: { movies: TMDBMovie[] }) {
  const { width } = useWindowDimensions();
  const listRef = useAnimatedRef<Animated.FlatList<TMDBMovie>>();
  const scrollX = useSharedValue(0);
  const activeIndex = useRef(0);
  const autoplayTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });

  const goTo = useCallback(
    (index: number) => {
      scrollTo(listRef, index * width, 0, true);
    },
    [listRef, width],
  );

  const startAutoplay = useCallback(() => {
    if (autoplayTimer.current) clearInterval(autoplayTimer.current);
    if (movies.length <= 1) return;
    autoplayTimer.current = setInterval(() => {
      activeIndex.current = (activeIndex.current + 1) % movies.length;
      goTo(activeIndex.current);
    }, AUTOPLAY_INTERVAL);
  }, [movies.length, goTo]);

  useEffect(() => {
    startAutoplay();
    return () => {
      if (autoplayTimer.current) clearInterval(autoplayTimer.current);
    };
  }, [startAutoplay]);

  const onMomentumScrollEnd = useCallback(
    (event: { nativeEvent: { contentOffset: { x: number } } }) => {
      activeIndex.current = Math.round(event.nativeEvent.contentOffset.x / width);
    },
    [width],
  );

  if (movies.length === 0) return null;

  return (
    <View>
      <Animated.FlatList
        ref={listRef}
        data={movies}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => String(item.id)}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onScrollBeginDrag={startAutoplay}
        onMomentumScrollEnd={onMomentumScrollEnd}
        renderItem={({ item }) => <HeroSection movie={item} width={width} />}
      />
      {movies.length > 1 && (
        <View
          style={{
            position: 'absolute',
            top: 16,
            left: 0,
            right: 0,
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          {movies.map((movie, index) => (
            <Dot key={movie.id} index={index} scrollX={scrollX} width={width} />
          ))}
        </View>
      )}
    </View>
  );
}
