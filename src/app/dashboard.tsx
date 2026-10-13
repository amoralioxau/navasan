import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';

import { useNavasanTheme } from '@/context/theme-context';
import { useXP } from '@/context/xp-context';

// =========================================================
// TYPES
// =========================================================

type Trade = {
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
  rating?: number;
};

const STORAGE_KEY = 'navasan_trades_v1';
const BALANCE_STORAGE_KEY = 'navasan_account_v1';
const GOALS_STORAGE_KEY = 'navasan_goals_v1';

const BLUE = '#2563EB';
const BLUE_LIGHT = '#3B82F6';
const BLUE_DARK = '#1E40AF';
const GREEN = '#16A34A';
const RED = '#DC2626';
const AMBER = '#D97706';
const PURPLE = '#7C3AED';
const CYAN = '#0891B2';
const GOLD = '#EAB308';

// =========================================================
// HELPERS
// =========================================================

const toNumber = (value: string | number) => {
  const n = typeof value === 'number' ? value : Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
};

const getOutcome = (trade: Trade) => {
  const result = toNumber(trade.result);
  if (result > 0) return 'win';
  if (result < 0) return 'loss';
  return 'be';
};

const formatMoney = (value: number, decimals = 2) => {
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}$${Math.abs(value).toFixed(decimals)}`;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'بدون تاریخ';
  return date.toLocaleDateString('fa-IR', { month: 'short', day: 'numeric' });
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 5) return 'شب بخیر 🌙';
  if (hour < 12) return 'صبح بخیر ☀️';
  if (hour < 17) return 'وقت بخیر 🌤️';
  if (hour < 21) return 'عصر بخیر 🌆';
  return 'شب بخیر 🌙';
};

const getDayKey = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

// =========================================================
// MAIN
// =========================================================

export default function Dashboard() {
  const { colors, isDark } = useNavasanTheme();
  const { levelInfo, state: xpState } = useXP();

  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [initialBalance, setInitialBalance] = useState<number | null>(null);
  const [dailyTarget, setDailyTarget] = useState(200);
  const [dailyMaxLoss, setDailyMaxLoss] = useState(100);
  const [dailyMaxTrades, setDailyMaxTrades] = useState(5);

  const router = useRouter();

  const BG = colors.background;
  const CARD = colors.card;
  const BORDER = colors.border;
  const TEXT = colors.text;
  const MUTED = colors.mutedText;

  // =========================================================
  // LOAD
  // =========================================================

  const loadTrades = useCallback(async () => {
    try {
      const [raw, accountRaw, goalsRaw] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(BALANCE_STORAGE_KEY),
        AsyncStorage.getItem(GOALS_STORAGE_KEY),
      ]);

      if (accountRaw) {
        const account = JSON.parse(accountRaw);
        setInitialBalance(
          typeof account?.initialBalance === 'number' ? account.initialBalance : null
        );
      } else {
        setInitialBalance(null);
      }

      if (goalsRaw) {
        const g = JSON.parse(goalsRaw);
        if (typeof g?.dailyTargetProfit === 'number') setDailyTarget(g.dailyTargetProfit);
        if (typeof g?.dailyMaxLoss === 'number') setDailyMaxLoss(g.dailyMaxLoss);
        if (typeof g?.dailyMaxTrades === 'number') setDailyMaxTrades(g.dailyMaxTrades);
      }

      if (!raw) {
        setTrades([]);
        return;
      }

      const parsed = JSON.parse(raw);
      setTrades(Array.isArray(parsed) ? parsed : []);
    } catch {
      setTrades([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTrades();
  }, [loadTrades]);

  useEffect(() => {
    const interval = setInterval(loadTrades, 1500);
    return () => clearInterval(interval);
  }, [loadTrades]);

  // =========================================================
  // STATS
  // =========================================================

  const stats = useMemo(() => {
    const total = trades.length;
    const wins = trades.filter((t) => getOutcome(t) === 'win').length;
    const losses = trades.filter((t) => getOutcome(t) === 'loss').length;
    const breakevens = total - wins - losses;

    const profit = trades.reduce((sum, t) => {
      const r = toNumber(t.result);
      return r > 0 ? sum + r : sum;
    }, 0);

    const loss = Math.abs(
      trades.reduce((sum, t) => {
        const r = toNumber(t.result);
        return r < 0 ? sum + r : sum;
      }, 0)
    );

    const net = trades.reduce((sum, t) => sum + toNumber(t.result), 0);

    const winRate = total ? (wins / total) * 100 : 0;
    const profitFactor = loss > 0 ? profit / loss : profit > 0 ? 999 : 0;

    const avgWin = wins > 0 ? profit / wins : 0;
    const avgLoss = losses > 0 ? loss / losses : 0;
    const expectancy =
      (winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss;

    const chronological = [...trades].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let equity = 0;
    let peak = 0;
    let maxDrawdown = 0;

    const equityPoints = chronological.map((trade) => {
      equity += toNumber(trade.result);
      peak = Math.max(peak, equity);
      maxDrawdown = Math.max(maxDrawdown, peak - equity);
      return equity;
    });

    const currentBalance = (initialBalance ?? 0) + net;
    const balanceChangePercent =
      initialBalance && initialBalance > 0 ? (net / initialBalance) * 100 : null;

    const todayKey = new Date().toDateString();
    const todayTrades = trades.filter(
      (t) => new Date(t.date).toDateString() === todayKey
    );
    const todayNet = todayTrades.reduce((s, t) => s + toNumber(t.result), 0);
    const todayCount = todayTrades.length;

    const sortedResults = chronological.map((t) => toNumber(t.result));
    let currentStreak = 0;
    if (sortedResults.length) {
      const last = sortedResults[sortedResults.length - 1];
      if (last !== 0) {
        const sign = last > 0 ? 1 : -1;
        for (let i = sortedResults.length - 1; i >= 0; i--) {
          if (
            sortedResults[i] === 0 ||
            (sortedResults[i] > 0 ? 1 : -1) !== sign
          ) {
            break;
          }
          currentStreak += sign;
        }
      }
    }

    const bestTrade = trades.reduce((b, t) => Math.max(b, toNumber(t.result)), 0);
    const worstTrade = trades.reduce((w, t) => Math.min(w, toNumber(t.result)), 0);

    const last7Days: { day: string; pnl: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toDateString();
      const dayPnl = trades
        .filter((t) => new Date(t.date).toDateString() === key)
        .reduce((s, t) => s + toNumber(t.result), 0);
      last7Days.push({
        day: d.toLocaleDateString('fa-IR', { weekday: 'short' }),
        pnl: dayPnl,
      });
    }

    const dayMap: Record<string, number> = {};
    trades.forEach((t) => {
      const k = getDayKey(t.date);
      dayMap[k] = (dayMap[k] || 0) + toNumber(t.result);
    });
    const dayValues = Object.values(dayMap);
    const greenDays = dayValues.filter((v) => v > 0).length;
    const redDays = dayValues.filter((v) => v < 0).length;

    const planAdherence =
      total > 0
        ? (trades.filter((t) => t.followedPlan).length / total) * 100
        : 0;

    return {
      total,
      wins,
      losses,
      breakevens,
      net,
      profit,
      loss,
      winRate,
      profitFactor,
      maxDrawdown,
      equityPoints,
      currentBalance,
      balanceChangePercent,
      todayNet,
      todayCount,
      currentStreak,
      bestTrade,
      worstTrade,
      last7Days,
      greenDays,
      redDays,
      avgWin,
      avgLoss,
      expectancy,
      planAdherence,
    };
  }, [trades, initialBalance]);

  const recentTrades = [...trades]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const chartValues = useMemo(() => {
    if (initialBalance === null) return [];
    return [
      Number(initialBalance.toFixed(2)),
      ...stats.equityPoints.map((v) => Number((v + initialBalance).toFixed(2))),
    ];
  }, [stats.equityPoints, initialBalance]);

  const chartLabels = chartValues.map((_, index) =>
    index === 0 ? 'شروع' : `${index}`
  );

  const dailyGoalPct = useMemo(() => {
    if (dailyTarget <= 0) return 0;
    return Math.min(Math.max((stats.todayNet / dailyTarget) * 100, 0), 100);
  }, [stats.todayNet, dailyTarget]);

  const dailyLossPct = useMemo(() => {
    if (dailyMaxLoss <= 0 || stats.todayNet >= 0) return 0;
    return Math.min((Math.abs(stats.todayNet) / dailyMaxLoss) * 100, 100);
  }, [stats.todayNet, dailyMaxLoss]);

  const insights = useMemo(() => {
    const list: { icon: string; text: string; color: string }[] = [];

    if (stats.total === 0) {
      list.push({
        icon: 'rocket-outline',
        text: 'اولین معامله‌ات رو ثبت کن تا تحلیل شروع بشه',
        color: BLUE,
      });
      return list;
    }

    if (stats.winRate >= 60 && stats.total >= 10) {
      list.push({
        icon: 'flame',
        text: `وین‌ریت ${stats.winRate.toFixed(0)}٪ — داری عالی کار می‌کنی`,
        color: GREEN,
      });
    } else if (stats.winRate < 40 && stats.total >= 10) {
      list.push({
        icon: 'alert-circle',
        text: `وین‌ریت ${stats.winRate.toFixed(0)}٪ — استراتژی رو بازبینی کن`,
        color: RED,
      });
    }

    if (stats.expectancy > 0 && stats.total >= 10) {
      list.push({
        icon: 'trending-up',
        text: `امید ریاضی مثبت: ${formatMoney(stats.expectancy)} در هر معامله`,
        color: GREEN,
      });
    }

    if (stats.currentStreak >= 3) {
      list.push({
        icon: 'trophy',
        text: `${stats.currentStreak} برد پشت سر هم — حواست به tilt باشه`,
        color: GOLD,
      });
    } else if (stats.currentStreak <= -3) {
      list.push({
        icon: 'warning',
        text: `${Math.abs(stats.currentStreak)} باخت پی‌درپی — استراحت کن`,
        color: RED,
      });
    }

    if (stats.planAdherence >= 80 && stats.total >= 10) {
      list.push({
        icon: 'shield-checkmark',
        text: `پایبندی به پلن ${stats.planAdherence.toFixed(0)}٪ — فوق‌العاده`,
        color: GREEN,
      });
    } else if (stats.planAdherence < 50 && stats.total >= 10) {
      list.push({
        icon: 'shield-outline',
        text: 'کمتر از نصف معاملات طبق پلن بوده',
        color: AMBER,
      });
    }

    if (list.length === 0) {
      list.push({
        icon: 'sparkles',
        text: 'داده‌ها دارن جمع می‌شن — بعد از ۱۰ معامله تحلیل عمیق‌تر می‌شی',
        color: BLUE,
      });
    }

    return list.slice(0, 3);
  }, [stats]);

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: BG }]}>
        <ActivityIndicator size="large" color={BLUE} />
        <Text style={[styles.loadingText, { color: MUTED }]}>
          در حال بارگذاری داشبورد...
        </Text>
      </View>
    );
  }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <View style={[styles.container, { backgroundColor: BG }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadTrades();
            }}
            tintColor={BLUE}
          />
        }
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: MUTED }]}>
              {getGreeting()}
            </Text>
            <Text style={[styles.brand, { color: TEXT }]}>NAVASAN</Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => router.push('/profile-xp' as any)}
              style={[styles.xpPill, { backgroundColor: levelInfo.color }]}
              activeOpacity={0.85}
            >
              <Ionicons
                name={levelInfo.icon as any}
                size={14}
                color="#FFFFFF"
              />
              <Text style={styles.xpPillText}>{xpState.totalXP} XP</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.iconButton,
                { backgroundColor: CARD, borderColor: BORDER },
              ]}
              onPress={() => router.push('/notifications' as any)}
            >
              <Ionicons name="notifications-outline" size={21} color={TEXT} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.iconButton,
                { backgroundColor: CARD, borderColor: BORDER },
              ]}
              onPress={() => router.push('/account')}
            >
              <Ionicons name="person-outline" size={21} color={TEXT} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.iconButton,
                { backgroundColor: CARD, borderColor: BORDER },
              ]}
              onPress={() => router.push({ pathname: '/more' } as any)}
            >
              <Ionicons name="ellipsis-horizontal" size={21} color={TEXT} />
            </TouchableOpacity>
          </View>
        </View>

        {/* HERO BALANCE CARD */}
        <View style={styles.heroWrapper}>
          <View style={[styles.heroBgLayer, { backgroundColor: BLUE }]} />
          <View style={[styles.heroCircle1, { backgroundColor: BLUE_LIGHT }]} />
          <View style={[styles.heroCircle2, { backgroundColor: BLUE_DARK }]} />

          <View style={styles.heroContent}>
            <View style={styles.heroTop}>
              <View>
                <Text style={styles.heroLabel}>
                  {initialBalance !== null
                    ? 'موجودی فعلی حساب'
                    : 'خالص عملکرد معاملات'}
                </Text>
                <Text style={styles.heroValue}>
                  {initialBalance !== null
                    ? `$${stats.currentBalance.toFixed(2)}`
                    : formatMoney(stats.net)}
                </Text>

                {initialBalance !== null && stats.balanceChangePercent !== null && (
                  <View style={styles.heroChangeRow}>
                    <Ionicons
                      name={
                        stats.balanceChangePercent >= 0
                          ? 'arrow-up-circle'
                          : 'arrow-down-circle'
                      }
                      size={16}
                      color="#FFFFFF"
                    />
                    <Text style={styles.heroChangeText}>
                      {stats.balanceChangePercent >= 0 ? '+' : ''}
                      {stats.balanceChangePercent.toFixed(2)}% از شروع
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.heroBadge}>
                <Ionicons name="trending-up" size={26} color="#FFFFFF" />
              </View>
            </View>

            <View style={styles.heroStats}>
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatLabel}>موجودی شروع</Text>
                <Text style={styles.heroStatValue}>
                  {initialBalance !== null
                    ? `$${initialBalance.toFixed(0)}`
                    : '—'}
                </Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatLabel}>معاملات</Text>
                <Text style={styles.heroStatValue}>{stats.total}</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatLabel}>وین‌ریت</Text>
                <Text style={styles.heroStatValue}>
                  {stats.winRate.toFixed(1)}%
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* QUICK ACTIONS — NEW */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={[
              styles.quickAction,
              { backgroundColor: `${GOLD}15`, borderColor: GOLD },
            ]}
            activeOpacity={0.85}
            onPress={() => router.push('/backtest' as any)}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: `${GOLD}28` }]}>
              <Ionicons name="game-controller" size={24} color={GOLD} />
            </View>
            <Text style={[styles.quickActionLabel, { color: TEXT }]}>
              بک‌تست
            </Text>
            <Text style={[styles.quickActionSub, { color: MUTED }]}>
              تست استراتژی
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.quickAction,
              { backgroundColor: `${CYAN}15`, borderColor: CYAN },
            ]}
            activeOpacity={0.85}
            onPress={() => router.push('/chart' as any)}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: `${CYAN}28` }]}>
              <Ionicons name="trending-up" size={24} color={CYAN} />
            </View>
            <Text style={[styles.quickActionLabel, { color: TEXT }]}>
              چارت زنده
            </Text>
            <Text style={[styles.quickActionSub, { color: MUTED }]}>
              تحلیل بازار
            </Text>
          </TouchableOpacity>
        </View>

        {/* TODAY PROGRESS */}
        <View
          style={[styles.todayCard, { backgroundColor: CARD, borderColor: BORDER }]}
        >
          <View style={styles.todayHeader}>
            <View style={styles.todayHeaderLeft}>
              <View
                style={[styles.todayIconWrap, { backgroundColor: `${BLUE}18` }]}
              >
                <Ionicons name="today-outline" size={18} color={BLUE} />
              </View>
              <Text style={[styles.todayTitle, { color: TEXT }]}>امروز</Text>
            </View>

            <View style={styles.todayChipRow}>
              <View
                style={[
                  styles.todayChip,
                  {
                    backgroundColor:
                      stats.todayNet >= 0 ? `${GREEN}18` : `${RED}18`,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.todayChipText,
                    { color: stats.todayNet >= 0 ? GREEN : RED },
                  ]}
                >
                  {formatMoney(stats.todayNet, 0)}
                </Text>
              </View>
              <View
                style={[styles.todayChip, { backgroundColor: `${PURPLE}18` }]}
              >
                <Text style={[styles.todayChipText, { color: PURPLE }]}>
                  {stats.todayCount}/{dailyMaxTrades}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.progressBlock}>
            <View style={styles.progressLabels}>
              <Text style={[styles.progressLabel, { color: MUTED }]}>
                هدف سود روزانه
              </Text>
              <Text style={[styles.progressValue, { color: TEXT }]}>
                ${dailyTarget}
              </Text>
            </View>
            <View
              style={[styles.progressTrack, { backgroundColor: colors.input }]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${dailyGoalPct}%`,
                    backgroundColor: dailyGoalPct >= 100 ? GREEN : BLUE,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressHint, { color: MUTED }]}>
              {dailyGoalPct.toFixed(0)}% از هدف
            </Text>
          </View>

          {stats.todayNet < 0 && (
            <View style={styles.progressBlock}>
              <View style={styles.progressLabels}>
                <Text style={[styles.progressLabel, { color: MUTED }]}>
                  حداکثر ضرر روزانه
                </Text>
                <Text style={[styles.progressValue, { color: RED }]}>
                  ${dailyMaxLoss}
                </Text>
              </View>
              <View
                style={[styles.progressTrack, { backgroundColor: colors.input }]}
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${dailyLossPct}%`,
                      backgroundColor: dailyLossPct >= 80 ? RED : AMBER,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.progressHint, { color: RED }]}>
                {dailyLossPct.toFixed(0)}% از حد مجاز مصرف شده
              </Text>
            </View>
          )}
        </View>

        {/* 7-DAY PERFORMANCE */}
        <View
          style={[
            styles.sevenDayCard,
            { backgroundColor: CARD, borderColor: BORDER },
          ]}
        >
          <View style={styles.sevenDayHeader}>
            <View>
              <Text style={[styles.sevenDayTitle, { color: TEXT }]}>
                عملکرد هفته اخیر
              </Text>
              <Text style={[styles.sevenDaySub, { color: MUTED }]}>
                ۷ روز گذشته
              </Text>
            </View>

            <View style={styles.daysCounter}>
              <View style={styles.dayBadge}>
                <View style={[styles.dayDot, { backgroundColor: GREEN }]} />
                <Text style={[styles.dayBadgeText, { color: TEXT }]}>
                  {stats.greenDays}
                </Text>
              </View>
              <View style={styles.dayBadge}>
                <View style={[styles.dayDot, { backgroundColor: RED }]} />
                <Text style={[styles.dayBadgeText, { color: TEXT }]}>
                  {stats.redDays}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.sevenDayBars}>
            {stats.last7Days.map((d, i) => {
              const maxAbs = Math.max(
                ...stats.last7Days.map((x) => Math.abs(x.pnl)),
                1
              );
              const heightPct = (Math.abs(d.pnl) / maxAbs) * 100;
              const isPositive = d.pnl >= 0;
              const isEmpty = d.pnl === 0;

              return (
                <View key={i} style={styles.dayColumn}>
                  <View style={styles.dayBarContainer}>
                    <View
                      style={[
                        styles.dayBar,
                        {
                          height: isEmpty ? 4 : `${heightPct}%`,
                          backgroundColor: isEmpty
                            ? colors.input
                            : isPositive
                            ? GREEN
                            : RED,
                          opacity: isEmpty ? 0.4 : 1,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.dayName, { color: MUTED }]}>{d.day}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* INSIGHTS */}
        {insights.length > 0 && (
          <View style={styles.insightsSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: TEXT }]}>
                بینش سریع
              </Text>
              <View
                style={[styles.insightBadge, { backgroundColor: `${BLUE}18` }]}
              >
                <Ionicons name="sparkles" size={11} color={BLUE} />
                <Text style={[styles.insightBadgeText, { color: BLUE }]}>
                  AI
                </Text>
              </View>
            </View>

            {insights.map((ins, i) => (
              <View
                key={i}
                style={[
                  styles.insightRow,
                  { backgroundColor: CARD, borderColor: BORDER },
                ]}
              >
                <View
                  style={[
                    styles.insightIconWrap,
                    { backgroundColor: `${ins.color}18` },
                  ]}
                >
                  <Ionicons name={ins.icon as any} size={17} color={ins.color} />
                </View>
                <Text style={[styles.insightText, { color: TEXT }]}>
                  {ins.text}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* STATS GRID */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: TEXT }]}>آمار کلیدی</Text>
          <Text style={[styles.sectionHint, { color: MUTED }]}>
            {stats.total} معامله
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            icon="checkmark-circle"
            label="برد"
            value={String(stats.wins)}
            valueColor={GREEN}
            bg={`${GREEN}12`}
            iconColor={GREEN}
            cardColor={CARD}
            borderColor={BORDER}
            labelColor={MUTED}
          />
          <StatCard
            icon="close-circle"
            label="باخت"
            value={String(stats.losses)}
            valueColor={RED}
            bg={`${RED}12`}
            iconColor={RED}
            cardColor={CARD}
            borderColor={BORDER}
            labelColor={MUTED}
          />
          <StatCard
            icon="analytics"
            label="PF"
            value={
              Number.isFinite(stats.profitFactor)
                ? stats.profitFactor.toFixed(2)
                : '∞'
            }
            valueColor={PURPLE}
            bg={`${PURPLE}12`}
            iconColor={PURPLE}
            cardColor={CARD}
            borderColor={BORDER}
            labelColor={MUTED}
          />
          <StatCard
            icon="flash"
            label="روند"
            value={
              stats.currentStreak > 0
                ? `${stats.currentStreak}W`
                : stats.currentStreak < 0
                ? `${Math.abs(stats.currentStreak)}L`
                : '—'
            }
            valueColor={
              stats.currentStreak > 0
                ? GREEN
                : stats.currentStreak < 0
                ? RED
                : MUTED
            }
            bg={`${
              stats.currentStreak > 0
                ? GREEN
                : stats.currentStreak < 0
                ? RED
                : BLUE
            }12`}
            iconColor={
              stats.currentStreak > 0
                ? GREEN
                : stats.currentStreak < 0
                ? RED
                : BLUE
            }
            cardColor={CARD}
            borderColor={BORDER}
            labelColor={MUTED}
          />
        </View>

        {/* PRO METRICS */}
        {stats.total >= 5 && (
          <View
            style={[
              styles.proMetricsCard,
              { backgroundColor: CARD, borderColor: BORDER },
            ]}
          >
            <View style={styles.proMetricsHeader}>
              <View
                style={[
                  styles.proMetricsIcon,
                  { backgroundColor: `${GOLD}18` },
                ]}
              >
                <Ionicons name="diamond" size={18} color={GOLD} />
              </View>
              <Text style={[styles.proMetricsTitle, { color: TEXT }]}>
                متریک‌های حرفه‌ای
              </Text>
            </View>

            <View style={styles.proMetricsGrid}>
              <ProMetric
                label="Expectancy"
                value={formatMoney(stats.expectancy)}
                color={stats.expectancy >= 0 ? GREEN : RED}
                bg={CARD}
                border={BORDER}
                mutedColor={MUTED}
                textColor={TEXT}
              />
              <ProMetric
                label="Avg Win"
                value={formatMoney(stats.avgWin)}
                color={GREEN}
                bg={CARD}
                border={BORDER}
                mutedColor={MUTED}
                textColor={TEXT}
              />
              <ProMetric
                label="Avg Loss"
                value={formatMoney(-stats.avgLoss)}
                color={RED}
                bg={CARD}
                border={BORDER}
                mutedColor={MUTED}
                textColor={TEXT}
              />
              <ProMetric
                label="Max DD"
                value={formatMoney(-stats.maxDrawdown, 0)}
                color={RED}
                bg={CARD}
                border={BORDER}
                mutedColor={MUTED}
                textColor={TEXT}
              />
            </View>
          </View>
        )}

        {/* EQUITY CHART */}
        <View
          style={[styles.card, { backgroundColor: CARD, borderColor: BORDER }]}
        >
          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.cardTitle, { color: TEXT }]}>
                منحنی سرمایه
              </Text>
              <Text style={[styles.cardSubtitle, { color: MUTED }]}>
                {chartValues.length > 1
                  ? `${chartValues.length - 1} نقطه داده`
                  : 'منتظر معاملات'}
              </Text>
            </View>
            <View
              style={[styles.chartIconWrap, { backgroundColor: `${BLUE}18` }]}
            >
              <Ionicons name="analytics-outline" size={20} color={BLUE} />
            </View>
          </View>

          {initialBalance !== null && chartValues.length > 1 ? (
            <LineChart
              data={{
                labels: chartLabels,
                datasets: [{ data: chartValues }],
              }}
              width={340}
              height={205}
              withDots={chartValues.length < 20}
              withInnerLines={false}
              withOuterLines={false}
              fromZero={false}
              yAxisLabel="$"
              yAxisSuffix=""
              chartConfig={{
                backgroundGradientFrom: CARD,
                backgroundGradientTo: CARD,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
                labelColor: (opacity = 1) =>
                  isDark
                    ? `rgba(148, 163, 184, ${opacity})`
                    : `rgba(100, 116, 139, ${opacity})`,
                propsForDots: {
                  r: '4',
                  strokeWidth: '2',
                  stroke: BLUE,
                },
              }}
              bezier
              style={styles.chart}
            />
          ) : (
            <View style={styles.emptyChart}>
              <View
                style={[
                  styles.emptyIconWrap,
                  { backgroundColor: `${BLUE}12` },
                ]}
              >
                <Ionicons name="bar-chart-outline" size={32} color={BLUE} />
              </View>
              <Text style={[styles.emptyTitle, { color: TEXT }]}>
                {initialBalance === null
                  ? 'سرمایه اولیه ثبت نشده'
                  : 'هنوز معامله‌ای ثبت نشده'}
              </Text>
              <Text style={[styles.emptyText, { color: MUTED }]}>
                {initialBalance === null
                  ? 'سرمایه اولیه رو در ژورنال ثبت کن تا نمودار از همون‌جا شروع بشه.'
                  : 'اولین معامله رو در ژورنال ثبت کن تا منحنی رشد بسازه.'}
              </Text>
              {initialBalance === null && (
                <TouchableOpacity
                  style={[styles.emptyAction, { backgroundColor: BLUE }]}
                  onPress={() =>
                    router.push({
                      pathname: '/',
                      params: { openBalance: '1' },
                    })
                  }
                >
                  <Text style={styles.emptyActionText}>ثبت سرمایه اولیه</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* RECENT TRADES */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: TEXT }]}>
            معاملات اخیر
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/' as any)}
            style={styles.seeAllBtn}
          >
            <Text style={[styles.seeAllText, { color: BLUE }]}>مشاهده همه</Text>
            <Ionicons name="chevron-forward" size={14} color={BLUE} />
          </TouchableOpacity>
        </View>

        <View
          style={[styles.card, { backgroundColor: CARD, borderColor: BORDER }]}
        >
          {recentTrades.length === 0 ? (
            <View style={styles.emptyRecent}>
              <View
                style={[
                  styles.emptyIconWrap,
                  { backgroundColor: `${BLUE}12` },
                ]}
              >
                <Ionicons name="book-outline" size={32} color={BLUE} />
              </View>
              <Text style={[styles.emptyTitle, { color: TEXT }]}>
                ژورنال هنوز خالیه
              </Text>
              <Text style={[styles.emptyText, { color: MUTED }]}>
                از بخش ژورنال اولین معامله‌ات رو ثبت کن.
              </Text>
            </View>
          ) : (
            recentTrades.map((trade, index) => {
              const result = toNumber(trade.result);
              const win = result > 0;
              const loss = result < 0;

              return (
                <View
                  key={trade.id}
                  style={[
                    styles.tradeRow,
                    { borderBottomColor: colors.divider },
                    index === recentTrades.length - 1 && styles.lastTradeRow,
                  ]}
                >
                  <View
                    style={[
                      styles.tradeIcon,
                      {
                        backgroundColor: win
                          ? `${GREEN}18`
                          : loss
                          ? `${RED}18`
                          : `${MUTED}18`,
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        win ? 'arrow-up' : loss ? 'arrow-down' : 'remove'
                      }
                      size={17}
                      color={win ? GREEN : loss ? RED : MUTED}
                    />
                  </View>

                  <View style={styles.tradeInfo}>
                    <Text style={[styles.tradePair, { color: TEXT }]}>
                      {trade.pair || 'نامشخص'}
                    </Text>
                    <Text style={[styles.tradeMeta, { color: MUTED }]}>
                      {trade.direction === 'buy' ? 'BUY' : 'SELL'} •{' '}
                      {formatDate(trade.date)}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text
                      style={[
                        styles.tradeResult,
                        { color: win ? GREEN : loss ? RED : MUTED },
                      ]}
                    >
                      {formatMoney(result, 0)}
                    </Text>
                    {trade.rating ? (
                      <View style={styles.tradeStarsRow}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Ionicons
                            key={s}
                            name={s <= trade.rating! ? 'star' : 'star-outline'}
                            size={8}
                            color={GOLD}
                          />
                        ))}
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* REGISTER BUTTON */}
        <TouchableOpacity
          style={styles.registerButton}
          activeOpacity={0.9}
          onPress={() =>
            router.push({
              pathname: '/',
              params: { openTrade: '1' },
            })
          }
        >
          <View style={styles.registerInner}>
            <View style={styles.registerIcon}>
              <Ionicons name="add" size={26} color="#FFFFFF" />
            </View>

            <View style={styles.registerTextWrap}>
              <Text style={styles.registerTitle}>ثبت معامله جدید</Text>
              <Text style={styles.registerSubtitle}>
                معامله بعدی رو در ژورنال ثبت کن
              </Text>
            </View>

            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        <View style={{ height: 110 }} />
      </ScrollView>
    </View>
  );
}

// =========================================================
// STAT CARD
// =========================================================

function StatCard({
  icon,
  label,
  value,
  valueColor,
  bg,
  iconColor,
  cardColor,
  borderColor,
  labelColor,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  valueColor: string;
  bg: string;
  iconColor: string;
  cardColor: string;
  borderColor: string;
  labelColor: string;
}) {
  return (
    <View
      style={[
        styles.statCard,
        { backgroundColor: cardColor, borderColor },
      ]}
    >
      <View style={[styles.statIconWrap, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>

      <Text style={[styles.statLabel, { color: labelColor }]}>{label}</Text>

      <Text style={[styles.statValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

// =========================================================
// PRO METRIC
// =========================================================

function ProMetric({
  label,
  value,
  color,
  bg,
  border,
  mutedColor,
  textColor,
}: {
  label: string;
  value: string;
  color: string;
  bg: string;
  border: string;
  mutedColor: string;
  textColor: string;
}) {
  return (
    <View
      style={[styles.proMetricItem, { backgroundColor: bg, borderColor: border }]}
    >
      <Text style={[styles.proMetricLabel, { color: mutedColor }]}>{label}</Text>
      <Text style={[styles.proMetricValue, { color }]}>{value}</Text>
    </View>
  );
}

// =========================================================
// STYLES
// =========================================================

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingTop: 56, paddingBottom: 20 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, fontWeight: '600' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  greeting: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  brand: { fontSize: 24, fontWeight: '900', letterSpacing: 1.2 },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  xpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 12,
    height: 42,
  },
  xpPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },

  heroWrapper: {
    borderRadius: 26,
    marginBottom: 18,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: BLUE,
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  heroBgLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroCircle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    top: -80,
    right: -60,
    opacity: 0.35,
  },
  heroCircle2: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    bottom: -60,
    left: -50,
    opacity: 0.3,
  },
  heroContent: { padding: 22, position: 'relative', zIndex: 2 },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroLabel: {
    color: '#DBEAFE',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  heroValue: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  heroChangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
  },
  heroChangeText: {
    color: '#DBEAFE',
    fontSize: 12,
    fontWeight: '700',
  },
  heroBadge: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroStats: {
    flexDirection: 'row',
    marginTop: 22,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
  },
  heroStatItem: { flex: 1, alignItems: 'center' },
  heroStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  heroStatLabel: {
    color: '#BFDBFE',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  heroStatValue: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },

  /* QUICK ACTIONS */
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  quickAction: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 14,
    alignItems: 'flex-start',
    gap: 6,
  },
  quickActionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  quickActionLabel: { fontSize: 13, fontWeight: '900' },
  quickActionSub: { fontSize: 10, fontWeight: '600' },

  todayCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  todayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  todayHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  todayIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayTitle: { fontSize: 15, fontWeight: '900' },
  todayChipRow: { flexDirection: 'row', gap: 6 },
  todayChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  todayChipText: { fontSize: 12, fontWeight: '900' },
  progressBlock: { marginBottom: 12 },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 7,
  },
  progressLabel: { fontSize: 11, fontWeight: '700' },
  progressValue: { fontSize: 12, fontWeight: '900' },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressHint: { fontSize: 10, fontWeight: '600', marginTop: 5 },

  sevenDayCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  sevenDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sevenDayTitle: { fontSize: 15, fontWeight: '900' },
  sevenDaySub: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  daysCounter: { flexDirection: 'row', gap: 8 },
  dayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dayDot: { width: 7, height: 7, borderRadius: 4 },
  dayBadgeText: { fontSize: 11, fontWeight: '900' },
  sevenDayBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 90,
    gap: 5,
  },
  dayColumn: { flex: 1, alignItems: 'center' },
  dayBarContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  dayBar: { width: '70%', borderRadius: 6, minHeight: 4 },
  dayName: { fontSize: 9, fontWeight: '700', marginTop: 6 },

  insightsSection: { marginBottom: 16 },
  insightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  insightBadgeText: { fontSize: 10, fontWeight: '900' },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
    gap: 11,
  },
  insightIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 19,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 11,
    marginTop: 4,
  },
  sectionTitle: { fontSize: 16, fontWeight: '900' },
  sectionHint: { fontSize: 11, fontWeight: '600' },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: { fontSize: 12, fontWeight: '800' },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statCard: {
    width: '48.3%',
    borderRadius: 16,
    padding: 13,
    marginBottom: 10,
    borderWidth: 1,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statLabel: { fontSize: 11, fontWeight: '700' },
  statValue: { fontSize: 20, fontWeight: '900', marginTop: 3 },

  proMetricsCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 18,
  },
  proMetricsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  proMetricsIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proMetricsTitle: { fontSize: 15, fontWeight: '900' },
  proMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  proMetricItem: {
    width: '48.3%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 11,
    marginBottom: 8,
    alignItems: 'flex-end',
  },
  proMetricLabel: { fontSize: 10, fontWeight: '700', marginBottom: 4 },
  proMetricValue: { fontSize: 16, fontWeight: '900' },

  card: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginBottom: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: '900' },
  cardSubtitle: { fontSize: 11, marginTop: 3 },
  chartIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chart: { marginTop: 8, marginLeft: -20, borderRadius: 16 },
  emptyChart: { alignItems: 'center', paddingVertical: 32 },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyAction: {
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
  },
  emptyActionText: { fontSize: 13, fontWeight: '900', color: '#FFFFFF' },
  emptyRecent: { alignItems: 'center', paddingVertical: 24 },
  emptyTitle: { fontSize: 14, fontWeight: '800', marginTop: 10 },
  emptyText: {
    fontSize: 12,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 5,
    maxWidth: 280,
  },

  tradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
  },
  lastTradeRow: { borderBottomWidth: 0 },
  tradeIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tradeInfo: { flex: 1, marginLeft: 11 },
  tradePair: { fontSize: 14, fontWeight: '800' },
  tradeMeta: { fontSize: 11, marginTop: 3 },
  tradeResult: { fontSize: 14, fontWeight: '900' },
  tradeStarsRow: { flexDirection: 'row', gap: 1, marginTop: 4 },

  registerButton: {
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: BLUE,
    shadowColor: BLUE,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  registerInner: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  registerIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerTextWrap: { flex: 1, marginHorizontal: 13 },
  registerTitle: { fontSize: 15, fontWeight: '900', color: '#FFFFFF' },
  registerSubtitle: {
    fontSize: 11,
    marginTop: 3,
    color: '#DBEAFE',
    fontWeight: '600',
  },
});