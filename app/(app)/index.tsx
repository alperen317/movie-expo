import { useEffect } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HeroCarousel } from '../../components/home/HeroCarousel';
import { useAuthStore } from '../../stores/auth.store';
import { useMovieStore } from '../../stores/movie.store';

export default function HomeScreen() {
  const { trendingMovies, isLoading, error, fetchTrendingMovies } = useMovieStore();
  const signOut = useAuthStore((state) => state.signOut);

  useEffect(() => {
    fetchTrendingMovies();
  }, [fetchTrendingMovies]);

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top']}>
      {/* Temporary: move to the Profile/Settings screen once it exists */}
      <View className="absolute right-4 top-4 z-10">
        <Pressable onPress={signOut} className="rounded-full bg-black/50 px-3 py-1.5">
          <Text className="font-sans text-xs text-white">Çıkış Yap</Text>
        </Pressable>
      </View>

      {isLoading && trendingMovies.length === 0 && (
        <View className="h-[480px] items-center justify-center">
          <ActivityIndicator color="#ffffff" />
        </View>
      )}

      {error && (
        <View className="h-[480px] items-center justify-center px-6">
          <Text className="text-center font-sans text-white">{error}</Text>
        </View>
      )}

      {!isLoading && !error && trendingMovies.length > 0 && (
        <HeroCarousel movies={trendingMovies} />
      )}
    </SafeAreaView>
  );
}
