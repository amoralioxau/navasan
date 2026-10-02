import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { ExportPreviewCard } from '@/components/ExportPreviewCard';
import { useNavasanTheme } from '@/context/theme-context';
import {
  exportTradesToCSV,
  exportTradesToExcel,
  exportViewToPNG,
} from '@/lib/export';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const BLUE = '#2563EB';

const SETTINGS_STORAGE_KEY = 'navasan_settings_v1';
const JOURNAL_STORAGE_KEY = 'navasan_trades_v1';
const BALANCE_STORAGE_KEY = 'navasan_account_v1';

const TELEGRAM_USERNAME = '@navasanapp_support';
const RUBIKA_USERNAME = '@navasanapp_support';
const SUPPORT_EMAIL = 'xbromand@gmail.com';

type MenuItem = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  action: string;
  route?: string;
};

type SettingsData = {
  darkMode: boolean;
  notifications: boolean;
  confirmDelete: boolean;
  showStatistics: boolean;
};

const DEFAULT_SETTINGS: SettingsData = {
  darkMode: false,
  notifications: true,
  confirmDelete: true,
  showStatistics: true,
};

const menuItems: MenuItem[] = [
  {
    title: 'پروفایل',
    subtitle: 'پروفایل شخصی و معاملاتی',
    icon: 'person-outline',
    action: 'profile',
    route: '/account',
  },
  {
    title: 'تنظیمات',
    subtitle: 'شخصی‌سازی و مدیریت NAVASAN',
    icon: 'settings-outline',
    action: 'settings',
  },
  {
    title: 'اعلان‌ها',
    subtitle: 'مدیریت اعلان‌های NAVASAN',
    icon: 'notifications-outline',
    action: 'notifications',
  },
  {
    title: 'تماس با ما',
    subtitle: 'تلگرام، روبیکا و ایمیل',
    icon: 'mail-outline',
    action: 'contact',
  },
  {
    title: 'سؤالات متداول',
    subtitle: 'پاسخ سؤالات رایج NAVASAN',
    icon: 'help-circle-outline',
    action: 'faq',
  },
  {
    title: 'پشتیبانی و گزارش مشکل',
    subtitle: 'گزارش خطا یا ارسال درخواست',
    icon: 'headset-outline',
    action: 'support',
  },
  {
    title: 'درباره NAVASAN',
    subtitle: 'آشنایی با امکانات و مسیر NAVASAN',
    icon: 'information-circle-outline',
    action: 'about',
  },
  {
    title: 'اشتراک‌گذاری اپ',
    subtitle: 'NAVASAN را با دوستانت به اشتراک بگذار',
    icon: 'share-social-outline',
    action: 'share',
  },
];

