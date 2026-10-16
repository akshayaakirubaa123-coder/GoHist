import { Image } from 'expo-image';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useVisits } from '@/hooks/use-visits';

/** Your history passport: every historic place you've been to, newest first. */
export default function PassportScreen() {
  const { visits, removeVisit } = useVisits();

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={visits}
        keyExtractor={(visit) => visit.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <ThemedText type="subtitle">{visits.length}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {visits.length === 1 ? 'historic place visited' : 'historic places visited'}. A place is
              added when you open GoHist within 100 m of it, or tap &quot;I&apos;ve been here&quot; on
              its card. Your log stays on this phone.
            </ThemedText>
          </View>
        }
        renderItem={({ item }) => (
          <ThemedView type="backgroundElement" style={styles.row}>
            {item.thumbnailUrl ? (
              <Image source={item.thumbnailUrl} style={styles.thumbnail} contentFit="cover" />
            ) : null}
            <View style={styles.rowText}>
              <ThemedText type="smallBold">{item.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {new Date(item.visitedAt).toLocaleDateString(undefined, {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </ThemedText>
              <View style={styles.actions}>
                {item.sourceUrl ? (
                  <ExternalLink href={item.sourceUrl}>
                    <ThemedText type="linkPrimary">Source</ThemedText>
                  </ExternalLink>
                ) : null}
                <Pressable onPress={() => removeVisit(item.id)} accessibilityRole="button">
                  <ThemedText type="link" themeColor="textSecondary">
                    Remove
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          </ThemedView>
        )}
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
  header: {
    marginBottom: Spacing.two,
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
  actions: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
});
