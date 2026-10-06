import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useEffect } from 'react';

import AppTabs from '@/components/app-tabs';
import {
  NavasanThemeProvider,
  useNavasanTheme,
} from '@/context/theme-context';

function NavasanNavigation() {
  const { isDark } = useNavasanTheme();

  useEffect(() => {
    let responseListener: any;
    let receivedListener: any;
    let cancelled = false;

    const setupNotifications = async () => {
      try {
        // ⚠️ همه چیز داخل try/catch تا اپ کرش نکنه
        const Notifications = await import('expo-notifications');
        const Device = await import('expo-device');
        const { Platform } = await import('react-native');

        if (!Device.isDevice) {
          console.log('[NOTIF] شبیه‌ساز — اعلان غیرفعال');
          return;
        }

        // درخواست مجوز
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
          console.log('[NOTIF] مجوز خطا داد (نادیده گرفته شد):', e);
          return;
        }

        if (cancelled) return;
        if (!granted) {
          console.log('[NOTIF] کاربر مجوز نداد');
          return;
        }

        // کانال اندروید
        if (Platform.OS === 'android') {
          try {
            await Notifications.setNotificationChannelAsync('default', {
              name: 'NAVASAN',
              importance: Notifications.AndroidImportance.HIGH,
            });
          } catch (e) {
            console.log('[NOTIF] ساخت کانال خطا (نادیده):', e);
          }
        }

        // لیسنرها
        try {
          responseListener = Notifications.addNotificationResponseReceivedListener(
            (response: any) => {
              console.log('[NOTIF] کلیک شد:', response?.notification?.request?.content?.data);
            }
          );
          receivedListener = Notifications.addNotificationReceivedListener(
            (notification: any) => {
              console.log('[NOTIF] دریافت شد:', notification);
            }
          );
        } catch (e) {
          console.log('[NOTIF] لیسنر خطا (نادیده):', e);
        }

        console.log('[NOTIF] راه‌اندازی کامل شد ✅');
      } catch (e) {
        // ⚠️ هیچ خطایی از اینجا بیرون نمی‌زنه
        console.log('[NOTIF] خطای کلی (نادیده گرفته شد):', e);
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
      <NavasanNavigation />
    </NavasanThemeProvider>
  );
}