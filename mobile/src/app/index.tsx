import * as Location from 'expo-location';
import { Link, Stack } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, FadeOutDown, LinearTransition, SlideInDown } from 'react-native-reanimated';

import { HistoryMap } from '@/components/history-map';
import { listItemEntering, PressableScale, SPRING, useThemeColorTransition } from '@/components/motion';
import { PlaceCard } from '@/components/place-card';
import { SpotSearch } from '@/components/spot-search';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useLanguage } from '@/hooks/use-language';
import { useSavedAreas } from '@/hooks/use-saved-areas';
import { useVisits } from '@/hooks/use-visits';
import { formatDistance, type Coordinates } from '@/lib/geo';
import { languageName } from '@/lib/languages';
import type { MapState } from '@/lib/map-html';
import type { PlaceSearchResult } from '@/lib/place-search';
import { savedPlacesNear } from '@/lib/offline';
import type { Place } from '@/lib/places';
import { translateOnDevice } from '@/lib/translate';
import { placesYouAreAt } from '@/lib/visits';
import { fetchNearbyPlaces } from '@/lib/wikipedia';

const RADIUS_OPTIONS = [500, 2000, 10000, 25000];

type ScreenState =
  | { kind: 'loading' }
  | { kind: 'permission-denied' }
  | { kind: 'error'; message: string }
  | { kind: 'choose-spot' }
  // `atMyLocation` is false for a picked spot, so those places never count as visited.
  | {
      kind: 'ready';
      places: Place[];
      atMyLocation: boolean;
      offline?: boolean;
    };

type ViewMode = 'map' | 'list';

/** Where to look: around your location, or around a spot you picked on the map or searched for. */
type SearchCentre = 'me' | 'spot';

