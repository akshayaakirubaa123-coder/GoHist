import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { fetchNearbyPhotos, pickThenAndNow, THEN_CUTOFF_YEAR, type CommonsPhoto, type ThenAndNow } from '@/lib/commons';

type ScreenState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; photos: ThenAndNow };

/** Old photos of a place next to a recent one, from Wikimedia Commons. */
export default function ThenAndNowScreen() {
  const params = useLocalSearchParams<{ title: string; lat: string; lon: string; thumbnail?: string }>();
  const [state, setState] = useState<ScreenState>({ kind: 'loading' });
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const location = { latitude: Number(params.lat), longitude: Number(params.lon) };
    fetchNearbyPhotos(location)
      .then((photos) => setState({ kind: 'ready', photos: pickThenAndNow(photos) }))
      .catch((error) =>
        setState({ kind: 'error', message: error instanceof Error ? error.message : String(error) }),
      );
  }, [params.lat, params.lon]);

  const header = <Stack.Screen options={{ title: params.title ?? 'Then and now' }} />;

  if (state.kind === 'loading') {
    return (
      <ThemedView style={styles.container}>
        {header}
        <ActivityIndicator style={styles.centered} />
      </ThemedView>
    );
  }
  if (state.kind === 'error') {
    return (
      <ThemedView style={styles.container}>
        {header}
        <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
          Couldn&apos;t load photos: {state.message}. Old photos need an internet connection.
        </ThemedText>
      </ThemedView>
    );
  }

  const { then, now } = state.photos;
  const old = then[shown];
  return (
    <ThemedView style={styles.container}>
      {header}
      <ScrollView contentContainerStyle={styles.content}>
        {old ? (
          <>
            <PhotoPanel label={`Then · ${old.year}`} photo={old} />
            {then.length > 1 ? (
              <FlatList
                horizontal
                data={then}
                keyExtractor={(photo) => photo.pageUrl}
                contentContainerStyle={styles.strip}
                renderItem={({ item, index }) => (
                  <Pressable
                    onPress={() => setShown(index)}
                    accessibilityRole="button"
                    accessibilityLabel={`Photo from ${item.year}`}
                    accessibilityState={{ selected: index === shown }}>
                    <Image
                      source={item.imageUrl}
                      style={[styles.stripPhoto, index === shown && styles.stripSelected]}
                      contentFit="cover"
                    />
                    <ThemedText type="small" themeColor="textSecondary" style={styles.stripYear}>
                      {item.year}
                    </ThemedText>
                  </Pressable>
                )}
              />
            ) : null}
          </>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            Wikimedia Commons has no dated photos from {THEN_CUTOFF_YEAR} or earlier taken right here yet.
          </ThemedText>
        )}

        {now ? (
          <PhotoPanel label={`Now · ${now.year}`} photo={now} />
        ) : params.thumbnail ? (
          <View style={styles.panel}>
            <ThemedText type="smallBold">Now</ThemedText>
            <Image source={params.thumbnail} style={styles.photo} contentFit="cover" />
            <ThemedText type="small" themeColor="textSecondary">
              The photo from this place&apos;s Wikipedia article.
            </ThemedText>
          </View>
        ) : null}

        <ThemedText type="small" themeColor="textSecondary">
          Photos taken within 300 m of this place, from Wikimedia Commons. Dates are as recorded by
          whoever uploaded each photo. Tap a credit to see the photo&apos;s page and licence.
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

function PhotoPanel({ label, photo }: { label: string; photo: CommonsPhoto }) {
  const credit = [photo.author, photo.licence].filter(Boolean).join(' · ');
  return (
    <View style={styles.panel}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <Image source={photo.imageUrl} style={styles.photo} contentFit="cover" accessibilityLabel={photo.title} />
      <ThemedText type="small">{photo.title}</ThemedText>
      <ExternalLink href={photo.pageUrl}>
        <ThemedText type="linkPrimary">
          {credit ? `${credit} · ` : ''}Wikimedia Commons
        </ThemedText>
      </ExternalLink>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.four,
  },
  centered: {
    marginTop: Spacing.six,
  },
  message: {
    padding: Spacing.three,
    textAlign: 'center',
  },
  panel: {
    gap: Spacing.one,
  },
  photo: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: Spacing.three,
  },
  strip: {
    gap: Spacing.two,
  },
  stripPhoto: {
    width: 72,
    height: 72,
    borderRadius: Spacing.two,
    opacity: 0.6,
  },
  stripSelected: {
    opacity: 1,
  },
  stripYear: {
    textAlign: 'center',
  },
});
