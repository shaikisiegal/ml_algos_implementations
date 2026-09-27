import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { StoreProvider } from '../lib/store';
import { usePalette } from '../lib/theme';

export default function RootLayout() {
  const scheme = useColorScheme();
  const p = usePalette();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const theme = {
    ...base,
    colors: { ...base.colors, background: p.bg, card: p.card, text: p.text, border: p.border, primary: p.accent },
  };

  return (
    <StoreProvider>
      <ThemeProvider value={theme}>
        <StatusBar style="auto" />
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="event" options={{ presentation: 'modal', title: 'Add event' }} />
          <Stack.Screen name="settings" options={{ presentation: 'modal', title: 'Baby profile' }} />
        </Stack>
      </ThemeProvider>
    </StoreProvider>
  );
}
