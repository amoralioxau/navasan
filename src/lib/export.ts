import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as XLSX from 'xlsx';

// =========================================================
// TYPES
// =========================================================

export type ExportTrade = {
  id: string;
  date: string;
  pair: string;
  direction: 'buy' | 'sell';
  entryPrice: string;
  exitPrice: string;
  volume: string;
  result: string;
  riskAmount: string;
  stress: number;
  emotion: string;
  sleepHours: string;
  followedPlan: boolean;
  notes: string;
  setup?: string;
  session?: string;
  rating?: number;
  mae?: string;
  mfe?: string;
};

export type ExportStats = {
  trades: number;
  wins: number;
  losses: number;
  be: number;
  total: number;
  winRate: number;
  profitFactor: number;
  expectancy: number;
  avgWin: number;
  avgLoss: number;
  maxDrawdown: number;
};

// =========================================================
// HELPERS
// =========================================================

const num = (v: any): number => {
  if (v === undefined || v === null) return 0;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
};

const escapeCsv = (value: any): string => {
  const str = String(value ?? '').trim();
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const formatDate = (dateStr: string): string => {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

// =========================================================
// URI NORMALIZER
// =========================================================

/**
 * مطمئن می‌شه URI همیشه با file:// شروع بشه
 * (expo-sharing جدید فقط file:// قبول می‌کنه)
 */
function normalizeFileUri(uri: string): string {
  if (!uri) return uri;

  // اگه از قبل file:// داشت
  if (uri.startsWith('file://')) {
    return uri;
  }

  // اگه content:// داشت — نمی‌تونیم کاری کنیم، همینطوری بفرست
  if (uri.startsWith('content://')) {
    return uri;
  }

  // اگه مسیر خالص بود (/data/...)، file:// اضافه کن
  if (uri.startsWith('/')) {
    return `file://${uri}`;
  }

  return uri;
}

// =========================================================
// SHARE HELPER
// =========================================================

async function shareFile(
  fileUri: string,
  mimeType: string,
  dialogTitle: string,
  uti: string,
): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    Alert.alert(
      'اشتراک‌گذاری پشتیبانی نمی‌شود',
      'دستگاه شما از اشتراک‌گذاری فایل پشتیبانی نمی‌کند.',
    );
    return;
  }

  // ✅ نرمال‌سازی URI برای file://
  const shareUri = normalizeFileUri(fileUri);

  console.log('Sharing URI:', shareUri, 'MIME:', mimeType);

  await Sharing.shareAsync(shareUri, {
    mimeType,
    dialogTitle,
    UTI: uti,
  });
}

// =========================================================
// CSV EXPORT
// =========================================================

export async function exportTradesToCSV(
  trades: ExportTrade[],
): Promise<void> {
  try {
    if (trades.length === 0) {
      Alert.alert('خطا', 'هیچ معامله‌ای برای خروجی گرفتن وجود ندارد.');
      return;
    }

    const headers = [
      'تاریخ',
      'نماد',
      'جهت',
      'ورود',
      'خروج',
      'حجم',
      'نتیجه ($)',
      'ریسک ($)',
      'R Multiple',
      'Setup',
      'Session',
      'احساس',
      'استرس',
      'خواب',
      'پایبند به پلن',
      'امتیاز',
      'MAE',
      'MFE',
      'یادداشت',
    ];

    const rows = trades.map((t) => {
      const risk = num(t.riskAmount);
      const result = num(t.result);
      const rMultiple = risk > 0 ? (result / risk).toFixed(2) : '';

      return [
        formatDate(t.date),
        t.pair,
        t.direction === 'buy' ? 'BUY' : 'SELL',
        t.entryPrice,
        t.exitPrice,
        t.volume,
        result.toFixed(2),
        risk.toFixed(2),
        rMultiple,
        t.setup || '',
        t.session || '',
        t.emotion || '',
        String(t.stress ?? ''),
        t.sleepHours || '',
        t.followedPlan ? 'بله' : 'خیر',
        t.rating ? `${t.rating}/5` : '',
        t.mae || '',
        t.mfe || '',
        t.notes || '',
      ];
    });

    const csvContent =
      '\uFEFF' +
      [headers, ...rows]
        .map((row) => row.map(escapeCsv).join(','))
        .join('\n');

    const fileName = `navasan-journal-${Date.now()}.csv`;
    const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    await shareFile(
      fileUri,
      'text/csv',
      'اشتراک‌گذاری CSV',
      'public.comma-separated-values-text',
    );
  } catch (error: any) {
    console.error('CSV export error:', error);
    Alert.alert('خطا', error?.message || 'خروجی CSV گرفته نشد.');
  }
}

// =========================================================
// EXCEL (XLSX) EXPORT
// =========================================================

