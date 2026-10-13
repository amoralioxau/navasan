import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

// =========================================================
// CONFIGURATION
// =========================================================

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// =========================================================
// TYPES
// =========================================================

export type NotificationType =
  | 'tilt_warning'
  | 'overtrading_warning'
  | 'daily_reminder'
  | 'weekly_report'
  | 'new_analysis'
  | 'trade_logged'
  | 'achievement'
  | 'level_up'
  | 'system';

export type NotificationPreferences = {
  enabled: boolean;
  tiltWarning: boolean;
  overtradingWarning: boolean;
  dailyReminder: boolean;
  dailyReminderHour: number;
  dailyReminderMinute: number;
  weeklyReport: boolean;
  newAnalysis: boolean;
  tradeLogged: boolean;
};

export type NotificationRecord = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  data: Record<string, any>;
  read: boolean;
  delivered: boolean;
  error?: string;
  created_at: string;
};

export const DEFAULT_NOTIF_PREFS: NotificationPreferences = {
  enabled: true,
  tiltWarning: true,
  overtradingWarning: true,
  dailyReminder: true,
  dailyReminderHour: 21,
  dailyReminderMinute: 0,
  weeklyReport: true,
  newAnalysis: true,
  tradeLogged: false,
};

const NOTIF_PREFS_KEY = 'navasan_notification_prefs_v1';

// =========================================================
// PERMISSIONS
// =========================================================

export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    console.log('[NOTIF] شبیه‌ساز — اعلان غیرفعال');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return false;

  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'NAVASAN',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563EB',
      });

      await Notifications.setNotificationChannelAsync('warnings', {
        name: 'هشدارها',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#EF4444',
      });

      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'یادآوری‌ها',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#2563EB',
      });
    } catch (e) {
      console.log('[NOTIF] channel error:', e);
    }
  }

  return true;
}

// =========================================================
// GET PUSH TOKEN
// =========================================================

export async function getPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    return tokenData.data;
  } catch (error) {
    console.log('[NOTIF] getPushToken error:', error);
    return null;
  }
}

// =========================================================
// SAVE TOKEN TO SUPABASE
// =========================================================

export async function savePushTokenToSupabase(
  userId: string,
  token: string
): Promise<void> {
  try {
    const { error } = await supabase.from('push_tokens').upsert(
      {
        user_id: userId,
        token,
        platform: Platform.OS,
        device_info: {
          brand: Device.brand,
          modelName: Device.modelName,
          osVersion: Device.osVersion,
        },
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    if (error) {
      console.log('[NOTIF] savePushToken error:', error.message);
    } else {
      console.log('[NOTIF] توکن در Supabase ذخیره شد ✅');
    }
  } catch (error) {
    console.log('[NOTIF] savePushToken exception:', error);
  }
}

// =========================================================
// LOCAL NOTIFICATIONS
// =========================================================

export async function showLocalNotification(
  title: string,
  body: string,
  data?: Record<string, any>,
  channelId: string = 'default'
): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data: data ?? {},
      },
      trigger: null,
    });
  } catch (e) {
    console.log('[NOTIF] showLocal error:', e);
  }
}

// =========================================================
// CREATE NOTIFICATION IN SUPABASE
// =========================================================

export async function createNotificationInDb(
  userId: string,
  title: string,
  body: string,
  type: NotificationType,
  data?: Record<string, any>
): Promise<boolean> {
  try {
    const { error } = await supabase.from('notifications').insert({
      user_id: userId,
      title,
      body,
      type,
      data: data ?? {},
      delivered: false,
    });

    if (error) {
      console.log('[NOTIF] createNotification error:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.log('[NOTIF] createNotification exception:', e);
    return false;
  }
}

// =========================================================
// FETCH NOTIFICATIONS
// =========================================================

export async function fetchUserNotifications(
  userId: string,
  limit: number = 50
): Promise<NotificationRecord[]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.log('[NOTIF] fetch error:', error.message);
      return [];
    }
    return (data || []) as NotificationRecord[];
  } catch (e) {
    console.log('[NOTIF] fetch exception:', e);
    return [];
  }
}

// =========================================================
// MARK AS READ
// =========================================================

