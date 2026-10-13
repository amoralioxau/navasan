import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
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
import {
    fetchCandles,
    type Candle,
    type Timeframe
} from '@/lib/market-data';

const BLUE = '#2563EB';
const GREEN = '#16A34A';
const RED = '#DC2626';

// =========================================================
// SYMBOLS
// =========================================================

type SymbolItem = {
  id: string;
  label: string;
  category: 'crypto' | 'metal' | 'forex' | 'index';
};

const SYMBOLS: SymbolItem[] = [
  // Crypto
  { id: 'BTCUSD', label: 'بیت‌کوین', category: 'crypto' },
  { id: 'ETHUSD', label: 'اتریوم', category: 'crypto' },
  { id: 'BNBUSD', label: 'BNB', category: 'crypto' },
  { id: 'SOLUSD', label: 'Solana', category: 'crypto' },
  { id: 'XRPUSD', label: 'XRP', category: 'crypto' },
  { id: 'ADAUSD', label: 'Cardano', category: 'crypto' },
  { id: 'DOGEUSD', label: 'Dogecoin', category: 'crypto' },
  { id: 'MATICUSD', label: 'Polygon', category: 'crypto' },
  { id: 'AVAXUSD', label: 'Avalanche', category: 'crypto' },
  { id: 'DOTUSD', label: 'Polkadot', category: 'crypto' },
  { id: 'LINKUSD', label: 'Chainlink', category: 'crypto' },
  { id: 'LTCUSD', label: 'Litecoin', category: 'crypto' },

  // Metals
  { id: 'XAUUSD', label: 'طلا', category: 'metal' },
  { id: 'XAGUSD', label: 'نقره', category: 'metal' },
  { id: 'XPTUSD', label: 'پلاتین', category: 'metal' },

  // Forex
  { id: 'EURUSD', label: 'یورو/دلار', category: 'forex' },
  { id: 'GBPUSD', label: 'پوند/دلار', category: 'forex' },
  { id: 'USDJPY', label: 'دلار/ین', category: 'forex' },
  { id: 'USDCHF', label: 'دلار/فرانک', category: 'forex' },
  { id: 'AUDUSD', label: 'دلار استرالیا', category: 'forex' },
  { id: 'USDCAD', label: 'دلار/کانادا', category: 'forex' },
  { id: 'NZDUSD', label: 'دلار نیوزلند', category: 'forex' },
  { id: 'EURJPY', label: 'یورو/ین', category: 'forex' },
  { id: 'GBPJPY', label: 'پوند/ین', category: 'forex' },
  { id: 'EURGBP', label: 'یورو/پوند', category: 'forex' },

  // Index
  { id: 'SPX', label: 'S&P 500', category: 'index' },
  { id: 'NAS100', label: 'نزدک', category: 'index' },
  { id: 'DJI', label: 'داو جونز', category: 'index' },
  { id: 'DAX', label: 'DAX', category: 'index' },
  { id: 'FTSE', label: 'FTSE', category: 'index' },
  { id: 'NIKKEI', label: 'نیکی', category: 'index' },
];

const TIMEFRAMES: { id: Timeframe; label: string }[] = [
  { id: '1m', label: '۱د' },
  { id: '5m', label: '۵د' },
  { id: '15m', label: '۱۵د' },
  { id: '1h', label: '۱س' },
  { id: '4h', label: '۴س' },
  { id: '1d', label: 'روز' },
  { id: '1w', label: 'هفته' },
];

const CATEGORY_LABELS: Record<SymbolItem['category'], string> = {
  crypto: 'کریپتو',
  metal: 'فلزات',
  forex: 'فارکس',
  index: 'شاخص‌ها',
};

const CATEGORY_ORDER: SymbolItem['category'][] = [
  'metal',
  'crypto',
  'forex',
  'index',
];

// =========================================================
// HTML BUILDER (Lightweight Charts v5)
// =========================================================

