import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useEffect } from 'react';

import AppTabs from '@/components/app-tabs';
import {
  NavasanThemeProvider,
  useNavasanTheme,
} from '@/context/theme-context';
import { XPProvider } from '@/context/xp-context';

function NavasanNavigation() {
  const { isDark } = useNavasanTheme();

  useEffect(() => {
    let responseListener: any;
    let receivedListener: any;
    let cancelled = false;

    const setupNotifications = async () => {
      try {
        const Notifications = await import('expo-notifications');
        const Device = await import('expo-device');
        const { Platform } = await import('react-native');

        if (!Device.isDevice) {
          console.log('[NOTIF] شبیه‌ساز — اعلان غیرفعال');
          return;
        }

        let granted = false;
        try {
          const { status: existing } = await Notifications.getPermissionsAsync();
          let finalStatus = existing;
          if (existing !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
          }
          granted = finalStatus === 'granted';
        } catch (e) {
          console.log('[NOTIF] مجوز خطا:', e);
          return;
        }

        if (cancelled || !granted) return;

        if (Platform.OS === 'android') {
          try {
            await Notifications.setNotificationChannelAsync('default', {
              name: 'NAVASAN',
              importance: Notifications.AndroidImportance.HIGH,
            });
          } catch {}
        }

        try {
          responseListener = Notifications.addNotificationResponseReceivedListener(
            (response: any) => {
              console.log('[NOTIF] کلیک:', response?.notification?.request?.content?.data);
            }
          );
          receivedListener = Notifications.addNotificationReceivedListener(
            (notification: any) => {
              console.log('[NOTIF] دریافت:', notification);
            }
          );
        } catch {}

        console.log('[NOTIF] راه‌اندازی کامل ✅');
      } catch (e) {
        console.log('[NOTIF] خطای کلی:', e);
      }
    };

    setupNotifications();

    return () => {
      cancelled = true;
      try { responseListener?.remove?.(); } catch {}
      try { receivedListener?.remove?.(); } catch {}
    };
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
      <XPProvider>
        <NavasanNavigation />
      </XPProvider>
    </NavasanThemeProvider>
  );
}