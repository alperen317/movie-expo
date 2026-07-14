import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MediaRow } from '../../../components/home/MediaRow';
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { getProfileUrl } from '../../../lib/tmdb/config';
import { PersonDetails, toPersonDetails } from '../../../lib/tmdb/details';
import { getPersonDetails } from '../../../lib/tmdb/person';

function formatDate(dateString: string | null): string | null {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function ActorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  const [person, setPerson] = useState<PersonDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const data = toPersonDetails(await getPersonDetails(Number(id)));
        if (!cancelled) setPerson(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load actor.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const profileUri = getProfileUrl(person?.profilePath ?? null, 'h632');
  const heroHeight = windowHeight * 0.55;
  const birthDate = formatDate(person?.birthday ?? null);
  const deathDate = formatDate(person?.deathday ?? null);

  return (
    <View className="flex-1 bg-background">
      {profileUri && (
        <>
          <Image
            source={{ uri: profileUri }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: heroHeight }}
            contentFit="cover"
          />
          <LinearGradient
            colors={['rgba(19,19,19,0.85)', 'transparent']}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: heroHeight * 0.6 }}
          />
          <LinearGradient
            colors={['transparent', 'rgba(19,19,19,0.9)', '#131313']}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: heroHeight * 0.25,
              height: heroHeight * 0.75,
            }}
          />
        </>
      )}

      <View
        style={{ paddingTop: insets.top + 12 }}
        className="absolute left-0 right-0 top-0 z-10 flex-row items-center justify-between px-margin-mobile"
      >
        <AnimatedPressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full border border-glass-border bg-background-blur"
        >
          <MaterialIcons name="arrow-back" size={22} color="#FFFFFF" />
        </AnimatedPressable>
        <View className="h-10 w-10" />
      </View>

      {isLoading && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#ffffff" />
        </View>
      )}

      {error && !isLoading && (
        <View className="flex-1 items-center justify-center px-margin-mobile">
          <Text className="text-center font-sans text-body-md text-text-primary">{error}</Text>
        </View>
      )}

      {person && !isLoading && !error && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: heroHeight * 0.75, paddingBottom: 64 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="gap-stack-lg px-margin-mobile">
            <View className="gap-stack-sm">
              <Text className="text-display-xl-mobile text-text-primary">{person.name}</Text>
              {person.knownForDepartment && (
                <Text className="font-sans-semibold text-title-md text-primary-container">
                  {person.knownForDepartment}
                </Text>
              )}
            </View>

            <BlurView intensity={30} tint="dark" style={{ borderRadius: 24, overflow: 'hidden' }}>
              <View className="gap-stack-md border border-glass-border bg-background-blur p-stack-md">
                <Text className="border-b border-glass-border pb-2 font-sans-semibold text-title-md text-text-primary">
                  Biography
                </Text>
                <Text className="font-sans text-body-md leading-relaxed text-on-surface-variant">
                  {person.biography || 'No biography available.'}
                </Text>
                {(birthDate || person.placeOfBirth) && (
                  <View className="flex-row flex-wrap gap-2">
                    {birthDate && (
                      <View className="rounded-full border border-glass-border bg-surface-container px-3 py-1">
                        <Text className="font-sans text-caption text-text-primary">
                          {deathDate ? `${birthDate} – ${deathDate}` : `Born: ${birthDate}`}
                        </Text>
                      </View>
                    )}
                    {person.placeOfBirth && (
                      <View className="rounded-full border border-glass-border bg-surface-container px-3 py-1">
                        <Text className="font-sans text-caption text-text-primary">
                          {person.placeOfBirth}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </BlurView>
          </View>

          {person.knownFor.length > 0 && (
            <MediaRow
              title="Known For"
              items={person.knownFor.slice(0, 12)}
              onViewAll={() =>
                router.push({
                  pathname: '/list/[source]',
                  params: {
                    source: 'person-credits',
                    personId: String(person.id),
                    title: person.name,
                  },
                })
              }
            />
          )}
        </ScrollView>
      )}
    </View>
  );
}
