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
          Place names, summaries and images come from Wikipedia articles in your chosen language,
          English and Spanish, used under the Creative Commons Attribution-ShareAlike 4.0 licence.
        </ThemedText>
        <ExternalLink href="https://creativecommons.org/licenses/by-sa/4.0/">
          <ThemedText type="linkPrimary">CC BY-SA 4.0 licence</ThemedText>
        </ExternalLink>

        <ThemedText type="smallBold">Wikidata</ThemedText>
        <ThemedText type="small">
          Used to recognise when articles in different languages describe the same place, and to
          show a place&apos;s name and short description in your language when Wikipedia has no
          article in it. Wikidata is released into the public domain (CC0).
        </ThemedText>

        <ThemedText type="smallBold">Translations</ThemedText>
        <ThemedText type="small">
          When a place has no article in your language, your phone translates the original summary
          with Google ML Kit, without sending it to a server. Translated cards are labelled, and
          their source link always opens the original article.
        </ThemedText>
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
