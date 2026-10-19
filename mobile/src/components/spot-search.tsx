import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { usePlaceSearch } from '@/hooks/use-place-search';
import { useTheme } from '@/hooks/use-theme';
import type { LanguageCode } from '@/lib/languages';
import type { PlaceSearchResult } from '@/lib/place-search';

// Enough to choose from without covering the whole map.
const MAX_RESULTS = 6;

/** A search box for jumping the map to a town, city or landmark by name. */
export function SpotSearch({
  language,
  onChoose,
}: {
  language: LanguageCode;
  onChoose: (result: PlaceSearchResult) => void;
}) {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const { results, searching, error, noMatches } = usePlaceSearch(query, language);
  const open = query.trim().length >= 2;

  const choose = (result: PlaceSearchResult) => {
    Keyboard.dismiss();
    setQuery('');
    onChoose(result);
  };

  return (
    <View style={styles.wrapper}>
      <View style={[styles.field, { backgroundColor: theme.backgroundElement }]}>
        <TextInput
          style={[styles.input, { color: theme.text }]}
          value={query}
          onChangeText={setQuery}
          placeholder="Search a city, town or landmark"
          placeholderTextColor={theme.textSecondary}
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={() => results[0] && choose(results[0])}
          accessibilityLabel="Search for a place to explore"
        />
        {searching ? <ActivityIndicator /> : null}
        {query ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery('')} hitSlop={8}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              ✕
            </ThemedText>
          </Pressable>
        ) : null}
      </View>

      {open && (results.length > 0 || error || noMatches) ? (
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(120)}
          style={[styles.dropdown, { backgroundColor: theme.background }]}>
          <ScrollView keyboardShouldPersistTaps="handled">
            {error ? <Note text={error} /> : null}
            {noMatches ? <Note text={`No places with a location matched "${query.trim()}".`} /> : null}
            {results.slice(0, MAX_RESULTS).map((result) => (
              <Pressable
                key={result.id}
                accessibilityRole="button"
                onPress={() => choose(result)}
                style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.backgroundSelected }]}>
                {result.thumbnailUrl ? (
                  <Image source={result.thumbnailUrl} style={styles.thumbnail} contentFit="cover" />
                ) : (
                  <View style={[styles.thumbnail, { backgroundColor: theme.backgroundElement }]} />
                )}
                <View style={styles.rowText}>
                  <ThemedText type="smallBold" numberOfLines={1}>
                    {result.title}
                  </ThemedText>
                  {result.description ? (
                    <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                      {result.description}
                    </ThemedText>
                  ) : null}
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </Animated.View>
      ) : null}
    </View>
  );
}

function Note({ text }: { text: string }) {
  return (
    <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
      {text}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  // Sits above the map so the results can drop down over it.
  wrapper: {
    zIndex: 10,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: Spacing.one,
    maxHeight: 360,
    borderRadius: Spacing.three,
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.25)',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  thumbnail: {
    width: 40,
    height: 40,
    borderRadius: Spacing.two,
  },
  rowText: {
    flex: 1,
  },
  note: {
    padding: Spacing.three,
  },
});
