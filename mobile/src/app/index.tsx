import * as Location from 'expo-location';
import { Link } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { HistoryMap } from '@/components/history-map';
import { PlaceCard } from '@/components/place-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { formatDistance, type Coordinates } from '@/lib/geo';
import type { MapState } from '@/lib/map-html';
import type { Place } from '@/lib/places';
import { fetchNearbyPlaces } from '@/lib/wikipedia';

const RADIUS_OPTIONS = [500, 2000, 10000];

type ScreenState =
  | { kind: 'loading' }
  | { kind: 'permission-denied' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; places: Place[] };

type ViewMode = 'map' | 'list';

export default function NearbyScreen() {
  const [radius, setRadius] = useState(2000);
  const [state, setState] = useState<ScreenState>({ kind: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const [here, setHere] = useState<Coordinates>();
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [selectedId, setSelectedId] = useState<string>();

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
      const coordinates: Coordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setHere(coordinates);
      setState({ kind: 'ready', places: await fetchNearbyPlaces(coordinates, radius) });
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

  const places = useMemo(() => (state.kind === 'ready' ? state.places : []), [state]);
  const selectedPlace = places.find((place) => place.id === selectedId);

  // What the map draws. Kept stable between renders so the map only updates when something changed.
  const mapState = useMemo<MapState | undefined>(
    () =>
      here && {
        here,
        radiusMetres: radius,
        places: places.map((place) => ({
          id: place.id,
          title: place.title,
          latitude: place.coordinates.latitude,
          longitude: place.coordinates.longitude,
        })),
        selectedId: selectedPlace?.id,
      },
    [here, radius, places, selectedPlace],
  );

  return (
    <ThemedView style={styles.container}>
      <View style={styles.toolbar}>
        {RADIUS_OPTIONS.map((option) => (
          <Chip
            key={option}
            label={formatDistance(option)}
            selected={option === radius}
            onPress={() => setRadius(option)}
          />
        ))}
        <View style={styles.spacer} />
        <Chip label="Map" selected={viewMode === 'map'} onPress={() => setViewMode('map')} />
        <Chip label="List" selected={viewMode === 'list'} onPress={() => setViewMode('list')} />
      </View>

      {state.kind === 'permission-denied' && (
        <Message text="GoHist needs your location to find history near you. You can allow it in your phone's settings." />
      )}

      {state.kind === 'error' && <Message text={`Couldn't load nearby places: ${state.message}`} />}

      {viewMode === 'map' && mapState && (
        <View style={styles.mapArea}>
          <HistoryMap state={mapState} onSelect={setSelectedId} />
          {state.kind === 'loading' && (
            <ThemedView type="backgroundElement" style={styles.mapBadge}>
              <ActivityIndicator />
              <ThemedText type="small">Finding history nearby…</ThemedText>
            </ThemedView>
          )}
          {state.kind === 'ready' && places.length === 0 && (
            <ThemedView type="backgroundElement" style={styles.mapBadge}>
              <ThemedText type="small">No documented places within this distance. Try a wider radius.</ThemedText>
            </ThemedView>
          )}
          {selectedPlace && (
            <View style={styles.cardSheet}>
              <PlaceCard place={selectedPlace} />
              <Pressable
                onPress={() => setSelectedId(undefined)}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={styles.closeButton}>
                <ThemedView type="backgroundSelected" style={styles.closeCircle}>
                  <ThemedText type="smallBold">✕</ThemedText>
                </ThemedView>
              </Pressable>
            </View>
          )}
        </View>
      )}

      {state.kind === 'loading' && (viewMode === 'list' || !mapState) && (
        <ActivityIndicator style={styles.centered} />
      )}

      {viewMode === 'list' && state.kind === 'ready' && (
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

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }}>
      <ThemedView type={selected ? 'backgroundSelected' : 'backgroundElement'} style={styles.chip}>
        <ThemedText type={selected ? 'smallBold' : 'small'}>{label}</ThemedText>
      </ThemedView>
    </Pressable>
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
  toolbar: {
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.three,
  },
  spacer: {
    flex: 1,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.four,
  },
  mapArea: {
    flex: 1,
  },
  mapBadge: {
    position: 'absolute',
    top: Spacing.three,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.four,
    maxWidth: '80%',
  },
  cardSheet: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    bottom: Spacing.four,
    maxWidth: 560,
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.25)',
    borderRadius: Spacing.three,
  },
  closeButton: {
    position: 'absolute',
    top: -Spacing.three,
    right: -Spacing.two,
  },
  closeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.3)',
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
