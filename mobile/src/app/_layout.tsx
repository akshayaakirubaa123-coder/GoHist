import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { AuthProvider } from '@/hooks/use-auth';
import { LanguageProvider } from '@/hooks/use-language';
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
            <Stack>
              <Stack.Screen name="index" options={{ title: 'Nearby history' }} />
              <Stack.Screen name="place" options={{ title: '' }} />
              <Stack.Screen name="sources" options={{ title: 'Sources' }} />
              <Stack.Screen name="language" options={{ title: 'Language' }} />
              <Stack.Screen name="then-and-now" options={{ title: 'Then and now' }} />
              <Stack.Screen name="passport" options={{ title: 'My history passport' }} />
              <Stack.Screen name="offline" options={{ title: 'Download a city' }} />
              <Stack.Screen name="profile" options={{ title: 'My profile' }} />
              <Stack.Screen name="sign-in" options={{ title: 'Your account', presentation: 'modal' }} />
            </Stack>
          </ThemeProvider>
        </SavedAreasProvider>
      </VisitsProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
