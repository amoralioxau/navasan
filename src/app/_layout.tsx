import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useEffect } from 'react';

import AppTabs from '@/components/app-tabs';
import {
  NavasanThemeProvider,
  useNavasanTheme,
} from '@/context/theme-context';
import {
  addNotificationReceivedListener,
  addNotificationResponseListener,
  getPushToken,
  requestNotificationPermissions,
  savePushTokenToSupabase,
  scheduleDailyReminder,
  scheduleWeeklyReport,
} from '@/lib/notifications';
import { supabase } from '@/lib/supabase';

function NavasanNavigation() {
  const { isDark } = useNavasanTheme();

  useEffect(() => {
    let responseListener: any;
    let receivedListener: any;

    const setupNotifications = async () => {
      // ۱. درخواست اجازه
      const granted = await requestNotificationPermissions();
      if (!granted) return;

      // ۲. گرفتن توکن
      const token = await getPushToken();
      if (token) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await savePushTokenToSupabase(session.user.id, token);
        }
      }

      // ۳. زمان‌بندی اعلان‌ها
      await scheduleDailyReminder(21, 0); // هر شب ساعت ۲۱
      await scheduleWeeklyReport(); // هر یکشنبه ساعت ۱۰

      // ۴. لیسنرها
      responseListener = addNotificationResponseListener((data) => {
        console.log('Notification tapped:', data);
        // TODO: بعداً routing بر اساس data.type
      });

      receivedListener = addNotificationReceivedListener((notification) => {
        console.log('Notification received:', notification);
      });
    };

    setupNotifications();

    // Cleanup
    return () => {
      if (responseListener) responseListener.remove();
      if (receivedListener) receivedListener.remove();
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