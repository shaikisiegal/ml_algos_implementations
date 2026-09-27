import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { I18nManager, Platform, useColorScheme } from 'react-native';

import { StoreProvider } from '../lib/store';
import { usePalette } from '../lib/theme';

// Hebrew UI: right-to-left. On web this comes from <html dir="rtl"> (public/index.html);
// natively RN needs forceRTL, which applies from the next app launch.
if (Platform.OS !== 'web' && !I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

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
          <Stack.Screen name="event" options={{ presentation: 'modal', title: 'אירוע חדש' }} />
          <Stack.Screen name="settings" options={{ presentation: 'modal', title: 'פרופיל התינוק/ת' }} />
        </Stack>
      </ThemeProvider>
    </StoreProvider>
  );
}
