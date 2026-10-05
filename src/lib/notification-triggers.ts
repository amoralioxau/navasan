import AsyncStorage from '@react-native-async-storage/async-storage';

import {
    confirmTradeLogged,
    loadNotificationPreferences,
    triggerOvertradingWarning,
    triggerTiltWarning,
} from '@/lib/notifications';

const JOURNAL_STORAGE_KEY = 'navasan_trades_v1';

type Trade = {
  id?: string;
  pair?: string;
  result?: string;      // ✅ string (هماهنگ با journal.tsx)
  riskAmount?: string;
  date?: string;
  createdAt?: string;
};

// =========================================================
// HELPERS
// =========================================================

const num = (v: string | number | undefined): number => {
  if (v === undefined || v === null) return 0;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
};

const isToday = (dateStr?: string): boolean => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
};

const getTrades = async (): Promise<Trade[]> => {
  try {
    const saved = await AsyncStorage.getItem(JOURNAL_STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

// =========================================================
// COUNT CONSECUTIVE LOSSES
// =========================================================

const countConsecutiveLosses = (trades: Trade[]): number => {
  let count = 0;
  for (let i = trades.length - 1; i >= 0; i--) {
    const r = num(trades[i]?.result);
    if (r < 0) {
      count++;
    } else {
      break;
    }
  }
  return count;
};

// =========================================================
// COUNT TODAY'S TRADES
// =========================================================

const countTodayTrades = (trades: Trade[]): number => {
  return trades.filter((t) => {
    const when = t.createdAt || t.date;
    return isToday(when);
  }).length;
};

// =========================================================
// MAIN TRIGGER: AFTER LOGGING A TRADE
// =========================================================

/**
 * این تابع رو بعد از ثبت هر معامله صدا بزن.
 * خودش تنظیمات کاربر رو چک می‌کنه و اعلان مناسب رو می‌فرسته.
 */
export async function runNotificationTriggersAfterTrade(
  newTrade: Trade
): Promise<void> {
  const prefs = await loadNotificationPreferences();

  if (!prefs.enabled) return;

  // ۱. تأیید ثبت معامله
  if (prefs.tradeLogged) {
    await confirmTradeLogged(
      String(newTrade.pair ?? '—'),
      num(newTrade.result)
    );
  }

  // بارگذاری همه معاملات
  const trades = await getTrades();

  // ۲. هشدار Tilt — ۳ باخت پشت سر هم
  if (prefs.tiltWarning) {
    const losses = countConsecutiveLosses(trades);
    if (losses === 3) {
      await triggerTiltWarning(losses);
    }
  }

  // ۳. هشدار Overtrading — ۵+ معامله در یک روز
  if (prefs.overtradingWarning) {
    const todayCount = countTodayTrades(trades);
    if (todayCount === 5) {
      await triggerOvertradingWarning(todayCount);
    }
  }
}