export async function exportTradesToExcel(
  trades: ExportTrade[],
  stats: ExportStats,
): Promise<void> {
  try {
    if (trades.length === 0) {
      Alert.alert('خطا', 'هیچ معامله‌ای برای خروجی گرفتن وجود ندارد.');
      return;
    }

    const wb = XLSX.utils.book_new();

    // Sheet 1: Summary
    const summaryData: any[][] = [
      ['NAVASAN — گزارش عملکرد معاملاتی'],
      [],
      ['تاریخ گزارش', new Date().toLocaleString('fa-IR')],
      [],
      ['آمار کلی', ''],
      ['تعداد کل معاملات', stats.trades],
      ['برد', stats.wins],
      ['باخت', stats.losses],
      ['Break Even', stats.be],
      ['Win Rate', `${stats.winRate.toFixed(2)}%`],
      ['سود / زیان کل', Number(stats.total.toFixed(2))],
      ['Profit Factor', stats.profitFactor ? Number(stats.profitFactor.toFixed(2)) : '—'],
      ['امید ریاضی', Number(stats.expectancy.toFixed(2))],
      ['میانگین برد', Number(stats.avgWin.toFixed(2))],
      ['میانگین باخت', Number(stats.avgLoss.toFixed(2))],
      ['حداکثر افت سرمایه', `${stats.maxDrawdown.toFixed(2)}%`],
      ['Win/Loss Ratio', stats.losses > 0 ? Number((stats.wins / stats.losses).toFixed(2)) : '—'],
      ['Payoff Ratio', stats.avgLoss > 0 ? Number((stats.avgWin / stats.avgLoss).toFixed(2)) : '—'],
    ];

    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    ws1['!cols'] = [{ wch: 28 }, { wch: 24 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'خلاصه');

    // Sheet 2: Trades
    const tradesHeaders = [
      'تاریخ',
      'نماد',
      'جهت',
      'ورود',
      'خروج',
      'حجم',
      'نتیجه ($)',
      'ریسک ($)',
      'R Multiple',
      'Setup',
      'Session',
      'احساس',
      'استرس',
      'خواب',
      'پایبند به پلن',
      'امتیاز',
      'MAE',
      'MFE',
      'یادداشت',
    ];

    const tradesRows = trades.map((t) => {
      const risk = num(t.riskAmount);
      const result = num(t.result);
      const rMultiple = risk > 0 ? Number((result / risk).toFixed(2)) : '';
      return [
        formatDate(t.date),
        t.pair,
        t.direction === 'buy' ? 'BUY' : 'SELL',
        t.entryPrice,
        t.exitPrice,
        t.volume,
        Number(result.toFixed(2)),
        Number(risk.toFixed(2)),
        rMultiple,
        t.setup || '',
        t.session || '',
        t.emotion || '',
        t.stress ?? '',
        t.sleepHours || '',
        t.followedPlan ? 'بله' : 'خیر',
        t.rating ?? '',
        t.mae || '',
        t.mfe || '',
        t.notes || '',
      ];
    });

    const ws2 = XLSX.utils.aoa_to_sheet([tradesHeaders, ...tradesRows]);
    ws2['!cols'] = tradesHeaders.map((h) => ({
      wch: h === 'یادداشت' ? 30 : h === 'تاریخ' ? 20 : 14,
    }));
    XLSX.utils.book_append_sheet(wb, ws2, 'معاملات');

    // Write xlsx
    const wbout = XLSX.write(wb, {
      type: 'base64',
      bookType: 'xlsx',
    });

    const fileName = `navasan-journal-${Date.now()}.xlsx`;
    const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, wbout, {
      encoding: FileSystem.EncodingType.Base64,
    });

    await shareFile(
      fileUri,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'اشتراک‌گذاری Excel',
      'com.microsoft.excel.xlsx',
    );
  } catch (error: any) {
    console.error('Excel export error:', error);
    Alert.alert('خطا', error?.message || 'خروجی Excel گرفته نشد.');
  }
}

// =========================================================
// PNG EXPORT
// =========================================================

export async function exportViewToPNG(viewRef: any): Promise<void> {
  try {
    if (!viewRef?.current) {
      Alert.alert('خطا', 'صفحه گزارش آماده نیست.');
      return;
    }

    const rawUri = await captureRef(viewRef, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
    });

    console.log('PNG capture URI:', rawUri);

    // ✅ نرمال‌سازی URI
    let fileUri = rawUri;

    // اگه content:// بود، کپی کن به cache با file://
    if (rawUri.startsWith('content://')) {
      const fileName = `navasan-report-${Date.now()}.png`;
      const destUri = `${FileSystem.cacheDirectory}${fileName}`;

      await FileSystem.copyAsync({
        from: rawUri,
        to: destUri,
      });

      fileUri = destUri;
    } else if (!rawUri.startsWith('file://') && rawUri.startsWith('/')) {
      fileUri = `file://${rawUri}`;
    }

    console.log('Final PNG URI:', fileUri);

    await shareFile(
      fileUri,
      'image/png',
      'اشتراک‌گذاری تصویر گزارش',
      'public.png',
    );
  } catch (error: any) {
    console.error('PNG export error:', error);
    Alert.alert('خطا', error?.message || 'خروجی تصویر گرفته نشد.');
  }
}