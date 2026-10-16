import { Link, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { VisitedMap } from '@/components/visited-map';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { useVisits } from '@/hooks/use-visits';
import type { VisitedCountry, VisitedMapState } from '@/lib/visited-map-html';

/** Your profile: who you are, and a world map that fills in as you explore. */
export default function ProfileScreen() {
  const { available, loading, session, profile, signOut, updateProfile } = useAuth();
  const { visits } = useVisits();
  const theme = useTheme();
  const [countries, setCountries] = useState<VisitedCountry[]>([]);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [homeCountry, setHomeCountry] = useState('');
  const [error, setError] = useState<string>();

  const mapState = useMemo<VisitedMapState>(
    () => ({
      visits: visits.map((visit) => ({
        id: visit.id,
        latitude: visit.coordinates.latitude,
        longitude: visit.coordinates.longitude,
      })),
    }),
    [visits],
  );

  const signedIn = session !== null;
  const displayName = signedIn ? (profile?.displayName ?? '') : 'Traveller';
  const sortedCountries = [...countries].sort((a, b) => b.places - a.places || a.name.localeCompare(b.name));
  const inputStyle = [styles.input, { color: theme.text, backgroundColor: theme.background }];

  const startEditing = () => {
    setName(profile?.displayName ?? '');
    setHomeCountry(profile?.homeCountry ?? '');
    setError(undefined);
    setEditing(true);
  };

  const save = async () => {
    const message = await updateProfile({ displayName: name, homeCountry });
    if (message) setError(message);
    else setEditing(false);
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedView type="backgroundElement" style={styles.card}>
          <View style={styles.identity}>
            <View style={[styles.avatar, { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText type="subtitle">{(displayName || '?').charAt(0).toUpperCase()}</ThemedText>
            </View>
            <View style={styles.identityText}>
              <ThemedText type="default" style={styles.name}>
                {displayName}
              </ThemedText>
              {signedIn ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {[
                    profile?.homeCountry ? `From ${profile.homeCountry}` : undefined,
                    profile ? `Exploring since ${formatMonth(profile.createdAt)}` : undefined,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </ThemedText>
              ) : (
                <ThemedText type="small" themeColor="textSecondary">
                  Not signed in. Your passport is saved on this phone only.
                </ThemedText>
              )}
            </View>
          </View>

          {editing ? (
            <View style={styles.form}>
              <TextInput
                style={inputStyle}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={theme.textSecondary}
              />
              <TextInput
                style={inputStyle}
                value={homeCountry}
                onChangeText={setHomeCountry}
                placeholder="Home country (optional)"
                placeholderTextColor={theme.textSecondary}
              />
              {error ? <ThemedText type="small">{error}</ThemedText> : null}
              <View style={styles.actions}>
                <Pressable accessibilityRole="button" onPress={save} disabled={name.trim() === ''}>
                  <ThemedText type="linkPrimary">Save</ThemedText>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => setEditing(false)}>
                  <ThemedText type="link" themeColor="textSecondary">
                    Cancel
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          ) : signedIn ? (
            <View style={styles.actions}>
              <Pressable accessibilityRole="button" onPress={startEditing}>
                <ThemedText type="linkPrimary">Edit profile</ThemedText>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={signOut}>
                <ThemedText type="link" themeColor="textSecondary">
                  Sign out
                </ThemedText>
              </Pressable>
            </View>
          ) : available && !loading ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/sign-in')}
              style={[styles.button, { backgroundColor: theme.text }]}>
              <ThemedText type="smallBold" style={{ color: theme.background }}>
                Sign in or create an account
              </ThemedText>
            </Pressable>
          ) : null}
        </ThemedView>

        <View style={styles.stats}>
          <Stat value={visits.length} label={visits.length === 1 ? 'place' : 'places'} />
          <Stat value={countries.length} label={countries.length === 1 ? 'country' : 'countries'} />
        </View>

        <View style={styles.mapFrame}>
          <VisitedMap state={mapState} onCountries={setCountries} />
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          Countries you&apos;ve visited are filled in. Zoom into a city to see the streets you&apos;ve
          explored light up.
        </ThemedText>

        {sortedCountries.length > 0 ? (
          <View style={styles.countries}>
            {sortedCountries.map((country) => (
              <ThemedView key={country.id} type="backgroundElement" style={styles.country}>
                <ThemedText type="small">
                  {country.name} <ThemedText type="small" themeColor="textSecondary">{country.places}</ThemedText>
                </ThemedText>
              </ThemedView>
            ))}
          </View>
        ) : null}

        <Link href="/passport" accessibilityLabel="My history passport">
          <ThemedText type="linkPrimary">See every place in your passport</ThemedText>
        </Link>
      </ScrollView>
    </ThemedView>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <ThemedView type="backgroundElement" style={styles.stat}>
      <ThemedText type="subtitle">{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </ThemedView>
  );
}

function formatMonth(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    gap: Spacing.three,
    padding: Spacing.three,
  },
  card: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityText: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: 700,
  },
  form: {
    gap: Spacing.two,
  },
  input: {
    fontSize: 16,
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    borderRadius: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.four,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderRadius: Spacing.three,
  },
  stats: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  stat: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  mapFrame: {
    height: 380,
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  countries: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  country: {
    paddingHorizontal: 12,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.four,
  },
});