export async function markNotificationRead(
  notificationId: string
): Promise<void> {
  try {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);
  } catch (e) {
    console.log('[NOTIF] markRead error:', e);
  }
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  try {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);
  } catch (e) {
    console.log('[NOTIF] markAllRead error:', e);
  }
}

export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) return 0;
    return count || 0;
  } catch {
    return 0;
  }
}

// =========================================================
// SCHEDULED NOTIFICATIONS
// =========================================================

export async function scheduleDailyReminder(
  hour: number = 21,
  minute: number = 0
): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📝 یادآوری ژورنال',
        body: 'امروز معامله‌هات رو ثبت کردی؟ چند دقیقه وقت بذار و مرور کن.',
        sound: true,
        data: { type: 'daily_reminder' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  } catch (e) {
    console.log('[NOTIF] scheduleDaily error:', e);
  }
}

export async function scheduleWeeklyReport(): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📊 گزارش هفتگی آماده‌ست',
        body: 'عملکرد این هفته‌ت رو ببین و برنامه هفته بعد رو بچین.',
        sound: true,
        data: { type: 'weekly_report' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 1,
        hour: 10,
        minute: 0,
      },
    });
  } catch (e) {
    console.log('[NOTIF] scheduleWeekly error:', e);
  }
}

export async function cancelAllScheduled(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    console.log('[NOTIF] cancelAll error:', e);
  }
}

// =========================================================
// CONDITIONAL NOTIFICATIONS
// =========================================================

export async function triggerTiltWarning(lossCount: number): Promise<void> {
  if (lossCount < 3) return;
  await showLocalNotification(
    '⚠️ هشدار Tilt',
    `${lossCount} باخت پشت سر هم داشتی. قبل از معامله بعدی استراحت کن.`,
    { type: 'tilt_warning' }
  );
}

export async function triggerOvertradingWarning(
  tradeCount: number
): Promise<void> {
  if (tradeCount < 5) return;
  await showLocalNotification(
    '🔥 هشدار Overtrading',
    `امروز ${tradeCount} معامله کردی. زیاده‌روی می‌تونه به ضررت تموم بشه.`,
    { type: 'overtrading_warning' }
  );
}

export async function notifyNewAnalysis(
  authorName: string,
  symbol: string
): Promise<void> {
  await showLocalNotification(
    '📊 تحلیل جدید',
    `${authorName} یه تحلیل جدید برای ${symbol} منتشر کرد.`,
    { type: 'new_analysis' }
  );
}

export async function confirmTradeLogged(
  pair: string,
  result: number
): Promise<void> {
  const emoji = result >= 0 ? '✅' : '📉';
  const text =
    result >= 0
      ? `+$${result.toFixed(2)}`
      : `-$${Math.abs(result).toFixed(2)}`;

  await showLocalNotification(`${emoji} معامله ثبت شد`, `${pair} - ${text}`, {
    type: 'trade_logged',
  });
}

// =========================================================
// LISTENERS
// =========================================================

export function addNotificationResponseListener(
  callback: (data: Record<string, any>) => void
) {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    callback(data);
  });
}

export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(callback);
}

// =========================================================
// PREFERENCES STORAGE
// =========================================================

export async function loadNotificationPreferences(): Promise<NotificationPreferences> {
  try {
    const stored = await AsyncStorage.getItem(NOTIF_PREFS_KEY);
    if (!stored) return DEFAULT_NOTIF_PREFS;
    const parsed = JSON.parse(stored);
    return { ...DEFAULT_NOTIF_PREFS, ...parsed };
  } catch {
    return DEFAULT_NOTIF_PREFS;
  }
}

export async function saveNotificationPreferences(
  prefs: NotificationPreferences
): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.log('[NOTIF] savePrefs error:', e);
  }
}

export async function applyNotificationPreferences(
  prefs: NotificationPreferences
): Promise<void> {
  await cancelAllScheduled();
  if (!prefs.enabled) return;

  if (prefs.dailyReminder) {
    await scheduleDailyReminder(
      prefs.dailyReminderHour,
      prefs.dailyReminderMinute
    );
  }
  if (prefs.weeklyReport) {
    await scheduleWeeklyReport();
  }
}