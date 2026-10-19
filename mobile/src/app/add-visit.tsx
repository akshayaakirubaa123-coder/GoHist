import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { PressableScale } from '@/components/motion';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useLanguage } from '@/hooks/use-language';
import { usePlaceSearch } from '@/hooks/use-place-search';
import { useTheme } from '@/hooks/use-theme';
import { useVisits } from '@/hooks/use-visits';
import {
  dateFrom,
  stepDate,
  toLocalNoon,
  visitFromSearchResult,
  type PlaceSearchResult,
  type VisitDate,
} from '@/lib/place-search';

/** Add a place you've been to before: search for it by name, then say when you went. */
export default function AddVisitScreen() {
  const { language } = useLanguage();
  const { hasVisited, addVisit } = useVisits();
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const { results, searching, error, noMatches } = usePlaceSearch(query, language);
  const [chosen, setChosen] = useState<PlaceSearchResult>();
  const today = dateFrom(new Date());
  const [date, setDate] = useState<VisitDate>(today);


  const save = () => {
    if (!chosen) return;
    addVisit(visitFromSearchResult(chosen, toLocalNoon(date)));
    router.back();
  };

  if (chosen) {
    const step = (part: keyof VisitDate, by: number) => setDate((current) => stepDate(current, part, by, today));
    return (
      <ThemedView style={[styles.container, styles.content]}>
        <ResultRow result={chosen} />
        <ThemedText type="smallBold">When were you there?</ThemedText>
        <View style={styles.dateParts}>
          <Stepper label={String(date.day)} onStep={(by) => step('day', by)} name="day" />
          <Stepper
            label={toLocalNoon(date).toLocaleDateString(undefined, { month: 'long' })}
            onStep={(by) => step('month', by)}
            name="month"
          />
          <Stepper label={String(date.year)} onStep={(by) => step('year', by)} name="year" />
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          Not sure of the exact day? A rough date is fine.
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          onPress={save}
          style={[styles.button, { backgroundColor: theme.text }]}>
          <ThemedText type="smallBold" style={{ color: theme.background }}>
            Add to my passport
          </ThemedText>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => setChosen(undefined)} style={styles.centred}>
          <ThemedText type="link" themeColor="textSecondary">
            Pick a different place
          </ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={results}
        keyExtractor={(result) => result.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
              value={query}
              onChangeText={setQuery}
              placeholder="Search for a landmark, town or city"
              placeholderTextColor={theme.textSecondary}
              autoFocus
              autoCorrect={false}
              returnKeyType="search"
              accessibilityLabel="Search for a place"
            />
            {searching ? <ActivityIndicator /> : null}
            {error ? <ThemedText type="small">{error}</ThemedText> : null}
            {noMatches ? (
              <ThemedText type="small" themeColor="textSecondary">
                No places with a location matched &quot;{query.trim()}&quot;.
              </ThemedText>
            ) : null}
          </View>
        }
        renderItem={({ item }) => {
          const visited = hasVisited(item.id);
          return (
            <PressableScale
              accessibilityRole="button"
              accessibilityState={{ disabled: visited }}
              disabled={visited}
              onPress={() => setChosen(item)}>
              <ResultRow result={item} note={visited ? 'Already in your passport' : undefined} />
            </PressableScale>
          );
        }}
      />
    </ThemedView>
  );
}

function ResultRow({ result, note }: { result: PlaceSearchResult; note?: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
      {result.thumbnailUrl ? (
        <Image source={result.thumbnailUrl} style={styles.thumbnail} contentFit="cover" transition={200} />
      ) : (
        <View style={[styles.thumbnail, { backgroundColor: theme.backgroundSelected }]} />
      )}
      <View style={styles.rowText}>
        <ThemedText type="smallBold">{result.title}</ThemedText>
        {result.description ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
            {result.description}
          </ThemedText>
        ) : null}
        {note ? (
          <ThemedText type="small" themeColor="textSecondary">
            {note}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

function Stepper({ label, name, onStep }: { label: string; name: string; onStep: (by: number) => void }) {
  const theme = useTheme();
  return (
    <View style={[styles.stepper, { backgroundColor: theme.backgroundElement }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Earlier ${name}`} onPress={() => onStep(-1)} hitSlop={8}>
        <ThemedText type="smallBold">‹</ThemedText>
      </Pressable>
      <ThemedText type="small" style={styles.stepperLabel} numberOfLines={1}>
        {label}
      </ThemedText>
      <Pressable accessibilityRole="button" accessibilityLabel={`Later ${name}`} onPress={() => onStep(1)} hitSlop={8}>
        <ThemedText type="smallBold">›</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    gap: Spacing.two,
    padding: Spacing.three,
  },
  header: {
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  input: {
    fontSize: 16,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    borderRadius: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: Spacing.two,
  },
  rowText: {
    flex: 1,
  },
  dateParts: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  stepper: {
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    minHeight: 44,
    borderRadius: Spacing.three,
  },
  stepperLabel: {
    textAlign: 'center',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderRadius: Spacing.three,
    marginTop: Spacing.two,
  },
  centred: {
    alignItems: 'center',
  },
});
