import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { LanguageProvider } from '@/hooks/use-language';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <LanguageProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="index" options={{ title: 'Nearby history' }} />
          <Stack.Screen name="place" options={{ title: '' }} />
          <Stack.Screen name="sources" options={{ title: 'Sources' }} />
          <Stack.Screen name="language" options={{ title: 'Language' }} />
        </Stack>
      </ThemeProvider>
    </LanguageProvider>
  );
}
