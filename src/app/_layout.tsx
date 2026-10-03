import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';

import AppTabs from '@/components/app-tabs';
import {
  NavasanThemeProvider,
  useNavasanTheme,
} from '@/context/theme-context';

// از همون ابتدا Splash رو مخفی کن (بدون انتظار)
SplashScreen.hideAsync().catch(() => {});

function NavasanNavigation() {
  const { isDark } = useNavasanTheme();

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <AppTabs />
    </ThemeProvider>
  );
}

export default function TabLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // یه بار دیگه بعد از mount شدن هم مطمئن شو
    SplashScreen.hideAsync().catch(() => {});
    setReady(true);
  }, []);

  return (
    <NavasanThemeProvider>
      <NavasanNavigation />
    </NavasanThemeProvider>
  );
}