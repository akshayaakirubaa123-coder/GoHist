import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { LanguageProvider } from '@/hooks/use-language';
import { SavedAreasProvider } from '@/hooks/use-saved-areas';
import { VisitsProvider } from '@/hooks/use-visits';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <LanguageProvider>
      <VisitsProvider>
        <SavedAreasProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack>
              <Stack.Screen name="index" options={{ title: 'Nearby history' }} />
              <Stack.Screen name="sources" options={{ title: 'Sources' }} />
              <Stack.Screen name="language" options={{ title: 'Language' }} />
              <Stack.Screen name="then-and-now" options={{ title: 'Then and now' }} />
              <Stack.Screen name="passport" options={{ title: 'My history passport' }} />
              <Stack.Screen name="offline" options={{ title: 'Download a city' }} />
            </Stack>
          </ThemeProvider>
        </SavedAreasProvider>
      </VisitsProvider>
    </LanguageProvider>
  );
}
