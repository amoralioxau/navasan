import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';

import AppTabs from '@/components/app-tabs';
import {
  NavasanThemeProvider,
  useNavasanTheme,
} from '@/context/theme-context';

function NavasanNavigation() {
  const { isDark } = useNavasanTheme();

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