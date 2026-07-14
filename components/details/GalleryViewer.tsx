import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { FlatList, Modal, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getBackdropUrl } from '../../lib/tmdb/config';
import { AnimatedPressable } from '../ui/AnimatedPressable';

interface GalleryViewerProps {
  backdrops: string[];
}

export function GalleryViewer({ backdrops }: GalleryViewerProps) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  if (backdrops.length === 0) return null;

  return (
    <>
      <View className="gap-stack-sm">
        <Text className="font-sans-semibold text-title-md text-text-primary">Gallery</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-stack-md">
            {backdrops.map((path, index) => {
              const imageUri = getBackdropUrl(path, 'w780');
              if (!imageUri) return null;
              return (
                <AnimatedPressable
                  key={path}
                  onPress={() => setViewerIndex(index)}
                  className="overflow-hidden rounded-lg border border-glass-border"
                  style={{ width: 220, height: 124 }}
                >
                  <Image
                    source={{ uri: imageUri }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                  />
                </AnimatedPressable>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <Modal
        visible={viewerIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerIndex(null)}
      >
        <View style={{ flex: 1, backgroundColor: '#000000' }}>
          {viewerIndex !== null && (
            <FlatList
              data={backdrops}
              horizontal
              pagingEnabled
              initialScrollIndex={viewerIndex}
              getItemLayout={(_, index) => ({
                length: windowWidth,
                offset: windowWidth * index,
                index,
              })}
              keyExtractor={(path) => path}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => {
                const imageUri = getBackdropUrl(item, 'original');
                return (
                  <View
                    style={{ width: windowWidth, height: windowHeight, justifyContent: 'center' }}
                  >
                    {imageUri && (
                      <Animated.View entering={ZoomIn.duration(250)}>
                        <Image
                          source={{ uri: imageUri }}
                          style={{ width: windowWidth, height: (windowWidth * 9) / 16 }}
                          contentFit="contain"
                        />
                      </Animated.View>
                    )}
                  </View>
                );
              }}
            />
          )}

          {/* Rendered after the FlatList so it stays tappable — on iOS a
              full-bleed scroll view sibling can otherwise take touches meant
              for a control painted "above" it only in JS z-index terms. */}
          <View
            style={{ paddingTop: insets.top, marginTop: 12 }}
            className="absolute right-4 top-0 z-10"
          >
            <AnimatedPressable
              onPress={() => setViewerIndex(null)}
              className="h-10 w-10 items-center justify-center rounded-full border border-glass-border bg-background-blur"
            >
              <MaterialIcons name="close" size={24} color="#FFFFFF" />
            </AnimatedPressable>
          </View>
        </View>
      </Modal>
    </>
  );
}
