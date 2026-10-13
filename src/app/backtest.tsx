import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
const CYAN = '#0891B2';

const SESSION_KEY = 'navasan_backtest_session_v1';

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
  { id: 'NAS100', label: 'نزدک' },
];

const TIMEFRAMES: { id: Timeframe; label: string }[] = [
  { id: '15m', label: '۱۵د' },
  { id: '1h', label: '۱س' },
  { id: '4h', label: '۴س' },
  { id: '1d', label: 'روز' },
];

const SPEEDS = [
  { label: '0.5×', value: 800 },
  { label: '1×', value: 400 },
  { label: '2×', value: 200 },
  { label: '5×', value: 80 },
  { label: '10×', value: 30 },
];

const INITIAL_VISIBLE = 100;
const TOTAL_CANDLES = 1000;

// =========================================================
// CHART HTML (Lightweight Charts v4.2.3 — tested & working)
// =========================================================

const buildChartHTML = (isDark: boolean): string => {
  const bg = isDark ? '#0A0A0A' : '#FFFFFF';
  const textColor = isDark ? '#E5E7EB' : '#0F172A';
  const gridColor = isDark ? '#1A1A1A' : '#F1F5F9';
  const borderColor = isDark ? '#1E1E1E' : '#E2E8F0';
  const panelBg = isDark ? '#0F0F0F' : '#FAFAFA';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    html, body {
      width: 100%; height: 100%;
      background: ${bg}; overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: ${textColor}; user-select: none;
    }
    #ohlc-bar {
      position: absolute; top: 0; left: 0; right: 0; height: 28px;
      background: ${panelBg}; border-bottom: 1px solid ${borderColor};
      padding: 0 8px; display: flex; align-items: center; gap: 10px;
      font-size: 10px; font-weight: 700; color: ${textColor};
      z-index: 20; overflow-x: auto; scrollbar-width: none;
    }
    #ohlc-bar::-webkit-scrollbar { display: none; }
    #ohlc-bar span { white-space: nowrap; }
    #ohlc-bar span b { font-weight: 900; }
    #ohlc-bar .up { color: #16A34A; }
    #ohlc-bar .down { color: #DC2626; }
    #trade-overlay {
      position: absolute; top: 34px; left: 8px; z-index: 15;
      background: ${bg}EE; backdrop-filter: blur(6px);
      border: 1px solid ${borderColor};
      padding: 6px 10px; border-radius: 8px;
      font-size: 10px; font-weight: 800;
      display: none;
      min-width: 180px;
    }
    #trade-overlay.active { display: block; }
    #trade-overlay .row { display: flex; justify-content: space-between; gap: 10px; margin: 2px 0; }
    #trade-overlay .label { color: #94A3B8; }
    #trade-overlay .value { font-weight: 900; }
    #trade-overlay .pnl { font-size: 13px; font-weight: 900; text-align: center; margin-top: 4px; padding-top: 4px; border-top: 1px solid ${borderColor}; }
    #main-chart { position: absolute; top: 28px; left: 0; right: 0; bottom: 0; }
    .loading {
      position: absolute; inset: 0;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      gap: 12px; color: ${textColor}; background: ${bg}; z-index: 100;
    }
    .spinner {
      width: 32px; height: 32px;
      border: 3px solid ${gridColor};
      border-top-color: #2563EB; border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .error { color: #DC2626; font-size: 12px; text-align: center; padding: 20px; line-height: 20px; }
  </style>
</head>
<body>
  <div id="ohlc-bar">
    <span>O <b id="o-val">—</b></span>
    <span>H <b id="h-val">—</b></span>
    <span>L <b id="l-val">—</b></span>
    <span>C <b id="c-val">—</b></span>
  </div>

  <div id="trade-overlay">
    <div class="row"><span class="label">جهت:</span><span class="value" id="t-dir">—</span></div>
    <div class="row"><span class="label">ورود:</span><span class="value" id="t-entry">—</span></div>
    <div class="row"><span class="label">SL:</span><span class="value" id="t-sl">—</span></div>
    <div class="row"><span class="label">TP:</span><span class="value" id="t-tp">—</span></div>
    <div class="row"><span class="label">R:R:</span><span class="value" id="t-rr">—</span></div>
    <div class="pnl" id="t-pnl">—</div>
  </div>

  <div id="main-chart"></div>

  <div class="loading" id="loading">
    <div class="spinner"></div>
    <div>در حال بارگذاری چارت...</div>
  </div>

  <script src="https://unpkg.com/lightweight-charts@4.2.3/dist/lightweight-charts.standalone.production.js"></script>
  <script>
    let chart = null;
    let candleSeries = null;
    let volumeSeries = null;
    let ma20Series = null;
    let ma50Series = null;
    let entryLine = null;
    let slLine = null;
    let tpLine = null;
    let currentCandles = [];
    let currentTrade = null;
    let showMA = true;
    let showVolume = true;

    // =====================================================
    // INIT
    // =====================================================
    function initChart() {
      try {
        document.getElementById('loading').style.display = 'none';
        const el = document.getElementById('main-chart');

        chart = LightweightCharts.createChart(el, {
          width: el.clientWidth,
          height: el.clientHeight,
          layout: {
            background: { type: 'solid', color: '${bg}' },
            textColor: '${textColor}',
            fontSize: 10,
          },
          grid: {
            vertLines: { color: '${gridColor}' },
            horzLines: { color: '${gridColor}' },
          },
          rightPriceScale: {
            borderColor: '${borderColor}',
            scaleMargins: { top: 0.1, bottom: 0.2 },
          },
          timeScale: {
            borderColor: '${borderColor}',
            timeVisible: true,
            rightOffset: 8,
            barSpacing: 6,
            minBarSpacing: 0.3,
            fixLeftEdge: false,
          },
          crosshair: {
            mode: 0,
            vertLine: { color: '#2563EB', width: 1, style: 3, labelBackgroundColor: '#2563EB' },
            horzLine: { color: '#2563EB', width: 1, style: 3, labelBackgroundColor: '#2563EB' },
          },
          handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
          handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
        });

        candleSeries = chart.addCandlestickSeries({
          upColor: '#16A34A',
          downColor: '#DC2626',
          borderUpColor: '#16A34A',
          borderDownColor: '#DC2626',
          wickUpColor: '#16A34A',
          wickDownColor: '#DC2626',
          priceLineVisible: false,
        });

        volumeSeries = chart.addHistogramSeries({
          color: '#2563EB30',
          priceFormat: { type: 'volume' },
          priceScaleId: 'volume',
          lastValueVisible: false,
          priceLineVisible: false,
        });
        chart.priceScale('volume').applyOptions({
          scaleMargins: { top: 0.85, bottom: 0 },
        });

        ma20Series = chart.addLineSeries({
          color: '#F59E0B', lineWidth: 2, priceLineVisible: false,
          lastValueVisible: false, crosshairMarkerVisible: false,
        });

        ma50Series = chart.addLineSeries({
          color: '#7C3AED', lineWidth: 2, priceLineVisible: false,
          lastValueVisible: false, crosshairMarkerVisible: false,
        });

        chart.subscribeCrosshairMove((param) => {
          if (!param.time || !param.seriesData.has(candleSeries)) {
            const last = currentCandles[currentCandles.length - 1];
            if (last) renderOHLC(last);
            return;
          }
          const d = param.seriesData.get(candleSeries);
          if (d) renderOHLC(d);
        });

        new ResizeObserver(() => {
          if (chart && el) {
            chart.applyOptions({ width: el.clientWidth, height: el.clientHeight });
          }
        }).observe(el);

      } catch (e) {
        document.getElementById('loading').innerHTML =
          '<div class="error">خطا در راه‌اندازی چارت<br/>' + (e.message || '') + '</div>';
      }
    }

    function renderOHLC(d) {
      document.getElementById('o-val').textContent = d.open.toFixed(d.open > 100 ? 2 : 4);
      document.getElementById('h-val').textContent = d.high.toFixed(d.high > 100 ? 2 : 4);
      document.getElementById('l-val').textContent = d.low.toFixed(d.low > 100 ? 2 : 4);
      document.getElementById('c-val').textContent = d.close.toFixed(d.close > 100 ? 2 : 4);
      document.getElementById('c-val').className = d.close >= d.open ? 'up' : 'down';
    }

    function calcSMA(candles, period) {
      const r = [];
      for (let i = 0; i < candles.length; i++) {
        if (i < period - 1) continue;
        let sum = 0;
        for (let j = 0; j < period; j++) sum += candles[i - j].close;
        r.push({ time: Math.floor(candles[i].timestamp / 1000), value: sum / period });
      }
      return r;
    }

    // =====================================================
    // SET CANDLES
    // =====================================================
    window.setCandles = function (candles) {
      if (!chart || !candleSeries || !candles || candles.length === 0) return;
      currentCandles = candles;

      const formatted = candles.map(c => ({
        time: Math.floor(c.timestamp / 1000),
        open: c.open, high: c.high, low: c.low, close: c.close,
      }));
      candleSeries.setData(formatted);

      if (showVolume && volumeSeries) {
        volumeSeries.setData(candles.map(c => ({
          time: Math.floor(c.timestamp / 1000),
          value: c.volume || 0,
          color: c.close >= c.open ? '#16A34A30' : '#DC262630',
        })));
      }

      if (showMA && ma20Series && ma50Series) {
        ma20Series.setData(calcSMA(candles, 20));
        ma50Series.setData(calcSMA(candles, 50));
      }

      const last = candles[candles.length - 1];
      if (last) renderOHLC(last);
    };

    // =====================================================
    // SET MARKERS
    // =====================================================
    window.setMarkers = function (markers) {
      if (candleSeries) candleSeries.setMarkers(markers || []);
    };

    // =====================================================
    // SET TRADE LINES (entry/SL/TP)
    // =====================================================
    window.setTradeLines = function (trade) {
      if (!candleSeries) return;

      // Clear existing
      if (entryLine) { candleSeries.removePriceLine(entryLine); entryLine = null; }
      if (slLine) { candleSeries.removePriceLine(slLine); slLine = null; }
      if (tpLine) { candleSeries.removePriceLine(tpLine); tpLine = null; }

      currentTrade = trade;

      if (!trade) {
        document.getElementById('trade-overlay').classList.remove('active');
        return;
      }

      // Entry
      entryLine = candleSeries.createPriceLine({
        price: trade.entryPrice,
        color: '#2563EB',
        lineWidth: 2,
        lineStyle: 0,
        axisLabelVisible: true,
        title: 'ورود',
      });

      // SL
      slLine = candleSeries.createPriceLine({
        price: trade.currentStopLoss,
        color: '#DC2626',
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'SL',
      });

      // TP
      const finalStage = trade.stages[trade.stages.length - 1];
      if (finalStage) {
        tpLine = candleSeries.createPriceLine({
          price: finalStage.level,
          color: '#16A34A',
          lineWidth: 2,
          lineStyle: 2,
          axisLabelVisible: true,
          title: 'TP',
        });
      }

      // Overlay
      const overlay = document.getElementById('trade-overlay');
      overlay.classList.add('active');
      document.getElementById('t-dir').textContent = trade.direction === 'buy' ? 'BUY' : 'SELL';
      document.getElementById('t-dir').style.color = trade.direction === 'buy' ? '#16A34A' : '#DC2626';
      document.getElementById('t-entry').textContent = trade.entryPrice.toFixed(trade.entryPrice > 100 ? 2 : 4);
      document.getElementById('t-sl').textContent = trade.currentStopLoss.toFixed(trade.currentStopLoss > 100 ? 2 : 4);
      const risk = Math.abs(trade.entryPrice - trade.currentStopLoss);
      const reward = Math.abs(finalStage.level - trade.entryPrice);
      document.getElementById('t-tp').textContent = finalStage.level.toFixed(finalStage.level > 100 ? 2 : 4);
      document.getElementById('t-rr').textContent = risk > 0 ? '1:' + (reward / risk).toFixed(2) : '—';
    };

    // =====================================================
    // UPDATE PnL (لحظه‌ای)
    // =====================================================
    window.updatePnL = function (currentPrice) {
      if (!currentTrade) return;
      const diff = currentTrade.direction === 'buy'
        ? currentPrice - currentTrade.entryPrice
        : currentTrade.entryPrice - currentPrice;
      const pnl = diff * currentTrade.positionSize;
      const pnlEl = document.getElementById('t-pnl');
      pnlEl.textContent = (pnl >= 0 ? '+' : '') + '$' + pnl.toFixed(2);
      pnlEl.style.color = pnl >= 0 ? '#16A34A' : '#DC2626';
    };

    window.fitContent = function () { if (chart) chart.timeScale().fitContent(); };
    window.scrollRealtime = function () { if (chart) chart.timeScale().scrollToRealTime(); };

    if (document.readyState === 'complete') initChart();
    else window.addEventListener('load', initChart);
  </script>
</body>
</html>
  `;
};

const buildEquityHTML = (isDark: boolean): string => {
  const bg = isDark ? '#0A0A0A' : '#FFFFFF';
  const textColor = isDark ? '#E5E7EB' : '#0F172A';
  const gridColor = isDark ? '#1A1A1A' : '#F1F5F9';
  const borderColor = isDark ? '#1E1E1E' : '#E2E8F0';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: ${bg}; overflow: hidden; }
    #eq { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="eq"></div>
  <script src="https://unpkg.com/lightweight-charts@4.2.3/dist/lightweight-charts.standalone.production.js"></script>
  <script>
    let chart = null, series = null;
    function init() {
      const el = document.getElementById('eq');
      chart = LightweightCharts.createChart(el, {
        width: el.clientWidth, height: el.clientHeight,
        layout: { background: { type: 'solid', color: '${bg}' }, textColor: '${textColor}', fontSize: 10 },
        grid: { vertLines: { color: '${gridColor}' }, horzLines: { color: '${gridColor}' } },
        rightPriceScale: { borderColor: '${borderColor}' },
        timeScale: { borderColor: '${borderColor}', timeVisible: true },
      });
      series = chart.addAreaSeries({
        topColor: '#16A34A50', bottomColor: '#16A34A05',
        lineColor: '#16A34A', lineWidth: 2,
      });
      new ResizeObserver(() => {
        chart.applyOptions({ width: el.clientWidth, height: el.clientHeight });
      }).observe(el);
    }
    window.setEquity = function (data) {
      if (series && data && data.length) {
        series.setData(data);
        chart.timeScale().fitContent();
      }
    };
    if (document.readyState === 'complete') init();
    else window.addEventListener('load', init);
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
  const [speedIdx, setSpeedIdx] = useState(1); // 1x default
  const [trades, setTrades] = useState<BacktestTrade[]>([]);
  const [settings, setSettings] = useState<BacktestSettings>(DEFAULT_SETTINGS);

  const [showSettings, setShowSettings] = useState(false);
  const [showEquity, setShowEquity] = useState(false);
  const [showOrder, setShowOrder] = useState(false);
  const [showSymbolPicker, setShowSymbolPicker] = useState(false);
  const [settingsForm, setSettingsForm] = useState<BacktestSettings>(DEFAULT_SETTINGS);

  const [orderDirection, setOrderDirection] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop'>('market');
  const [customEntry, setCustomEntry] = useState('');
  const [customSL, setCustomSL] = useState('');
  const [customTP, setCustomTP] = useState('');
  const [autoSL, setAutoSL] = useState(true);
  const [autoTP, setAutoTP] = useState(true);

  const webViewRef = useRef<WebView>(null);
  const equityViewRef = useRef<WebView>(null);
  const playTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const chartHTML = useMemo(() => buildChartHTML(isDark), [isDark]);
  const equityHTML = useMemo(() => buildEquityHTML(isDark), [isDark]);
  const chartKey = isDark ? 'c-dark' : 'c-light';
  const equityKey = isDark ? 'e-dark' : 'e-light';

  const [chartReady, setChartReady] = useState(false);
  const [equityReady, setEquityReady] = useState(false);

  // =========================================================
  // SESSION SAVE / LOAD
  // =========================================================

  const saveSession = useCallback(async () => {
    try {
      const session = {
        symbol,
        timeframe,
        visibleCount,
        trades,
        settings,
        savedAt: Date.now(),
      };
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
      Alert.alert('ذخیره شد', 'جلسه بک‌تست ذخیره شد.');
    } catch (e) {
      console.log('Save error:', e);
    }
  }, [symbol, timeframe, visibleCount, trades, settings]);

  const loadSession = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(SESSION_KEY);
      if (!raw) {
        Alert.alert('چیزی نیست', 'جلسه ذخیره‌شده‌ای پیدا نشد.');
        return;
      }
      const session = JSON.parse(raw);
      Alert.alert(
        'بارگذاری جلسه',
        `جلسه ذخیره‌شده در ${new Date(session.savedAt).toLocaleString('fa-IR')}\nبارگذاری شود؟`,
        [
          { text: 'انصراف', style: 'cancel' },
          {
            text: 'بارگذاری',
            onPress: () => {
              setSymbol(session.symbol);
              setTimeframe(session.timeframe);
              setSettings(session.settings);
              setSettingsForm(session.settings);
              setVisibleCount(session.visibleCount);
              setTrades(session.trades);
            },
          },
        ]
      );
    } catch (e) {
      console.log('Load error:', e);
    }
  }, []);

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
  // SEND TO CHART
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

    // Trade lines
    const openTrade = trades.find((t) => t.outcome === 'open');
    webViewRef.current.injectJavaScript(
      `window.setTradeLines(${openTrade ? JSON.stringify(openTrade) : 'null'}); true;`
    );
  }, [candles, visibleCount, trades, chartReady]);

  useEffect(() => {
    sendToChart();
  }, [sendToChart]);

  // Update PnL on price move
  useEffect(() => {
    if (!webViewRef.current || !chartReady) return;
    const last = candles[visibleCount - 1];
    if (last) {
      webViewRef.current.injectJavaScript(
        `window.updatePnL(${last.close}); true;`
      );
    }
  }, [visibleCount, candles, chartReady]);

  // =========================================================
  // EQUITY CURVE
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

    const interval = SPEEDS[speedIdx].value;
    playTimer.current = setInterval(() => {
      setVisibleCount((prev) => {
        if (prev >= candles.length) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, interval);

    return () => {
      if (playTimer.current) clearInterval(playTimer.current);
    };
  }, [isPlaying, candles.length, speedIdx]);

  // =========================================================
  // PROCESS TRADE EXITS
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

  const openOrderModal = (dir: 'buy' | 'sell') => {
    const idx = visibleCount - 1;
    const candle = candles[idx];
    if (!candle) return;

    setOrderDirection(dir);
    setOrderType('market');
    setAutoSL(true);
    setAutoTP(true);
    setCustomEntry(candle.close.toString());
    setCustomSL('');
    setCustomTP('');
    setShowOrder(true);
  };

  const submitOrder = () => {
    const idx = visibleCount - 1;
    const candle = candles[idx];
    if (!candle) return;

    const hasOpen = trades.some((t) => t.outcome === 'open');
    if (hasOpen) {
      Alert.alert('معامله باز', 'اول معامله فعلی بسته بشه.');
      return;
    }

    // Auto ATR-based SL/TP
    let trade = createTrade(candle, idx, orderDirection, candles, settings);
    if (!trade) {
      Alert.alert('خطا', 'ATR قابل محاسبه نیست.');
      return;
    }

    // Custom entry
    if (orderType !== 'market') {
      const entry = parseFloat(customEntry);
      if (isNaN(entry)) {
        Alert.alert('خطا', 'قیمت ورود نامعتبر');
        return;
      }
      // For Limit/Stop, we set a pending order (simplified: wait 1 candle)
      // For now, we set as market with custom entry
      trade = {
        ...trade,
        entryPrice: entry,
      };
    }

    // Custom SL
    if (!autoSL) {
      const sl = parseFloat(customSL);
      if (!isNaN(sl)) {
        trade = {
          ...trade,
          stopLoss: sl,
          currentStopLoss: sl,
          originalStopLoss: sl,
        };
      }
    }

    // Custom TP
    if (!autoTP) {
      const tp = parseFloat(customTP);
      if (!isNaN(tp)) {
        const risk = Math.abs(trade.entryPrice - trade.currentStopLoss);
        const reward = Math.abs(tp - trade.entryPrice);
        const rr = risk > 0 ? reward / risk : 2;
        const stages = trade.stages.map((s, i) => {
          if (i === trade.stages.length - 1) {
            return { ...s, level: tp };
          }
          const pct = (i + 1) / trade.stages.length;
          return {
            ...s,
            level:
              trade.direction === 'buy'
                ? trade.entryPrice + risk * pct * rr
                : trade.entryPrice - risk * pct * rr,
          };
        });
        trade = { ...trade, stages };
      }
    }

    setTrades((prev) => [trade, ...prev]);
    setShowOrder(false);
  };

  const togglePlay = () => {
    if (visibleCount >= candles.length) return;
    setIsPlaying((p) => !p);
  };

  const stepForward = () => {
    if (visibleCount < candles.length) setVisibleCount((c) => c + 1);
  };

  const stepForwardN = (n: number) => {
    if (visibleCount < candles.length) {
      setVisibleCount((c) => Math.min(c + n, candles.length));
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

  const closeTradeManually = (tradeId: string) => {
    Alert.alert('بستن دستی', 'این معامله به قیمت فعلی بسته شود؟', [
      { text: 'انصراف', style: 'cancel' },
      {
        text: 'بستن',
        onPress: () => {
          const idx = visibleCount - 1;
          const candle = candles[idx];
          if (!candle) return;
          setTrades((prev) =>
            prev.map((t) => {
              if (t.id !== tradeId || t.outcome !== 'open') return t;
              const perUnit =
                t.direction === 'buy'
                  ? candle.close - t.entryPrice
                  : t.entryPrice - candle.close;
              const risk = Math.abs(t.entryPrice - t.originalStopLoss);
              const result = perUnit * t.positionSize;
              return {
                ...t,
                exitIndex: idx,
                exitPrice: candle.close,
                result,
                resultR: risk > 0 ? perUnit / risk : 0,
                outcome: result > 0 ? 'win' : result < 0 ? 'loss' : 'be',
                closedPercent: 100,
              };
            })
          );
        },
      },
    ]);
  };

  // =========================================================
  // RENDER HELPERS
  // =========================================================

  const lastCandle = candles[visibleCount - 1];
  const openTrade = trades.find((t) => t.outcome === 'open');
  const progress = candles.length ? (visibleCount / candles.length) * 100 : 0;

  const livePnL = useMemo(() => {
    if (!openTrade || !lastCandle) return 0;
    const perUnit =
      openTrade.direction === 'buy'
        ? lastCandle.close - openTrade.entryPrice
        : openTrade.entryPrice - lastCandle.close;
    return perUnit * openTrade.positionSize;
  }, [openTrade, lastCandle]);

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
            styles.iconBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowSymbolPicker(true)}
          style={{ flex: 1, alignItems: 'center' }}
        >
          <Text style={[styles.title, { color: colors.text }]}>
            {symbol}
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedText }]}>
            {timeframe} • {candles.length} کندل
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowSettings(true)}
          style={[
            styles.iconBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Ionicons name="options-outline" size={20} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={saveSession}
          style={[
            styles.iconBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Ionicons name="save-outline" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
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

        {/* TIMELINE SLIDER */}
        <View style={styles.sliderWrap}>
          <View style={styles.sliderHeader}>
            <Text style={[styles.sliderLabel, { color: colors.mutedText }]}>
              کندل {visibleCount} از {candles.length}
            </Text>
            <Text style={[styles.sliderLabel, { color: colors.mutedText }]}>
              {progress.toFixed(0)}%
            </Text>
          </View>
          <View
            style={[styles.sliderTrack, { backgroundColor: colors.input }]}
          >
            <View
              style={[
                styles.sliderFill,
                { width: `${progress}%`, backgroundColor: BLUE },
              ]}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sliderBtns}
            >
              <TouchableOpacity
                onPress={() => setVisibleCount(INITIAL_VISIBLE)}
                style={styles.sliderBtn}
              >
                <Text style={[styles.sliderBtnText, { color: colors.mutedText }]}>
                  شروع
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => stepForwardN(-50)}
                style={styles.sliderBtn}
              >
                <Ionicons name="play-back" size={12} color={colors.mutedText} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => stepForwardN(50)}
                style={styles.sliderBtn}
              >
                <Ionicons name="play-forward" size={12} color={colors.mutedText} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setVisibleCount(candles.length)}
                style={styles.sliderBtn}
              >
                <Text style={[styles.sliderBtnText, { color: colors.mutedText }]}>
                  پایان
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>

        {/* LIVE PRICE + P&L */}
        {lastCandle && (
          <View
            style={[
              styles.liveBar,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.liveCol}>
              <Text style={[styles.liveLabel, { color: colors.mutedText }]}>
                قیمت
              </Text>
              <Text style={[styles.liveValue, { color: colors.text }]}>
                {lastCandle.close.toFixed(lastCandle.close > 100 ? 2 : 4)}
              </Text>
            </View>

            <View style={styles.liveDivider} />

            <View style={styles.liveCol}>
              <Text style={[styles.liveLabel, { color: colors.mutedText }]}>
                P&L
              </Text>
              <Text
                style={[
                  styles.liveValue,
                  { color: livePnL >= 0 ? GREEN : RED },
                ]}
              >
                {livePnL >= 0 ? '+' : ''}${livePnL.toFixed(2)}
              </Text>
            </View>

            {openTrade && (
              <>
                <View style={styles.liveDivider} />
                <TouchableOpacity
                  onPress={() => closeTradeManually(openTrade.id)}
                  style={[
                    styles.closeTradeBtn,
                    { backgroundColor: `${RED}22`, borderColor: RED },
                  ]}
                >
                  <Ionicons name="close-circle" size={14} color={RED} />
                  <Text style={styles.closeTradeBtnText}>بستن</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* CONTROLS BAR */}
        <View style={styles.controlsBar}>
          <TouchableOpacity
            onPress={() => stepForwardN(-10)}
            disabled={visibleCount <= INITIAL_VISIBLE || isPlaying}
            style={[
              styles.smBtn,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: visibleCount <= INITIAL_VISIBLE || isPlaying ? 0.4 : 1,
              },
            ]}
          >
            <Text style={{ color: colors.text, fontSize: 10, fontWeight: '900' }}>
              ‹‹10
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={stepForward}
            disabled={visibleCount >= candles.length || isPlaying}
            style={[
              styles.smBtn,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: visibleCount >= candles.length || isPlaying ? 0.4 : 1,
              },
            ]}
          >
            <Ionicons name="play-skip-forward" size={16} color={colors.text} />
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
              size={24}
              color="#FFF"
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => stepForwardN(5)}
            disabled={visibleCount >= candles.length || isPlaying}
            style={[
              styles.smBtn,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: visibleCount >= candles.length || isPlaying ? 0.4 : 1,
              },
            ]}
          >
            <Text style={{ color: colors.text, fontSize: 10, fontWeight: '900' }}>
              5››
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => stepForwardN(10)}
            disabled={visibleCount >= candles.length || isPlaying}
            style={[
              styles.smBtn,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: visibleCount >= candles.length || isPlaying ? 0.4 : 1,
              },
            ]}
          >
            <Text style={{ color: colors.text, fontSize: 10, fontWeight: '900' }}>
              10››
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={resetSession}
            style={[
              styles.smBtn,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Ionicons name="refresh" size={16} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* SPEED SELECTOR */}
        <View style={styles.speedRow}>
          <Text style={[styles.speedLabel, { color: colors.mutedText }]}>
            سرعت:
          </Text>
          {SPEEDS.map((s, idx) => {
            const active = idx === speedIdx;
            return (
              <TouchableOpacity
                key={s.label}
                onPress={() => setSpeedIdx(idx)}
                style={[
                  styles.speedBtn,
                  {
                    backgroundColor: active ? BLUE : colors.input,
                    borderColor: active ? BLUE : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.speedBtnText,
                    { color: active ? '#FFF' : colors.mutedText },
                  ]}
                >
                  {s.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* TRADE BUTTONS */}
        <View style={styles.tradeRow}>
          <TouchableOpacity
            onPress={() => openOrderModal('buy')}
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
            onPress={() => openOrderModal('sell')}
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

        {/* STATS */}
        {stats.total > 0 && (
          <>
            <View style={styles.sectionTitleRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                آمار جلسه
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
            {trades.slice(0, 20).map((t) => {
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
                          t.direction === 'buy' ? `${GREEN}22` : `${RED}22`,
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
                      {t.direction === 'buy' ? 'BUY' : 'SELL'} @{' '}
                      {t.entryPrice.toFixed(t.entryPrice > 100 ? 2 : 4)}
                    </Text>
                    <Text style={[styles.logMeta, { color: colors.mutedText }]}>
                      {t.breakEvenTriggered ? '🎯 BE ' : ''}
                      {t.stages.filter((s) => s.hit).length}/{t.stages.length} TP
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
                        { color: isWin ? GREEN : isLoss ? RED : AMBER },
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

      {/* ============================================ */}
      {/* ORDER MODAL */}
      {/* ============================================ */}
      <Modal
        visible={showOrder}
        animationType="slide"
        transparent
        onRequestClose={() => setShowOrder(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.sheetModal,
              { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {orderDirection === 'buy' ? 'خرید' : 'فروش'}
              </Text>
              <TouchableOpacity onPress={() => setShowOrder(false)}>
                <Ionicons name="close" size={24} color={colors.mutedText} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* ORDER TYPE */}
              <Text style={[styles.fieldLabel, { color: colors.mutedText }]}>
                نوع سفارش
              </Text>
              <View style={styles.typeSelector}>
                {(['market', 'limit', 'stop'] as const).map((t) => {
                  const active = orderType === t;
                  const labels = { market: 'Market', limit: 'Limit', stop: 'Stop' };
                  return (
                    <TouchableOpacity
                      key={t}
                      onPress={() => setOrderType(t)}
                      style={[
                        styles.typeBtn,
                        {
                          backgroundColor: active ? BLUE : colors.input,
                          borderColor: active ? BLUE : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.typeBtnText,
                          { color: active ? '#FFF' : colors.mutedText },
                        ]}
                      >
                        {labels[t]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* ENTRY */}
              <Text style={[styles.fieldLabel, { color: colors.mutedText }]}>
                قیمت ورود
              </Text>
              <TextInput
                value={customEntry}
                onChangeText={setCustomEntry}
                keyboardType="decimal-pad"
                editable={orderType !== 'market'}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.input,
                    borderColor: colors.border,
                    color: colors.text,
                    opacity: orderType === 'market' ? 0.6 : 1,
                  },
                ]}
              />

              {/* AUTO SL */}
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.toggleLabel, { color: colors.text }]}>
                    SL خودکار (ATR)
                  </Text>
                </View>
                <Switch
                  value={autoSL}
                  onValueChange={setAutoSL}
                  trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
                  thumbColor={autoSL ? BLUE : '#FFFFFF'}
                />
              </View>

              {!autoSL && (
                <>
                  <Text style={[styles.fieldLabel, { color: colors.mutedText }]}>
                    Stop Loss
                  </Text>
                  <TextInput
                    value={customSL}
                    onChangeText={setCustomSL}
                    keyboardType="decimal-pad"
                    placeholder="مثلاً 3650.00"
                    placeholderTextColor={colors.mutedText}
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

              {/* AUTO TP */}
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.toggleLabel, { color: colors.text }]}>
                    TP خودکار (R:R)
                  </Text>
                </View>
                <Switch
                  value={autoTP}
                  onValueChange={setAutoTP}
                  trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
                  thumbColor={autoTP ? BLUE : '#FFFFFF'}
                />
              </View>

              {!autoTP && (
                <>
                  <Text style={[styles.fieldLabel, { color: colors.mutedText }]}>
                    Take Profit
                  </Text>
                  <TextInput
                    value={customTP}
                    onChangeText={setCustomTP}
                    keyboardType="decimal-pad"
                    placeholder="مثلاً 3670.00"
                    placeholderTextColor={colors.mutedText}
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

              {/* PREVIEW */}
              <View
                style={[
                  styles.previewBox,
                  { backgroundColor: colors.input, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.previewTitle, { color: colors.mutedText }]}>
                  پیش‌نمایش
                </Text>
                <View style={styles.previewRow}>
                  <Text style={[styles.previewLabel, { color: colors.mutedText }]}>
                    ریسک:
                  </Text>
                  <Text style={[styles.previewValue, { color: RED }]}>
                    ${(settings.capital * settings.riskPerTrade / 100).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={[styles.previewLabel, { color: colors.mutedText }]}>
                    حجم:
                  </Text>
                  <Text style={[styles.previewValue, { color: colors.text }]}>
                    {(settings.capital * settings.riskPerTrade / 100 / 10).toFixed(3)} lots
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={submitOrder}
                style={[
                  styles.submitBtn,
                  {
                    backgroundColor:
                      orderDirection === 'buy' ? GREEN : RED,
                  },
                ]}
              >
                <Ionicons
                  name={orderDirection === 'buy' ? 'arrow-up' : 'arrow-down'}
                  size={20}
                  color="#FFF"
                />
                <Text style={styles.submitBtnText}>
                  ثبت {orderDirection === 'buy' ? 'خرید' : 'فروش'}
                </Text>
              </TouchableOpacity>

              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ============================================ */}
      {/* SETTINGS MODAL */}
      {/* ============================================ */}
      <Modal
        visible={showSettings}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.sheetModal,
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
              <TouchableOpacity
                onPress={loadSession}
                style={[
                  styles.loadBtn,
                  { backgroundColor: colors.input, borderColor: colors.border },
                ]}
              >
                <Ionicons name="folder-open-outline" size={18} color={colors.text} />
                <Text style={[styles.loadBtnText, { color: colors.text }]}>
                  بارگذاری جلسه ذخیره‌شده
                </Text>
              </TouchableOpacity>

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

              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.toggleLabel, { color: colors.text }]}>
                    Multi-Stage Take Profit
                  </Text>
                  <Text style={[styles.toggleSub, { color: colors.mutedText }]}>
                    ۳ مرحله: 1R، 2R، RR
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

              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.toggleLabel, { color: colors.text }]}>
                    Breakeven Stop
                  </Text>
                  <Text style={[styles.toggleSub, { color: colors.mutedText }]}>
                    انتقال SL به نقطه ورود
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

              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.toggleLabel, { color: colors.text }]}>
                    Trailing Stop
                  </Text>
                  <Text style={[styles.toggleSub, { color: colors.mutedText }]}>
                    حد ضرر متحرک
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

      {/* ============================================ */}
      {/* EQUITY MODAL */}
      {/* ============================================ */}
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
                    { color: stats.totalPnL >= 0 ? GREEN : RED },
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
                    { color: stats.totalPnL >= 0 ? GREEN : RED },
                  ]}
                >
                  {((stats.totalPnL / settings.capital) * 100).toFixed(2)}%
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================ */}
      {/* SYMBOL PICKER */}
      {/* ============================================ */}
      <Modal
        visible={showSymbolPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSymbolPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.sheetModal,
              { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                انتخاب نماد
              </Text>
              <TouchableOpacity onPress={() => setShowSymbolPicker(false)}>
                <Ionicons name="close" size={24} color={colors.mutedText} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.fieldLabel, { color: colors.mutedText }]}>
              نماد
            </Text>
            <View style={styles.chipsWrap}>
              {SYMBOLS.map((s) => {
                const active = s.id === symbol;
                return (
                  <TouchableOpacity
                    key={s.id}
                    onPress={() => {
                      setSymbol(s.id);
                      setShowSymbolPicker(false);
                    }}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? BLUE : colors.input,
                        borderColor: active ? BLUE : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: active ? '#FFF' : colors.text },
                      ]}
                    >
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.fieldLabel, { color: colors.mutedText }]}>
              تایم‌فریم
            </Text>
            <View style={styles.chipsWrap}>
              {TIMEFRAMES.map((tf) => {
                const active = tf.id === timeframe;
                return (
                  <TouchableOpacity
                    key={tf.id}
                    onPress={() => {
                      setTimeframe(tf.id);
                      setShowSymbolPicker(false);
                    }}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? BLUE : colors.input,
                        borderColor: active ? BLUE : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: active ? '#FFF' : colors.text },
                      ]}
                    >
                      {tf.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
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
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'ios' ? 56 : 50,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  title: { fontSize: 16, fontWeight: '900' },
  subtitle: { fontSize: 10, fontWeight: '700', marginTop: 2 },

  content: { padding: 14, paddingBottom: 30 },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 10 },
  loadText: { fontSize: 12, fontWeight: '600' },

  chartWrap: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
    height: 320,
  },
  webview: { flex: 1, backgroundColor: 'transparent' },

  sliderWrap: { marginBottom: 12 },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  sliderLabel: { fontSize: 10, fontWeight: '700' },
  sliderTrack: { height: 30, borderRadius: 8, overflow: 'hidden', justifyContent: 'center' },
  sliderFill: { position: 'absolute', left: 0, top: 0, bottom: 0, opacity: 0.2 },
  sliderBtns: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, gap: 4 },
  sliderBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  sliderBtnText: { fontSize: 10, fontWeight: '900' },

  liveBar: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  liveCol: { flex: 1, alignItems: 'center' },
  liveLabel: { fontSize: 9, fontWeight: '700', marginBottom: 3 },
  liveValue: { fontSize: 14, fontWeight: '900' },
  liveDivider: { width: 1, height: 26, backgroundColor: '#00000015' },
  closeTradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  closeTradeBtnText: { fontSize: 11, fontWeight: '900', color: RED },

  controlsBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  smBtn: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  playBtn: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  speedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  speedLabel: { fontSize: 11, fontWeight: '800' },
  speedBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  speedBtnText: { fontSize: 10, fontWeight: '900' },

  tradeRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  tradeBtn: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  tradeBtnText: { color: '#FFF', fontSize: 14, fontWeight: '900' },

  sectionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '900' },
  sectionLink: { fontSize: 12, fontWeight: '800' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  statCard: { width: '48.5%', borderRadius: 12, borderWidth: 1, padding: 10, alignItems: 'flex-end' },
  statLabel: { fontSize: 9, fontWeight: '700' },
  statValue: { fontSize: 15, fontWeight: '900', marginTop: 3 },

  logCard: { borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 14 },
  logTitle: { fontSize: 13, fontWeight: '900', marginBottom: 8 },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1 },
  logIcon: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  logPair: { fontSize: 11, fontWeight: '900' },
  logMeta: { fontSize: 9, fontWeight: '600', marginTop: 2 },
  logOutcome: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  logOutcomeText: { fontSize: 8, fontWeight: '900' },
  logResult: { fontSize: 11, fontWeight: '900', width: 58, textAlign: 'left' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheetModal: {
    maxHeight: '90%',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  equityModal: {
    maxHeight: '70%',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: '900' },

  loadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  loadBtnText: { fontSize: 13, fontWeight: '800' },

  fieldLabel: { fontSize: 11, fontWeight: '800', marginTop: 10, marginBottom: 6, textAlign: 'right' },
  input: {
    height: 46,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },

  typeSelector: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  typeBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBtnText: { fontSize: 12, fontWeight: '900' },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  toggleLabel: { fontSize: 13, fontWeight: '900', textAlign: 'right' },
  toggleSub: { fontSize: 10, fontWeight: '600', marginTop: 2, textAlign: 'right' },

  previewBox: { borderRadius: 12, borderWidth: 1, padding: 12, marginTop: 14 },
  previewTitle: { fontSize: 11, fontWeight: '800', marginBottom: 8, textAlign: 'right' },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  previewLabel: { fontSize: 11, fontWeight: '700' },
  previewValue: { fontSize: 12, fontWeight: '900' },

  submitBtn: {
    marginTop: 16,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  submitBtnText: { color: '#FFF', fontSize: 14, fontWeight: '900' },

  saveBtn: {
    marginTop: 18,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  saveBtnText: { color: '#FFF', fontSize: 14, fontWeight: '900' },

  equityChartWrap: { borderRadius: 14, borderWidth: 1, overflow: 'hidden', height: 240, marginBottom: 14 },
  equityInfo: { flexDirection: 'row', gap: 10 },
  equityItem: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  equityLabel: { fontSize: 10, fontWeight: '700' },
  equityValue: { fontSize: 17, fontWeight: '900', marginTop: 4 },

  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '800' },
});