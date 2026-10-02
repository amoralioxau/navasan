import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import AppTabs from '@/components/app-tabs';
import {
  NavasanThemeProvider,
  useNavasanTheme,
} from '@/context/theme-context';

// جلوگیری از مخفی شدن خودکار Splash
SplashScreen.preventAutoHideAsync();

function NavasanNavigation() {
  const { isDark } = useNavasanTheme();

  useEffect(() => {
    // وقتی اپ لود شد، Splash رو مخفی کن
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <AppTabs />
    </ThemeProvider>
  );
}

export default function TabLayout() {
  return (
    <NavasanThemeProvider>
      <NavasanNavigation />
    </NavasanThemeProvider>
  );
}