const buildChartHTML = (isDark: boolean): string => {
  const bg = isDark ? '#050505' : '#FFFFFF';
  const cardBg = isDark ? '#0F172A' : '#F8FAFC';
  const textColor = isDark ? '#E5E7EB' : '#0F172A';
  const mutedColor = isDark ? '#94A3B8' : '#64748B';
  const gridColor = isDark ? '#1E293B' : '#E2E8F0';
  const borderColor = isDark ? '#1E293B' : '#E2E8F0';

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
      background: ${bg};
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: ${textColor};
      user-select: none;
    }
    #top-bar {
      position: absolute; top: 0; left: 0; right: 0;
      z-index: 10;
      background: ${bg};
      padding: 8px 10px;
      border-bottom: 1px solid ${borderColor};
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 40px;
    }
    #ohlc {
      font-size: 11px;
      font-weight: 700;
      color: ${mutedColor};
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    #ohlc span b { color: ${textColor}; font-weight: 800; }
    #ohlc .up { color: #16A34A; }
    #ohlc .down { color: #DC2626; }
    #legend {
      position: absolute; top: 45px; left: 10px;
      z-index: 10;
      font-size: 10px;
      font-weight: 700;
      display: flex; flex-direction: column; gap: 3px;
      pointer-events: none;
    }
    #legend .row { display: flex; align-items: center; gap: 5px; }
    #legend .dot { width: 8px; height: 8px; border-radius: 50%; }
    #chart { position: absolute; top: 40px; left: 0; right: 0; bottom: 0; }
    .loading {
      position: absolute; inset: 0;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      gap: 12px; color: ${mutedColor};
    }
    .spinner {
      width: 32px; height: 32px;
      border: 3px solid ${gridColor};
      border-top-color: #2563EB; border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div id="top-bar">
    <div id="ohlc">
      <span>O: <b id="o-val">—</b></span>
      <span>H: <b id="h-val">—</b></span>
      <span>L: <b id="l-val">—</b></span>
      <span>C: <b id="c-val">—</b></span>
    </div>
  </div>
  <div id="legend"></div>
  <div id="chart">
    <div class="loading" id="loading">
      <div class="spinner"></div>
      <div>در حال بارگذاری چارت...</div>
    </div>
  </div>

  <script src="https://unpkg.com/lightweight-charts@5.0.0/dist/lightweight-charts.standalone.production.js"></script>
  <script>
    let chart = null;
    let candleSeries = null;
    let volumeSeries = null;
    let ma20Series = null;
    let ma50Series = null;
    let bbUpperSeries = null;
    let bbLowerSeries = null;
    let currentCandles = [];
    let currentShowMA = true;
    let currentShowBB = false;
    let currentShowVolume = true;

    // =========================================================
    // INIT CHART
    // =========================================================
    function initChart() {
      try {
        document.getElementById('loading').style.display = 'none';

        const chartEl = document.getElementById('chart');
        chart = LightweightCharts.createChart(chartEl, {
          width: chartEl.clientWidth,
          height: chartEl.clientHeight,
          layout: {
            background: { type: 'solid', color: '${bg}' },
            textColor: '${textColor}',
            fontSize: 11,
            fontFamily: '-apple-system, sans-serif',
          },
          grid: {
            vertLines: { color: '${gridColor}', style: 1 },
            horzLines: { color: '${gridColor}', style: 1 },
          },
          rightPriceScale: {
            borderColor: '${borderColor}',
            scaleMargins: { top: 0.1, bottom: 0.25 },
          },
          timeScale: {
            borderColor: '${borderColor}',
            timeVisible: true,
            secondsVisible: false,
            rightOffset: 5,
            barSpacing: 6,
            minBarSpacing: 0.5,
          },
          crosshair: {
            mode: 1,
            vertLine: {
              color: '#2563EB',
              width: 1,
              style: 2,
              labelBackgroundColor: '#2563EB',
            },
            horzLine: {
              color: '#2563EB',
              width: 1,
              style: 2,
              labelBackgroundColor: '#2563EB',
            },
          },
          handleScroll: {
            mouseWheel: true,
            pressedMouseMove: true,
            horzTouchDrag: true,
            vertTouchDrag: false,
          },
          handleScale: {
            axisPressedMouseMove: true,
            mouseWheel: true,
            pinch: true,
          },
        });

        // Candles
        candleSeries = chart.addCandlestickSeries({
          upColor: '#16A34A',
          downColor: '#DC2626',
          borderUpColor: '#16A34A',
          borderDownColor: '#DC2626',
          wickUpColor: '#16A34A',
          wickDownColor: '#DC2626',
          priceLineColor: '#2563EB',
          priceLineWidth: 1,
        });

        // Volume
        volumeSeries = chart.addHistogramSeries({
          color: '#2563EB40',
          priceFormat: { type: 'volume' },
          priceScaleId: 'volume',
          lastValueVisible: false,
          priceLineVisible: false,
        });
        chart.priceScale('volume').applyOptions({
          scaleMargins: { top: 0.8, bottom: 0 },
        });

        // MA20
        ma20Series = chart.addLineSeries({
          color: '#F59E0B',
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });

        // MA50
        ma50Series = chart.addLineSeries({
          color: '#7C3AED',
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });

        // Bollinger Bands
        bbUpperSeries = chart.addLineSeries({
          color: '#0891B2',
          lineWidth: 1,
          lineStyle: 2,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
        bbLowerSeries = chart.addLineSeries({
          color: '#0891B2',
          lineWidth: 1,
          lineStyle: 2,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });

        // Update OHLC on crosshair move
        chart.subscribeCrosshairMove((param) => {
          if (!param.time || !param.seriesData.has(candleSeries)) {
            updateOHLC(null);
            return;
          }
          const data = param.seriesData.get(candleSeries);
          updateOHLC(data);
        });

        // Resize observer
        const ro = new ResizeObserver(() => {
          if (chart && chartEl) {
            chart.applyOptions({
              width: chartEl.clientWidth,
              height: chartEl.clientHeight,
            });
          }
        });
        ro.observe(chartEl);

      } catch (e) {
        document.getElementById('chart').innerHTML =
          '<div class="loading">خطا در راه‌اندازی چارت</div>';
        console.error('Init error:', e);
      }
    }

    // =========================================================
    // UPDATE OHLC BAR
    // =========================================================
    function updateOHLC(data) {
      if (!data) {
        ['o-val','h-val','l-val','c-val'].forEach(id => {
          document.getElementById(id).textContent = '—';
          document.getElementById(id).className = '';
        });
        return;
      }
      document.getElementById('o-val').textContent = data.open.toFixed(4);
      document.getElementById('h-val').textContent = data.high.toFixed(4);
      document.getElementById('l-val').textContent = data.low.toFixed(4);
      const cls = data.close >= data.open ? 'up' : 'down';
      document.getElementById('c-val').textContent = data.close.toFixed(4);
      document.getElementById('c-val').className = cls;
    }

    // =========================================================
    // CALCULATE INDICATORS
    // =========================================================
    function calcSMA(candles, period) {
      const result = [];
      for (let i = 0; i < candles.length; i++) {
        if (i < period - 1) continue;
        let sum = 0;
        for (let j = 0; j < period; j++) sum += candles[i - j].close;
        result.push({
          time: Math.floor(candles[i].timestamp / 1000),
          value: sum / period,
        });
      }
      return result;
    }

    function calcBollingerBands(candles, period, multiplier) {
      const upper = [];
      const lower = [];
      for (let i = 0; i < candles.length; i++) {
        if (i < period - 1) continue;
        let sum = 0;
        for (let j = 0; j < period; j++) sum += candles[i - j].close;
        const sma = sum / period;
        let variance = 0;
        for (let j = 0; j < period; j++) {
          variance += Math.pow(candles[i - j].close - sma, 2);
        }
        const stdDev = Math.sqrt(variance / period);
        upper.push({
          time: Math.floor(candles[i].timestamp / 1000),
          value: sma + stdDev * multiplier,
        });
        lower.push({
          time: Math.floor(candles[i].timestamp / 1000),
          value: sma - stdDev * multiplier,
        });
      }
      return { upper, lower };
    }

    // =========================================================
    // SET CANDLES
    // =========================================================
    window.setCandles = function (candles) {
      if (!chart || !candleSeries || !candles || candles.length === 0) return;

      currentCandles = candles;

      const formatted = candles.map(c => ({
        time: Math.floor(c.timestamp / 1000),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));

      candleSeries.setData(formatted);

      // Volume
      if (currentShowVolume && volumeSeries) {
        const volumeData = candles.map(c => ({
          time: Math.floor(c.timestamp / 1000),
          value: c.volume || 0,
          color: c.close >= c.open ? '#16A34A40' : '#DC262640',
        }));
        volumeSeries.setData(volumeData);
      }

      // MA20
      if (currentShowMA && ma20Series) {
        ma20Series.setData(calcSMA(candles, 20));
      }

      // MA50
      if (currentShowMA && ma50Series) {
        ma50Series.setData(calcSMA(candles, 50));
      }

      // Bollinger Bands
      if (currentShowBB && bbUpperSeries && bbLowerSeries) {
        const bb = calcBollingerBands(candles, 20, 2);
        bbUpperSeries.setData(bb.upper);
        bbLowerSeries.setData(bb.lower);
      }

      updateLegend();

      // Fit all data
      chart.timeScale().fitContent();
    };

    // =========================================================
    // TOGGLE INDICATORS
    // =========================================================
    window.toggleMA = function (show) {
      currentShowMA = show;
      if (ma20Series) ma20Series.applyOptions({ visible: show });
      if (ma50Series) ma50Series.applyOptions({ visible: show });
      updateLegend();
    };

    window.toggleBB = function (show) {
      currentShowBB = show;
      if (bbUpperSeries) bbUpperSeries.applyOptions({ visible: show });
      if (bbLowerSeries) bbLowerSeries.applyOptions({ visible: show });
      updateLegend();
    };

    window.toggleVolume = function (show) {
      currentShowVolume = show;
      if (volumeSeries) volumeSeries.applyOptions({ visible: show });
    };

    // =========================================================
    // LEGEND
    // =========================================================
    function updateLegend() {
      const legend = document.getElementById('legend');
      let html = '';
      if (currentShowMA) {
        html += '<div class="row"><div class="dot" style="background:#F59E0B"></div><span>MA 20</span></div>';
        html += '<div class="row"><div class="dot" style="background:#7C3AED"></div><span>MA 50</span></div>';
      }
      if (currentShowBB) {
        html += '<div class="row"><div class="dot" style="background:#0891B2"></div><span>Bollinger</span></div>';
      }
      legend.innerHTML = html;
    }

    // =========================================================
    // FIT CONTENT
    // =========================================================
    window.fitContent = function() {
      if (chart) chart.timeScale().fitContent();
    };

    window.scrollToRealtime = function() {
      if (chart) chart.timeScale().scrollToRealTime();
    };

    // =========================================================
    // START
    // =========================================================
    if (document.readyState === 'complete') initChart();
    else window.addEventListener('load', initChart);
  </script>
</body>
</html>
  `;
};

// =========================================================
// MAIN COMPONENT
// =========================================================

export default function ChartScreen() {
  const { colors, isDark } = useNavasanTheme();
  const webViewRef = useRef<WebView>(null);

  const [selectedSymbol, setSelectedSymbol] = useState<SymbolItem>(SYMBOLS[0]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('1h');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSymbolPicker, setShowSymbolPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [showMA, setShowMA] = useState(true);
  const [showBB, setShowBB] = useState(false);
  const [showVolume, setShowVolume] = useState(true);
  const [chartReady, setChartReady] = useState(false);

  const html = useMemo(() => buildChartHTML(isDark), [isDark]);
  const webViewKey = useMemo(() => `chart-${isDark ? 'dark' : 'light'}`, [isDark]);

  // =========================================================
  // LOAD CANDLES
  // =========================================================

  const loadCandles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCandles(
        selectedSymbol.id,
        selectedTimeframe,
        1000
      );
      setCandles(data);
    } catch (e) {
      console.log('Load candles error:', e);
      setCandles([]);
    } finally {
      setLoading(false);
    }
  }, [selectedSymbol.id, selectedTimeframe]);

  useEffect(() => {
    loadCandles();
  }, [loadCandles]);

  // =========================================================
  // SEND DATA TO WEBVIEW
  // =========================================================

  const sendDataToWebView = useCallback(() => {
    if (!webViewRef.current || candles.length === 0 || !chartReady) return;

    // Candles
    const script = `window.setCandles(${JSON.stringify(candles)}); true;`;
    webViewRef.current.injectJavaScript(script);
  }, [candles, chartReady]);

  useEffect(() => {
    sendDataToWebView();
  }, [sendDataToWebView]);

  // =========================================================
  // TOGGLE INDICATORS
  // =========================================================

  useEffect(() => {
    if (!webViewRef.current || !chartReady) return;
    webViewRef.current.injectJavaScript(
      `window.toggleMA(${showMA}); true;`
    );
  }, [showMA, chartReady]);

  useEffect(() => {
    if (!webViewRef.current || !chartReady) return;
    webViewRef.current.injectJavaScript(
      `window.toggleBB(${showBB}); true;`
    );
  }, [showBB, chartReady]);

  useEffect(() => {
    if (!webViewRef.current || !chartReady) return;
    webViewRef.current.injectJavaScript(
      `window.toggleVolume(${showVolume}); true;`
    );
  }, [showVolume, chartReady]);

  // =========================================================
  // FILTERED SYMBOLS
  // =========================================================

  const filteredSymbols = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return SYMBOLS;
    return SYMBOLS.filter(
      (s) =>
        s.id.toLowerCase().includes(q) ||
        s.label.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const latest = candles.length > 0 ? candles[candles.length - 1] : null;
  const previous = candles.length > 1 ? candles[candles.length - 2] : null;
  const priceChange = latest && previous ? latest.close - previous.close : 0;
  const priceChangePct =
    latest && previous && previous.close !== 0
      ? (priceChange / previous.close) * 100
      : 0;
  const isUp = priceChange >= 0;

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* HEADER */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <View style={styles.brandRow}>
            <Text style={[styles.brand, { color: colors.text }]}>NAVASAN</Text>
            <View style={[styles.liveBadge, { backgroundColor: `${GREEN}22` }]}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
          <Text style={[styles.subtitle, { color: colors.mutedText }]}>
            {selectedSymbol.label} • {selectedTimeframe}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setShowSymbolPicker(true)}
          style={[
            styles.iconBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Ionicons name="search" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* SYMBOL INFO */}
      {latest && (
        <View
          style={[
            styles.priceBar,
            { backgroundColor: colors.card, borderBottomColor: colors.border },
          ]}
        >
          <View>
            <Text style={[styles.symbolId, { color: colors.mutedText }]}>
              {selectedSymbol.id}
            </Text>
            <Text style={[styles.priceText, { color: colors.text }]}>
              {latest.close.toFixed(latest.close > 100 ? 2 : 4)}
            </Text>
          </View>

          <View style={styles.changeBox}>
            <Ionicons
              name={isUp ? 'arrow-up-circle' : 'arrow-down-circle'}
              size={18}
              color={isUp ? GREEN : RED}
            />
            <Text
              style={[
                styles.changeText,
                { color: isUp ? GREEN : RED },
              ]}
            >
              {isUp ? '+' : ''}
              {priceChangePct.toFixed(2)}%
            </Text>
          </View>
        </View>
      )}

      {/* TIMEFRAME ROW */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.timeframeRow}
        style={[
          styles.timeframeBar,
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        {TIMEFRAMES.map((tf) => {
          const active = tf.id === selectedTimeframe;
          return (
            <TouchableOpacity
              key={tf.id}
              onPress={() => setSelectedTimeframe(tf.id)}
              style={[
                styles.tfBtn,
                {
                  backgroundColor: active ? BLUE : colors.input,
                  borderColor: active ? BLUE : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.tfText,
                  { color: active ? '#FFFFFF' : colors.mutedText },
                ]}
              >
                {tf.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* INDICATOR TOGGLES */}
      <View style={styles.indicatorRow}>
        <TouchableOpacity
          onPress={() => setShowMA(!showMA)}
          style={[
            styles.indicatorBtn,
            {
              backgroundColor: showMA ? `${BLUE}22` : colors.input,
              borderColor: showMA ? BLUE : colors.border,
            },
          ]}
        >
          <View style={[styles.indicatorDot, { backgroundColor: '#F59E0B' }]} />
          <Text
            style={[
              styles.indicatorText,
              { color: showMA ? BLUE : colors.mutedText },
            ]}
          >
            MA
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowBB(!showBB)}
          style={[
            styles.indicatorBtn,
            {
              backgroundColor: showBB ? `${BLUE}22` : colors.input,
              borderColor: showBB ? BLUE : colors.border,
            },
          ]}
        >
          <View style={[styles.indicatorDot, { backgroundColor: '#0891B2' }]} />
          <Text
            style={[
              styles.indicatorText,
              { color: showBB ? BLUE : colors.mutedText },
            ]}
          >
            BB
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowVolume(!showVolume)}
          style={[
            styles.indicatorBtn,
            {
              backgroundColor: showVolume ? `${BLUE}22` : colors.input,
              borderColor: showVolume ? BLUE : colors.border,
            },
          ]}
        >
          <Ionicons
            name="bar-chart-outline"
            size={12}
            color={showVolume ? BLUE : colors.mutedText}
          />
          <Text
            style={[
              styles.indicatorText,
              { color: showVolume ? BLUE : colors.mutedText },
            ]}
          >
            Vol
          </Text>
        </TouchableOpacity>

        <View style={{ flex: 1 }} />

        <TouchableOpacity
          onPress={() => {
            webViewRef.current?.injectJavaScript(
              'window.scrollToRealtime(); true;'
            );
          }}
          style={[
            styles.indicatorBtn,
            { backgroundColor: colors.input, borderColor: colors.border },
          ]}
        >
          <Ionicons name="arrow-forward" size={12} color={colors.mutedText} />
        </TouchableOpacity>
      </View>

      {/* CHART */}
      <View style={styles.chartWrap}>
        {loading && candles.length === 0 ? (
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
            onLoadEnd={() => setChartReady(true)}
            onMessage={(event) => {
              console.log('[Chart]', event.nativeEvent.data);
            }}
          />
        )}

        {loading && candles.length > 0 && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color={BLUE} />
          </View>
        )}
      </View>

      {/* SYMBOL PICKER */}
      <Modal
        visible={showSymbolPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSymbolPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.pickerModal,
              { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' },
            ]}
          >
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>
                انتخاب نماد
              </Text>
              <TouchableOpacity onPress={() => setShowSymbolPicker(false)}>
                <Ionicons name="close" size={24} color={colors.mutedText} />
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.searchWrap,
                { backgroundColor: colors.input, borderColor: colors.border },
              ]}
            >
              <Ionicons name="search" size={18} color={colors.mutedText} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="جستجوی نماد..."
                placeholderTextColor={colors.mutedText}
                style={[styles.searchInput, { color: colors.text }]}
              />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {CATEGORY_ORDER.map((cat) => {
                const items = filteredSymbols.filter(
                  (s) => s.category === cat
                );
                if (items.length === 0) return null;
                return (
                  <View key={cat} style={styles.categorySection}>
                    <Text
                      style={[
                        styles.categoryLabel,
                        { color: colors.mutedText },
                      ]}
                    >
                      {CATEGORY_LABELS[cat]}
                    </Text>
                    {items.map((s) => {
                      const active = s.id === selectedSymbol.id;
                      return (
                        <TouchableOpacity
                          key={s.id}
                          onPress={() => {
                            setSelectedSymbol(s);
                            setShowSymbolPicker(false);
                            setSearchQuery('');
                          }}
                          style={[
                            styles.pickerRow,
                            {
                              backgroundColor: active
                                ? `${BLUE}15`
                                : colors.card,
                              borderColor: active ? BLUE : colors.border,
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.pickerIcon,
                              {
                                backgroundColor: active
                                  ? `${BLUE}22`
                                  : colors.input,
                              },
                            ]}
                          >
                            <Ionicons
                              name={
                                cat === 'crypto'
                                  ? 'logo-bitcoin'
                                  : cat === 'metal'
                                  ? 'diamond'
                                  : cat === 'index'
                                  ? 'stats-chart'
                                  : 'cash'
                              }
                              size={16}
                              color={active ? BLUE : colors.mutedText}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.pickerLabel,
                                { color: colors.text },
                              ]}
                            >
                              {s.label}
                            </Text>
                            <Text
                              style={[
                                styles.pickerId,
                                { color: colors.mutedText },
                              ]}
                            >
                              {s.id}
                            </Text>
                          </View>
                          {active && (
                            <Ionicons
                              name="checkmark-circle"
                              size={20}
                              color={BLUE}
                            />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                );
              })}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// =========================================================
// STYLES
// =========================================================

const styles = StyleSheet.create({
  screen: { flex: 1 },

  header: {
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'ios' ? 56 : 50,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  headerLeft: { flex: 1 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brand: { fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: GREEN },
  liveText: {
    color: GREEN,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  subtitle: { fontSize: 11, fontWeight: '600', marginTop: 3 },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  priceBar: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  symbolId: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  priceText: { fontSize: 22, fontWeight: '900', marginTop: 2 },
  changeBox: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  changeText: { fontSize: 14, fontWeight: '900' },

  timeframeBar: { borderBottomWidth: 1 },
  timeframeRow: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  tfBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  tfText: { fontSize: 11, fontWeight: '900' },

  indicatorRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  indicatorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
    borderWidth: 1,
  },
  indicatorDot: { width: 8, height: 8, borderRadius: 4 },
  indicatorText: { fontSize: 10, fontWeight: '900' },

  chartWrap: { flex: 1, position: 'relative' },
  webview: { flex: 1, backgroundColor: 'transparent' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadText: { fontSize: 12, fontWeight: '600' },
  loadingOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 8,
    borderRadius: 12,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerModal: {
    maxHeight: '88%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  pickerTitle: { fontSize: 20, fontWeight: '900' },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 46,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 13, textAlign: 'right' },

  categorySection: { marginBottom: 16 },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 7,
    textAlign: 'right',
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 11,
    borderRadius: 13,
    borderWidth: 1,
    marginBottom: 7,
  },
  pickerIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerLabel: { fontSize: 13, fontWeight: '800', textAlign: 'right' },
  pickerId: { fontSize: 10, fontWeight: '600', marginTop: 2, textAlign: 'right' },
});