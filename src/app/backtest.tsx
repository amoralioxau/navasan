import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

import { useNavasanTheme } from '@/context/theme-context';
import {
  buildBacktestChartHTML,
  buildEquityCurveHTML,
  calcStats,
  createTrade,
  DEFAULT_SETTINGS,
  processTrade,
  type BacktestSettings,
  type BacktestTrade,
} from '@/lib/backtest-engine';
import { fetchCandles, type Candle, type Timeframe } from '@/lib/market-data';

const BLUE = '#2563EB';
const GREEN = '#16A34A';
const RED = '#DC2626';
const AMBER = '#D97706';
const GOLD = '#EAB308';
const PURPLE = '#7C3AED';

// =========================================================
// DATA
// =========================================================

const SYMBOLS = [
  { id: 'XAUUSD', label: 'طلا' },
  { id: 'BTCUSD', label: 'بیت‌کوین' },
  { id: 'ETHUSD', label: 'اتریوم' },
  { id: 'EURUSD', label: 'یورو/دلار' },
  { id: 'GBPUSD', label: 'پوند/دلار' },
  { id: 'SPX', label: 'S&P 500' },
];

const TIMEFRAMES: { id: Timeframe; label: string }[] = [
  { id: '15m', label: '۱۵د' },
  { id: '1h', label: '۱س' },
  { id: '4h', label: '۴س' },
  { id: '1d', label: 'روز' },
];

const INITIAL_VISIBLE = 100;
const TOTAL_CANDLES = 1000;
const PLAY_INTERVAL_MS = 300;

// =========================================================
// MAIN
// =========================================================

