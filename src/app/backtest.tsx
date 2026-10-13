import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

import { useNavasanTheme } from '@/context/theme-context';
import { fetchCandles, type Candle, type Timeframe } from '@/lib/market-data';

const BLUE = '#2563EB';
const GREEN = '#16A34A';
const RED = '#DC2626';
const AMBER = '#D97706';
const GOLD = '#EAB308';

// =========================================================
// DATA
// =========================================================

const SYMBOLS = [
  { id: 'XAUUSD', label: 'طلا' },
  { id: 'BTCUSD', label: 'بیت‌کوین' },
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

const INITIAL_VISIBLE = 50;
const TOTAL_CANDLES = 200;
const PLAY_INTERVAL_MS = 600;

// =========================================================
// TYPES
// =========================================================

type BacktestTrade = {
  id: string;
  direction: 'buy' | 'sell';
  entryIndex: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  exitIndex?: number;
  exitPrice?: number;
  result?: number;
  outcome?: 'win' | 'loss' | 'open';
};

// =========================================================
// BUILD HTML (Lightweight Charts)
// =========================================================

const buildBacktestHTML = (isDark: boolean): string => {
  const bg = isDark ? '#050505' : '#F8FAFC';
  const gridColor = isDark ? '#1E293B' : '#E2E8F0';
  const textColor = isDark ? '#94A3B8' : '#64748B';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: ${bg}; overflow: hidden; font-family: -apple-system, sans-serif; }
    #chart { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="chart"></div>
  <script src="https://unpkg.com/lightweight-charts@4.1.3/dist/lightweight-charts.standalone.production.js"></script>
  <script>
    const chart = LightweightCharts.createChart(document.getElementById('chart'), {
      width: window.innerWidth,
      height: window.innerHeight,
      layout: {
        background: { color: '${bg}' },
        textColor: '${textColor}',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: '${gridColor}' },
        horzLines: { color: '${gridColor}' },
      },
      rightPriceScale: { borderColor: '${gridColor}' },
      timeScale: { borderColor: '${gridColor}', timeVisible: true },
      crosshair: { mode: 0 },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#16A34A',
      downColor: '#DC2626',
      borderUpColor: '#16A34A',
      borderDownColor: '#DC2626',
      wickUpColor: '#16A34A',
      wickDownColor: '#DC2626',
    });

    window.addEventListener('resize', () => {
      chart.applyOptions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    });

    window.setCandles = function(candles) {
      const formatted = candles.map(c => ({
        time: Math.floor(c.timestamp / 1000),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));
      candleSeries.setData(formatted);
    };

    window.setMarkers = function(markers) {
      candleSeries.setMarkers(markers || []);
    };

    window.fitContent = function() {
      chart.timeScale().fitContent();
    };

    // Initial empty
    candleSeries.setData([]);
  </script>
</body>
</html>
  `;
};

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
  const [atrMultiple, setAtrMultiple] = useState('1.5');
  const [riskReward, setRiskReward] = useState('2');

  const webViewRef = useRef<WebView>(null);
  const playTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const html = useMemo(() => buildBacktestHTML(isDark), [isDark]);
  const webViewKey = isDark ? 'dark' : 'light';

  // =========================================================
  // LOAD CANDLES
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
  // SEND DATA TO WEBVIEW
  // =========================================================

  const sendDataToWebView = useCallback(() => {
    if (!webViewRef.current || candles.length === 0) return;

    const visible = candles.slice(0, visibleCount);
    const candlesScript = `window.setCandles(${JSON.stringify(visible)}); true;`;
    webViewRef.current.injectJavaScript(candlesScript);

    // Build markers for closed/open trades
    const markers = trades.map((t) => ({
      time: Math.floor(candles[t.entryIndex].timestamp / 1000),
      position: t.direction === 'buy' ? 'belowBar' : 'aboveBar',
      color: t.direction === 'buy' ? '#16A34A' : '#DC2626',
      shape: t.direction === 'buy' ? 'arrowUp' : 'arrowDown',
      text: t.direction === 'buy' ? 'BUY' : 'SELL',
    }));

    trades.forEach((t) => {
      if (t.exitIndex !== undefined) {
        markers.push({
          time: Math.floor(candles[t.exitIndex].timestamp / 1000),
          position: t.outcome === 'win' ? 'aboveBar' : 'belowBar',
          color: t.outcome === 'win' ? '#16A34A' : '#DC2626',
          shape: 'circle',
          text: t.outcome === 'win' ? 'WIN' : 'LOSS',
        } as any);
      }
    });

    const markersScript = `window.setMarkers(${JSON.stringify(markers)}); true;`;
    webViewRef.current.injectJavaScript(markersScript);
    webViewRef.current.injectJavaScript('window.fitContent(); true;');
  }, [candles, visibleCount, trades]);

  useEffect(() => {
    sendDataToWebView();
  }, [sendDataToWebView]);

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
  // ATR CALC
  // =========================================================

  const calcATR = (upTo: number): number => {
    const period = 14;
    if (upTo < period) return 0;
    const slice = candles.slice(upTo - period, upTo);
    const trs: number[] = [];
    for (let i = 1; i < slice.length; i++) {
      const c = slice[i];
      const prev = slice[i - 1];
      const tr = Math.max(
        c.high - c.low,
        Math.abs(c.high - prev.close),
        Math.abs(c.low - prev.close)
      );
      trs.push(tr);
    }
    return trs.length ? trs.reduce((a, b) => a + b, 0) / trs.length : 0;
  };

  // =========================================================
  // CHECK TRADE EXITS
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

        let exitPrice: number | undefined;
        let outcome: 'win' | 'loss' | undefined;

        if (t.direction === 'buy') {
          if (currentCandle.low <= t.stopLoss) {
            exitPrice = t.stopLoss;
            outcome = 'loss';
          } else if (currentCandle.high >= t.takeProfit) {
            exitPrice = t.takeProfit;
            outcome = 'win';
          }
        } else {
          if (currentCandle.high >= t.stopLoss) {
            exitPrice = t.stopLoss;
            outcome = 'loss';
          } else if (currentCandle.low <= t.takeProfit) {
            exitPrice = t.takeProfit;
            outcome = 'win';
          }
        }

        if (!exitPrice || !outcome) return t;

        const result =
          t.direction === 'buy'
            ? exitPrice - t.entryPrice
            : t.entryPrice - exitPrice;

        return {
          ...t,
          exitIndex: idx,
          exitPrice,
          result,
          outcome,
        };
      })
    );
  }, [visibleCount, candles]);

  // =========================================================
  // HANDLE TRADE
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

    const atr = calcATR(idx + 1);
    const entryPrice = candle.close;
    const risk = atr * (parseFloat(atrMultiple) || 1.5) || entryPrice * 0.005;
    const rr = parseFloat(riskReward) || 2;

    const stopLoss =
      direction === 'buy' ? entryPrice - risk : entryPrice + risk;
    const takeProfit =
      direction === 'buy' ? entryPrice + risk * rr : entryPrice - risk * rr;

    const trade: BacktestTrade = {
      id: `bt-${Date.now()}`,
      direction,
      entryIndex: idx,
      entryPrice,
      stopLoss,
      takeProfit,
      outcome: 'open',
    };

    setTrades((prev) => [trade, ...prev]);
  };

  // =========================================================
  // CONTROLS
  // =========================================================

  const togglePlay = () => {
    if (visibleCount >= candles.length) return;
    setIsPlaying((p) => !p);
  };

  const stepForward = () => {
    if (visibleCount < candles.length) {
      setVisibleCount((c) => c + 1);
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

  // =========================================================
  // STATS
  // =========================================================

  const stats = useMemo(() => {
    const closed = trades.filter((t) => t.outcome !== 'open');
    const wins = closed.filter((t) => t.outcome === 'win').length;
    const losses = closed.filter((t) => t.outcome === 'loss').length;
    const totalR = closed.reduce((sum, t) => {
      const risk = Math.abs(t.entryPrice - t.stopLoss);
      if (risk === 0 || t.result === undefined) return sum;
      return sum + t.result / risk;
    }, 0);

    const winRate = closed.length > 0 ? (wins / closed.length) * 100 : 0;
    const avgR = closed.length > 0 ? totalR / closed.length : 0;

    return { total: closed.length, wins, losses, winRate, totalR, avgR };
  }, [trades]);

  const lastCandle = candles[visibleCount - 1];
  const openTrade = trades.find((t) => t.outcome === 'open');
  const progress = candles.length ? (visibleCount / candles.length) * 100 : 0;

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* HEADER */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[
            styles.backBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[styles.title, { color: colors.text }]}>بک‌تست</Text>
          <Text style={[styles.subtitle, { color: colors.mutedText }]}>
            {symbol} • {timeframe}
          </Text>
        </View>

        <TouchableOpacity
          onPress={resetSession}
          style={[
            styles.backBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Ionicons name="refresh" size={20} color={colors.text} />
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
              key={webViewKey}
              originWhitelist={['*']}
              source={{ html }}
              style={styles.webview}
              javaScriptEnabled
              domStorageEnabled
              scrollEnabled={false}
              bounces={false}
              overScrollMode="never"
              onLoadEnd={sendDataToWebView}
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
            کندل {visibleCount} از {candles.length}
          </Text>
        </View>

        {/* CURRENT PRICE + OPEN TRADE */}
        {lastCandle && (
          <View
            style={[
              styles.infoCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.infoRow}>
              <View style={styles.infoCol}>
                <Text style={[styles.infoLabel, { color: colors.mutedText }]}>
                  قیمت
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {lastCandle.close.toFixed(2)}
                </Text>
              </View>
              {openTrade && (
                <>
                  <View style={styles.infoCol}>
                    <Text style={[styles.infoLabel, { color: colors.mutedText }]}>
                      معامله
                    </Text>
                    <Text
                      style={[
                        styles.infoValue,
                        {
                          color:
                            openTrade.direction === 'buy' ? GREEN : RED,
                        },
                      ]}
                    >
                      {openTrade.direction === 'buy' ? 'BUY' : 'SELL'}
                    </Text>
                  </View>
                  <View style={styles.infoCol}>
                    <Text style={[styles.infoLabel, { color: colors.mutedText }]}>
                      ورود
                    </Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>
                      {openTrade.entryPrice.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.infoCol}>
                    <Text style={[styles.infoLabel, { color: colors.mutedText }]}>
                      SL
                    </Text>
                    <Text style={[styles.infoValue, { color: RED }]}>
                      {openTrade.stopLoss.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.infoCol}>
                    <Text style={[styles.infoLabel, { color: colors.mutedText }]}>
                      TP
                    </Text>
                    <Text style={[styles.infoValue, { color: GREEN }]}>
                      {openTrade.takeProfit.toFixed(2)}
                    </Text>
                  </View>
                </>
              )}
            </View>
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
            <Ionicons
              name="play-skip-forward"
              size={20}
              color={colors.text}
            />
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
            disabled
            style={[
              styles.controlBtn,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: 0.4,
              },
            ]}
          >
            <Ionicons name="stats-chart" size={20} color={colors.text} />
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

        {/* SETTINGS */}
        <View
          style={[
            styles.settingsCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.settingsRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: colors.mutedText }]}>
                ATR ×
              </Text>
              <TextInput
                value={atrMultiple}
                onChangeText={setAtrMultiple}
                keyboardType="decimal-pad"
                style={[
                  styles.settingInput,
                  {
                    backgroundColor: colors.input,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: colors.mutedText }]}>
                R:R
              </Text>
              <TextInput
                value={riskReward}
                onChangeText={setRiskReward}
                keyboardType="decimal-pad"
                style={[
                  styles.settingInput,
                  {
                    backgroundColor: colors.input,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* STATS */}
        {stats.total > 0 && (
          <View
            style={[
              styles.statsCard,
              { backgroundColor: colors.card, borderColor: BLUE },
            ]}
          >
            <Text style={[styles.statsTitle, { color: colors.text }]}>
              نتایج تا این لحظه
            </Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {stats.total}
                </Text>
                <Text style={[styles.statLabel, { color: colors.mutedText }]}>
                  معامله
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: GREEN }]}>
                  {stats.wins}
                </Text>
                <Text style={[styles.statLabel, { color: colors.mutedText }]}>
                  برد
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: RED }]}>
                  {stats.losses}
                </Text>
                <Text style={[styles.statLabel, { color: colors.mutedText }]}>
                  باخت
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: BLUE }]}>
                  {stats.winRate.toFixed(0)}%
                </Text>
                <Text style={[styles.statLabel, { color: colors.mutedText }]}>
                  وین‌ریت
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text
                  style={[
                    styles.statValue,
                    { color: stats.avgR >= 0 ? GREEN : RED },
                  ]}
                >
                  {stats.avgR.toFixed(2)}R
                </Text>
                <Text style={[styles.statLabel, { color: colors.mutedText }]}>
                  میانگین R
                </Text>
              </View>
            </View>
          </View>
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
            {trades.slice(0, 10).map((t) => {
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
                  <Text style={[styles.logPair, { color: colors.text }]}>
                    {t.direction === 'buy' ? 'BUY' : 'SELL'}
                  </Text>
                  <Text
                    style={[styles.logPrice, { color: colors.mutedText }]}
                  >
                    {t.entryPrice.toFixed(2)}
                  </Text>
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
                      {t.result >= 0 ? '+' : ''}
                      {t.result.toFixed(2)}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
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
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '900' },
  subtitle: { fontSize: 11, fontWeight: '700', marginTop: 2 },

  content: { padding: 18, paddingBottom: 30 },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  loadText: { fontSize: 12, fontWeight: '600' },

  pillsRow: { gap: 8, paddingBottom: 12 },
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
    marginBottom: 14,
    height: 280,
  },
  webview: { flex: 1, backgroundColor: 'transparent' },

  progressWrap: { marginBottom: 14 },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'right',
  },

  infoCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoCol: { alignItems: 'center', flex: 1 },
  infoLabel: { fontSize: 9, fontWeight: '700', marginBottom: 3 },
  infoValue: { fontSize: 13, fontWeight: '900' },

  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginBottom: 14,
  },
  controlBtn: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  playBtn: {
    width: 68,
    height: 68,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tradeRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  tradeBtn: {
    flex: 1,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  tradeBtnText: { color: '#FFF', fontSize: 15, fontWeight: '900' },

  settingsCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  settingsRow: { flexDirection: 'row', gap: 12 },
  settingLabel: { fontSize: 10, fontWeight: '700', marginBottom: 6 },
  settingInput: {
    borderRadius: 12,
    borderWidth: 1,
    height: 44,
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },

  statsCard: {
    borderRadius: 16,
    borderWidth: 2,
    padding: 14,
    marginBottom: 14,
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 12,
    textAlign: 'right',
  },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 17, fontWeight: '900' },
  statLabel: { fontSize: 9, fontWeight: '700', marginTop: 3 },

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
  logPair: { fontSize: 12, fontWeight: '900', width: 45 },
  logPrice: { fontSize: 11, fontWeight: '700', flex: 1 },
  logOutcome: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  logOutcomeText: { fontSize: 9, fontWeight: '900' },
  logResult: {
    fontSize: 12,
    fontWeight: '900',
    width: 60,
    textAlign: 'left',
  },
});