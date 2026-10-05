import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

// =========================================================
// CONFIGURATION
// =========================================================

// چطور نوتیفیکیشن نشون داده بشه وقتی اپ بازه
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
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
  | 'trade_logged';

// =========================================================
// PERMISSIONS
// =========================================================

/**
 * درخواست دسترسی اعلان از کاربر
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    console.log('Notifications only work on physical device');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return false;
  }

  // برای Android، کانال اعلان بساز
  if (Platform.OS === 'android') {
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
  }

  return true;
}

// =========================================================
// GET PUSH TOKEN
// =========================================================

/**
 * گرفتن Expo Push Token برای ارسال اعلان از سرور
 */
export async function getPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }

  try {
    const token = (await Notifications.getExpoPushTokenAsync({
      projectId: 'YOUR_PROJECT_ID', // بعداً از app.json پر می‌شه
    })).data;

    return token;
  } catch (error) {
    console.log('Error getting push token:', error);
    return null;
  }
}

// =========================================================
// SAVE TOKEN TO SUPABASE
// =========================================================

/**
 * ذخیره Expo Push Token در Supabase برای کاربر
 */
export async function savePushTokenToSupabase(
  userId: string,
  token: string
): Promise<void> {
  try {
    await supabase
      .from('push_tokens')
      .upsert(
        {
          user_id: userId,
          token,
          platform: Platform.OS,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
  } catch (error) {
    console.log('Error saving push token:', error);
  }
}

// =========================================================
// LOCAL NOTIFICATIONS (Immediate)
// =========================================================

/**
 * نمایش یه اعلان فوری (روی همون گوشی)
 */
export async function showLocalNotification(
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      data: data ?? {},
    },
    trigger: null, // فوری
  });
}

// =========================================================
// SCHEDULED NOTIFICATIONS
// =========================================================

/**
 * یادآوری روزانه در ساعت مشخص
 */
export async function scheduleDailyReminder(
  hour: number = 21,
  minute: number = 0
): Promise<void> {
  // اول اعلان‌های قبلی رو پاک کن
  await cancelAllScheduled();

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
}

/**
 * گزارش هفتگی - هر یکشنبه ساعت ۱۰ صبح
 */
export async function scheduleWeeklyReport(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '📊 گزارش هفتگی آماده‌ست',
      body: 'عملکرد این هفته‌ت رو ببین و برنامه هفته بعد رو بچین.',
      sound: true,
      data: { type: 'weekly_report' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 1, // یکشنبه (۱ = Sunday)
      hour: 10,
      minute: 0,
    },
  });
}

/**
 * لغو همه اعلان‌های زمان‌بندی‌شده
 */
export async function cancelAllScheduled(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// =========================================================
// CONDITIONAL NOTIFICATIONS
// =========================================================

/**
 * هشدار Tilt - وقتی ۳ باخت پشت سر هم داره
 */
export async function triggerTiltWarning(lossCount: number): Promise<void> {
  if (lossCount < 3) return;

  await showLocalNotification(
    '⚠️ هشدار Tilt',
    `${lossCount} باخت پشت سر هم داشتی. قبل از معامله بعدی استراحت کن و ذهنت رو آروم کن.`,
    { type: 'tilt_warning' }
  );
}

/**
 * هشدار Overtrading - وقتی تعداد معاملات روز زیاده
 */
export async function triggerOvertradingWarning(
  tradeCount: number
): Promise<void> {
  if (tradeCount < 5) return;

  await showLocalNotification(
    '🔥 هشدار Overtrading',
    `امروز ${tradeCount} معامله کردی. زیاده روی می‌تونه به ضررت تموم بشه.`,
    { type: 'overtrading_warning' }
  );
}

/**
 * اعلان جدید از تحلیل‌گر دنبال‌شده
 */
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

/**
 * تأیید ثبت معامله
 */
export async function confirmTradeLogged(
  pair: string,
  result: number
): Promise<void> {
  const emoji = result >= 0 ? '✅' : '📉';
  const text = result >= 0 ? `+$${result.toFixed(2)}` : `-$${Math.abs(result).toFixed(2)}`;

  await showLocalNotification(
    `${emoji} معامله ثبت شد`,
    `${pair} - ${text}`,
    { type: 'trade_logged' }
  );
}

// =========================================================
// LISTENERS
// =========================================================

/**
 * وقتی کاربر روی اعلان کلیک می‌کنه
 */
export function addNotificationResponseListener(
  callback: (data: Record<string, any>) => void
) {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    callback(data);
  });
}

/**
 * وقتی اعلان در حال اومدنه (اپ بازه)
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(callback);
}
// =========================================================
// PREFERENCES STORAGE
// =========================================================

import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIF_PREFS_KEY = 'navasan_notification_prefs_v1';

export type NotificationPreferences = {
  enabled: boolean;              // اعلان‌ها کلاً روشن؟
  tiltWarning: boolean;          // هشدار Tilt
  overtradingWarning: boolean;   // هشدار Overtrading
  dailyReminder: boolean;        // یادآوری روزانه
  dailyReminderHour: number;     // ساعت یادآوری (0-23)
  dailyReminderMinute: number;   // دقیقه یادآوری (0-59)
  weeklyReport: boolean;         // گزارش هفتگی
  newAnalysis: boolean;          // اعلان تحلیل جدید
  tradeLogged: boolean;          // تأیید ثبت معامله
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

/**
 * بارگذاری تنظیمات از AsyncStorage
 */
export async function loadNotificationPreferences(): Promise<NotificationPreferences> {
  try {
    const stored = await AsyncStorage.getItem(NOTIF_PREFS_KEY);
    if (!stored) return DEFAULT_NOTIF_PREFS;

    const parsed = JSON.parse(stored);
    return { ...DEFAULT_NOTIF_PREFS, ...parsed };
  } catch (error) {
    console.log('Error loading notification prefs:', error);
    return DEFAULT_NOTIF_PREFS;
  }
}

/**
 * ذخیره تنظیمات در AsyncStorage
 */
export async function saveNotificationPreferences(
  prefs: NotificationPreferences
): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(prefs));
  } catch (error) {
    console.log('Error saving notification prefs:', error);
  }
}

/**
 * اعمال تنظیمات روی اعلان‌های زمان‌بندی‌شده
 */
export async function applyNotificationPreferences(
  prefs: NotificationPreferences
): Promise<void> {
  // اول همه رو لغو کن
  await cancelAllScheduled();

  if (!prefs.enabled) return;

  // اگه یادآوری روزانه فعاله
  if (prefs.dailyReminder) {
    await scheduleDailyReminder(
      prefs.dailyReminderHour,
      prefs.dailyReminderMinute
    );
  }

  // اگه گزارش هفتگی فعاله
  if (prefs.weeklyReport) {
    await scheduleWeeklyReport();
  }
}