import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StyleSheet, useColorScheme, View } from 'react-native';

import { ReadAloudBar } from '@/components/read-aloud-bar';
import { AuthProvider } from '@/hooks/use-auth';
import { LanguageProvider } from '@/hooks/use-language';
import { ReadAloudProvider } from '@/hooks/use-read-aloud';
import { SavedAreasProvider } from '@/hooks/use-saved-areas';
import { useVisitSync } from '@/hooks/use-visit-sync';
import { VisitsProvider } from '@/hooks/use-visits';

/** Copies your passport to and from your account while you're signed in. */
function VisitSync() {
  useVisitSync();
  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <LanguageProvider>
      <AuthProvider>
      <VisitsProvider>
        <VisitSync />
        <SavedAreasProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <ReadAloudProvider>
              {/* The player sits under the screens rather than over them, so it never hides a card or the map. */}
              <View style={styles.root}>
                {/* Screens slide in from the side and can be swiped back from anywhere on the screen. */}
                <Stack screenOptions={{ animation: 'ios_from_right', fullScreenGestureEnabled: true }}>
                  <Stack.Screen name="index" options={{ title: 'Nearby history' }} />
                  <Stack.Screen name="place" options={{ title: '' }} />
                  <Stack.Screen name="sources" options={{ title: 'Sources' }} />
                  <Stack.Screen
                    name="language"
                    options={{ title: 'Language', presentation: 'modal', animation: 'slide_from_bottom' }}
                  />
                  <Stack.Screen name="then-and-now" options={{ title: 'Then and now' }} />
                  <Stack.Screen name="passport" options={{ title: 'My history passport' }} />
                  <Stack.Screen name="add-visit" options={{ title: 'Add a place', presentation: 'modal' }} />
                  <Stack.Screen name="offline" options={{ title: 'Download a city' }} />
                  <Stack.Screen name="profile" options={{ title: 'My profile' }} />
                  <Stack.Screen name="sign-in" options={{ title: 'Your account', presentation: 'modal' }} />
                </Stack>
                <ReadAloudBar />
              </View>
            </ReadAloudProvider>
          </ThemeProvider>
        </SavedAreasProvider>
      </VisitsProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
