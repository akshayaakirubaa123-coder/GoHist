import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { ExternalLink } from '@/components/external-link';
import { PressableScale } from '@/components/motion';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useReadAloud } from '@/hooks/use-read-aloud';
import { useVisits } from '@/hooks/use-visits';
import { articleTitleFromUrl } from '@/lib/article';
import { formatDistance } from '@/lib/geo';
import { languageName, type LanguageCode } from '@/lib/languages';
import { otherShownLanguage, type Place } from '@/lib/places';
import { trackFromSummary } from '@/lib/read-aloud';

export function PlaceCard({ place, language }: { place: Place; language: LanguageCode }) {
  const otherLanguage = otherShownLanguage(place, language);
  const { hasVisited, markVisited } = useVisits();
  const readAloud = useReadAloud();
  const visited = hasVisited(place.id);
  // The first source is the article in the most preferred language.
  const article = place.sources[0];
  const articleTitle = article && articleTitleFromUrl(article.url);
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.header}>
        {place.thumbnailUrl ? (
          <Image source={place.thumbnailUrl} style={styles.thumbnail} contentFit="cover" transition={200} />
        ) : null}
        <View style={styles.headerText}>
          <ThemedText type="smallBold">{place.title}</ThemedText>
          <View style={styles.meta}>
            <ThemedText type="small" themeColor="textSecondary">
              {formatDistance(place.distanceMetres)} away
            </ThemedText>
            {visited ? (
              <Animated.View entering={ZoomIn.springify()}>
                <ThemedText type="small" themeColor="textSecondary">
                  {' · ✓ Visited'}
                </ThemedText>
              </Animated.View>
            ) : null}
          </View>
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
      {articleTitle ? (
        <Link
          href={{
            pathname: '/place',
            params: {
              name: place.title,
              articleLanguage: article.language,
              articleTitle,
              ...(place.wikidataId ? { wikidataId: place.wikidataId } : {}),
            },
          }}
          asChild>
          <PressableScale accessibilityRole="button" scaleTo={0.98}>
            <ThemedView type="backgroundSelected" style={styles.readMore}>
              <ThemedText type="smallBold">Read the full history</ThemedText>
            </ThemedView>
          </PressableScale>
        </Link>
      ) : null}
      <View style={styles.actions}>
        {place.summary ? (
          <PressableScale
            onPress={() =>
              readAloud.play(trackFromSummary(place.title, place.summary!, place.summaryLanguage ?? language))
            }
            accessibilityRole="button">
            <ThemedText type="linkPrimary">▶ Listen</ThemedText>
          </PressableScale>
        ) : null}
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
          <PressableScale onPress={() => markVisited([place])} accessibilityRole="button">
            <ThemedText type="linkPrimary">I&apos;ve been here</ThemedText>
          </PressableScale>
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
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  readMore: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  sources: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: Spacing.three,
  },
});
