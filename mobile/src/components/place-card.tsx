import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { formatDistance } from '@/lib/geo';
import type { Place } from '@/lib/places';

const LANGUAGE_NAMES = { en: 'English', es: 'Spanish' } as const;

export function PlaceCard({ place }: { place: Place }) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.header}>
        {place.thumbnailUrl ? (
          <Image source={place.thumbnailUrl} style={styles.thumbnail} contentFit="cover" />
        ) : null}
        <View style={styles.headerText}>
          <ThemedText type="smallBold">{place.title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatDistance(place.distanceMetres)} away
          </ThemedText>
        </View>
      </View>
      {place.summary ? <ThemedText type="small">{place.summary}</ThemedText> : null}
      <View style={styles.sources}>
        {place.sources.map((source) => (
          <ExternalLink key={source.url} href={source.url}>
            <ThemedText type="linkPrimary">Source: {LANGUAGE_NAMES[source.language]} Wikipedia</ThemedText>
          </ExternalLink>
        ))}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: Spacing.two,
  },
  sources: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: Spacing.three,
  },
});