export default function BacktestScreen() {
  const { colors, isDark } = useNavasanTheme();
  const router = useRouter();

  const [symbol, setSymbol] = useState('XAUUSD');
  const [timeframe, setTimeframe] = useState<Timeframe>('1h');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);

  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trades, setTrades] = useState<BacktestTrade[]>([]);
  const [settings, setSettings] = useState<BacktestSettings>(DEFAULT_SETTINGS);

  const [showSettings, setShowSettings] = useState(false);
  const [showEquity, setShowEquity] = useState(false);
  const [settingsForm, setSettingsForm] = useState<BacktestSettings>(DEFAULT_SETTINGS);

  const webViewRef = useRef<WebView>(null);
  const equityViewRef = useRef<WebView>(null);
  const playTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const chartHTML = useMemo(() => buildBacktestChartHTML(isDark), [isDark]);
  const equityHTML = useMemo(() => buildEquityCurveHTML(isDark), [isDark]);
  const chartKey = isDark ? 'c-dark' : 'c-light';
  const equityKey = isDark ? 'e-dark' : 'e-light';

  const [chartReady, setChartReady] = useState(false);
  const [equityReady, setEquityReady] = useState(false);

  // =========================================================
  // LOAD DATA
  // =========================================================

  const loadData = useCallback(async () => {
    setLoading(true);
    setVisibleCount(INITIAL_VISIBLE);
    setIsPlaying(false);
    setTrades([]);

    try {
      const data = await fetchCandles(symbol, timeframe, TOTAL_CANDLES);
      if (data.length === 0) {
        Alert.alert('خطا', 'داده‌ای برای این نماد دریافت نشد.');
        setCandles([]);
      } else {
        setCandles(data);
      }
    } catch {
      Alert.alert('خطا', 'خطا در دریافت داده');
    } finally {
      setLoading(false);
    }
  }, [symbol, timeframe]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // =========================================================
  // SEND CANDLES + MARKERS TO WEBVIEW
  // =========================================================

  const sendToChart = useCallback(() => {
    if (!webViewRef.current || candles.length === 0 || !chartReady) return;

    const visible = candles.slice(0, visibleCount);

    webViewRef.current.injectJavaScript(
      `window.setCandles(${JSON.stringify(visible)}); true;`
    );

    // Markers
    const markers: any[] = [];
    trades.forEach((t) => {
      if (t.entryIndex < visibleCount) {
        markers.push({
          time: Math.floor(candles[t.entryIndex].timestamp / 1000),
          position: t.direction === 'buy' ? 'belowBar' : 'aboveBar',
          color: t.direction === 'buy' ? GREEN : RED,
          shape: t.direction === 'buy' ? 'arrowUp' : 'arrowDown',
          text: t.direction === 'buy' ? 'B' : 'S',
        });
      }
      if (t.exitIndex !== undefined && t.exitIndex < visibleCount) {
        markers.push({
          time: Math.floor(candles[t.exitIndex].timestamp / 1000),
          position: t.outcome === 'win' ? 'aboveBar' : 'belowBar',
          color: t.outcome === 'win' ? GREEN : RED,
          shape: 'circle',
          text: t.outcome === 'win' ? '✓' : '✗',
        });
      }
    });
    markers.sort((a, b) => a.time - b.time);

    webViewRef.current.injectJavaScript(
      `window.setMarkers(${JSON.stringify(markers)}); true;`
    );

    // Stop loss line for open trade
    const openTrade = trades.find((t) => t.outcome === 'open');
    if (openTrade) {
      webViewRef.current.injectJavaScript(
        `window.setStopLine(${openTrade.currentStopLoss}); true;`
      );
    } else {
      webViewRef.current.injectJavaScript('window.clearStopLine(); true;');
    }
  }, [candles, visibleCount, trades, chartReady]);

  useEffect(() => {
    sendToChart();
  }, [sendToChart]);

  // =========================================================
  // SEND EQUITY CURVE
  // =========================================================

  const stats = useMemo(
    () => calcStats(trades, candles, settings.capital),
    [trades, candles, settings.capital]
  );

  useEffect(() => {
    if (!equityViewRef.current || !equityReady) return;
    if (stats.equityCurve.length === 0) return;

    equityViewRef.current.injectJavaScript(
      `window.setEquity(${JSON.stringify(stats.equityCurve)}); true;`
    );
  }, [stats.equityCurve, equityReady]);

  // =========================================================
  // PLAY LOOP
  // =========================================================

  useEffect(() => {
    if (!isPlaying) {
      if (playTimer.current) {
        clearInterval(playTimer.current);
        playTimer.current = null;
      }
      return;
    }

    playTimer.current = setInterval(() => {
      setVisibleCount((prev) => {
        if (prev >= candles.length) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, PLAY_INTERVAL_MS);

    return () => {
      if (playTimer.current) {
        clearInterval(playTimer.current);
        playTimer.current = null;
      }
    };
  }, [isPlaying, candles.length]);

  // =========================================================
  // PROCESS TRADE EXITS ON NEW CANDLE
  // =========================================================

  useEffect(() => {
    if (candles.length === 0) return;
    const idx = visibleCount - 1;
    if (idx < 0) return;
    const currentCandle = candles[idx];
    if (!currentCandle) return;

    setTrades((prev) =>
      prev.map((t) => {
        if (t.outcome !== 'open') return t;
        return processTrade(t, currentCandle, idx, settings);
      })
    );
  }, [visibleCount, candles, settings]);

  // =========================================================
  // HANDLERS
  // =========================================================

  const handleTrade = (direction: 'buy' | 'sell') => {
    const idx = visibleCount - 1;
    const candle = candles[idx];
    if (!candle) return;

    const hasOpen = trades.some((t) => t.outcome === 'open');
    if (hasOpen) {
      Alert.alert('معامله باز', 'اول معامله فعلی بسته بشه.');
      return;
    }

    const trade = createTrade(candle, idx, direction, candles, settings);
    if (!trade) {
      Alert.alert('خطا', 'ATR قابل محاسبه نیست. چند کندل بیشتر جلو برو.');
      return;
    }

    setTrades((prev) => [trade, ...prev]);
  };

  const togglePlay = () => {
    if (visibleCount >= candles.length) return;
    setIsPlaying((p) => !p);
  };

  const stepForward = () => {
    if (visibleCount < candles.length) {
      setVisibleCount((c) => c + 1);
    }
  };

  const stepForward5 = () => {
    if (visibleCount < candles.length) {
      setVisibleCount((c) => Math.min(c + 5, candles.length));
    }
  };

  const resetSession = () => {
    Alert.alert('ریست جلسه', 'همه معاملات و پیشرفت پاک می‌شه. ادامه؟', [
      { text: 'انصراف', style: 'cancel' },
      {
        text: 'ریست',
        style: 'destructive',
        onPress: () => {
          setVisibleCount(INITIAL_VISIBLE);
          setIsPlaying(false);
          setTrades([]);
        },
      },
    ]);
  };

  const saveSettings = () => {
    setSettings(settingsForm);
    setShowSettings(false);
    setTrades([]);
    setVisibleCount(INITIAL_VISIBLE);
    setIsPlaying(false);
  };

  // =========================================================
  // RENDER
  // =========================================================

  const lastCandle = candles[visibleCount - 1];
  const openTrade = trades.find((t) => t.outcome === 'open');
  const progress = candles.length ? (visibleCount / candles.length) * 100 : 0;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* HEADER */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[
            styles.iconBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[styles.title, { color: colors.text }]}>
            بک‌تست حرفه‌ای
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedText }]}>
            {symbol} • {timeframe} • {candles.length} کندل
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setShowSettings(true)}
          style={[
            styles.iconBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Ionicons name="options-outline" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* SYMBOL PICKER */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsRow}
        >
          {SYMBOLS.map((s) => {
            const active = s.id === symbol;
            return (
              <TouchableOpacity
                key={s.id}
                onPress={() => setSymbol(s.id)}
                style={[
                  styles.pill,
                  {
                    backgroundColor: active ? BLUE : colors.card,
                    borderColor: active ? BLUE : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.pillText,
                    { color: active ? '#FFF' : colors.text },
                  ]}
                >
                  {s.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* TIMEFRAME PICKER */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsRow}
        >
          {TIMEFRAMES.map((tf) => {
            const active = tf.id === timeframe;
            return (
              <TouchableOpacity
                key={tf.id}
                onPress={() => setTimeframe(tf.id)}
                style={[
                  styles.pill,
                  {
                    backgroundColor: active ? BLUE : colors.card,
                    borderColor: active ? BLUE : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.pillText,
                    { color: active ? '#FFF' : colors.text },
                  ]}
                >
                  {tf.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* CHART */}
        <View
          style={[
            styles.chartWrap,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={BLUE} />
              <Text style={[styles.loadText, { color: colors.mutedText }]}>
                در حال دریافت داده...
              </Text>
            </View>
          ) : (
            <WebView
              ref={webViewRef}
              key={chartKey}
              originWhitelist={['*']}
              source={{ html: chartHTML }}
              style={styles.webview}
              javaScriptEnabled
              domStorageEnabled
              scrollEnabled={false}
              bounces={false}
              overScrollMode="never"
              onLoadEnd={() => setChartReady(true)}
            />
          )}
        </View>

        {/* PROGRESS */}
        <View style={styles.progressWrap}>
          <View
            style={[styles.progressTrack, { backgroundColor: colors.input }]}
          >
            <View
              style={[
                styles.progressFill,
                { width: `${progress}%`, backgroundColor: BLUE },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: colors.mutedText }]}>
            کندل {visibleCount} از {candles.length} ({progress.toFixed(0)}%)
          </Text>
        </View>

        {/* LIVE STATS BAR */}
        {lastCandle && (
          <View
            style={[
              styles.liveStatsBar,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.liveStatItem}>
              <Text style={[styles.liveStatLabel, { color: colors.mutedText }]}>
                قیمت
              </Text>
              <Text style={[styles.liveStatValue, { color: colors.text }]}>
                {lastCandle.close.toFixed(lastCandle.close > 100 ? 2 : 4)}
              </Text>
            </View>

            {openTrade && (
              <>
                <View style={styles.liveStatDivider} />
                <View style={styles.liveStatItem}>
                  <Text
                    style={[styles.liveStatLabel, { color: colors.mutedText }]}
                  >
                    معامله
                  </Text>
                  <Text
                    style={[
                      styles.liveStatValue,
                      {
                        color: openTrade.direction === 'buy' ? GREEN : RED,
                      },
                    ]}
                  >
                    {openTrade.direction === 'buy' ? 'BUY' : 'SELL'}
                  </Text>
                </View>
                <View style={styles.liveStatDivider} />
                <View style={styles.liveStatItem}>
                  <Text
                    style={[styles.liveStatLabel, { color: colors.mutedText }]}
                  >
                    ورود
                  </Text>
                  <Text style={[styles.liveStatValue, { color: colors.text }]}>
                    {openTrade.entryPrice.toFixed(
                      openTrade.entryPrice > 100 ? 2 : 4
                    )}
                  </Text>
                </View>
                <View style={styles.liveStatDivider} />
                <View style={styles.liveStatItem}>
                  <Text
                    style={[styles.liveStatLabel, { color: colors.mutedText }]}
                  >
                    SL
                  </Text>
                  <Text
                    style={[styles.liveStatValue, { color: RED, fontSize: 11 }]}
                  >
                    {openTrade.currentStopLoss.toFixed(
                      openTrade.currentStopLoss > 100 ? 2 : 4
                    )}
                  </Text>
                </View>
                {openTrade.breakEvenTriggered && (
                  <View style={styles.beBadge}>
                    <Text style={styles.beBadgeText}>BE</Text>
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {/* CONTROLS */}
        <View style={styles.controlsRow}>
          <TouchableOpacity
            onPress={stepForward}
            disabled={visibleCount >= candles.length || isPlaying}
            style={[
              styles.controlBtn,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity:
                  visibleCount >= candles.length || isPlaying ? 0.4 : 1,
              },
            ]}
          >
            <Ionicons name="play-skip-forward" size={18} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={stepForward5}
            disabled={visibleCount >= candles.length || isPlaying}
            style={[
              styles.controlBtn,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity:
                  visibleCount >= candles.length || isPlaying ? 0.4 : 1,
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="play-skip-forward" size={14} color={colors.text} />
              <Text style={{ fontSize: 9, fontWeight: '900', color: colors.text, marginLeft: 2 }}>
                ×5
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={togglePlay}
            disabled={loading}
            style={[
              styles.playBtn,
              { backgroundColor: isPlaying ? RED : BLUE },
            ]}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={26}
              color="#FFF"
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setVisibleCount(candles.length)}
            disabled={visibleCount >= candles.length || isPlaying}
            style={[
              styles.controlBtn,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity:
                  visibleCount >= candles.length || isPlaying ? 0.4 : 1,
              },
            ]}
          >
            <Ionicons name="play-forward" size={18} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={resetSession}
            style={[
              styles.controlBtn,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Ionicons name="refresh" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* TRADE BUTTONS */}
        <View style={styles.tradeRow}>
          <TouchableOpacity
            onPress={() => handleTrade('buy')}
            disabled={!!openTrade || visibleCount >= candles.length}
            style={[
              styles.tradeBtn,
              {
                backgroundColor:
                  !!openTrade || visibleCount >= candles.length
                    ? `${GREEN}30`
                    : GREEN,
                opacity:
                  !!openTrade || visibleCount >= candles.length ? 0.5 : 1,
              },
            ]}
          >
            <Ionicons name="arrow-up" size={22} color="#FFF" />
            <Text style={styles.tradeBtnText}>BUY</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleTrade('sell')}
            disabled={!!openTrade || visibleCount >= candles.length}
            style={[
              styles.tradeBtn,
              {
                backgroundColor:
                  !!openTrade || visibleCount >= candles.length
                    ? `${RED}30`
                    : RED,
                opacity:
                  !!openTrade || visibleCount >= candles.length ? 0.5 : 1,
              },
            ]}
          >
            <Ionicons name="arrow-down" size={22} color="#FFF" />
            <Text style={styles.tradeBtnText}>SELL</Text>
          </TouchableOpacity>
        </View>

        {/* STATS CARDS */}
        {stats.total > 0 && (
          <>
            <View style={styles.sectionTitleRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                آمار حرفه‌ای
              </Text>
              <TouchableOpacity onPress={() => setShowEquity(true)}>
                <Text style={[styles.sectionLink, { color: BLUE }]}>
                  منحنی سرمایه
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.statsGrid}>
              <StatCard
                label="معاملات"
                value={String(stats.total)}
                color={colors.text}
                bg={colors.card}
                border={colors.border}
                mutedColor={colors.mutedText}
              />
              <StatCard
                label="وین‌ریت"
                value={`${stats.winRate.toFixed(1)}%`}
                color={stats.winRate >= 50 ? GREEN : AMBER}
                bg={colors.card}
                border={colors.border}
                mutedColor={colors.mutedText}
              />
              <StatCard
                label="سود/زیان"
                value={`${stats.totalPnL >= 0 ? '+' : ''}$${stats.totalPnL.toFixed(2)}`}
                color={stats.totalPnL >= 0 ? GREEN : RED}
                bg={colors.card}
                border={colors.border}
                mutedColor={colors.mutedText}
              />
              <StatCard
                label="میانگین R"
                value={`${stats.avgR >= 0 ? '+' : ''}${stats.avgR.toFixed(2)}R`}
                color={stats.avgR >= 0 ? GREEN : RED}
                bg={colors.card}
                border={colors.border}
                mutedColor={colors.mutedText}
              />
              <StatCard
                label="Profit Factor"
                value={stats.profitFactor.toFixed(2)}
                color={stats.profitFactor >= 1.5 ? GREEN : AMBER}
                bg={colors.card}
                border={colors.border}
                mutedColor={colors.mutedText}
              />
              <StatCard
                label="Sharpe"
                value={stats.sharpe.toFixed(2)}
                color={stats.sharpe >= 1 ? GREEN : AMBER}
                bg={colors.card}
                border={colors.border}
                mutedColor={colors.mutedText}
              />
              <StatCard
                label="Sortino"
                value={stats.sortino.toFixed(2)}
                color={stats.sortino >= 1 ? GREEN : AMBER}
                bg={colors.card}
                border={colors.border}
                mutedColor={colors.mutedText}
              />
              <StatCard
                label="Max DD"
                value={`${stats.maxDrawdownPercent.toFixed(1)}%`}
                color={stats.maxDrawdownPercent > 20 ? RED : AMBER}
                bg={colors.card}
                border={colors.border}
                mutedColor={colors.mutedText}
              />
            </View>

            <View
              style={[
                styles.summaryCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.mutedText }]}>
                  میانگین برد
                </Text>
                <Text style={[styles.summaryValue, { color: GREEN }]}>
                  +${stats.avgWin.toFixed(2)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.mutedText }]}>
                  میانگین باخت
                </Text>
                <Text style={[styles.summaryValue, { color: RED }]}>
                  -${stats.avgLoss.toFixed(2)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.mutedText }]}>
                  بزرگ‌ترین برد
                </Text>
                <Text style={[styles.summaryValue, { color: GREEN }]}>
                  +${stats.largestWin.toFixed(2)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.mutedText }]}>
                  بزرگ‌ترین باخت
                </Text>
                <Text style={[styles.summaryValue, { color: RED }]}>
                  ${stats.largestLoss.toFixed(2)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.mutedText }]}>
                  بهترین زنجیره برد
                </Text>
                <Text style={[styles.summaryValue, { color: GREEN }]}>
                  {stats.maxWinStreak}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.mutedText }]}>
                  بدترین زنجیره باخت
                </Text>
                <Text style={[styles.summaryValue, { color: RED }]}>
                  {stats.maxLossStreak}
                </Text>
              </View>
            </View>
          </>
        )}

        {/* TRADES LOG */}
        {trades.length > 0 && (
          <View
            style={[
              styles.logCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.logTitle, { color: colors.text }]}>
              معاملات ({trades.length})
            </Text>
            {trades.slice(0, 15).map((t) => {
              const isWin = t.outcome === 'win';
              const isLoss = t.outcome === 'loss';
              const isOpen = t.outcome === 'open';
              return (
                <View
                  key={t.id}
                  style={[styles.logRow, { borderBottomColor: colors.divider }]}
                >
                  <View
                    style={[
                      styles.logIcon,
                      {
                        backgroundColor:
                          t.direction === 'buy'
                            ? `${GREEN}22`
                            : `${RED}22`,
                      },
                    ]}
                  >
                    <Ionicons
                      name={t.direction === 'buy' ? 'arrow-up' : 'arrow-down'}
                      size={14}
                      color={t.direction === 'buy' ? GREEN : RED}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.logPair, { color: colors.text }]}>
                      {t.direction === 'buy' ? 'BUY' : 'SELL'} @ {t.entryPrice.toFixed(2)}
                    </Text>
                    <Text style={[styles.logMeta, { color: colors.mutedText }]}>
                      {t.breakEvenTriggered ? '🎯 BE ' : ''}
                      {t.stages.filter((s) => s.hit).length}/
                      {t.stages.length} TP
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.logOutcome,
                      {
                        backgroundColor: isWin
                          ? `${GREEN}22`
                          : isLoss
                          ? `${RED}22`
                          : `${AMBER}22`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.logOutcomeText,
                        {
                          color: isWin ? GREEN : isLoss ? RED : AMBER,
                        },
                      ]}
                    >
                      {isWin ? 'WIN' : isLoss ? 'LOSS' : 'OPEN'}
                    </Text>
                  </View>

                  {t.result !== undefined && (
                    <Text
                      style={[
                        styles.logResult,
                        { color: isWin ? GREEN : RED },
                      ]}
                    >
                      {t.result >= 0 ? '+' : ''}${t.result.toFixed(1)}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* SETTINGS MODAL */}
      <Modal
        visible={showSettings}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.settingsModal,
              { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                تنظیمات بک‌تست
              </Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <Ionicons name="close" size={24} color={colors.mutedText} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* CAPITAL */}
              <Text style={[styles.fieldLabel, { color: colors.mutedText }]}>
                سرمایه اولیه ($)
              </Text>
              <TextInput
                value={String(settingsForm.capital)}
                onChangeText={(v) =>
                  setSettingsForm({ ...settingsForm, capital: parseFloat(v) || 0 })
                }
                keyboardType="decimal-pad"
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.input,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
              />

              {/* RISK */}
              <Text style={[styles.fieldLabel, { color: colors.mutedText }]}>
                ریسک هر معامله (%)
              </Text>
              <TextInput
                value={String(settingsForm.riskPerTrade)}
                onChangeText={(v) =>
                  setSettingsForm({
                    ...settingsForm,
                    riskPerTrade: parseFloat(v) || 0,
                  })
                }
                keyboardType="decimal-pad"
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.input,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
              />

              {/* ATR */}
              <Text style={[styles.fieldLabel, { color: colors.mutedText }]}>
                ATR × (برای حد ضرر)
              </Text>
              <TextInput
                value={String(settingsForm.atrMultiple)}
                onChangeText={(v) =>
                  setSettingsForm({
                    ...settingsForm,
                    atrMultiple: parseFloat(v) || 1.5,
                  })
                }
                keyboardType="decimal-pad"
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.input,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
              />

              {/* RR */}
              <Text style={[styles.fieldLabel, { color: colors.mutedText }]}>
                R:R (هدف نهایی)
              </Text>
              <TextInput
                value={String(settingsForm.initialRR)}
                onChangeText={(v) =>
                  setSettingsForm({
                    ...settingsForm,
                    initialRR: parseFloat(v) || 3,
                  })
                }
                keyboardType="decimal-pad"
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.input,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
              />

              {/* MULTI TP */}
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.toggleLabel, { color: colors.text }]}>
                    Multi-Stage Take Profit
                  </Text>
                  <Text style={[styles.toggleSub, { color: colors.mutedText }]}>
                    بستن تدریجی پوزیشن در ۳ مرحله (1R, 2R, RR)
                  </Text>
                </View>
                <Switch
                  value={settingsForm.enableMultiTP}
                  onValueChange={(v) =>
                    setSettingsForm({ ...settingsForm, enableMultiTP: v })
                  }
                  trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
                  thumbColor={settingsForm.enableMultiTP ? BLUE : '#FFFFFF'}
                />
              </View>

              {/* BREAKEVEN */}
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.toggleLabel, { color: colors.text }]}>
                    Breakeven Stop
                  </Text>
                  <Text style={[styles.toggleSub, { color: colors.mutedText }]}>
                    انتقال SL به نقطه ورود در سود مشخص
                  </Text>
                </View>
                <Switch
                  value={settingsForm.enableBreakeven}
                  onValueChange={(v) =>
                    setSettingsForm({ ...settingsForm, enableBreakeven: v })
                  }
                  trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
                  thumbColor={settingsForm.enableBreakeven ? BLUE : '#FFFFFF'}
                />
              </View>

              {settingsForm.enableBreakeven && (
                <>
                  <Text style={[styles.fieldLabel, { color: colors.mutedText }]}>
                    Breakeven در چند R؟
                  </Text>
                  <TextInput
                    value={String(settingsForm.breakevenAtR)}
                    onChangeText={(v) =>
                      setSettingsForm({
                        ...settingsForm,
                        breakevenAtR: parseFloat(v) || 1,
                      })
                    }
                    keyboardType="decimal-pad"
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.input,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                  />
                </>
              )}

              {/* TRAILING */}
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.toggleLabel, { color: colors.text }]}>
                    Trailing Stop
                  </Text>
                  <Text style={[styles.toggleSub, { color: colors.mutedText }]}>
                    حد ضرر متحرک با حرکت قیمت
                  </Text>
                </View>
                <Switch
                  value={settingsForm.enableTrailing}
                  onValueChange={(v) =>
                    setSettingsForm({ ...settingsForm, enableTrailing: v })
                  }
                  trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
                  thumbColor={settingsForm.enableTrailing ? BLUE : '#FFFFFF'}
                />
              </View>

              {settingsForm.enableTrailing && (
                <>
                  <Text style={[styles.fieldLabel, { color: colors.mutedText }]}>
                    Trailing ATR ×
                  </Text>
                  <TextInput
                    value={String(settingsForm.trailingATR)}
                    onChangeText={(v) =>
                      setSettingsForm({
                        ...settingsForm,
                        trailingATR: parseFloat(v) || 1,
                      })
                    }
                    keyboardType="decimal-pad"
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.input,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                  />
                </>
              )}

              <TouchableOpacity
                onPress={saveSettings}
                style={[styles.saveBtn, { backgroundColor: BLUE }]}
              >
                <Ionicons name="checkmark" size={20} color="#FFF" />
                <Text style={styles.saveBtnText}>ذخیره و شروع مجدد</Text>
              </TouchableOpacity>

              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* EQUITY CURVE MODAL */}
      <Modal
        visible={showEquity}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEquity(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.equityModal,
              { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                منحنی رشد سرمایه
              </Text>
              <TouchableOpacity onPress={() => setShowEquity(false)}>
                <Ionicons name="close" size={24} color={colors.mutedText} />
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.equityChartWrap,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <WebView
                ref={equityViewRef}
                key={equityKey}
                originWhitelist={['*']}
                source={{ html: equityHTML }}
                style={styles.webview}
                javaScriptEnabled
                domStorageEnabled
                scrollEnabled={false}
                bounces={false}
                onLoadEnd={() => setEquityReady(true)}
              />
            </View>

            <View style={styles.equityInfo}>
              <View style={styles.equityItem}>
                <Text style={[styles.equityLabel, { color: colors.mutedText }]}>
                  سرمایه نهایی
                </Text>
                <Text
                  style={[
                    styles.equityValue,
                    {
                      color:
                        stats.totalPnL >= 0 ? GREEN : RED,
                    },
                  ]}
                >
                  ${(settings.capital + stats.totalPnL).toFixed(2)}
                </Text>
              </View>
              <View style={styles.equityItem}>
                <Text style={[styles.equityLabel, { color: colors.mutedText }]}>
                  بازدهی
                </Text>
                <Text
                  style={[
                    styles.equityValue,
                    {
                      color: stats.totalPnL >= 0 ? GREEN : RED,
                    },
                  ]}
                >
                  {((stats.totalPnL / settings.capital) * 100).toFixed(2)}%
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// =========================================================
// STAT CARD
// =========================================================

function StatCard({
  label,
  value,
  color,
  bg,
  border,
  mutedColor,
}: {
  label: string;
  value: string;
  color: string;
  bg: string;
  border: string;
  mutedColor: string;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: bg, borderColor: border }]}>
      <Text style={[styles.statLabel, { color: mutedColor }]}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

// =========================================================
// STYLES
// =========================================================

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'ios' ? 56 : 50,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 10,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  title: { fontSize: 17, fontWeight: '900' },
  subtitle: { fontSize: 10, fontWeight: '700', marginTop: 2 },

  content: { padding: 18, paddingBottom: 30 },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  loadText: { fontSize: 12, fontWeight: '600' },

  pillsRow: { gap: 8, paddingBottom: 10 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  pillText: { fontSize: 12, fontWeight: '800' },

  chartWrap: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
    height: 300,
  },
  webview: { flex: 1, backgroundColor: 'transparent' },

  progressWrap: { marginBottom: 12 },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'right',
  },

  liveStatsBar: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    marginBottom: 12,
    alignItems: 'center',
    position: 'relative',
  },
  liveStatItem: { flex: 1, alignItems: 'center' },
  liveStatLabel: { fontSize: 9, fontWeight: '700', marginBottom: 3 },
  liveStatValue: { fontSize: 12, fontWeight: '900' },
  liveStatDivider: { width: 1, height: 26, backgroundColor: '#00000015' },
  beBadge: {
    position: 'absolute',
    top: -8,
    right: 10,
    backgroundColor: AMBER,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  beBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '900' },

  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  controlBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  playBtn: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tradeRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  tradeBtn: {
    flex: 1,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  tradeBtnText: { color: '#FFF', fontSize: 15, fontWeight: '900' },

  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 15, fontWeight: '900' },
  sectionLink: { fontSize: 12, fontWeight: '800' },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  statCard: {
    width: '48.5%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    alignItems: 'flex-end',
  },
  statLabel: { fontSize: 10, fontWeight: '700' },
  statValue: { fontSize: 16, fontWeight: '900', marginTop: 4 },

  summaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  summaryLabel: { fontSize: 11, fontWeight: '700' },
  summaryValue: { fontSize: 13, fontWeight: '900' },

  logCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  logTitle: { fontSize: 14, fontWeight: '900', marginBottom: 10 },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
  },
  logIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logPair: { fontSize: 12, fontWeight: '900' },
  logMeta: { fontSize: 9, fontWeight: '600', marginTop: 2 },
  logOutcome: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  logOutcomeText: { fontSize: 9, fontWeight: '900' },
  logResult: {
    fontSize: 12,
    fontWeight: '900',
    width: 65,
    textAlign: 'left',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  settingsModal: {
    maxHeight: '92%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  equityModal: {
    maxHeight: '70%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: { fontSize: 18, fontWeight: '900' },

  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 6,
    textAlign: 'right',
  },
  input: {
    height: 46,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#00000010',
  },
  toggleLabel: { fontSize: 13, fontWeight: '900', textAlign: 'right' },
  toggleSub: { fontSize: 10, fontWeight: '600', marginTop: 2, textAlign: 'right' },

  saveBtn: {
    marginTop: 20,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  saveBtnText: { color: '#FFF', fontSize: 14, fontWeight: '900' },

  equityChartWrap: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    height: 260,
    marginBottom: 14,
  },
  equityInfo: { flexDirection: 'row', gap: 10 },
  equityItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  equityLabel: { fontSize: 10, fontWeight: '700' },
  equityValue: { fontSize: 18, fontWeight: '900', marginTop: 4 },
});