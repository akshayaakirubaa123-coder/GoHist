import { ScrollView, StyleSheet } from 'react-native';

import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export default function SourcesScreen() {
  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="small">
          Every place in GoHist links to the article it came from, so you can check the facts and
          their references yourself. We don&apos;t write or generate any facts.
        </ThemedText>

        <ThemedText type="smallBold">Wikipedia</ThemedText>
        <ThemedText type="small">
          Place names, summaries, images and the full article text on each place&apos;s page come
          from Wikipedia articles in your chosen language, English and Spanish, used under the
          Creative Commons Attribution-ShareAlike 4.0 licence. The text is shown as its editors
          wrote it; only reference lists and links are left out.
        </ThemedText>
        <ExternalLink href="https://creativecommons.org/licenses/by-sa/4.0/">
          <ThemedText type="linkPrimary">CC BY-SA 4.0 licence</ThemedText>
        </ExternalLink>

        <ThemedText type="smallBold">Wikidata</ThemedText>
        <ThemedText type="small">
          Used to recognise when articles in different languages describe the same place, and to
          show a place&apos;s name and short description in your language when Wikipedia has no
          article in it. A place&apos;s key facts (when it was built, its architect, style, heritage
          status and key events) come from Wikidata too. Wikidata is released into the public domain (CC0).
        </ThemedText>

        <ThemedText type="smallBold">Wikimedia Commons</ThemedText>
        <ThemedText type="small">
          The old and recent photos on &quot;Then and now&quot; come from Wikimedia Commons, which
          records where many photos were taken. Each photo shows its author and licence and links to
          its page on Commons. A photo&apos;s year is the date its uploader recorded.
        </ThemedText>

        <ThemedText type="smallBold">Translations</ThemedText>
        <ThemedText type="small">
          When a place has no article in your language, your phone translates the original summary
          with Google ML Kit, without sending it to a server. Translated cards are labelled, and
          their source link always opens the original article.
        </ThemedText>

        <ThemedText type="smallBold">Maps</ThemedText>
        <ThemedText type="small">
          The street map comes from OpenStreetMap, a map made by volunteers. Satellite pictures come
          from Esri. The map itself is drawn with Leaflet, an open-source map library.
        </ThemedText>
        <ExternalLink href="https://www.openstreetmap.org/copyright">
          <ThemedText type="linkPrimary">OpenStreetMap licence</ThemedText>
        </ExternalLink>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
});