export default function MoreScreen() {
  const router = useRouter();

  const [settings, setSettings] =
    useState<SettingsData>(DEFAULT_SETTINGS);

  const [settingsVisible, setSettingsVisible] =
    useState(false);

  const [aboutVisible, setAboutVisible] =
    useState(false);

  const [faqVisible, setFaqVisible] =
    useState(false);

  const [contactVisible, setContactVisible] =
    useState(false);

  const [privacyVisible, setPrivacyVisible] =
    useState(false);

  const [termsVisible, setTermsVisible] =
    useState(false);

  const [statsVisible, setStatsVisible] =
    useState(false);

  const [trades, setTrades] = useState<any[]>([]);
  const [initialBalance, setInitialBalance] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);

  const exportCardRef = useRef<View>(null);

  const [journalCount, setJournalCount] =
    useState(0);

  const { isDark, setDarkMode } = useNavasanTheme();

  useEffect(() => {
    loadSettings();
    loadJournalCount();
  }, []);

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem(
        SETTINGS_STORAGE_KEY
      );

      if (!saved) {
        return;
      }

      const parsed = JSON.parse(saved);

      setSettings({
        darkMode: isDark,

        notifications:
          typeof parsed.notifications === 'boolean'
            ? parsed.notifications
            : DEFAULT_SETTINGS.notifications,

        confirmDelete:
          typeof parsed.confirmDelete === 'boolean'
            ? parsed.confirmDelete
            : DEFAULT_SETTINGS.confirmDelete,

        showStatistics:
          typeof parsed.showStatistics === 'boolean'
            ? parsed.showStatistics
            : DEFAULT_SETTINGS.showStatistics,
      });
    } catch (error) {
      console.log(
        'Failed to load NAVASAN settings:',
        error
      );
    }
  };

  const loadJournalCount = async () => {
    try {
      const saved = await AsyncStorage.getItem(
        JOURNAL_STORAGE_KEY
      );

      if (!saved) {
        setTrades([]);
        setJournalCount(0);
      } else {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setTrades(parsed);
          setJournalCount(parsed.length);
        } else {
          setTrades([]);
          setJournalCount(0);
        }
      }

      const balanceSaved = await AsyncStorage.getItem(
        BALANCE_STORAGE_KEY
      );

      if (balanceSaved) {
        const account = JSON.parse(balanceSaved);
        if (
          typeof account?.initialBalance === 'number' &&
          Number.isFinite(account.initialBalance)
        ) {
          setInitialBalance(account.initialBalance);
        }
      }
    } catch (error) {
      console.log(
        'Failed to load journal count:',
        error
      );
      setTrades([]);
      setJournalCount(0);
    }
  };

  const saveSettings = async (
    nextSettings: SettingsData
  ) => {
    try {
      await AsyncStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify(nextSettings)
      );
    } catch (error) {
      console.log(
        'Failed to save NAVASAN settings:',
        error
      );
    }
  };

  const updateSettings = async (
    changes: Partial<SettingsData>
  ) => {
    const nextSettings = {
      ...settings,
      ...changes,
      darkMode: isDark,
    };

    if (typeof changes.darkMode === 'boolean') {
      nextSettings.darkMode = changes.darkMode;
      await setDarkMode(changes.darkMode);
    }

    setSettings(nextSettings);
    await saveSettings(nextSettings);
  };

  const handlePress = async (item: MenuItem) => {
    switch (item.action) {
      case 'profile':
        if (item.route) {
          router.push({
            pathname: item.route,
          } as any);
        }
        break;

      case 'settings':
        setSettingsVisible(true);
        break;

      case 'notifications':
        updateSettings({
          notifications: !settings.notifications,
        });
        break;

      case 'contact':
        setContactVisible(true);
        break;

      case 'faq':
        setFaqVisible(true);
        break;

      case 'support':
        setContactVisible(true);
        break;

      case 'about':
        setAboutVisible(true);
        break;

      case 'share':
        handleShare();
        break;
    }
  };

  // =========================================================
  // EXPORT HANDLERS
  // =========================================================

  const computeStats = () => {
    const wins = trades.filter((t) => Number(t.result) > 0);
    const losses = trades.filter((t) => Number(t.result) < 0);
    const be = trades.filter((t) => Number(t.result) === 0);
    const total = trades.reduce((s, t) => s + Number(t.result || 0), 0);
    const grossWin = wins.reduce((s, t) => s + Number(t.result || 0), 0);
    const grossLoss = Math.abs(
      losses.reduce((s, t) => s + Number(t.result || 0), 0),
    );
    const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;
    const avgWin = wins.length > 0 ? grossWin / wins.length : 0;
    const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;
    const profitFactor = grossLoss > 0 ? grossWin / grossLoss : 0;
    const expectancy =
      (winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss;

    const startBalance = initialBalance || 10000;
    let balance = startBalance;
    let peak = startBalance;
    let maxDrawdown = 0;
    [...trades].reverse().forEach((t) => {
      balance += Number(t.result || 0);
      if (balance > peak) peak = balance;
      const dd = peak > 0 ? ((peak - balance) / peak) * 100 : 0;
      if (dd > maxDrawdown) maxDrawdown = dd;
    });

    return {
      trades: trades.length,
      wins: wins.length,
      losses: losses.length,
      be: be.length,
      total,
      winRate,
      profitFactor,
      expectancy,
      avgWin,
      avgLoss,
      maxDrawdown,
    };
  };

  const handleExportCSV = async () => {
    if (trades.length === 0) {
      Alert.alert('خطا', 'هیچ معامله‌ای برای خروجی گرفتن وجود ندارد.');
      return;
    }

    setExporting(true);
    try {
      await exportTradesToCSV(trades);
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = async () => {
    if (trades.length === 0) {
      Alert.alert('خطا', 'هیچ معامله‌ای برای خروجی گرفتن وجود ندارد.');
      return;
    }

    setExporting(true);
    try {
      await exportTradesToExcel(trades, computeStats());
    } finally {
      setExporting(false);
    }
  };

  const handleExportPNG = async () => {
    if (trades.length === 0) {
      Alert.alert('خطا', 'هیچ معامله‌ای برای خروجی گرفتن وجود ندارد.');
      return;
    }

    setExporting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      await exportViewToPNG(exportCardRef);
    } finally {
      setExporting(false);
    }
  };

  // =========================================================
  // CONTACT
  // =========================================================

  const openTelegram = async () => {
    try {
      const username = TELEGRAM_USERNAME.replace('@', '');
      const telegramUrl = `tg://resolve?domain=${username}`;
      const webUrl = `https://t.me/${username}`;
      const supported = await Linking.canOpenURL(telegramUrl);

      if (supported) {
        await Linking.openURL(telegramUrl);
      } else {
        await Linking.openURL(webUrl);
      }
    } catch {
      Alert.alert(
        'تلگرام',
        `آیدی پشتیبانی NAVASAN:\n${TELEGRAM_USERNAME}`,
      );
    }
  };

  const openRubika = async () => {
    try {
      const username = RUBIKA_USERNAME.replace('@', '');
      const rubikaUrl = `rubika://rubika.ir/${username}`;
      const webUrl = `https://rubika.ir/${username}`;
      const supported = await Linking.canOpenURL(rubikaUrl);

      if (supported) {
        await Linking.openURL(rubikaUrl);
      } else {
        await Linking.openURL(webUrl);
      }
    } catch {
      Alert.alert(
        'روبیکا',
        `آیدی پشتیبانی NAVASAN:\n${RUBIKA_USERNAME}`,
      );
    }
  };

  const openEmail = async () => {
    try {
      const emailUrl = `mailto:${SUPPORT_EMAIL}`;
      const supported = await Linking.canOpenURL(emailUrl);

      if (supported) {
        await Linking.openURL(emailUrl);
      } else {
        Alert.alert('ایمیل پشتیبانی', SUPPORT_EMAIL);
      }
    } catch {
      Alert.alert('ایمیل پشتیبانی', SUPPORT_EMAIL);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: 'NAVASAN',
        message:
          'NAVASAN؛ یک پلتفرم جامع برای تریدرها.\n\n' +
          'ژورنال معاملاتی، تحلیل، آموزش، ستاپ‌ها، ' +
          'اتاق تحلیل و امکانات کاربردی برای ساختن ' +
          'یک مسیر منظم‌تر در معامله‌گری.\n\n' +
          'NAVASAN',
      });
    } catch (error) {
      console.log('NAVASAN share error:', error);
    }
  };

  const clearJournalData = () => {
    const deleteData = async () => {
      try {
        await AsyncStorage.removeItem(JOURNAL_STORAGE_KEY);
        setJournalCount(0);
        setTrades([]);

        Alert.alert(
          'انجام شد',
          'اطلاعات ژورنال این دستگاه پاک شد.',
        );
      } catch {
        Alert.alert(
          'خطا',
          'پاک کردن اطلاعات ژورنال انجام نشد.',
        );
      }
    };

    if (settings.confirmDelete) {
      Alert.alert(
        'پاک کردن ژورنال',
        'تمام معاملات ذخیره‌شده روی این دستگاه پاک می‌شوند. این عملیات قابل بازگشت نیست.',
        [
          { text: 'انصراف', style: 'cancel' },
          {
            text: 'پاک کردن',
            style: 'destructive',
            onPress: deleteData,
          },
        ],
      );
    } else {
      deleteData();
    }
  };

  const resetSettings = () => {
    Alert.alert(
      'بازنشانی تنظیمات',
      'همه تنظیمات NAVASAN به حالت پیش‌فرض برمی‌گردند.',
      [
        { text: 'انصراف', style: 'cancel' },
        {
          text: 'بازنشانی',
          onPress: async () => {
            setSettings(DEFAULT_SETTINGS);
            await setDarkMode(false);
            await saveSettings(DEFAULT_SETTINGS);

            Alert.alert(
              'انجام شد',
              'تنظیمات به حالت پیش‌فرض بازگردانده شدند.',
            );
          },
        },
      ],
    );
  };

  const backgroundColor = isDark ? '#050505' : '#F8FAFC';
  const cardColor = isDark ? '#111214' : '#FFFFFF';
  const borderColor = isDark ? '#24262A' : '#E2E8F0';
  const primaryText = isDark ? '#FFFFFF' : '#0F172A';
  const secondaryText = isDark ? '#A1A1AA' : '#64748B';
  const iconBackground = isDark ? '#172554' : '#EFF6FF';
  const dividerColor = isDark ? '#24262A' : '#F1F5F9';

  const exportStats = computeStats();

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: primaryText }]}>
              بیشتر
            </Text>

            <Text style={[styles.subtitle, { color: secondaryText }]}>
              مدیریت حساب، تنظیمات و امکانات NAVASAN
            </Text>
          </View>

          <View style={styles.logoBox}>
            <Text style={styles.logoText}>N</Text>
          </View>
        </View>

        {/* Profile */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={[
            styles.profileCard,
            {
              backgroundColor: cardColor,
              borderColor: isDark ? '#1D4ED8' : '#DBEAFE',
            },
          ]}
          onPress={() =>
            router.push({
              pathname: '/account',
            } as any)
          }
        >
          <View style={styles.profileIcon}>
            <Ionicons name="person" size={24} color="#FFFFFF" />
          </View>

          <View style={styles.profileInfo}>
            <Text style={[styles.profileTitle, { color: primaryText }]}>
              حساب کاربری
            </Text>

            <Text style={[styles.profileSubtitle, { color: secondaryText }]}>
              ورود و مدیریت پروفایل معاملاتی
            </Text>
          </View>

          <Ionicons
            name="chevron-back"
            size={22}
            color={secondaryText}
          />
        </TouchableOpacity>

        {/* Quick Settings */}
        <Text style={[styles.sectionTitle, { color: primaryText }]}>
          تنظیمات سریع
        </Text>

        <View
          style={[
            styles.quickSettingsCard,
            { backgroundColor: cardColor, borderColor },
          ]}
        >
          <View style={styles.quickRow}>
            <View
              style={[
                styles.quickIcon,
                { backgroundColor: iconBackground },
              ]}
            >
              <Ionicons
                name={isDark ? 'moon-outline' : 'sunny-outline'}
                size={21}
                color={BLUE}
              />
            </View>

            <View style={styles.quickText}>
              <Text style={[styles.quickTitle, { color: primaryText }]}>
                حالت نمایش
              </Text>

              <Text style={[styles.quickSubtitle, { color: secondaryText }]}>
                {isDark ? 'حالت تیره' : 'حالت روشن'}
              </Text>
            </View>

            <Switch
              value={isDark}
              onValueChange={(value) =>
                updateSettings({ darkMode: value })
              }
              trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
              thumbColor={isDark ? BLUE : '#FFFFFF'}
            />
          </View>

          <View
            style={[
              styles.quickDivider,
              { backgroundColor: dividerColor },
            ]}
          />

          <View style={styles.quickRow}>
            <View
              style={[
                styles.quickIcon,
                { backgroundColor: iconBackground },
              ]}
            >
              <Ionicons
                name={
                  settings.notifications
                    ? 'notifications-outline'
                    : 'notifications-off-outline'
                }
                size={21}
                color={BLUE}
              />
            </View>

            <View style={styles.quickText}>
              <Text style={[styles.quickTitle, { color: primaryText }]}>
                اعلان‌ها
              </Text>

              <Text style={[styles.quickSubtitle, { color: secondaryText }]}>
                {settings.notifications
                  ? 'اعلان‌ها فعال هستند'
                  : 'اعلان‌ها غیرفعال هستند'}
              </Text>
            </View>

            <Switch
              value={settings.notifications}
              onValueChange={(value) =>
                updateSettings({ notifications: value })
              }
              trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
              thumbColor={settings.notifications ? BLUE : '#FFFFFF'}
            />
          </View>
        </View>

        {/* Menu */}
        <Text
          style={[
            styles.sectionTitle,
            { color: primaryText, marginTop: 26 },
          ]}
        >
          امکانات
        </Text>

        <View
          style={[
            styles.menuCard,
            { backgroundColor: cardColor, borderColor },
          ]}
        >
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.title}
              activeOpacity={0.75}
              style={[
                styles.menuItem,
                index !== menuItems.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: dividerColor,
                },
              ]}
              onPress={() => handlePress(item)}
            >
              <View
                style={[
                  styles.menuIcon,
                  { backgroundColor: iconBackground },
                ]}
              >
                <Ionicons name={item.icon} size={22} color={BLUE} />
              </View>

              <View style={styles.menuText}>
                <Text style={[styles.menuTitle, { color: primaryText }]}>
                  {item.title}
                </Text>

                <Text style={[styles.menuSubtitle, { color: secondaryText }]}>
                  {item.subtitle}
                </Text>
              </View>

              <Ionicons
                name="chevron-back"
                size={20}
                color={secondaryText}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerTitle, { color: BLUE }]}>
            NAVASAN
          </Text>

          <Text style={[styles.footerText, { color: secondaryText }]}>
            Trading Journal • Analysis • Education
          </Text>

          <Text
            style={[
              styles.versionText,
              { color: isDark ? '#52525B' : '#CBD5E1' },
            ]}
          >
            Version 1.0.0
          </Text>
        </View>
      </ScrollView>

      {/* ================================================ */}
      {/* Settings Modal */}
      {/* ================================================ */}

      <Modal
        visible={settingsVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSettingsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.settingsModal,
              { backgroundColor: cardColor },
            ]}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setSettingsVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={23} color={primaryText} />
              </TouchableOpacity>

              <Text style={[styles.modalTitle, { color: primaryText }]}>
                تنظیمات NAVASAN
              </Text>

              <View style={styles.headerPlaceholder} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* APPEARANCE */}
              <Text
                style={[styles.modalSectionTitle, { color: secondaryText }]}
              >
                ظاهر و تجربه کاربری
              </Text>

              <View style={[styles.settingRow, { borderColor }]}>
                <View
                  style={[
                    styles.settingIcon,
                    { backgroundColor: iconBackground },
                  ]}
                >
                  <Ionicons
                    name={isDark ? 'moon-outline' : 'sunny-outline'}
                    size={22}
                    color={BLUE}
                  />
                </View>

                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: primaryText }]}>
                    حالت تیره
                  </Text>

                  <Text
                    style={[styles.settingSubtitle, { color: secondaryText }]}
                  >
                    تغییر ظاهر برنامه به حالت تیره
                  </Text>
                </View>

                <Switch
                  value={isDark}
                  onValueChange={(value) =>
                    updateSettings({ darkMode: value })
                  }
                  trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
                  thumbColor={isDark ? BLUE : '#FFFFFF'}
                />
              </View>

              {/* NOTIFICATIONS */}
              <Text
                style={[styles.modalSectionTitle, { color: secondaryText }]}
              >
                اعلان‌ها
              </Text>

              <View style={[styles.settingRow, { borderColor }]}>
                <View
                  style={[
                    styles.settingIcon,
                    { backgroundColor: iconBackground },
                  ]}
                >
                  <Ionicons
                    name={
                      settings.notifications
                        ? 'notifications-outline'
                        : 'notifications-off-outline'
                    }
                    size={22}
                    color={BLUE}
                  />
                </View>

                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: primaryText }]}>
                    اعلان‌های NAVASAN
                  </Text>

                  <Text
                    style={[styles.settingSubtitle, { color: secondaryText }]}
                  >
                    فعال یا غیرفعال کردن اعلان‌ها
                  </Text>
                </View>

                <Switch
                  value={settings.notifications}
                  onValueChange={(value) =>
                    updateSettings({ notifications: value })
                  }
                  trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
                  thumbColor={settings.notifications ? BLUE : '#FFFFFF'}
                />
              </View>

              {/* PRIVACY */}
              <Text
                style={[styles.modalSectionTitle, { color: secondaryText }]}
              >
                حریم خصوصی و امنیت
              </Text>

              <View style={[styles.settingRow, { borderColor }]}>
                <View
                  style={[
                    styles.settingIcon,
                    { backgroundColor: iconBackground },
                  ]}
                >
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={22}
                    color={BLUE}
                  />
                </View>

                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: primaryText }]}>
                    تأیید قبل از حذف
                  </Text>

                  <Text
                    style={[styles.settingSubtitle, { color: secondaryText }]}
                  >
                    قبل از حذف اطلاعات از شما تأیید گرفته شود
                  </Text>
                </View>

                <Switch
                  value={settings.confirmDelete}
                  onValueChange={(value) =>
                    updateSettings({ confirmDelete: value })
                  }
                  trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
                  thumbColor={settings.confirmDelete ? BLUE : '#FFFFFF'}
                />
              </View>

              {/* ========================================== */}
              {/* EXPORT SECTION */}
              {/* ========================================== */}

              <Text
                style={[styles.modalSectionTitle, { color: secondaryText }]}
              >
                خروجی گرفتن
              </Text>

              {/* CSV */}
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.actionSettingRow, { borderColor }]}
                onPress={handleExportCSV}
                disabled={exporting || trades.length === 0}
              >
                <View
                  style={[
                    styles.settingIcon,
                    {
                      backgroundColor: isDark ? '#052E16' : '#F0FDF4',
                    },
                  ]}
                >
                  {exporting ? (
                    <ActivityIndicator size="small" color="#16A34A" />
                  ) : (
                    <Ionicons
                      name="document-text-outline"
                      size={22}
                      color="#16A34A"
                    />
                  )}
                </View>

                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: primaryText }]}>
                    خروجی CSV
                  </Text>

                  <Text
                    style={[styles.settingSubtitle, { color: secondaryText }]}
                  >
                    {trades.length > 0
                      ? `${trades.length} معامله • داده خام`
                      : 'هنوز معامله‌ای ثبت نکردی'}
                  </Text>
                </View>

                <Ionicons
                  name="chevron-back"
                  size={20}
                  color={secondaryText}
                />
              </TouchableOpacity>

              {/* Excel */}
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.actionSettingRow, { borderColor }]}
                onPress={handleExportExcel}
                disabled={exporting || trades.length === 0}
              >
                <View
                  style={[
                    styles.settingIcon,
                    {
                      backgroundColor: isDark ? '#064E3B' : '#ECFDF5',
                    },
                  ]}
                >
                  {exporting ? (
                    <ActivityIndicator size="small" color="#059669" />
                  ) : (
                    <Ionicons
                      name="grid-outline"
                      size={22}
                      color="#059669"
                    />
                  )}
                </View>

                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: primaryText }]}>
                    خروجی Excel
                  </Text>

                  <Text
                    style={[styles.settingSubtitle, { color: secondaryText }]}
                  >
                    {trades.length > 0
                      ? `${trades.length} معامله • آمار + جدول`
                      : 'هنوز معامله‌ای ثبت نکردی'}
                  </Text>
                </View>

                <Ionicons
                  name="chevron-back"
                  size={20}
                  color={secondaryText}
                />
              </TouchableOpacity>

              {/* PNG */}
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.actionSettingRow, { borderColor }]}
                onPress={handleExportPNG}
                disabled={exporting || trades.length === 0}
              >
                <View
                  style={[
                    styles.settingIcon,
                    {
                      backgroundColor: isDark ? '#450A0A' : '#FEF2F2',
                    },
                  ]}
                >
                  {exporting ? (
                    <ActivityIndicator size="small" color="#DC2626" />
                  ) : (
                    <Ionicons
                      name="image-outline"
                      size={22}
                      color="#DC2626"
                    />
                  )}
                </View>

                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: primaryText }]}>
                    خروجی تصویر گزارش
                  </Text>

                  <Text
                    style={[styles.settingSubtitle, { color: secondaryText }]}
                  >
                    {trades.length > 0
                      ? `${trades.length} معامله • برای اشتراک‌گذاری`
                      : 'هنوز معامله‌ای ثبت نکردی'}
                  </Text>
                </View>

                <Ionicons
                  name="chevron-back"
                  size={20}
                  color={secondaryText}
                />
              </TouchableOpacity>

              {/* STATS */}
              <Text
                style={[styles.modalSectionTitle, { color: secondaryText }]}
              >
                اطلاعات و آمار
              </Text>

              <View style={[styles.settingRow, { borderColor }]}>
                <View
                  style={[
                    styles.settingIcon,
                    { backgroundColor: iconBackground },
                  ]}
                >
                  <Ionicons
                    name="stats-chart-outline"
                    size={22}
                    color={BLUE}
                  />
                </View>

                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: primaryText }]}>
                    نمایش آمار
                  </Text>

                  <Text
                    style={[styles.settingSubtitle, { color: secondaryText }]}
                  >
                    دسترسی سریع به آمار ژورنال
                  </Text>
                </View>

                <Switch
                  value={settings.showStatistics}
                  onValueChange={(value) =>
                    updateSettings({ showStatistics: value })
                  }
                  trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
                  thumbColor={settings.showStatistics ? BLUE : '#FFFFFF'}
                />
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.actionSettingRow, { borderColor }]}
                onPress={() => setPrivacyVisible(true)}
              >
                <View
                  style={[
                    styles.settingIcon,
                    { backgroundColor: iconBackground },
                  ]}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={22}
                    color={BLUE}
                  />
                </View>

                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: primaryText }]}>
                    حریم خصوصی
                  </Text>

                  <Text
                    style={[styles.settingSubtitle, { color: secondaryText }]}
                  >
                    نحوه نگهداری و استفاده از اطلاعات
                  </Text>
                </View>

                <Ionicons
                  name="chevron-back"
                  size={20}
                  color={secondaryText}
                />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.actionSettingRow, { borderColor }]}
                onPress={() => setTermsVisible(true)}
              >
                <View
                  style={[
                    styles.settingIcon,
                    { backgroundColor: iconBackground },
                  ]}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={22}
                    color={BLUE}
                  />
                </View>

                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: primaryText }]}>
                    شرایط استفاده
                  </Text>

                  <Text
                    style={[styles.settingSubtitle, { color: secondaryText }]}
                  >
                    قوانین و شرایط استفاده از NAVASAN
                  </Text>
                </View>

                <Ionicons
                  name="chevron-back"
                  size={20}
                  color={secondaryText}
                />
              </TouchableOpacity>

              {settings.showStatistics && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.actionSettingRow, { borderColor }]}
                  onPress={() => setStatsVisible(true)}
                >
                  <View
                    style={[
                      styles.settingIcon,
                      { backgroundColor: iconBackground },
                    ]}
                  >
                    <Ionicons
                      name="analytics-outline"
                      size={22}
                      color={BLUE}
                    />
                  </View>

                  <View style={styles.settingText}>
                    <Text
                      style={[styles.settingTitle, { color: primaryText }]}
                    >
                      آمار ژورنال
                    </Text>

                    <Text
                      style={[
                        styles.settingSubtitle,
                        { color: secondaryText },
                      ]}
                    >
                      مشاهده تعداد معاملات ثبت‌شده
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-back"
                    size={20}
                    color={secondaryText}
                  />
                </TouchableOpacity>
              )}

              {/* MANAGE DATA */}
              <Text
                style={[styles.modalSectionTitle, { color: secondaryText }]}
              >
                مدیریت اطلاعات
              </Text>

              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.dangerRow,
                  {
                    borderColor: '#FECACA',
                    backgroundColor: isDark ? '#2A1111' : '#FEF2F2',
                  },
                ]}
                onPress={clearJournalData}
              >
                <View style={styles.dangerIcon}>
                  <Ionicons
                    name="trash-outline"
                    size={22}
                    color="#DC2626"
                  />
                </View>

                <View style={styles.settingText}>
                  <Text style={styles.dangerTitle}>
                    پاک کردن ژورنال
                  </Text>

                  <Text style={styles.dangerSubtitle}>
                    حذف معاملات ذخیره‌شده روی این دستگاه
                  </Text>
                </View>

                <Ionicons
                  name="chevron-back"
                  size={20}
                  color="#DC2626"
                />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.actionSettingRow, { borderColor }]}
                onPress={resetSettings}
              >
                <View
                  style={[
                    styles.settingIcon,
                    {
                      backgroundColor: isDark ? '#27272A' : '#F1F5F9',
                    },
                  ]}
                >
                  <Ionicons
                    name="refresh-outline"
                    size={22}
                    color={secondaryText}
                  />
                </View>

                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: primaryText }]}>
                    بازنشانی تنظیمات
                  </Text>

                  <Text
                    style={[styles.settingSubtitle, { color: secondaryText }]}
                  >
                    بازگرداندن تنظیمات به حالت پیش‌فرض
                  </Text>
                </View>

                <Ionicons
                  name="chevron-back"
                  size={20}
                  color={secondaryText}
                />
              </TouchableOpacity>

              <View style={styles.settingsInfoBox}>
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={BLUE}
                />

                <Text
                  style={[styles.settingsInfoText, { color: secondaryText }]}
                >
                  تنظیمات این بخش روی همین دستگاه ذخیره
                  می‌شوند و با باز کردن دوباره برنامه
                  حفظ خواهند شد.
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.doneButton}
                onPress={() => setSettingsVisible(false)}
              >
                <Text style={styles.doneButtonText}>
                  ذخیره و بستن
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Contact Modal */}
      <Modal
        visible={contactVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setContactVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.contactModal,
              { backgroundColor: cardColor },
            ]}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setContactVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={23} color={primaryText} />
              </TouchableOpacity>

              <Text style={[styles.modalTitle, { color: primaryText }]}>
                تماس با ما
              </Text>

              <View style={styles.headerPlaceholder} />
            </View>

            <Text
              style={[styles.contactDescription, { color: secondaryText }]}
            >
              اگر سؤال، پیشنهاد، انتقاد یا مشکلی در
              NAVASAN داری، از یکی از راه‌های زیر با
              ما در ارتباط باش.
            </Text>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.contactRow, { borderColor }]}
              onPress={openTelegram}
            >
              <View
                style={[
                  styles.contactIcon,
                  { backgroundColor: '#E0F2FE' },
                ]}
              >
                <Ionicons
                  name="paper-plane-outline"
                  size={24}
                  color="#0284C7"
                />
              </View>

              <View style={styles.contactText}>
                <Text style={[styles.contactTitle, { color: primaryText }]}>
                  تلگرام
                </Text>

                <Text
                  style={[styles.contactSubtitle, { color: secondaryText }]}
                >
                  {TELEGRAM_USERNAME}
                </Text>
              </View>

              <Ionicons
                name="chevron-back"
                size={20}
                color={secondaryText}
              />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.contactRow, { borderColor }]}
              onPress={openRubika}
            >
              <View
                style={[
                  styles.contactIcon,
                  { backgroundColor: '#EEF2FF' },
                ]}
              >
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={24}
                  color="#4F46E5"
                />
              </View>

              <View style={styles.contactText}>
                <Text style={[styles.contactTitle, { color: primaryText }]}>
                  روبیکا
                </Text>

                <Text
                  style={[styles.contactSubtitle, { color: secondaryText }]}
                >
                  {RUBIKA_USERNAME}
                </Text>
              </View>

              <Ionicons
                name="chevron-back"
                size={20}
                color={secondaryText}
              />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.contactRow, { borderColor }]}
              onPress={openEmail}
            >
              <View
                style={[
                  styles.contactIcon,
                  { backgroundColor: '#EFF6FF' },
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={24}
                  color={BLUE}
                />
              </View>

              <View style={styles.contactText}>
                <Text style={[styles.contactTitle, { color: primaryText }]}>
                  ایمیل
                </Text>

                <Text
                  style={[styles.contactSubtitle, { color: secondaryText }]}
                >
                  {SUPPORT_EMAIL}
                </Text>
              </View>

              <Ionicons
                name="chevron-back"
                size={20}
                color={secondaryText}
              />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.doneButton}
              onPress={() => setContactVisible(false)}
            >
              <Text style={styles.doneButtonText}>بستن</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* About Modal */}
      <Modal
        visible={aboutVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAboutVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.aboutModal,
              { backgroundColor: cardColor },
            ]}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.aboutLogo}>
                <Text style={styles.aboutLogoText}>N</Text>
              </View>

              <Text style={[styles.aboutTitle, { color: primaryText }]}>
                NAVASAN
              </Text>

              <Text style={[styles.aboutSubtitle, { color: secondaryText }]}>
                یک پلتفرم جامع برای تریدرها
              </Text>

              <Text
                style={[styles.aboutDescription, { color: secondaryText }]}
              >
                NAVASAN فقط یک ژورنال معاملاتی نیست.
                هدف ما ساختن یک فضای یکپارچه برای
                معامله‌گرهاست؛ جایی که بتوانند مسیر
                معاملاتی خود را ثبت کنند، عملکردشان را
                بررسی کنند، تحلیل‌های خود را به اشتراک
                بگذارند، آموزش ببینند و ابزارهای موردنیاز
                خود را در یک محیط منظم در اختیار داشته
                باشند.
              </Text>

              <View
                style={[
                  styles.aboutFeature,
                  {
                    backgroundColor: isDark ? '#18181B' : '#F8FAFC',
                  },
                ]}
              >
                <View style={styles.aboutFeatureIcon}>
                  <Ionicons name="book-outline" size={22} color={BLUE} />
                </View>

                <View style={styles.aboutFeatureText}>
                  <Text
                    style={[styles.aboutFeatureTitle, { color: primaryText }]}
                  >
                    ژورنال معاملاتی
                  </Text>

                  <Text
                    style={[
                      styles.aboutFeatureDescription,
                      { color: secondaryText },
                    ]}
                  >
                    ثبت معاملات، بررسی نتایج، مدیریت اطلاعات
                    و شناخت بهتر عملکرد معاملاتی.
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.aboutFeature,
                  {
                    backgroundColor: isDark ? '#18181B' : '#F8FAFC',
                  },
                ]}
              >
                <View style={styles.aboutFeatureIcon}>
                  <Ionicons
                    name="analytics-outline"
                    size={22}
                    color={BLUE}
                  />
                </View>

                <View style={styles.aboutFeatureText}>
                  <Text
                    style={[styles.aboutFeatureTitle, { color: primaryText }]}
                  >
                    تحلیل و اتاق تحلیل
                  </Text>

                  <Text
                    style={[
                      styles.aboutFeatureDescription,
                      { color: secondaryText },
                    ]}
                  >
                    بررسی بازار و اشتراک‌گذاری تحلیل‌ها با
                    جامعه معامله‌گران NAVASAN.
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.aboutFeature,
                  {
                    backgroundColor: isDark ? '#18181B' : '#F8FAFC',
                  },
                ]}
              >
                <View style={styles.aboutFeatureIcon}>
                  <Ionicons name="school-outline" size={22} color={BLUE} />
                </View>

                <View style={styles.aboutFeatureText}>
                  <Text
                    style={[styles.aboutFeatureTitle, { color: primaryText }]}
                  >
                    آموزش
                  </Text>

                  <Text
                    style={[
                      styles.aboutFeatureDescription,
                      { color: secondaryText },
                    ]}
                  >
                    دسترسی به دوره‌ها و محتوای آموزشی برای
                    توسعه دانش و مهارت معاملاتی.
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.aboutFeature,
                  {
                    backgroundColor: isDark ? '#18181B' : '#F8FAFC',
                  },
                ]}
              >
                <View style={styles.aboutFeatureIcon}>
                  <Ionicons name="flash-outline" size={22} color={BLUE} />
                </View>

                <View style={styles.aboutFeatureText}>
                  <Text
                    style={[styles.aboutFeatureTitle, { color: primaryText }]}
                  >
                    ستاپ‌ها و ابزارها
                  </Text>

                  <Text
                    style={[
                      styles.aboutFeatureDescription,
                      { color: secondaryText },
                    ]}
                  >
                    مجموعه‌ای از امکانات کاربردی برای
                    سازمان‌دهی بهتر فرآیند معاملاتی.
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.aboutFeature,
                  {
                    backgroundColor: isDark ? '#18181B' : '#F8FAFC',
                  },
                ]}
              >
                <View style={styles.aboutFeatureIcon}>
                  <Ionicons
                    name="storefront-outline"
                    size={22}
                    color={BLUE}
                  />
                </View>

                <View style={styles.aboutFeatureText}>
                  <Text
                    style={[styles.aboutFeatureTitle, { color: primaryText }]}
                  >
                    فروشگاه
                  </Text>

                  <Text
                    style={[
                      styles.aboutFeatureDescription,
                      { color: secondaryText },
                    ]}
                  >
                    بستری برای دسترسی به محصولات و منابع
                    مرتبط با دنیای معامله‌گری.
                  </Text>
                </View>
              </View>

              <Text
                style={[styles.aboutClosing, { color: secondaryText }]}
              >
                NAVASAN با هدف ایجاد یک تجربه منظم،
                کاربردی و حرفه‌ای برای معامله‌گران ساخته
                شده و امکانات آن در طول زمان توسعه پیدا
                خواهد کرد.
              </Text>

              <View
                style={[
                  styles.aboutVersionBox,
                  {
                    backgroundColor: isDark ? '#18181B' : '#F8FAFC',
                  },
                ]}
              >
                <Text
                  style={[styles.aboutVersionLabel, { color: secondaryText }]}
                >
                  نسخه فعلی
                </Text>

                <Text style={[styles.aboutVersion, { color: primaryText }]}>
                  1.0.0
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.doneButton}
                onPress={() => setAboutVisible(false)}
              >
                <Text style={styles.doneButtonText}>بستن</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* FAQ Modal */}
      <Modal
        visible={faqVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFaqVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.faqModal,
              { backgroundColor: cardColor },
            ]}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setFaqVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={23} color={primaryText} />
              </TouchableOpacity>

              <Text style={[styles.modalTitle, { color: primaryText }]}>
                سؤالات متداول
              </Text>

              <View style={styles.headerPlaceholder} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.faqItem}>
                <Text style={[styles.faqQuestion, { color: primaryText }]}>
                  NAVASAN چیست؟
                </Text>

                <Text style={[styles.faqAnswer, { color: secondaryText }]}>
                  NAVASAN یک پلتفرم جامع برای معامله‌گران
                  است که امکاناتی مانند ژورنال معاملاتی،
                  تحلیل، آموزش، ستاپ‌ها، اتاق تحلیل و
                  امکانات تکمیلی را در یک محیط واحد
                  ارائه می‌کند.
                </Text>
              </View>

              <View style={styles.faqItem}>
                <Text style={[styles.faqQuestion, { color: primaryText }]}>
                  آیا NAVASAN فقط برای ثبت معاملات است؟
                </Text>

                <Text style={[styles.faqAnswer, { color: secondaryText }]}>
                  خیر. ژورنال یکی از بخش‌های اصلی NAVASAN
                  است، اما برنامه با هدف ارائه یک تجربه
                  کامل‌تر شامل تحلیل، آموزش، ستاپ‌ها،
                  اشتراک‌گذاری تحلیل و امکانات مرتبط با
                  معامله‌گری توسعه داده می‌شود.
                </Text>
              </View>

              <View style={styles.faqItem}>
                <Text style={[styles.faqQuestion, { color: primaryText }]}>
                  اطلاعات ژورنال کجا ذخیره می‌شود؟
                </Text>

                <Text style={[styles.faqAnswer, { color: secondaryText }]}>
                  در نسخه فعلی، اطلاعات ژورنال روی دستگاه
                  ذخیره می‌شوند. معماری برنامه به‌گونه‌ای
                  طراحی شده که امکانات آنلاین و
                  همگام‌سازی در نسخه‌های بعدی قابل توسعه
                  باشند.
                </Text>
              </View>

              <View style={styles.faqItem}>
                <Text style={[styles.faqQuestion, { color: primaryText }]}>
                  آیا می‌توان حالت تاریک را فعال کرد؟
                </Text>

                <Text style={[styles.faqAnswer, { color: secondaryText }]}>
                  بله. از بخش تنظیمات می‌توان بین حالت
                  روشن و تاریک جابه‌جا شد. انتخاب شما روی
                  همین دستگاه ذخیره می‌شود.
                </Text>
              </View>

              <View style={styles.faqItem}>
                <Text style={[styles.faqQuestion, { color: primaryText }]}>
                  اگر بخواهم اطلاعات ژورنالم را حذف کنم
                  چه کار کنم؟
                </Text>

                <Text style={[styles.faqAnswer, { color: secondaryText }]}>
                  از مسیر بیشتر ← تنظیمات ← مدیریت اطلاعات
                  می‌توانی اطلاعات ژورنال ذخیره‌شده روی
                  دستگاه را پاک کنی. قبل از حذف، در حالت
                  پیش‌فرض از شما تأیید گرفته می‌شود.
                </Text>
              </View>

              <View style={styles.faqItem}>
                <Text style={[styles.faqQuestion, { color: primaryText }]}>
                  چگونه با پشتیبانی ارتباط بگیرم؟
                </Text>

                <Text style={[styles.faqAnswer, { color: secondaryText }]}>
                  از بخش تماس با ما می‌توانی از طریق
                  تلگرام، روبیکا یا ایمیل با تیم NAVASAN
                  ارتباط بگیری.
                </Text>
              </View>

              <View style={styles.faqItem}>
                <Text style={[styles.faqQuestion, { color: primaryText }]}>
                  آیا امکانات جدید به NAVASAN اضافه می‌شود؟
                </Text>

                <Text style={[styles.faqAnswer, { color: secondaryText }]}>
                  بله. NAVASAN به‌صورت مرحله‌ای توسعه پیدا
                  می‌کند و هدف آن اضافه شدن امکانات بیشتر
                  برای مدیریت، تحلیل و آموزش معامله‌گران
                  است.
                </Text>
              </View>

              <View style={styles.faqItem}>
                <Text style={[styles.faqQuestion, { color: primaryText }]}>
                  آیا NAVASAN سیگنال معاملاتی ارائه می‌دهد؟
                </Text>

                <Text style={[styles.faqAnswer, { color: secondaryText }]}>
                  هدف NAVASAN فراهم کردن ابزار و محیطی برای
                  ثبت، تحلیل، آموزش و بهبود فرآیند تصمیم‌گیری
                  معامله‌گر است و نباید امکانات آموزشی یا
                  تحلیلی برنامه را به‌عنوان تضمین نتیجه
                  معاملاتی در نظر گرفت.
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.doneButton}
              onPress={() => setFaqVisible(false)}
            >
              <Text style={styles.doneButtonText}>بستن</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Privacy Modal */}
      <Modal
        visible={privacyVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPrivacyVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.textModal,
              { backgroundColor: cardColor },
            ]}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setPrivacyVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={23} color={primaryText} />
              </TouchableOpacity>

              <Text style={[styles.modalTitle, { color: primaryText }]}>
                حریم خصوصی
              </Text>

              <View style={styles.headerPlaceholder} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.policyTitle, { color: primaryText }]}>
                اطلاعات شما
              </Text>

              <Text style={[styles.policyText, { color: secondaryText }]}>
                NAVASAN تلاش می‌کند اطلاعات کاربران را فقط
                برای ارائه و بهبود امکانات برنامه استفاده
                کند. اطلاعات حساب کاربری و داده‌های مرتبط
                با امکانات آنلاین، مطابق معماری سرویس
                مربوطه مدیریت می‌شوند.
              </Text>

              <Text style={[styles.policyTitle, { color: primaryText }]}>
                اطلاعات ژورنال
              </Text>

              <Text style={[styles.policyText, { color: secondaryText }]}>
                در نسخه فعلی، داده‌های ژورنال معاملاتی روی
                دستگاه کاربر نگهداری می‌شوند. حذف آن‌ها از
                داخل تنظیمات امکان‌پذیر است.
              </Text>

              <Text style={[styles.policyTitle, { color: primaryText }]}>
                امنیت حساب
              </Text>

              <Text style={[styles.policyText, { color: secondaryText }]}>
                برای اطلاعات حساب و قابلیت‌های آنلاین،
                دسترسی‌ها و داده‌ها باید به شکل امن مدیریت
                شوند. کاربران نیز باید از نگهداری امن
                اطلاعات ورود خود اطمینان داشته باشند.
              </Text>

              <Text style={[styles.policyTitle, { color: primaryText }]}>
                تغییرات آینده
              </Text>

              <Text style={[styles.policyText, { color: secondaryText }]}>
                با توسعه NAVASAN و اضافه شدن قابلیت‌های
                جدید، این بخش نیز می‌تواند به‌روزرسانی
                شود.
              </Text>
            </ScrollView>

            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.doneButton}
              onPress={() => setPrivacyVisible(false)}
            >
              <Text style={styles.doneButtonText}>بستن</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Terms Modal */}
      <Modal
        visible={termsVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTermsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.textModal,
              { backgroundColor: cardColor },
            ]}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setTermsVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={23} color={primaryText} />
              </TouchableOpacity>

              <Text style={[styles.modalTitle, { color: primaryText }]}>
                شرایط استفاده
              </Text>

              <View style={styles.headerPlaceholder} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.policyTitle, { color: primaryText }]}>
                استفاده از برنامه
              </Text>

              <Text style={[styles.policyText, { color: secondaryText }]}>
                استفاده از NAVASAN به معنی پذیرش قوانین و
                شرایط استفاده از برنامه است. کاربر مسئول
                اطلاعاتی است که در حساب خود وارد یا در
                برنامه ثبت می‌کند.
              </Text>

              <Text style={[styles.policyTitle, { color: primaryText }]}>
                مسئولیت معاملاتی
              </Text>

              <Text style={[styles.policyText, { color: secondaryText }]}>
                NAVASAN یک ابزار نرم‌افزاری برای ثبت،
                تحلیل، آموزش و مدیریت اطلاعات معاملاتی
                است. استفاده از امکانات برنامه به معنی
                تضمین سود یا نتیجه معاملاتی نیست و تصمیم
                نهایی معامله‌گری بر عهده خود کاربر است.
              </Text>

              <Text style={[styles.policyTitle, { color: primaryText }]}>
                محتوای کاربران
              </Text>

              <Text style={[styles.policyText, { color: secondaryText }]}>
                در بخش‌هایی مانند اتاق تحلیل، کاربران ممکن
                است محتوا یا تحلیل خود را منتشر کنند.
                مسئولیت محتوای منتشرشده بر عهده منتشرکننده
                آن است.
              </Text>

              <Text style={[styles.policyTitle, { color: primaryText }]}>
                تغییر شرایط
              </Text>

              <Text style={[styles.policyText, { color: secondaryText }]}>
                با توسعه و اضافه شدن قابلیت‌های جدید،
                شرایط استفاده ممکن است به‌روزرسانی شود.
              </Text>
            </ScrollView>

            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.doneButton}
              onPress={() => setTermsVisible(false)}
            >
              <Text style={styles.doneButtonText}>بستن</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Statistics Modal */}
      <Modal
        visible={statsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStatsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.statsModal,
              { backgroundColor: cardColor },
            ]}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setStatsVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={23} color={primaryText} />
              </TouchableOpacity>

              <Text style={[styles.modalTitle, { color: primaryText }]}>
                آمار ژورنال
              </Text>

              <View style={styles.headerPlaceholder} />
            </View>

            <View
              style={[
                styles.bigStatCard,
                {
                  backgroundColor: isDark ? '#172554' : '#EFF6FF',
                },
              ]}
            >
              <Ionicons name="bar-chart-outline" size={30} color={BLUE} />

              <Text style={[styles.bigStatNumber, { color: primaryText }]}>
                {journalCount}
              </Text>

              <Text style={[styles.bigStatLabel, { color: secondaryText }]}>
                معامله ثبت‌شده
              </Text>
            </View>

            <Text
              style={[styles.statsDescription, { color: secondaryText }]}
            >
              این عدد تعداد معاملات ذخیره‌شده فعلی در
              ژورنال روی همین دستگاه را نشان می‌دهد.
            </Text>

            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.doneButton}
              onPress={() => setStatsVisible(false)}
            >
              <Text style={styles.doneButtonText}>بستن</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ================================================ */}
      {/* OFF-SCREEN EXPORT CARD (for PNG capture) */}
      {/* ================================================ */}

      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: -9999,
          top: 0,
          opacity: 0,
        }}
      >
        <ExportPreviewCard ref={exportCardRef} stats={exportStats} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 58,
    paddingBottom: 120,
  },

  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'right',
  },

  subtitle: {
    marginTop: 5,
    fontSize: 13,
    textAlign: 'right',
  },

  logoBox: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoText: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '900',
  },

  profileCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 26,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  profileIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileInfo: {
    flex: 1,
    marginHorizontal: 14,
  },

  profileTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'right',
  },

  profileSubtitle: {
    marginTop: 4,
    fontSize: 12,
    textAlign: 'right',
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'right',
  },

  quickSettingsCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  quickRow: {
    minHeight: 76,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 14,
  },

  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  quickText: {
    flex: 1,
    marginHorizontal: 12,
  },

  quickTitle: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'right',
  },

  quickSubtitle: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'right',
  },

  quickDivider: {
    height: 1,
    marginHorizontal: 14,
  },

  menuCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  menuItem: {
    minHeight: 76,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 14,
  },

  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  menuText: {
    flex: 1,
    marginHorizontal: 12,
  },

  menuTitle: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'right',
  },

  menuSubtitle: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'right',
  },

  footer: {
    alignItems: 'center',
    marginTop: 32,
  },

  footerTitle: {
    fontSize: 14,
    fontWeight: '900',
  },

  footerText: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },

  versionText: {
    fontSize: 10,
    marginTop: 8,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },

  settingsModal: {
    width: '100%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    maxHeight: '94%',
  },

  contactModal: {
    width: '100%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },

  faqModal: {
    width: '100%',
    maxHeight: '91%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },

  textModal: {
    width: '100%',
    maxHeight: '90%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },

  aboutModal: {
    width: '100%',
    maxHeight: '92%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },

  statsModal: {
    marginHorizontal: 22,
    borderRadius: 28,
    padding: 20,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },

  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerPlaceholder: {
    width: 42,
    height: 42,
  },

  modalSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
    marginBottom: 9,
    marginTop: 5,
  },

  settingRow: {
    minHeight: 76,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    marginBottom: 18,
  },

  actionSettingRow: {
    minHeight: 72,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    marginBottom: 12,
  },

  settingIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  settingText: {
    flex: 1,
    marginHorizontal: 12,
  },

  settingTitle: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'right',
  },

  settingSubtitle: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'right',
    lineHeight: 18,
  },

  settingsInfoBox: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 9,
    marginTop: 6,
    marginBottom: 20,
    paddingHorizontal: 4,
  },

  settingsInfoText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 19,
    textAlign: 'right',
  },

  doneButton: {
    height: 52,
    borderRadius: 16,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },

  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },

  dangerRow: {
    minHeight: 72,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    marginBottom: 12,
  },

  dangerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  dangerTitle: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'right',
  },

  dangerSubtitle: {
    color: '#EF4444',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'right',
  },

  contactDescription: {
    fontSize: 13,
    lineHeight: 22,
    textAlign: 'right',
    marginBottom: 18,
  },

  contactRow: {
    minHeight: 76,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    marginBottom: 12,
  },

  contactIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  contactText: {
    flex: 1,
    marginHorizontal: 12,
  },

  contactTitle: {
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'right',
  },

  contactSubtitle: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'right',
  },

  aboutLogo: {
    alignSelf: 'center',
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  aboutLogoText: {
    color: '#FFFFFF',
    fontSize: 38,
    fontWeight: '900',
  },

  aboutTitle: {
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },

  aboutSubtitle: {
    fontSize: 13,
    marginTop: 5,
    textAlign: 'center',
  },

  aboutDescription: {
    fontSize: 13,
    lineHeight: 24,
    textAlign: 'right',
    marginTop: 20,
    marginBottom: 16,
  },

  aboutFeature: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    borderRadius: 18,
    padding: 13,
    marginBottom: 10,
  },

  aboutFeatureIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  aboutFeatureText: {
    flex: 1,
    marginHorizontal: 11,
  },

  aboutFeatureTitle: {
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'right',
  },

  aboutFeatureDescription: {
    fontSize: 11,
    lineHeight: 19,
    marginTop: 4,
    textAlign: 'right',
  },

  aboutClosing: {
    fontSize: 12,
    lineHeight: 21,
    textAlign: 'right',
    marginTop: 10,
  },

  aboutVersionBox: {
    width: '100%',
    borderRadius: 16,
    padding: 13,
    marginTop: 18,
    marginBottom: 4,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  aboutVersionLabel: {
    fontSize: 12,
  },

  aboutVersion: {
    fontSize: 13,
    fontWeight: '800',
  },

  faqItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },

  faqQuestion: {
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'right',
    marginBottom: 8,
  },

  faqAnswer: {
    fontSize: 12,
    lineHeight: 21,
    textAlign: 'right',
  },

  policyTitle: {
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'right',
    marginTop: 12,
    marginBottom: 8,
  },

  policyText: {
    fontSize: 12,
    lineHeight: 22,
    textAlign: 'right',
    marginBottom: 12,
  },

  bigStatCard: {
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 25,
    marginBottom: 15,
  },

  bigStatNumber: {
    fontSize: 40,
    fontWeight: '900',
    marginTop: 8,
  },

  bigStatLabel: {
    fontSize: 12,
    marginTop: 3,
  },

  statsDescription: {
    fontSize: 12,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 8,
  },
});