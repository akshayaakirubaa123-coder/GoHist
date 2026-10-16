import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useLanguage } from '@/hooks/use-language';
import { LANGUAGES } from '@/lib/languages';

export default function LanguageScreen() {
  const { language, setLanguage } = useLanguage();

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={LANGUAGES}
        keyExtractor={(option) => option.code}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <ThemedText type="small" themeColor="textSecondary" style={styles.intro}>
            Place names and summaries are shown in this language when Wikipedia or Wikidata has
            them. If not, your phone translates them and the card says so. Where that isn&apos;t
            possible, you&apos;ll see the original text, labelled with its language.
          </ThemedText>
        }
        renderItem={({ item }) => {
          const selected = item.code === language;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => {
                setLanguage(item.code);
                router.back();
              }}>
              <ThemedView type={selected ? 'backgroundSelected' : 'backgroundElement'} style={styles.row}>
                <ThemedText type={selected ? 'smallBold' : 'small'}>{item.name}</ThemedText>
                {item.nativeName !== item.name ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {item.nativeName}
                  </ThemedText>
                ) : null}
              </ThemedView>
            </Pressable>
          );
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    gap: Spacing.two,
    padding: Spacing.three,
  },
  intro: {
    marginBottom: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
});