export default function NearbyScreen() {
  const { language } = useLanguage();
  const [radius, setRadius] = useState(2000);
  const [state, setState] = useState<ScreenState>({ kind: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const [here, setHere] = useState<Coordinates>();
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [selectedId, setSelectedId] = useState<string>();
  const [searchCentre, setSearchCentre] = useState<SearchCentre>('me');
  const [spot, setSpot] = useState<Coordinates>();
  // The name of a searched-for spot, shown on the map until the spot is moved by hand.
  const [spotName, setSpotName] = useState<string>();
  // Counts loads, so a slow translation from an earlier load can't overwrite a newer list.
  const loadCount = useRef(0);
  const { markVisited } = useVisits();
  // Downloaded cities, used when there's no internet. A ref so downloading one doesn't reload this screen.
  const { areas } = useSavedAreas();
  const savedAreas = useRef(areas);
  savedAreas.current = areas;

  const load = useCallback(async () => {
    const thisLoad = ++loadCount.current;
    const atMyLocation = searchCentre === 'me';
    try {
      let coordinates: Coordinates;
      if (!atMyLocation) {
        setHere(spot);
        if (!spot) {
          setState({ kind: 'choose-spot' });
          return;
        }
        coordinates = spot;
      } else {
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
        coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        // A newer load (say, after picking a spot) may have started while we waited for the phone.
        if (thisLoad !== loadCount.current) return;
        setHere(coordinates);
      }
      let places: Place[];
      try {
        places = await fetchNearbyPlaces(coordinates, radius, language, {
          translate: translateOnDevice,
          onTranslated: (translated) => {
            if (thisLoad === loadCount.current) setState({ kind: 'ready', places: translated, atMyLocation });
          },
        });
      } catch (error) {
        // No internet: fall back to a downloaded city, if this spot is in one.
        const saved = savedPlacesNear(savedAreas.current, coordinates, radius);
        if (saved.length === 0) throw error;
        if (thisLoad === loadCount.current) {
          setState({
            kind: 'ready',
            places: saved,
            atMyLocation,
            offline: true,
          });
          // The map needs internet; the list doesn't.
          setViewMode('list');
        }
        return;
      }
      if (thisLoad === loadCount.current) setState({ kind: 'ready', places, atMyLocation });
    } catch (error) {
      if (thisLoad === loadCount.current)
        setState({
          kind: 'error',
          message: error instanceof Error ? error.message : String(error),
        });
    }
  }, [radius, language, searchCentre, spot]);

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

  // Log places you're standing at in your history passport. A picked spot doesn't count: you're not there.
  const atMyLocation = state.kind === 'ready' && state.atMyLocation;
  useEffect(() => {
    if (!atMyLocation) return;
    const here = placesYouAreAt(places);
    if (here.length > 0) markVisited(here);
  }, [places, atMyLocation, markVisited]);
  const selectedPlace = places.find((place) => place.id === selectedId);

  // What the map draws. Kept stable between renders so the map only updates when something changed.
  const picking = searchCentre === 'spot';
  const mapState = useMemo<MapState | undefined>(
    () =>
      here || picking
        ? {
            here,
            picking,
            radiusMetres: radius,
            places: places.map((place) => ({
              id: place.id,
              title: place.title,
              latitude: place.coordinates.latitude,
              longitude: place.coordinates.longitude,
            })),
            selectedId: selectedPlace?.id,
          }
        : undefined,
    [here, picking, radius, places, selectedPlace],
  );

  const chooseSearchCentre = (next: SearchCentre) => {
    if (next === searchCentre) return;
    setSelectedId(undefined);
    if (next === 'spot') {
      // Start the spot where you are, then let you move it. Picking happens on the map.
      setSpot((current) => current ?? here);
      setViewMode('map');
    }
    setSearchCentre(next);
  };

  // A tap on the map closes an open card first; otherwise, when picking, it moves the spot there.
  const onMapTap = (point: Coordinates) => {
    if (selectedId) setSelectedId(undefined);
    else if (picking) {
      setSpot(point);
      setSpotName(undefined);
    }
  };

  // Searching for a place moves the spot there. It's a picked spot, so it never counts as a visit.
  const onSearchChoose = (result: PlaceSearchResult) => {
    setSelectedId(undefined);
    setSpot(result.coordinates);
    setSpotName(result.title);
    setSearchCentre('spot');
    setViewMode('map');
  };

  const mapHint = !picking
    ? undefined
    : spot && spotName
      ? `Exploring around ${spotName}. Tap the map to move your spot`
      : spot
        ? 'Tap the map to move your spot'
      : 'Search above, or tap anywhere on the map to explore there';

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <View style={styles.headerLinks}>
              <Link href="/profile" accessibilityLabel="My profile and history passport">
                <ThemedText type="linkPrimary">Profile</ThemedText>
              </Link>
              <Link href="/offline" accessibilityLabel="Download a city">
                <ThemedText type="linkPrimary">Offline</ThemedText>
              </Link>
              <Link href="/language" accessibilityLabel="Change language">
                <ThemedText type="linkPrimary">{languageName(language)}</ThemedText>
              </Link>
            </View>
          ),
        }}
      />
      <View style={styles.toolbar}>
        <SpotSearch language={language} onChoose={onSearchChoose} />
        <View style={styles.toolbarRow}>
          <Chip label="Near me" selected={!picking} onPress={() => chooseSearchCentre('me')} />
          <Chip label="Pick a spot" selected={picking} onPress={() => chooseSearchCentre('spot')} />
          <View style={styles.spacer} />
          <Chip label="Map" selected={viewMode === 'map'} onPress={() => setViewMode('map')} />
          <Chip label="List" selected={viewMode === 'list'} onPress={() => setViewMode('list')} />
        </View>
        <View style={styles.toolbarRow}>
          {RADIUS_OPTIONS.map((option) => (
            <Chip
              key={option}
              label={formatDistance(option)}
              selected={option === radius}
              onPress={() => setRadius(option)}
            />
          ))}
        </View>
      </View>

      {state.kind === 'permission-denied' && (
        <Message text="GoHist needs your location to find history near you. You can allow it in your phone's settings, or search for a place or tap Pick a spot to explore anywhere on the map." />
      )}

      {state.kind === 'choose-spot' && viewMode === 'list' && (
        <Message text="Search for a place above, or switch to the map and tap a spot to explore around it." />
      )}

      {state.kind === 'ready' && state.offline && (
        <Message text="No internet, so you're seeing your downloaded copy of this area." />
      )}

      {state.kind === 'error' && <Message text={`Couldn't load nearby places: ${state.message}`} />}

      {viewMode === 'map' && mapState && (
        <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(150)} style={styles.mapArea}>
          <HistoryMap state={mapState} onSelect={setSelectedId} onTap={onMapTap} />
          {state.kind === 'loading' && (
            <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.mapBadgeSlot}>
              <ThemedView type="backgroundElement" style={styles.mapBadge}>
                <ActivityIndicator />
                <ThemedText type="small">Finding history nearby…</ThemedText>
              </ThemedView>
            </Animated.View>
          )}
          {mapHint &&
            !selectedPlace &&
            state.kind !== 'loading' &&
            !(state.kind === 'ready' && places.length === 0) && (
              <Animated.View key={mapHint} entering={FadeIn} exiting={FadeOut} style={styles.mapBadgeSlot}>
                <ThemedView type="backgroundElement" style={styles.mapBadge}>
                  <ThemedText type="small">{mapHint}</ThemedText>
                </ThemedView>
              </Animated.View>
            )}
          {state.kind === 'ready' && places.length === 0 && (
            <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.mapBadgeSlot}>
              <ThemedView type="backgroundElement" style={styles.mapBadge}>
                <ThemedText type="small">No documented places within this distance. Try a wider radius.</ThemedText>
              </ThemedView>
            </Animated.View>
          )}
          {selectedPlace && (
            // Keyed by place, so tapping another pin slides the old card away and the new one up.
            <Animated.View
              key={selectedPlace.id}
              entering={SlideInDown.springify().damping(SPRING.damping).stiffness(SPRING.stiffness)}
              exiting={FadeOutDown.duration(160)}
              style={styles.cardSheet}>
              <PlaceCard place={selectedPlace} language={language} />
              <PressableScale
                onPress={() => setSelectedId(undefined)}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={styles.closeButton}>
                <ThemedView type="backgroundSelected" style={styles.closeCircle}>
                  <ThemedText type="smallBold">✕</ThemedText>
                </ThemedView>
              </PressableScale>
            </Animated.View>
          )}
        </Animated.View>
      )}

      {state.kind === 'loading' && (viewMode === 'list' || !mapState) && <ActivityIndicator style={styles.centered} />}

      {viewMode === 'list' && state.kind === 'ready' && (
        <Animated.FlatList
          entering={FadeIn.duration(220)}
          exiting={FadeOut.duration(150)}
          data={state.places}
          keyExtractor={(place) => place.id}
          itemLayoutAnimation={LinearTransition.springify().damping(SPRING.damping)}
          renderItem={({ item, index }) => (
            <Animated.View entering={listItemEntering(index)}>
              <PlaceCard place={item} language={language} />
            </Animated.View>
          )}
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
  const background = useThemeColorTransition(selected, 'backgroundElement', 'backgroundSelected');
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }}>
      <Animated.View style={[styles.chip, background]}>
        <ThemedText type={selected ? 'smallBold' : 'small'}>{label}</ThemedText>
      </Animated.View>
    </PressableScale>
  );
}

function Message({ text }: { text: string }) {
  return (
    <Animated.View entering={FadeIn} exiting={FadeOut}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
        {text}
      </ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toolbar: {
    // Above the map, so search results can drop down over it.
    zIndex: 10,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  toolbarRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  headerLinks: {
    flexDirection: 'row',
    gap: Spacing.three,
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
  mapBadgeSlot: {
    position: 'absolute',
    top: Spacing.three,
    alignSelf: 'center',
    maxWidth: '80%',
  },
  mapBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.four,
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
