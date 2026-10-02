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
};

const STORAGE_KEY = 'navasan_trades_v1';
const BALANCE_STORAGE_KEY = 'navasan_account_v1';

const BLUE = '#2563EB';
const GREEN = '#16A34A';
const RED = '#DC2626';

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

const formatMoney = (value: number) => {
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';

  return `${sign}$${Math.abs(value).toFixed(2)}`;
};

const formatDate = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'بدون تاریخ';
  }

  return date.toLocaleDateString('fa-IR', {
    month: 'short',
    day: 'numeric',
  });
};

export default function Dashboard() {
  const { colors, isDark } = useNavasanTheme();

  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [initialBalance, setInitialBalance] = useState<number | null>(null);

  const router = useRouter();

  const BG = colors.background;
  const CARD = colors.card;
  const BORDER = colors.border;
  const TEXT = colors.text;
  const MUTED = colors.mutedText;

  const loadTrades = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const accountRaw = await AsyncStorage.getItem(BALANCE_STORAGE_KEY);

      if (accountRaw) {
        const account = JSON.parse(accountRaw);

        setInitialBalance(
          typeof account?.initialBalance === 'number'
            ? account.initialBalance
            : null,
        );
      } else {
        setInitialBalance(null);
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

  const stats = useMemo(() => {
    const total = trades.length;

    const wins = trades.filter(
      (t) => getOutcome(t) === 'win',
    ).length;

    const losses = trades.filter(
      (t) => getOutcome(t) === 'loss',
    ).length;

    const breakevens = total - wins - losses;

    const profit = trades.reduce((sum, t) => {
      const result = toNumber(t.result);

      return result > 0 ? sum + result : sum;
    }, 0);

    const loss = Math.abs(
      trades.reduce((sum, t) => {
        const result = toNumber(t.result);

        return result < 0 ? sum + result : sum;
      }, 0),
    );

    const net = trades.reduce(
      (sum, t) => sum + toNumber(t.result),
      0,
    );

    const winRate = total ? (wins / total) * 100 : 0;

    const profitFactor =
      loss > 0
        ? profit / loss
        : profit > 0
          ? Infinity
          : 0;

    const chronological = [...trades].sort(
      (a, b) =>
        new Date(a.date).getTime() -
        new Date(b.date).getTime(),
    );

    let equity = 0;
    let peak = 0;
    let maxDrawdown = 0;

    const equityPoints = chronological.map((trade) => {
      equity += toNumber(trade.result);

      peak = Math.max(peak, equity);

      maxDrawdown = Math.max(
        maxDrawdown,
        peak - equity,
      );

      return equity;
    });

    const currentBalance =
      (initialBalance ?? 0) + net;

    const balanceChangePercent =
      initialBalance && initialBalance > 0
        ? (net / initialBalance) * 100
        : null;

    const todayKey = new Date().toDateString();

    const todayNet = trades.reduce(
      (sum, t) =>
        new Date(t.date).toDateString() === todayKey
          ? sum + toNumber(t.result)
          : sum,
      0,
    );

    const sortedResults = chronological.map((t) =>
      toNumber(t.result),
    );

    let currentStreak = 0;

    if (sortedResults.length) {
      const last = sortedResults[sortedResults.length - 1];

      if (last !== 0) {
        const sign = last > 0 ? 1 : -1;

        for (
          let i = sortedResults.length - 1;
          i >= 0;
          i--
        ) {
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

    const bestTrade = trades.reduce(
      (best, t) =>
        Math.max(best, toNumber(t.result)),
      0,
    );

    const worstTrade = trades.reduce(
      (worst, t) =>
        Math.min(worst, toNumber(t.result)),
      0,
    );

    return {
      total,
      wins,
      losses,
      breakevens,
      net,
      winRate,
      profitFactor,
      maxDrawdown,
      equityPoints,
      currentBalance,
      balanceChangePercent,
      todayNet,
      currentStreak,
      bestTrade,
      worstTrade,
    };
  }, [trades, initialBalance]);

  const recentTrades = [...trades]
    .sort(
      (a, b) =>
        new Date(b.date).getTime() -
        new Date(a.date).getTime(),
    )
    .slice(0, 5);

  const chartValues = useMemo(() => {
    if (initialBalance === null) {
      return [];
    }

    return [
      Number(initialBalance.toFixed(2)),
      ...stats.equityPoints.map((v) =>
        Number((v + initialBalance).toFixed(2)),
      ),
    ];
  }, [stats.equityPoints, initialBalance]);

  const chartLabels = chartValues.map((_, index) =>
    index === 0 ? 'شروع' : `${index}`,
  );

  if (loading) {
    return (
      <View
        style={[
          styles.loading,
          { backgroundColor: BG },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={BLUE}
        />

        <Text
          style={[
            styles.loadingText,
            { color: MUTED },
          ]}
        >
          در حال بارگذاری داشبورد...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: BG },
      ]}
    >
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
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>NAVASAN</Text>

            <Text
              style={[
                styles.subtitle,
                { color: MUTED },
              ]}
            >
              داشبورد معاملاتی
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[
                styles.iconButton,
                {
                  backgroundColor: CARD,
                  borderColor: BORDER,
                },
              ]}
            >
              <Ionicons
                name="notifications-outline"
                size={22}
                color={TEXT}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.iconButton,
                {
                  backgroundColor: CARD,
                  borderColor: BORDER,
                },
              ]}
              onPress={() =>
                router.push('/account')
              }
            >
              <Ionicons
                name="person-outline"
                size={22}
                color={TEXT}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.iconButton,
                {
                  backgroundColor: CARD,
                  borderColor: BORDER,
                },
              ]}
              onPress={() =>
                router.push({
                  pathname: '/more',
                } as any)
              }
            >
              <Ionicons
                name="ellipsis-horizontal"
                size={22}
                color={TEXT}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Campaign banner - intentionally unchanged */}
        <TouchableOpacity
          style={styles.campaignBanner}
          activeOpacity={0.9}
          onPress={() =>
            router.push('/campaign' as any)
          }
        >
          <View style={styles.campaignIconWrap}>
            <Ionicons
              name="trophy"
              size={26}
              color="#FFFFFF"
            />
          </View>

          <View style={styles.campaignTextWrap}>
            <View style={styles.campaignBadge}>
              <Text style={styles.campaignBadgeText}>
                کمپین ویژه NAVASAN
              </Text>
            </View>

            <Text style={styles.campaignTitle}>
              فرصت دریافت حساب پراپ
            </Text>

            <Text style={styles.campaignAmount}>
              $100,000
            </Text>

            <Text style={styles.campaignSub}>
              ثبت‌نام با فقط ۱ دلار
            </Text>
          </View>

          <Ionicons
            name="chevron-back"
            size={22}
            color="#93C5FD"
          />
        </TouchableOpacity>

        <View style={styles.balanceCard}>
          <View style={styles.balanceTop}>
            <View>
              <Text style={styles.balanceLabel}>
                {initialBalance !== null
                  ? 'موجودی فعلی حساب'
                  : 'خالص عملکرد معاملات'}
              </Text>

              <Text style={styles.balanceValue}>
                {initialBalance !== null
                  ? `$${stats.currentBalance.toFixed(2)}`
                  : formatMoney(stats.net)}
              </Text>
            </View>

            <View style={styles.blueCircle}>
              <Ionicons
                name="trending-up"
                size={25}
                color="#FFFFFF"
              />
            </View>
          </View>

          <View style={styles.balanceBottom}>
            <View>
              <Text style={styles.balanceMeta}>
                سرمایه اولیه
              </Text>

              <Text style={styles.balanceMetaValue}>
                {initialBalance !== null
                  ? `$${initialBalance.toFixed(2)}`
                  : 'ثبت نشده'}
              </Text>
            </View>

            <View>
              <Text style={styles.balanceMeta}>
                تغییر حساب
              </Text>

              <Text style={styles.balanceMetaValue}>
                {initialBalance === null
                  ? '—'
                  : formatMoney(stats.net)}
              </Text>

              <Text style={styles.balanceMetaPercent}>
                {stats.balanceChangePercent === null
                  ? ''
                  : `${stats.balanceChangePercent >= 0 ? '+' : ''}${stats.balanceChangePercent.toFixed(2)}%`}
              </Text>
            </View>

            <View>
              <Text style={styles.balanceMeta}>
                معاملات
              </Text>

              <Text style={styles.balanceMetaValue}>
                {stats.total}
              </Text>
            </View>

            <View>
              <Text style={styles.balanceMeta}>
                وین‌ریت
              </Text>

              <Text style={styles.balanceMetaValue}>
                {stats.winRate.toFixed(1)}%
              </Text>
            </View>

            <View>
              <Text style={styles.balanceMeta}>
                PF
              </Text>

              <Text style={styles.balanceMetaValue}>
                {Number.isFinite(stats.profitFactor)
                  ? stats.profitFactor.toFixed(2)
                  : '∞'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text
            style={[
              styles.sectionTitle,
              { color: TEXT },
            ]}
          >
            عملکرد
          </Text>

          <Text
            style={[
              styles.sectionHint,
              { color: MUTED },
            ]}
          >
            داده‌های واقعی ژورنال
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            icon="trending-up-outline"
            label="سود خالص"
            value={formatMoney(stats.net)}
            valueColor={
              stats.net >= 0 ? GREEN : RED
            }
            cardColor={CARD}
            borderColor={BORDER}
            labelColor={MUTED}
          />

          <StatCard
            icon="checkmark-circle-outline"
            label="برد"
            value={String(stats.wins)}
            valueColor={GREEN}
            cardColor={CARD}
            borderColor={BORDER}
            labelColor={MUTED}
          />

          <StatCard
            icon="close-circle-outline"
            label="باخت"
            value={String(stats.losses)}
            valueColor={RED}
            cardColor={CARD}
            borderColor={BORDER}
            labelColor={MUTED}
          />

          <StatCard
            icon="remove-circle-outline"
            label="سر‌به‌سر"
            value={String(stats.breakevens)}
            valueColor={MUTED}
            cardColor={CARD}
            borderColor={BORDER}
            labelColor={MUTED}
          />
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: CARD,
              borderColor: BORDER,
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <View>
              <Text
                style={[
                  styles.cardTitle,
                  { color: TEXT },
                ]}
              >
                Equity Curve
              </Text>

              <Text
                style={[
                  styles.cardSubtitle,
                  { color: MUTED },
                ]}
              >
                روند خالص معاملات
              </Text>
            </View>

            <Ionicons
              name="analytics-outline"
              size={22}
              color={BLUE}
            />
          </View>

          {initialBalance !== null ? (
            <LineChart
              data={{
                labels: chartLabels,
                datasets: [
                  {
                    data: chartValues,
                  },
                ],
              }}
              width={340}
              height={205}
              withDots
              withInnerLines={false}
              withOuterLines={false}
              fromZero={false}
              yAxisLabel="$"
              yAxisSuffix=""
              chartConfig={{
                backgroundGradientFrom: CARD,
                backgroundGradientTo: CARD,
                decimalPlaces: 0,
                color: (opacity = 1) =>
                  `rgba(37, 99, 235, ${opacity})`,
                labelColor: (opacity = 1) =>
                  isDark
                    ? `rgba(203, 213, 225, ${opacity})`
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
              <Ionicons
                name="bar-chart-outline"
                size={36}
                color={MUTED}
              />

              <Text
                style={[
                  styles.emptyTitle,
                  { color: TEXT },
                ]}
              >
                {initialBalance === null
                  ? 'سرمایه اولیه ثبت نشده'
                  : 'هنوز معامله‌ای ثبت نشده'}
              </Text>

              <Text
                style={[
                  styles.emptyText,
                  { color: MUTED },
                ]}
              >
                {initialBalance === null
                  ? 'ابتدا سرمایه اولیه حساب را در ژورنال ثبت کن تا نمودار از همان نقطه شروع شود.'
                  : 'اولین معامله را در ژورنال ثبت کن تا نمودار عملکرد ساخته شود.'}
              </Text>

              {initialBalance === null && (
                <TouchableOpacity
                  style={[
                    styles.emptyAction,
                    {
                      backgroundColor:
                        colors.primarySoft,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() =>
                    router.push({
                      pathname: '/',
                      params: {
                        openBalance: '1',
                      },
                    })
                  }
                >
                  <Text
                    style={[
                      styles.emptyActionText,
                      { color: BLUE },
                    ]}
                  >
                    ثبت سرمایه اولیه
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <View style={styles.sectionHeader}>
          <Text
            style={[
              styles.sectionTitle,
              { color: TEXT },
            ]}
          >
            معاملات اخیر
          </Text>

          <Text
            style={[
              styles.sectionHint,
              { color: MUTED },
            ]}
          >
            آخرین ۵ معامله
          </Text>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: CARD,
              borderColor: BORDER,
            },
          ]}
        >
          {recentTrades.length === 0 ? (
            <View style={styles.emptyRecent}>
              <Ionicons
                name="book-outline"
                size={36}
                color={MUTED}
              />

              <Text
                style={[
                  styles.emptyTitle,
                  { color: TEXT },
                ]}
              >
                ژورنال هنوز خالی است
              </Text>

              <Text
                style={[
                  styles.emptyText,
                  { color: MUTED },
                ]}
              >
                معامله‌ها را از بخش ژورنال ثبت کن؛ این قسمت خودکار به‌روزرسانی می‌شود.
              </Text>
            </View>
          ) : (
            recentTrades.map((trade, index) => {
              const result = toNumber(
                trade.result,
              );

              const win = result > 0;
              const loss = result < 0;

              return (
                <View
                  key={trade.id}
                  style={[
                    styles.tradeRow,
                    {
                      borderBottomColor:
                        colors.divider,
                    },
                    index ===
                      recentTrades.length - 1 &&
                      styles.lastTradeRow,
                  ]}
                >
                  <View
                    style={[
                      styles.tradeIcon,
                      {
                        backgroundColor:
                          colors.cardSecondary,
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        win
                          ? 'arrow-up'
                          : loss
                            ? 'arrow-down'
                            : 'remove'
                      }
                      size={17}
                      color={
                        win
                          ? GREEN
                          : loss
                            ? RED
                            : MUTED
                      }
                    />
                  </View>

                  <View style={styles.tradeInfo}>
                    <Text
                      style={[
                        styles.tradePair,
                        { color: TEXT },
                      ]}
                    >
                      {trade.pair || 'نامشخص'}
                    </Text>

                    <Text
                      style={[
                        styles.tradeMeta,
                        { color: MUTED },
                      ]}
                    >
                      {trade.direction === 'buy'
                        ? 'BUY'
                        : 'SELL'}{' '}
                      • {formatDate(trade.date)}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.tradeResult,
                      {
                        color: win
                          ? GREEN
                          : loss
                            ? RED
                            : MUTED,
                      },
                    ]}
                  >
                    {formatMoney(result)}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        <View style={styles.twoCards}>
          <MiniMetric
            icon="warning-outline"
            label="Max Drawdown"
            value={formatMoney(
              -stats.maxDrawdown,
            )}
            color={
              stats.maxDrawdown > 0
                ? RED
                : GREEN
            }
            cardColor={CARD}
            borderColor={BORDER}
            labelColor={MUTED}
          />

          <MiniMetric
            icon="trophy-outline"
            label="Win Rate"
            value={`${stats.winRate.toFixed(1)}%`}
            color={BLUE}
            cardColor={CARD}
            borderColor={BORDER}
            labelColor={MUTED}
          />
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            icon="calendar-outline"
            label="امروز"
            value={formatMoney(
              stats.todayNet,
            )}
            valueColor={
              stats.todayNet >= 0
                ? GREEN
                : RED
            }
            cardColor={CARD}
            borderColor={BORDER}
            labelColor={MUTED}
          />

          <StatCard
            icon="ribbon-outline"
            label="بهترین معامله"
            value={formatMoney(
              stats.bestTrade,
            )}
            valueColor={GREEN}
            cardColor={CARD}
            borderColor={BORDER}
            labelColor={MUTED}
          />

          <StatCard
            icon="trending-down-outline"
            label="بدترین معامله"
            value={formatMoney(
              stats.worstTrade,
            )}
            valueColor={
              stats.worstTrade < 0
                ? RED
                : MUTED
            }
            cardColor={CARD}
            borderColor={BORDER}
            labelColor={MUTED}
          />

          <StatCard
            icon="flash-outline"
            label="روند اخیر"
            value={
              stats.currentStreak > 0
                ? `${stats.currentStreak} برد`
                : stats.currentStreak < 0
                  ? `${Math.abs(stats.currentStreak)} باخت`
                  : '—'
            }
            valueColor={
              stats.currentStreak > 0
                ? GREEN
                : stats.currentStreak < 0
                  ? RED
                  : MUTED
            }
            cardColor={CARD}
            borderColor={BORDER}
            labelColor={MUTED}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.registerButton,
            {
              backgroundColor:
                colors.primarySoft,
              borderColor: colors.border,
            },
          ]}
          onPress={() =>
            router.push({
              pathname: '/',
              params: {
                openTrade: '1',
              },
            })
          }
        >
          <View style={styles.registerIcon}>
            <Ionicons
              name="add"
              size={25}
              color="#FFFFFF"
            />
          </View>

          <View style={styles.registerTextWrap}>
            <Text
              style={[
                styles.registerTitle,
                { color: TEXT },
              ]}
            >
              ثبت معامله جدید
            </Text>

            <Text
              style={[
                styles.registerSubtitle,
                { color: MUTED },
              ]}
            >
              معامله بعدی را در ژورنال ثبت کن
            </Text>
          </View>

          <Ionicons
            name="chevron-back"
            size={22}
            color={BLUE}
          />
        </TouchableOpacity>

        <View style={{ height: 110 }} />
      </ScrollView>
    </View>
  );
}

function StatCard({
  icon,
  label,
  value,
  valueColor,
  cardColor,
  borderColor,
  labelColor,
}: {
  icon: React.ComponentProps<
    typeof Ionicons
  >['name'];
  label: string;
  value: string;
  valueColor: string;
  cardColor: string;
  borderColor: string;
  labelColor: string;
}) {
  return (
    <View
      style={[
        styles.statCard,
        {
          backgroundColor: cardColor,
          borderColor,
        },
      ]}
    >
      <Ionicons
        name={icon}
        size={21}
        color={BLUE}
      />

      <Text
        style={[
          styles.statLabel,
          { color: labelColor },
        ]}
      >
        {label}
      </Text>

      <Text
        style={[
          styles.statValue,
          { color: valueColor },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function MiniMetric({
  icon,
  label,
  value,
  color,
  cardColor,
  borderColor,
  labelColor,
}: {
  icon: React.ComponentProps<
    typeof Ionicons
  >['name'];
  label: string;
  value: string;
  color: string;
  cardColor: string;
  borderColor: string;
  labelColor: string;
}) {
  return (
    <View
      style={[
        styles.miniCard,
        {
          backgroundColor: cardColor,
          borderColor,
        },
      ]}
    >
      <Ionicons
        name={icon}
        size={20}
        color={color}
      />

      <Text
        style={[
          styles.miniLabel,
          { color: labelColor },
        ]}
      >
        {label}
      </Text>

      <Text
        style={[
          styles.miniValue,
          { color },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    padding: 20,
    paddingTop: 56,
  },

  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },

  brand: {
    fontSize: 25,
    fontWeight: '900',
    color: BLUE,
    letterSpacing: 1.2,
  },

  subtitle: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: '600',
  },

  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },

  iconButton: {
    width: 43,
    height: 43,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  /*
   * Campaign banner intentionally kept exactly as provided.
   */
  campaignBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#1E3A8A',
    padding: 16,
    marginBottom: 20,
    shadowColor: '#0F172A',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 4,
  },

  campaignIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },

  campaignTextWrap: {
    flex: 1,
    marginHorizontal: 12,
    alignItems: 'flex-end',
  },

  campaignBadge: {
    backgroundColor: 'rgba(37,99,235,0.35)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 6,
  },

  campaignBadgeText: {
    color: '#BFDBFE',
    fontSize: 10,
    fontWeight: '800',
  },

  campaignTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'right',
  },

  campaignAmount: {
    color: '#FBBF24',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
    letterSpacing: 0.5,
  },

  campaignSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
    textAlign: 'right',
  },

  balanceCard: {
    backgroundColor: BLUE,
    borderRadius: 24,
    padding: 20,
    marginBottom: 22,
    shadowColor: BLUE,
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 5,
  },

  balanceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  balanceLabel: {
    color: '#DBEAFE',
    fontSize: 13,
    fontWeight: '700',
  },

  balanceValue: {
    color: '#FFFFFF',
    fontSize: 29,
    fontWeight: '900',
    marginTop: 5,
  },

  blueCircle: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  balanceBottom: {
    flexDirection: 'row',
    marginTop: 22,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'space-between',
  },

  balanceMeta: {
    color: '#BFDBFE',
    fontSize: 11,
    fontWeight: '600',
  },

  balanceMetaValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 3,
  },

  balanceMetaPercent: {
    color: '#DBEAFE',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 1,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 11,
    marginTop: 2,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
  },

  sectionHint: {
    fontSize: 11,
    fontWeight: '600',
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  statCard: {
    width: '48.3%',
    borderRadius: 18,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
  },

  statLabel: {
    fontSize: 12,
    marginTop: 9,
    fontWeight: '600',
  },

  statValue: {
    fontSize: 21,
    fontWeight: '900',
    marginTop: 4,
  },

  card: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
  },

  cardSubtitle: {
    fontSize: 11,
    marginTop: 3,
  },

  chart: {
    marginTop: 8,
    marginLeft: -20,
    borderRadius: 16,
  },

  emptyChart: {
    alignItems: 'center',
    paddingVertical: 35,
  },

  emptyAction: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },

  emptyActionText: {
    fontSize: 13,
    fontWeight: '900',
  },

  emptyRecent: {
    alignItems: 'center',
    paddingVertical: 25,
  },

  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 10,
  },

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

  lastTradeRow: {
    borderBottomWidth: 0,
  },

  tradeIcon: {
    width: 37,
    height: 37,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tradeInfo: {
    flex: 1,
    marginLeft: 11,
  },

  tradePair: {
    fontSize: 14,
    fontWeight: '800',
  },

  tradeMeta: {
    fontSize: 11,
    marginTop: 3,
  },

  tradeResult: {
    fontSize: 14,
    fontWeight: '900',
  },

  twoCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },

  miniCard: {
    width: '48.3%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 15,
  },

  miniLabel: {
    fontSize: 11,
    marginTop: 8,
    fontWeight: '600',
  },

  miniValue: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 3,
  },

  registerButton: {
    borderRadius: 19,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },

  registerIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },

  registerTextWrap: {
    flex: 1,
    marginHorizontal: 11,
  },

  registerTitle: {
    fontSize: 14,
    fontWeight: '900',
  },

  registerSubtitle: {
    fontSize: 11,
    marginTop: 3,
  },
});