import * as Location from 'expo-location';
import { Link } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { PlaceCard } from '@/components/place-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { formatDistance, type Coordinates } from '@/lib/geo';
import type { Place } from '@/lib/places';
import { fetchNearbyPlaces } from '@/lib/wikipedia';

const RADIUS_OPTIONS = [500, 2000, 10000];

type ScreenState =
  | { kind: 'loading' }
  | { kind: 'permission-denied' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; places: Place[] };

export default function NearbyScreen() {
  const [radius, setRadius] = useState(2000);
  const [state, setState] = useState<ScreenState>({ kind: 'loading' });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      // Ask for "while using the app" location access. The app never tracks
      // location in the background.
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setState({ kind: 'permission-denied' });
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const here: Coordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setState({ kind: 'ready', places: await fetchNearbyPlaces(here, radius) });
    } catch (error) {
      setState({ kind: 'error', message: error instanceof Error ? error.message : String(error) });
    }
  }, [radius]);

  useEffect(() => {
    setState({ kind: 'loading' });
    load();
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.radiusRow}>
        {RADIUS_OPTIONS.map((option) => (
          <Pressable key={option} onPress={() => setRadius(option)} accessibilityRole="button">
            <ThemedView
              type={option === radius ? 'backgroundSelected' : 'backgroundElement'}
              style={styles.radiusChip}>
              <ThemedText type={option === radius ? 'smallBold' : 'small'}>
                {formatDistance(option)}
              </ThemedText>
            </ThemedView>
          </Pressable>
        ))}
      </View>

      {state.kind === 'loading' && <ActivityIndicator style={styles.centered} />}

      {state.kind === 'permission-denied' && (
        <Message text="GoHist needs your location to find history near you. You can allow it in your phone's settings." />
      )}

      {state.kind === 'error' && <Message text={`Couldn't load nearby places: ${state.message}`} />}

      {state.kind === 'ready' && (
        <FlatList
          data={state.places}
          keyExtractor={(place) => place.id}
          renderItem={({ item }) => <PlaceCard place={item} />}
          contentContainerStyle={styles.list}
          refreshing={refreshing}
          onRefresh={refresh}
          ListEmptyComponent={<Message text="No documented places within this distance. Try a wider radius." />}
          ListFooterComponent={
            <Link href="/sources" style={styles.footer}>
              <ThemedText type="linkPrimary">About our sources</ThemedText>
            </Link>
          }
        />
      )}
    </ThemedView>
  );
}

function Message({ text }: { text: string }) {
  return (
    <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
      {text}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  radiusRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.three,
  },
  radiusChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.four,
  },
  list: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.five,
  },
  centered: {
    marginTop: Spacing.six,
  },
  message: {
    padding: Spacing.three,
    textAlign: 'center',
  },
  footer: {
    alignSelf: 'center',
    marginTop: Spacing.two,
  },
});
