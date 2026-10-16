import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useLanguage } from '@/hooks/use-language';
import { fetchArticle, translateArticle, type Article } from '@/lib/article';
import { fetchFacts, type Fact } from '@/lib/facts';
import { languageName } from '@/lib/languages';
import { translateOnDevice } from '@/lib/translate';

type Params = {
  /** Display name, shown while the article loads. */
  name: string;
  /** Language of the Wikipedia article to read. */
  articleLanguage: string;
  /** Title of that article. */
  articleTitle: string;
  wikidataId?: string;
};

type ArticleState = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready'; article: Article };

/** Everything Wikipedia and Wikidata say about one place, section by section. */
export default function PlaceScreen() {
  const { name, articleLanguage, articleTitle, wikidataId } = useLocalSearchParams<Params>();
  const { language } = useLanguage();
  const [articleState, setArticleState] = useState<ArticleState>({ kind: 'loading' });
  const [facts, setFacts] = useState<Fact[]>([]);

  useEffect(() => {
    let current = true;
    setArticleState({ kind: 'loading' });
    fetchArticle(articleLanguage, articleTitle)
      .then((article) => {
        if (!current) return;
        setArticleState({ kind: 'ready', article });
        // Show the original straight away, then swap in a translation if the phone can make one.
        translateArticle(article, language, translateOnDevice).then((translated) => {
          if (current && translated) setArticleState({ kind: 'ready', article: translated });
        });
      })
      .catch((error) => {
        if (current) setArticleState({ kind: 'error', message: error instanceof Error ? error.message : String(error) });
      });
    return () => {
      current = false;
    };
  }, [articleLanguage, articleTitle, language]);

  useEffect(() => {
    let current = true;
    setFacts([]);
    if (wikidataId) {
      // Key facts are extra; the article is still worth reading without them.
      fetchFacts(wikidataId, language)
        .then((result) => current && setFacts(result))
        .catch(() => {});
    }
    return () => {
      current = false;
    };
  }, [wikidataId, language]);

  const article = articleState.kind === 'ready' ? articleState.article : undefined;
  const shownLanguage = article && !article.translatedFrom ? article.language : language;

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: name }} />
      <ScrollView contentContainerStyle={styles.content}>
        {article?.imageUrl ? (
          <Image source={article.imageUrl} style={styles.image} contentFit="cover" transition={250} />
        ) : null}
        <ThemedText type="subtitle" style={styles.title}>
          {name}
        </ThemedText>

        {facts.length > 0 && (
          <Animated.View entering={FadeInDown.duration(260)}>
            <ThemedView type="backgroundElement" style={styles.facts}>
              <ThemedText type="smallBold">Key facts</ThemedText>
              {facts.map((fact) => (
                <View key={fact.label} style={styles.fact}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.factLabel}>
                    {fact.label}
                  </ThemedText>
                  {fact.url ? (
                    <ExternalLink href={fact.url} style={styles.factValue}>
                      <ThemedText type="linkPrimary">{fact.values.join(', ')}</ThemedText>
                    </ExternalLink>
                  ) : (
                    <ThemedText type="small" style={styles.factValue}>
                      {fact.values.join(', ')}
                    </ThemedText>
                  )}
                </View>
              ))}
              <ExternalLink href={`https://www.wikidata.org/wiki/${wikidataId}`}>
                <ThemedText type="linkPrimary">Source: Wikidata</ThemedText>
              </ExternalLink>
            </ThemedView>
          </Animated.View>
        )}

        {articleState.kind === 'loading' && <ActivityIndicator style={styles.loading} />}
        {articleState.kind === 'error' && (
          <ThemedText type="small" themeColor="textSecondary">
            Couldn&apos;t load the article: {articleState.message}
          </ThemedText>
        )}

        {article && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.article}>
            {article.translatedFrom ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
                Machine-translated from {languageName(article.translatedFrom)} on your phone. Check the
                source for the original.
              </ThemedText>
            ) : shownLanguage !== language ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
                Shown in {languageName(shownLanguage)} because {languageName(language)} Wikipedia
                doesn&apos;t have it yet.
              </ThemedText>
            ) : null}

            {article.sections.map((section, index) => (
              <View key={index} style={styles.section}>
                {section.heading ? (
                  <ThemedText type={section.level <= 1 ? 'default' : 'smallBold'} style={styles.heading}>
                    {section.heading}
                  </ThemedText>
                ) : null}
                {section.paragraphs.map((paragraph, paragraphIndex) => (
                  <ThemedText key={paragraphIndex} type="small" style={styles.paragraph}>
                    {paragraph}
                  </ThemedText>
                ))}
              </View>
            ))}

            <ThemedView type="backgroundElement" style={styles.credit}>
              <ThemedText type="small" themeColor="textSecondary">
                Text from the {languageName(article.language)} Wikipedia article &quot;{article.title}&quot;,
                written by its editors and shared under CC BY-SA 4.0. Images and references are in the
                original.
              </ThemedText>
              <ExternalLink href={article.url}>
                <ThemedText type="linkPrimary">Source: {languageName(article.language)} Wikipedia</ThemedText>
              </ExternalLink>
            </ThemedView>
          </Animated.View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  article: {
    gap: Spacing.three,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  image: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: Spacing.three,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
  },
  facts: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  fact: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  factLabel: {
    width: 130,
  },
  factValue: {
    flex: 1,
  },
  loading: {
    marginTop: Spacing.four,
  },
  note: {
    fontStyle: 'italic',
  },
  section: {
    gap: Spacing.two,
  },
  heading: {
    fontWeight: 700,
    marginTop: Spacing.two,
  },
  paragraph: {
    lineHeight: 22,
  },
  credit: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
});
