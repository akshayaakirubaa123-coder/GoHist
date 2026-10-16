import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useVisits } from '@/hooks/use-visits';
import { formatDistance } from '@/lib/geo';
import { languageName, type LanguageCode } from '@/lib/languages';
import { otherShownLanguage, type Place } from '@/lib/places';

export function PlaceCard({ place, language }: { place: Place; language: LanguageCode }) {
  const otherLanguage = otherShownLanguage(place, language);
  const { hasVisited, markVisited } = useVisits();
  const visited = hasVisited(place.id);
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.header}>
        {place.thumbnailUrl ? (
          <Image source={place.thumbnailUrl} style={styles.thumbnail} contentFit="cover" />
        ) : null}
        <View style={styles.headerText}>
          <ThemedText type="smallBold">{place.title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatDistance(place.distanceMetres)} away{visited ? ' · ✓ Visited' : ''}
          </ThemedText>
        </View>
      </View>
      {place.summary ? <ThemedText type="small">{place.summary}</ThemedText> : null}
      {place.translatedFrom ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.languageNote}>
          Machine-translated from {languageName(place.translatedFrom)} on your phone. Check the
          source for the original.
        </ThemedText>
      ) : null}
      {otherLanguage ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.languageNote}>
          Shown in {languageName(otherLanguage)} because {languageName(language)} Wikipedia doesn&apos;t have it yet.
        </ThemedText>
      ) : null}
      <View style={styles.actions}>
        <Link
          href={{
            pathname: '/then-and-now',
            params: {
              title: place.title,
              lat: String(place.coordinates.latitude),
              lon: String(place.coordinates.longitude),
              ...(place.thumbnailUrl ? { thumbnail: place.thumbnailUrl } : {}),
            },
          }}>
          <ThemedText type="linkPrimary">Then and now</ThemedText>
        </Link>
        {visited ? null : (
          <Pressable onPress={() => markVisited([place])} accessibilityRole="button">
            <ThemedText type="linkPrimary">I&apos;ve been here</ThemedText>
          </Pressable>
        )}
      </View>
      <View style={styles.sources}>
        {place.sources.map((source) => (
          <ExternalLink key={source.url} href={source.url}>
            <ThemedText type="linkPrimary">Source: {languageName(source.language)} Wikipedia</ThemedText>
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
  languageNote: {
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: Spacing.three,
  },
  sources: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: Spacing.three,
  },
});
