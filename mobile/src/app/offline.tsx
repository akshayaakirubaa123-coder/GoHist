import * as Location from 'expo-location';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOutLeft, LinearTransition } from 'react-native-reanimated';

import { listItemEntering, PressableScale, SPRING } from '@/components/motion';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useLanguage } from '@/hooks/use-language';
import { useSavedAreas } from '@/hooks/use-saved-areas';
import { useTheme } from '@/hooks/use-theme';
import type { Coordinates } from '@/lib/geo';
import { downloadArea, findCity } from '@/lib/download';

type Status = { kind: 'idle' } | { kind: 'working'; text: string } | { kind: 'done' | 'error'; text: string };

/** Download a city's history before a trip, to use without internet. */
export default function OfflineScreen() {
  const { language } = useLanguage();
  const { areas, saveArea, removeArea } = useSavedAreas();
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const busy = status.kind === 'working';

  const download = async (name: string, center: Coordinates) => {
    setStatus({ kind: 'working', text: `Downloading ${name}…` });
    try {
      const area = await downloadArea(name, center, language, (done) =>
        setStatus({ kind: 'working', text: `Downloading ${name}… ${Math.round(done * 100)}%` }),
      );
      setStatus({ kind: 'working', text: `Saving photos for ${name}…` });
      await saveArea(area);
      setStatus({ kind: 'done', text: `Saved ${area.places.length} places in ${name}.` });
    } catch (error) {
      setStatus({ kind: 'error', text: `Couldn't download ${name}: ${error instanceof Error ? error.message : error}` });
    }
  };

  const downloadCity = async () => {
    const name = query.trim();
    if (!name) return;
    setStatus({ kind: 'working', text: `Looking up ${name}…` });
    try {
      const city = await findCity(name, language);
      if (!city) {
        setStatus({ kind: 'error', text: `Couldn't find a place called "${name}" on Wikipedia.` });
        return;
      }
      await download(city.name, city.center);
    } catch (error) {
      setStatus({ kind: 'error', text: `Couldn't look up ${name}: ${error instanceof Error ? error.message : error}` });
    }
  };

  const downloadHere = async () => {
    setStatus({ kind: 'working', text: 'Finding where you are…' });
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setStatus({ kind: 'error', text: 'GoHist needs your location to download the area around you.' });
        return;
      }
      const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const center = { latitude: coords.latitude, longitude: coords.longitude };
      const address = await Location.reverseGeocodeAsync(center).catch(() => []);
      await download(address[0]?.city ?? address[0]?.region ?? 'The area around you', center);
    } catch (error) {
      setStatus({ kind: 'error', text: `Couldn't find your location: ${error instanceof Error ? error.message : error}` });
    }
  };

  return (
    <ThemedView style={styles.container}>
      <Animated.FlatList
        data={areas}
        keyExtractor={(area) => area.id}
        itemLayoutAnimation={LinearTransition.springify().damping(SPRING.damping)}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.form}>
            <ThemedText type="small" themeColor="textSecondary">
              Download a city before your trip and GoHist will show its history even with no signal.
              It saves the places, summaries and photos within about 7 km of the city centre. The
              list works offline; the map and old photos need internet.
            </ThemedText>
            <View style={styles.searchRow}>
              <TextInput
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={downloadCity}
                placeholder="City, e.g. Kyoto"
                placeholderTextColor={theme.textSecondary}
                returnKeyType="go"
                editable={!busy}
                style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
              />
              <Button label="Download" onPress={downloadCity} disabled={busy || !query.trim()} />
            </View>
            <Button label="Download where I am" onPress={downloadHere} disabled={busy} />
            {status.kind !== 'idle' ? (
              <Animated.View entering={FadeIn} style={styles.status}>
                {busy ? <ActivityIndicator /> : null}
                <ThemedText type="small" themeColor={status.kind === 'error' ? 'textSecondary' : 'text'}>
                  {status.text}
                </ThemedText>
              </Animated.View>
            ) : null}
            {areas.length > 0 ? <ThemedText type="smallBold">On this phone</ThemedText> : null}
          </View>
        }
        renderItem={({ item, index }) => (
          <Animated.View
            entering={listItemEntering(index)}
            exiting={FadeOutLeft.duration(200)}
            style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.rowText}>
              <ThemedText type="smallBold">{item.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {item.places.length} places · saved{' '}
                {new Date(item.savedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
              </ThemedText>
            </View>
            <Pressable onPress={() => removeArea(item.id)} accessibilityRole="button" disabled={busy}>
              <ThemedText type="link" themeColor="textSecondary">
                Delete
              </ThemedText>
            </Pressable>
          </Animated.View>
        )}
      />
    </ThemedView>
  );
}

function Button({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <PressableScale onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled }}>
      <ThemedView type="backgroundSelected" style={[styles.button, disabled && styles.disabled]}>
        <ThemedText type="smallBold">{label}</ThemedText>
      </ThemedView>
    </PressableScale>
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
  form: {
    gap: Spacing.three,
    marginBottom: Spacing.two,
  },
  searchRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  button: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  status: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  rowText: {
    flex: 1,
  },
});
