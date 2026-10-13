import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { WebView } from 'react-native-webview';

import { useNavasanTheme } from '@/context/theme-context';
import { fetchCandles, type Candle, type Timeframe } from '@/lib/market-data';

const BLUE = '#2563EB';
const GREEN = '#16A34A';
const RED = '#DC2626';
const AMBER = '#F59E0B';
const PURPLE = '#7C3AED';
const CYAN = '#0891B2';
const PINK = '#DB2777';

const DRAWINGS_KEY = 'navasan_chart_drawings_v1';
const ALERTS_KEY = 'navasan_chart_alerts_v1';

// =========================================================
// DATA
// =========================================================

type SymbolItem = {
  id: string;
  label: string;
  cat: 'metal' | 'crypto' | 'forex' | 'index';
};

const SYMBOLS: SymbolItem[] = [
  { id: 'XAUUSD', label: 'طلا', cat: 'metal' },
  { id: 'XAGUSD', label: 'نقره', cat: 'metal' },
  { id: 'XPTUSD', label: 'پلاتین', cat: 'metal' },
  { id: 'BTCUSD', label: 'بیت‌کوین', cat: 'crypto' },
  { id: 'ETHUSD', label: 'اتریوم', cat: 'crypto' },
  { id: 'BNBUSD', label: 'BNB', cat: 'crypto' },
  { id: 'SOLUSD', label: 'Solana', cat: 'crypto' },
  { id: 'XRPUSD', label: 'XRP', cat: 'crypto' },
  { id: 'ADAUSD', label: 'Cardano', cat: 'crypto' },
  { id: 'DOGEUSD', label: 'Dogecoin', cat: 'crypto' },
  { id: 'MATICUSD', label: 'Polygon', cat: 'crypto' },
  { id: 'AVAXUSD', label: 'Avalanche', cat: 'crypto' },
  { id: 'DOTUSD', label: 'Polkadot', cat: 'crypto' },
  { id: 'LINKUSD', label: 'Chainlink', cat: 'crypto' },
  { id: 'LTCUSD', label: 'Litecoin', cat: 'crypto' },
  { id: 'EURUSD', label: 'یورو/دلار', cat: 'forex' },
  { id: 'GBPUSD', label: 'پوند/دلار', cat: 'forex' },
  { id: 'USDJPY', label: 'دلار/ین', cat: 'forex' },
  { id: 'USDCHF', label: 'دلار/فرانک', cat: 'forex' },
  { id: 'AUDUSD', label: 'دلار استرالیا', cat: 'forex' },
  { id: 'USDCAD', label: 'دلار/کانادا', cat: 'forex' },
  { id: 'NZDUSD', label: 'دلار نیوزلند', cat: 'forex' },
  { id: 'EURJPY', label: 'یورو/ین', cat: 'forex' },
  { id: 'GBPJPY', label: 'پوند/ین', cat: 'forex' },
  { id: 'EURGBP', label: 'یورو/پوند', cat: 'forex' },
  { id: 'SPX', label: 'S&P 500', cat: 'index' },
  { id: 'NAS100', label: 'نزدک', cat: 'index' },
  { id: 'DJI', label: 'داو جونز', cat: 'index' },
  { id: 'DAX', label: 'DAX', cat: 'index' },
  { id: 'FTSE', label: 'FTSE', cat: 'index' },
  { id: 'NIKKEI', label: 'نیکی', cat: 'index' },
];

const TIMEFRAMES: { id: Timeframe; label: string }[] = [
  { id: '1m', label: '1د' },
  { id: '5m', label: '5د' },
  { id: '15m', label: '15د' },
  { id: '1h', label: '1س' },
  { id: '4h', label: '4س' },
  { id: '1d', label: 'روز' },
  { id: '1w', label: 'هفته' },
];

const CATEGORY_LABELS: Record<SymbolItem['cat'], string> = {
  metal: 'فلزات',
  crypto: 'کریپتو',
  forex: 'فارکس',
  index: 'شاخص‌ها',
};

const CATEGORIES: SymbolItem['cat'][] = ['metal', 'crypto', 'forex', 'index'];

// =========================================================
// HTML - ULTRA PRO CHART
// =========================================================

const buildHTML = (isDark: boolean): string => {
  const bg = isDark ? '#0B0B0F' : '#FFFFFF';
  const panelBg = isDark ? '#131319' : '#F8FAFC';
  const hoverBg = isDark ? '#1E1E28' : '#F1F5F9';
  const textColor = isDark ? '#E5E7EB' : '#0F172A';
  const mutedColor = isDark ? '#71717A' : '#94A3B8';
  const gridColor = isDark ? '#1A1A22' : '#F1F5F9';
  const borderColor = isDark ? '#26262E' : '#E2E8F0';

  return `<!DOCTYPE html>
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
  touch-action: none;
}

/* ============ TOP OHLC BAR ============ */
#ohlc-bar {
  position: absolute; top: 0; left: 0; right: 0; height: 42px;
  background: ${panelBg}; border-bottom: 1px solid ${borderColor};
  padding: 0 14px; display: flex; align-items: center; gap: 16px;
  font-size: 13px; font-weight: 700; color: ${mutedColor};
  z-index: 30; overflow-x: auto; scrollbar-width: none;
}
#ohlc-bar::-webkit-scrollbar { display: none; }
#ohlc-bar span { white-space: nowrap; }
#ohlc-bar b { color: ${textColor}; font-weight: 900; font-size: 14px; }
#ohlc-bar .up { color: #16A34A !important; }
#ohlc-bar .down { color: #DC2626 !important; }

/* ============ LEFT TOOLBAR ============ */
#toolbar-left {
  position: absolute; left: 0; top: 42px; bottom: 0; width: 52px;
  background: ${panelBg}; border-right: 1px solid ${borderColor};
  z-index: 25; overflow-y: auto; scrollbar-width: none;
  padding: 6px 4px;
  display: flex; flex-direction: column; gap: 3px;
}
#toolbar-left::-webkit-scrollbar { display: none; }

.tool-btn {
  width: 44px; height: 42px;
  background: transparent; border: none;
  color: ${textColor}; cursor: pointer;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 17px; font-weight: 700;
  transition: all 0.15s;
  position: relative;
  font-family: inherit;
}
.tool-btn:hover { background: ${hoverBg}; }
.tool-btn.active {
  background: #2563EB; color: #FFF;
  box-shadow: 0 2px 8px #2563EB66;
}
.tool-btn .badge {
  position: absolute; top: 2px; right: 2px;
  width: 6px; height: 6px; border-radius: 50%;
  background: #F59E0B;
}
.tool-sep {
  height: 1px; background: ${borderColor};
  margin: 4px 6px;
}

/* ============ LEGEND ============ */
#legend {
  position: absolute; top: 50px; left: 60px; z-index: 20;
  font-size: 12px; font-weight: 800;
  background: ${panelBg}DD; backdrop-filter: blur(6px);
  padding: 8px 12px; border-radius: 10px;
  display: flex; flex-direction: column; gap: 4px;
  pointer-events: none;
  border: 1px solid ${borderColor};
}
#legend .row { display: flex; align-items: center; gap: 6px; }
#legend .dot { width: 10px; height: 10px; border-radius: 50%; }
#legend .value { color: ${textColor}; font-weight: 900; }

/* ============ MAIN CHART ============ */
#chart-area {
  position: absolute; top: 42px; left: 52px; right: 0; bottom: 0;
}
#main-chart { width: 100%; height: 100%; }
#draw-canvas {
  position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none; z-index: 10;
}

/* ============ BOTTOM TOOLBAR ============ */
#toolbar-bottom {
  position: absolute; bottom: 10px; left: 60px; z-index: 40;
  background: ${panelBg}F0; backdrop-filter: blur(10px);
  border: 1px solid ${borderColor};
  border-radius: 14px;
  display: flex; padding: 5px; gap: 4px;
  box-shadow: 0 4px 16px ${isDark ? '#00000080' : '#00000020'};
}
.tbtn {
  width: 40px; height: 40px;
  background: transparent; border: none;
  color: ${mutedColor}; cursor: pointer;
  border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  font-size: 15px; font-weight: 700;
  transition: all 0.15s;
  font-family: inherit;
}
.tbtn:hover { background: ${hoverBg}; }
.tbtn.active { background: #2563EB; color: #FFF; }
.tbtn-danger:hover { background: #DC262620; color: #DC2626; }

/* ============ INFO/ALERT PANEL ============ */
#info-panel {
  position: absolute; bottom: 10px; right: 10px; z-index: 40;
  background: ${panelBg}F0; backdrop-filter: blur(10px);
  border: 1px solid ${borderColor};
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 11px; font-weight: 800;
  color: ${mutedColor};
  display: none;
  min-width: 140px;
}
#info-panel.active { display: block; }
#info-panel .pnl {
  font-size: 16px; font-weight: 900;
  color: ${textColor};
}

/* ============ HINT ============ */
#hint {
  position: absolute; top: 60px; left: 50%; transform: translateX(-50%);
  z-index: 40;
  background: #2563EBEE; color: #FFF;
  padding: 10px 18px; border-radius: 12px;
  font-size: 13px; font-weight: 800;
  display: none;
  box-shadow: 0 4px 20px #2563EB60;
  max-width: 80%; text-align: center;
}
#hint.active { display: block; animation: slideDown 0.3s ease-out; }
@keyframes slideDown { from { opacity: 0; transform: translate(-50%, -10px); } to { opacity: 1; transform: translate(-50%, 0); } }

/* ============ MEASURE LABEL ============ */
#measure-label {
  position: absolute; z-index: 45;
  background: #2563EBEE; color: #FFF;
  padding: 8px 14px; border-radius: 10px;
  font-size: 12px; font-weight: 900;
  display: none;
  pointer-events: none;
  box-shadow: 0 4px 16px #2563EB60;
  white-space: nowrap;
}
#measure-label.active { display: block; }

/* ============ LOADING ============ */
#loading {
  position: absolute; inset: 0; z-index: 100;
  background: ${bg};
  display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 14px;
  color: ${mutedColor}; font-size: 13px; font-weight: 700;
}
.spinner {
  width: 42px; height: 42px;
  border: 3px solid ${gridColor};
  border-top-color: #2563EB; border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.error { color: #DC2626; font-size: 13px; padding: 20px; }
</style>
</head>
<body>

<!-- OHLC -->
<div id="ohlc-bar">
  <span>O: <b id="o-val">—</b></span>
  <span>H: <b id="h-val">—</b></span>
  <span>L: <b id="l-val">—</b></span>
  <span>C: <b id="c-val">—</b></span>
  <span id="chg-val">—</span>
</div>

<!-- LEFT TOOLBAR -->
<div id="toolbar-left">
  <button class="tool-btn active" id="t-cursor" title="کرسر">✛</button>
  <div class="tool-sep"></div>
  <button class="tool-btn" id="t-trend" title="خط روند">╱</button>
  <button class="tool-btn" id="t-hline" title="خط افقی">━</button>
  <button class="tool-btn" id="t-hray" title="شعاع افقی">→</button>
  <button class="tool-btn" id="t-vline" title="خط عمودی">┃</button>
  <button class="tool-btn" id="t-ray" title="شعاع">↗</button>
  <button class="tool-btn" id="t-arrow" title="فلش">➤</button>
  <div class="tool-sep"></div>
  <button class="tool-btn" id="t-rect" title="مستطیل">▭</button>
  <button class="tool-btn" id="t-circle" title="دایره">◯</button>
  <button class="tool-btn" id="t-triangle" title="مثلث">△</button>
  <div class="tool-sep"></div>
  <button class="tool-btn" id="t-fib" title="فیبوناچی">≋</button>
  <button class="tool-btn" id="t-fibfan" title="فیبوناچی فن">⌒</button>
  <button class="tool-btn" id="t-fibext" title="فیبوناچی Extension">⩗</button>
  <div class="tool-sep"></div>
  <button class="tool-btn" id="t-text" title="متن">T</button>
  <button class="tool-btn" id="t-note" title="یادداشت">📝</button>
  <button class="tool-btn" id="t-measure" title="اندازه‌گیری">📏</button>
  <div class="tool-sep"></div>
  <button class="tool-btn" id="t-long" title="پیش‌بینی صعودی">▲</button>
  <button class="tool-btn" id="t-short" title="پیش‌بینی نزولی">▼</button>
</div>

<!-- LEGEND -->
<div id="legend"></div>

<!-- CHART -->
<div id="chart-area">
  <div id="main-chart"></div>
  <canvas id="draw-canvas"></canvas>
</div>

<!-- BOTTOM TOOLBAR -->
<div id="toolbar-bottom">
  <button class="tbtn active" id="ct-candles" title="کندل">🕯</button>
  <button class="tbtn" id="ct-bars" title="میله">▮</button>
  <button class="tbtn" id="ct-line" title="خط">∿</button>
  <button class="tbtn" id="ct-area" title="ناحیه">▨</button>
  <div class="tool-sep" style="width:1px;height:30px;background:${borderColor};margin:5px 2px;"></div>
  <button class="tbtn" id="b-undo" title="واگرد">↶</button>
  <button class="tbtn" id="b-redo" title="جلو">↷</button>
  <button class="tbtn" id="b-hide" title="مخفی کردن ترسیمات">👁</button>
  <button class="tbtn tbtn-danger" id="b-clear" title="پاک کردن همه">🗑</button>
  <div class="tool-sep" style="width:1px;height:30px;background:${borderColor};margin:5px 2px;"></div>
  <button class="tbtn" id="b-reset" title="ریست زوم">⟲</button>
  <button class="tbtn" id="b-last" title="آخرین کندل">⏭</button>
  <button class="tbtn" id="b-fullscreen" title="تمام‌صفحه">⛶</button>
</div>

<!-- MEASURE LABEL -->
<div id="measure-label"></div>

<!-- HINT -->
<div id="hint"></div>

<!-- LOADING -->
<div id="loading">
  <div class="spinner"></div>
  <div>در حال بارگذاری چارت حرفه‌ای...</div>
</div>

<script src="https://unpkg.com/lightweight-charts@4.2.3/dist/lightweight-charts.standalone.production.js"></script>
<script>
// =====================================================
// STATE
// =====================================================
let chart, candleSeries, volumeSeries;
let ma20Series, ma50Series, ema50Series, ema200Series;
let bbUpperSeries, bbMiddleSeries, bbLowerSeries;
let rsiChart, rsiSeries;
let macdChart, macdHistSeries, macdLineSeries, macdSignalSeries;

let currentCandles = [];
let currentSymbol = '';
let chartType = 'candles';
let showMA = true, showVolume = true, showBB = false, showEMA200 = false;
let showRSI = false, showMACD = false;
let drawingsHidden = false;

// Undo/Redo
let drawings = [];
let drawingsHistory = [drawings];
let historyIndex = 0;

let activeTool = 'cursor';
let drawingInProgress = null;
let isDrawing = false;
let drawCanvas, drawCtx;
let measureStart = null;

const COLORS = { up: '#16A34A', down: '#DC2626', draw: '#2563EB', fib: '#0891B2' };

// =====================================================
// INIT
// =====================================================
function initChart() {
  try {
    document.getElementById('loading').style.display = 'none';

    const chartEl = document.getElementById('main-chart');
    drawCanvas = document.getElementById('draw-canvas');
    drawCtx = drawCanvas.getContext('2d');

    chart = LightweightCharts.createChart(chartEl, {
      width: chartEl.clientWidth,
      height: chartEl.clientHeight,
      layout: {
        background: { type: 'solid', color: '${bg}' },
        textColor: '${textColor}',
        fontSize: 12,
      },
      grid: {
        vertLines: { color: '${gridColor}' },
        horzLines: { color: '${gridColor}' },
      },
      rightPriceScale: {
        borderColor: '${borderColor}',
        scaleMargins: { top: 0.06, bottom: 0.18 },
      },
      timeScale: {
        borderColor: '${borderColor}',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 8,
        barSpacing: 8,
        minBarSpacing: 0.5,
      },
      crosshair: {
        mode: 0,
        vertLine: { color: '#2563EB80', width: 1, style: 3, labelBackgroundColor: '#2563EB' },
        horzLine: { color: '#2563EB80', width: 1, style: 3, labelBackgroundColor: '#2563EB' },
      },
      handleScroll: {
        mouseWheel: true, pressedMouseMove: true,
        horzTouchDrag: true, vertTouchDrag: false,
      },
      handleScale: {
        axisPressedMouseMove: true, mouseWheel: true, pinch: true,
      },
    });

    createSeries();

    // RSI subchart
    const rsiEl = document.createElement('div');
    rsiEl.id = 'rsi-chart';
    rsiEl.style.cssText = 'position:absolute;left:0;right:0;bottom:0;height:100px;display:none;border-top:1px solid ${borderColor};';
    document.getElementById('chart-area').appendChild(rsiEl);
    rsiChart = LightweightCharts.createChart(rsiEl, {
      width: rsiEl.clientWidth, height: 100,
      layout: { background: { type: 'solid', color: '${bg}' }, textColor: '${textColor}', fontSize: 10 },
      grid: { vertLines: { color: '${gridColor}' }, horzLines: { color: '${gridColor}' } },
      rightPriceScale: { borderColor: '${borderColor}' },
      timeScale: { visible: false, borderColor: '${borderColor}' },
      handleScroll: false, handleScale: false,
    });
    rsiSeries = rsiChart.addLineSeries({ color: '#7C3AED', lineWidth: 2, priceLineVisible: false, lastValueVisible: true });

    // MACD subchart
    const macdEl = document.createElement('div');
    macdEl.id = 'macd-chart';
    macdEl.style.cssText = 'position:absolute;left:0;right:0;bottom:0;height:100px;display:none;border-top:1px solid ${borderColor};';
    document.getElementById('chart-area').appendChild(macdEl);
    macdChart = LightweightCharts.createChart(macdEl, {
      width: macdEl.clientWidth, height: 100,
      layout: { background: { type: 'solid', color: '${bg}' }, textColor: '${textColor}', fontSize: 10 },
      grid: { vertLines: { color: '${gridColor}' }, horzLines: { color: '${gridColor}' } },
      rightPriceScale: { borderColor: '${borderColor}' },
      timeScale: { visible: false, borderColor: '${borderColor}' },
      handleScroll: false, handleScale: false,
    });
    macdHistSeries = macdChart.addHistogramSeries({ priceLineVisible: false, lastValueVisible: false });
    macdLineSeries = macdChart.addLineSeries({ color: '#2563EB', lineWidth: 2, priceLineVisible: false, lastValueVisible: false });
    macdSignalSeries = macdChart.addLineSeries({ color: '#F59E0B', lineWidth: 2, priceLineVisible: false, lastValueVisible: false });

    // Crosshair
    chart.subscribeCrosshairMove((param) => {
      updateOHLC(param);
      syncCrosshair(param);
    });

    // Redraw on scroll/zoom
    chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
      redrawDrawings();
    });

    // Resize
    new ResizeObserver(() => {
      if (chart && chartEl) {
        chart.applyOptions({ width: chartEl.clientWidth, height: chartEl.clientHeight });
      }
      if (rsiChart) rsiChart.applyOptions({ width: chartEl.clientWidth });
      if (macdChart) macdChart.applyOptions({ width: chartEl.clientWidth });
      resizeDrawCanvas();
      redrawDrawings();
    }).observe(chartEl);

    resizeDrawCanvas();
    setupEvents();

    notifyRN({ type: 'ready' });
  } catch (e) {
    console.error(e);
    document.getElementById('loading').innerHTML = '<div class="error">خطا: ' + e.message + '</div>';
  }
}

function createSeries() {
  if (candleSeries) { chart.removeSeries(candleSeries); candleSeries = null; }
  if (volumeSeries) { chart.removeSeries(volumeSeries); volumeSeries = null; }
  if (ma20Series) { chart.removeSeries(ma20Series); ma20Series = null; }
  if (ma50Series) { chart.removeSeries(ma50Series); ma50Series = null; }
  if (ema50Series) { chart.removeSeries(ema50Series); ema50Series = null; }
  if (ema200Series) { chart.removeSeries(ema200Series); ema200Series = null; }
  if (bbUpperSeries) { chart.removeSeries(bbUpperSeries); bbUpperSeries = null; }
  if (bbMiddleSeries) { chart.removeSeries(bbMiddleSeries); bbMiddleSeries = null; }
  if (bbLowerSeries) { chart.removeSeries(bbLowerSeries); bbLowerSeries = null; }

  const commonOpts = { priceLineVisible: false, lastValueVisible: true };

  if (chartType === 'candles') {
    candleSeries = chart.addCandlestickSeries({
      upColor: COLORS.up, downColor: COLORS.down,
      borderUpColor: COLORS.up, borderDownColor: COLORS.down,
      wickUpColor: COLORS.up, wickDownColor: COLORS.down,
      ...commonOpts,
    });
  } else if (chartType === 'bars') {
    candleSeries = chart.addBarSeries({ upColor: COLORS.up, downColor: COLORS.down, ...commonOpts });
  } else if (chartType === 'line') {
    candleSeries = chart.addLineSeries({ color: '#2563EB', lineWidth: 2, ...commonOpts });
  } else if (chartType === 'area') {
    candleSeries = chart.addAreaSeries({
      topColor: '#2563EB50', bottomColor: '#2563EB05',
      lineColor: '#2563EB', lineWidth: 2, ...commonOpts,
    });
  }

  volumeSeries = chart.addHistogramSeries({
    color: '#2563EB40',
    priceFormat: { type: 'volume' },
    priceScaleId: 'volume',
    lastValueVisible: false, priceLineVisible: false,
  });
  chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });

  const lineOpts = { priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false };

  ma20Series = chart.addLineSeries({ color: '#F59E0B', lineWidth: 2, ...lineOpts });
  ma50Series = chart.addLineSeries({ color: '#7C3AED', lineWidth: 2, ...lineOpts });
  ema50Series = chart.addLineSeries({ color: '#0891B2', lineWidth: 2, ...lineOpts });
  ema200Series = chart.addLineSeries({ color: '#DB2777', lineWidth: 2, ...lineOpts });

  bbUpperSeries = chart.addLineSeries({ color: '#0891B2', lineWidth: 1, lineStyle: 2, ...lineOpts });
  bbMiddleSeries = chart.addLineSeries({ color: '#0891B280', lineWidth: 1, ...lineOpts });
  bbLowerSeries = chart.addLineSeries({ color: '#0891B2', lineWidth: 1, lineStyle: 2, ...lineOpts });

  if (currentCandles.length > 0) {
    applyData();
  }
}

// =====================================================
// OHLC
// =====================================================
function updateOHLC(param) {
  let o, h, l, c;
  if (!param.time || !param.seriesData || !param.seriesData.has(candleSeries)) {
    const last = currentCandles[currentCandles.length - 1];
    if (!last) return;
    ({ open: o, high: h, low: l, close: c } = last);
  } else {
    const d = param.seriesData.get(candleSeries);
    if (!d) return;
    ({ open: o, high: h, low: l, close: c } = d);
  }
  const dec = c > 100 ? 2 : c > 1 ? 3 : 5;
  document.getElementById('o-val').textContent = o.toFixed(dec);
  document.getElementById('h-val').textContent = h.toFixed(dec);
  document.getElementById('l-val').textContent = l.toFixed(dec);
  document.getElementById('c-val').textContent = c.toFixed(dec);
  document.getElementById('c-val').className = c >= o ? 'up' : 'down';
  const diff = c - o;
  const pct = o !== 0 ? (diff / o) * 100 : 0;
  const chg = document.getElementById('chg-val');
  chg.textContent = (diff >= 0 ? '+' : '') + diff.toFixed(dec) + ' (' + (diff >= 0 ? '+' : '') + pct.toFixed(2) + '%)';
  chg.className = diff >= 0 ? 'up' : 'down';
}

function syncCrosshair(param) {
  if (!param.time) return;
  if (showRSI && rsiChart) rsiChart.setCrosshairPosition(50, param.time, rsiSeries);
  if (showMACD && macdChart) macdChart.setCrosshairPosition(0, param.time, macdLineSeries);
}

// =====================================================
// INDICATORS
// =====================================================
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

function calcEMA(candles, period) {
  if (candles.length < period) return [];
  const k = 2 / (period + 1);
  const r = [];
  let ema = 0;
  for (let i = 0; i < period; i++) ema += candles[i].close;
  ema /= period;
  r.push({ time: Math.floor(candles[period - 1].timestamp / 1000), value: ema });
  for (let i = period; i < candles.length; i++) {
    ema = candles[i].close * k + ema * (1 - k);
    r.push({ time: Math.floor(candles[i].timestamp / 1000), value: ema });
  }
  return r;
}

function calcBB(candles, period, mult) {
  const upper = [], middle = [], lower = [];
  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) continue;
    let sum = 0;
    for (let j = 0; j < period; j++) sum += candles[i - j].close;
    const sma = sum / period;
    let variance = 0;
    for (let j = 0; j < period; j++) variance += Math.pow(candles[i - j].close - sma, 2);
    const stdDev = Math.sqrt(variance / period);
    const t = Math.floor(candles[i].timestamp / 1000);
    upper.push({ time: t, value: sma + stdDev * mult });
    middle.push({ time: t, value: sma });
    lower.push({ time: t, value: sma - stdDev * mult });
  }
  return { upper, middle, lower };
}

function calcRSI(candles, period) {
  if (candles.length <= period) return [];
  const r = [];
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const d = candles[i].close - candles[i - 1].close;
    if (d >= 0) avgGain += d; else avgLoss -= d;
  }
  avgGain /= period; avgLoss /= period;
  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  r.push({ time: Math.floor(candles[period].timestamp / 1000), value: 100 - 100 / (1 + rs) });
  for (let i = period + 1; i < candles.length; i++) {
    const d = candles[i].close - candles[i - 1].close;
    const gain = d > 0 ? d : 0;
    const loss = d < 0 ? -d : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    r.push({ time: Math.floor(candles[i].timestamp / 1000), value: 100 - 100 / (1 + rs) });
  }
  return r;
}

function calcMACD(candles, fast, slow, signal) {
  const emaFast = calcEMA(candles, fast);
  const emaSlow = calcEMA(candles, slow);
  const map = new Map();
  emaSlow.forEach(e => map.set(e.time, e.value));
  const macd = [];
  emaFast.forEach(e => {
    if (map.has(e.time)) macd.push({ time: e.time, value: e.value - map.get(e.time) });
  });
  if (macd.length === 0) return { macd: [], signal: [], hist: [] };
  const k = 2 / (signal + 1);
  let sig = 0;
  for (let i = 0; i < Math.min(signal, macd.length); i++) sig += macd[i].value;
  sig /= signal;
  const signalLine = [], histLine = [];
  for (let i = signal - 1; i < macd.length; i++) {
    if (i === signal - 1) signalLine.push({ time: macd[i].time, value: sig });
    else { sig = macd[i].value * k + sig * (1 - k); signalLine.push({ time: macd[i].time, value: sig }); }
    const h = macd[i].value - sig;
    histLine.push({ time: macd[i].time, value: h, color: h >= 0 ? '#16A34A80' : '#DC262680' });
  }
  return { macd, signal: signalLine, hist: histLine };
}

// =====================================================
// APPLY DATA
// =====================================================
function applyData() {
  const c = currentCandles;
  if (!c || c.length === 0) return;

  if (candleSeries) {
    candleSeries.setData(c.map(x => ({
      time: Math.floor(x.timestamp / 1000),
      open: x.open, high: x.high, low: x.low, close: x.close,
    })));
  }

  if (volumeSeries) {
    volumeSeries.setData(c.map(x => ({
      time: Math.floor(x.timestamp / 1000),
      value: x.volume || 0,
      color: x.close >= x.open ? '#16A34A30' : '#DC262630',
    })));
    volumeSeries.applyOptions({ visible: showVolume });
  }

  if (ma20Series) { ma20Series.setData(showMA ? calcSMA(c, 20) : []); ma20Series.applyOptions({ visible: showMA }); }
  if (ma50Series) { ma50Series.setData(showMA ? calcSMA(c, 50) : []); ma50Series.applyOptions({ visible: showMA }); }
  if (ema50Series) { ema50Series.setData(showMA ? calcEMA(c, 50) : []); ema50Series.applyOptions({ visible: showMA }); }
  if (ema200Series) { ema200Series.setData(showEMA200 ? calcEMA(c, 200) : []); ema200Series.applyOptions({ visible: showEMA200 }); }

  if (bbUpperSeries && bbMiddleSeries && bbLowerSeries) {
    if (showBB) {
      const bb = calcBB(c, 20, 2);
      bbUpperSeries.setData(bb.upper);
      bbMiddleSeries.setData(bb.middle);
      bbLowerSeries.setData(bb.lower);
    } else {
      bbUpperSeries.setData([]); bbMiddleSeries.setData([]); bbLowerSeries.setData([]);
    }
    bbUpperSeries.applyOptions({ visible: showBB });
    bbMiddleSeries.applyOptions({ visible: showBB });
    bbLowerSeries.applyOptions({ visible: showBB });
  }

  if (showRSI && rsiSeries) rsiSeries.setData(calcRSI(c, 14));
  if (showMACD && macdLineSeries) {
    const macd = calcMACD(c, 12, 26, 9);
    macdLineSeries.setData(macd.macd);
    macdSignalSeries.setData(macd.signal);
    macdHistSeries.setData(macd.hist);
  }

  updateLegend();
  chart.timeScale().fitContent();

  const last = c[c.length - 1];
  if (last) updateOHLC({ time: null });
}

// =====================================================
// LEGEND
// =====================================================
function updateLegend() {
  const legend = document.getElementById('legend');
  const c = currentCandles;
  if (c.length === 0) { legend.innerHTML = ''; return; }
  let html = '';
  const dec = c[0].close > 100 ? 2 : c[0].close > 1 ? 3 : 5;

  if (showMA) {
    const ma20 = calcSMA(c, 20);
    const ma50 = calcSMA(c, 50);
    const ema50 = calcEMA(c, 50);
    if (ma20.length) html += '<div class="row"><div class="dot" style="background:#F59E0B"></div><span>MA 20</span><span class="value" style="margin-right:auto;padding-right:8px;">' + ma20[ma20.length-1].value.toFixed(dec) + '</span></div>';
    if (ma50.length) html += '<div class="row"><div class="dot" style="background:#7C3AED"></div><span>MA 50</span><span class="value" style="margin-right:auto;padding-right:8px;">' + ma50[ma50.length-1].value.toFixed(dec) + '</span></div>';
    if (ema50.length) html += '<div class="row"><div class="dot" style="background:#0891B2"></div><span>EMA 50</span><span class="value" style="margin-right:auto;padding-right:8px;">' + ema50[ema50.length-1].value.toFixed(dec) + '</span></div>';
  }
  if (showEMA200) {
    const ema200 = calcEMA(c, 200);
    if (ema200.length) html += '<div class="row"><div class="dot" style="background:#DB2777"></div><span>EMA 200</span><span class="value" style="margin-right:auto;padding-right:8px;">' + ema200[ema200.length-1].value.toFixed(dec) + '</span></div>';
  }
  if (showBB) {
    html += '<div class="row"><div class="dot" style="background:#0891B2"></div><span>Bollinger 20,2</span></div>';
  }
  legend.innerHTML = html;
}

// =====================================================
// DRAWING
// =====================================================
function resizeDrawCanvas() {
  if (!drawCanvas) return;
  const area = document.getElementById('chart-area');
  drawCanvas.width = area.clientWidth;
  drawCanvas.height = area.clientHeight;
}

function getEventPos(e) {
  const rect = document.getElementById('chart-area').getBoundingClientRect();
  let cx, cy;
  if (e.touches && e.touches.length > 0) { cx = e.touches[0].clientX; cy = e.touches[0].clientY; }
  else if (e.changedTouches && e.changedTouches.length > 0) { cx = e.changedTouches[0].clientX; cy = e.changedTouches[0].clientY; }
  else { cx = e.clientX; cy = e.clientY; }
  return { x: cx - rect.left, y: cy - rect.top };
}

function screenToChart(pos) {
  if (!chart || !candleSeries) return null;
  const time = chart.timeScale().coordinateToTime(pos.x);
  const price = candleSeries.coordinateToPrice(pos.y);
  if (time === null || price === null) return null;
  return { time, price };
}

function chartToScreen(pt) {
  if (!chart || !candleSeries || !pt) return null;
  const x = chart.timeScale().timeToCoordinate(pt.time);
  const y = candleSeries.priceToCoordinate(pt.price);
  if (x === null || y === null) return null;
  return { x, y };
}

function setupEvents() {
  const area = document.getElementById('chart-area');
  area.addEventListener('mousedown', onDown);
  area.addEventListener('mousemove', onMove);
  area.addEventListener('mouseup', onUp);
  area.addEventListener('mouseleave', onUp);
  area.addEventListener('touchstart', onDown, { passive: false });
  area.addEventListener('touchmove', onMove, { passive: false });
  area.addEventListener('touchend', onUp);
  area.addEventListener('touchcancel', onUp);

  document.querySelectorAll('#toolbar-left .tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.id;
      document.querySelectorAll('#toolbar-left .tool-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTool = id.replace('t-', '');
      updateCursor();
    });
  });

  document.querySelectorAll('#toolbar-bottom .tbtn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.id;
      if (id.startsWith('ct-')) {
        chartType = id.replace('ct-', '');
        document.querySelectorAll('#toolbar-bottom .tbtn[id^="ct-"]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        createSeries();
      } else if (id === 'b-undo') undo();
      else if (id === 'b-redo') redo();
      else if (id === 'b-clear') clearAllDrawings();
      else if (id === 'b-hide') toggleHideDrawings();
      else if (id === 'b-reset') chart.timeScale().fitContent();
      else if (id === 'b-last') chart.timeScale().scrollToRealTime();
      else if (id === 'b-fullscreen') notifyRN({ type: 'fullscreen' });
    });
  });
}

function updateCursor() {
  const area = document.getElementById('chart-area');
  if (activeTool === 'cursor') {
    area.style.cursor = 'default';
    chart.applyOptions({
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
    });
    hideHint();
  } else {
    area.style.cursor = 'crosshair';
    chart.applyOptions({
      handleScroll: { mouseWheel: false, pressedMouseMove: false, horzTouchDrag: false, vertTouchDrag: false },
      handleScale: { axisPressedMouseMove: false, mouseWheel: false, pinch: false },
    });
    const hints = {
      trend: 'خط روند: بکش',
      hline: 'خط افقی: یه نقطه بزن',
      hray: 'شعاع افقی: یه نقطه بزن',
      vline: 'خط عمودی: یه نقطه بزن',
      ray: 'شعاع: بکش',
      arrow: 'فلش: بکش',
      rect: 'مستطیل: بکش',
      circle: 'دایره: بکش',
      triangle: 'مثلث: بکش',
      fib: 'فیبوناچی: از بالا به پایین بکش',
      fibfan: 'فیبوناچی فن: بکش',
      fibext: 'فیبوناچی Extension: ۳ نقطه',
      text: 'متن: یه نقطه بزن',
      note: 'یادداشت: یه نقطه بزن',
      measure: 'اندازه‌گیری: بکش',
      long: 'پیش‌بینی صعودی: بکش',
      short: 'پیش‌بینی نزولی: بکش',
    };
    showHint(hints[activeTool] || '');
  }
}

function onDown(e) {
  if (activeTool === 'cursor') return;
  e.preventDefault();
  const pos = getEventPos(e);
  const pt = screenToChart(pos);
  if (!pt) return;

  isDrawing = true;

  if (activeTool === 'hline' || activeTool === 'vline' || activeTool === 'hray') {
    pushDrawing({ tool: activeTool, points: [pt], color: COLORS.draw });
    isDrawing = false;
    return;
  }

  if (activeTool === 'text' || activeTool === 'note') {
    const text = prompt(activeTool === 'text' ? 'متن:' : 'یادداشت:', '') || '';
    if (!text) { isDrawing = false; return; }
    pushDrawing({ tool: activeTool, points: [pt], color: COLORS.draw, text });
    isDrawing = false;
    return;
  }

  if (activeTool === 'measure') {
    measureStart = pt;
    drawingInProgress = { tool: 'measure', points: [pt, pt], color: COLORS.draw };
    redrawDrawings();
    return;
  }

  drawingInProgress = { tool: activeTool, points: [pt, pt], color: COLORS.draw };
  redrawDrawings();
}

function onMove(e) {
  if (!isDrawing || !drawingInProgress) return;
  e.preventDefault();
  const pos = getEventPos(e);
  const pt = screenToChart(pos);
  if (!pt) return;
  drawingInProgress.points[1] = pt;
  redrawDrawings();
}

function onUp(e) {
  if (!isDrawing || !drawingInProgress) return;
  isDrawing = false;
  pushDrawing(drawingInProgress);
  drawingInProgress = null;
  measureStart = null;
  document.getElementById('measure-label').classList.remove('active');
}

function pushDrawing(d) {
  drawings.push(d);
  drawingsHistory = drawingsHistory.slice(0, historyIndex + 1);
  drawingsHistory.push([...drawings]);
  historyIndex = drawingsHistory.length - 1;
  redrawDrawings();
  notifyRN({ type: 'drawings-changed', count: drawings.length });
}

function undo() {
  if (historyIndex <= 0) return;
  historyIndex--;
  drawings = [...drawingsHistory[historyIndex]];
  redrawDrawings();
}

function redo() {
  if (historyIndex >= drawingsHistory.length - 1) return;
  historyIndex++;
  drawings = [...drawingsHistory[historyIndex]];
  redrawDrawings();
}

function clearAllDrawings() {
  if (drawings.length === 0) return;
  if (!confirm('همه ترسیمات پاک شود؟')) return;
  drawings = [];
  drawingsHistory = [[]];
  historyIndex = 0;
  redrawDrawings();
  notifyRN({ type: 'drawings-cleared' });
}

function toggleHideDrawings() {
  drawingsHidden = !drawingsHidden;
  const btn = document.getElementById('b-hide');
  btn.classList.toggle('active', drawingsHidden);
  redrawDrawings();
}

function redrawDrawings() {
  if (!drawCtx || !chart || !candleSeries) return;
  resizeDrawCanvas();
  drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);

  if (drawingsHidden) return;

  const all = drawingInProgress ? [...drawings, drawingInProgress] : drawings;

  all.forEach(d => {
    if (d.tool === 'measure' && d.points.length >= 2) drawMeasure(d);
    else if (d.tool === 'trend' && d.points.length >= 2) drawTrend(d);
    else if (d.tool === 'hline') drawHLine(d);
    else if (d.tool === 'vline') drawVLine(d);
    else if (d.tool === 'hray') drawHRay(d);
    else if (d.tool === 'ray' && d.points.length >= 2) drawRay(d);
    else if (d.tool === 'arrow' && d.points.length >= 2) drawArrow(d);
    else if (d.tool === 'rect' && d.points.length >= 2) drawRect(d);
    else if (d.tool === 'circle' && d.points.length >= 2) drawCircle(d);
    else if (d.tool === 'triangle' && d.points.length >= 2) drawTriangle(d);
    else if (d.tool === 'fib' && d.points.length >= 2) drawFib(d);
    else if (d.tool === 'fibfan' && d.points.length >= 2) drawFibFan(d);
    else if (d.tool === 'fibext' && d.points.length >= 3) drawFibExt(d);
    else if (d.tool === 'text' && d.text) drawText(d);
    else if (d.tool === 'note' && d.text) drawNote(d);
    else if (d.tool === 'long' && d.points.length >= 2) drawPosition(d, 'long');
    else if (d.tool === 'short' && d.points.length >= 2) drawPosition(d, 'short');
  });
}

function drawTrend(d) {
  const p = d.points.map(chartToScreen).filter(Boolean);
  if (p.length < 2) return;
  drawCtx.strokeStyle = d.color;
  drawCtx.lineWidth = 2;
  drawCtx.beginPath();
  drawCtx.moveTo(p[0].x, p[0].y);
  drawCtx.lineTo(p[1].x, p[1].y);
  drawCtx.stroke();
  [p[0], p[1]].forEach(pt => {
    drawCtx.fillStyle = d.color;
    drawCtx.beginPath();
    drawCtx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
    drawCtx.fill();
    drawCtx.strokeStyle = '#FFF';
    drawCtx.lineWidth = 2;
    drawCtx.stroke();
  });
}

function drawHLine(d) {
  const p = chartToScreen(d.points[0]);
  if (!p) return;
  drawCtx.strokeStyle = d.color;
  drawCtx.lineWidth = 2;
  drawCtx.setLineDash([10, 5]);
  drawCtx.beginPath();
  drawCtx.moveTo(0, p.y);
  drawCtx.lineTo(drawCanvas.width, p.y);
  drawCtx.stroke();
  drawCtx.setLineDash([]);
  // Price label
  drawCtx.fillStyle = d.color;
  drawCtx.fillRect(drawCanvas.width - 70, p.y - 10, 65, 20);
  drawCtx.fillStyle = '#FFF';
  drawCtx.font = 'bold 11px sans-serif';
  drawCtx.textAlign = 'center';
  drawCtx.fillText(d.points[0].price.toFixed(2), drawCanvas.width - 37, p.y + 4);
  drawCtx.textAlign = 'left';
}

function drawVLine(d) {
  const p = chartToScreen(d.points[0]);
  if (!p) return;
  drawCtx.strokeStyle = d.color;
  drawCtx.lineWidth = 2;
  drawCtx.setLineDash([10, 5]);
  drawCtx.beginPath();
  drawCtx.moveTo(p.x, 0);
  drawCtx.lineTo(p.x, drawCanvas.height);
  drawCtx.stroke();
  drawCtx.setLineDash([]);
}

function drawHRay(d) {
  const p = chartToScreen(d.points[0]);
  if (!p) return;
  drawCtx.strokeStyle = d.color;
  drawCtx.lineWidth = 2;
  drawCtx.beginPath();
  drawCtx.moveTo(p.x, p.y);
  drawCtx.lineTo(drawCanvas.width, p.y);
  drawCtx.stroke();
  drawCtx.fillStyle = d.color;
  drawCtx.beginPath();
  drawCtx.arc(p.x, p.y, 5, 0, Math.PI * 2);
  drawCtx.fill();
}

function drawRay(d) {
  const p = d.points.map(chartToScreen).filter(Boolean);
  if (p.length < 2) return;
  const dx = p[1].x - p[0].x;
  const dy = p[1].y - p[0].y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return;
  const scale = 3000 / len;
  const ex = p[0].x + dx * scale;
  const ey = p[0].y + dy * scale;
  drawCtx.strokeStyle = d.color;
  drawCtx.lineWidth = 2;
  drawCtx.beginPath();
  drawCtx.moveTo(p[0].x, p[0].y);
  drawCtx.lineTo(ex, ey);
  drawCtx.stroke();
  drawCtx.fillStyle = d.color;
  drawCtx.beginPath();
  drawCtx.arc(p[0].x, p[0].y, 5, 0, Math.PI * 2);
  drawCtx.fill();
}

function drawArrow(d) {
  const p = d.points.map(chartToScreen).filter(Boolean);
  if (p.length < 2) return;
  drawCtx.strokeStyle = d.color;
  drawCtx.fillStyle = d.color;
  drawCtx.lineWidth = 2;
  drawCtx.beginPath();
  drawCtx.moveTo(p[0].x, p[0].y);
  drawCtx.lineTo(p[1].x, p[1].y);
  drawCtx.stroke();
  // Arrowhead
  const angle = Math.atan2(p[1].y - p[0].y, p[1].x - p[0].x);
  const size = 12;
  drawCtx.beginPath();
  drawCtx.moveTo(p[1].x, p[1].y);
  drawCtx.lineTo(p[1].x - size * Math.cos(angle - Math.PI / 6), p[1].y - size * Math.sin(angle - Math.PI / 6));
  drawCtx.lineTo(p[1].x - size * Math.cos(angle + Math.PI / 6), p[1].y - size * Math.sin(angle + Math.PI / 6));
  drawCtx.closePath();
  drawCtx.fill();
}

function drawRect(d) {
  const p = d.points.map(chartToScreen).filter(Boolean);
  if (p.length < 2) return;
  const x = Math.min(p[0].x, p[1].x);
  const y = Math.min(p[0].y, p[1].y);
  const w = Math.abs(p[1].x - p[0].x);
  const h = Math.abs(p[1].y - p[0].y);
  drawCtx.fillStyle = d.color + '25';
  drawCtx.fillRect(x, y, w, h);
  drawCtx.strokeStyle = d.color;
  drawCtx.lineWidth = 2;
  drawCtx.strokeRect(x, y, w, h);
}

function drawCircle(d) {
  const p = d.points.map(chartToScreen).filter(Boolean);
  if (p.length < 2) return;
  const cx = p[0].x, cy = p[0].y;
  const rx = Math.abs(p[1].x - p[0].x);
  const ry = Math.abs(p[1].y - p[0].y);
  drawCtx.fillStyle = d.color + '25';
  drawCtx.strokeStyle = d.color;
  drawCtx.lineWidth = 2;
  drawCtx.beginPath();
  drawCtx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  drawCtx.fill();
  drawCtx.stroke();
}

function drawTriangle(d) {
  const p = d.points.map(chartToScreen).filter(Boolean);
  if (p.length < 2) return;
  const cx = (p[0].x + p[1].x) / 2;
  const topY = Math.min(p[0].y, p[1].y);
  const botY = Math.max(p[0].y, p[1].y);
  drawCtx.fillStyle = d.color + '25';
  drawCtx.strokeStyle = d.color;
  drawCtx.lineWidth = 2;
  drawCtx.beginPath();
  drawCtx.moveTo(cx, topY);
  drawCtx.lineTo(p[0].x, botY);
  drawCtx.lineTo(p[1].x, botY);
  drawCtx.closePath();
  drawCtx.fill();
  drawCtx.stroke();
}

function drawFib(d) {
  const p = d.points.map(chartToScreen).filter(Boolean);
  if (p.length < 2) return;
  const levels = [
    { lv: 0, name: '0' },
    { lv: 0.236, name: '23.6%' },
    { lv: 0.382, name: '38.2%' },
    { lv: 0.5, name: '50%' },
    { lv: 0.618, name: '61.8%' },
    { lv: 0.786, name: '78.6%' },
    { lv: 1, name: '100%' },
    { lv: 1.272, name: '127.2%' },
    { lv: 1.618, name: '161.8%' },
  ];
  const colors = ['#EF4444', '#F97316', '#F59E0B', '#FBBF24', '#A3E635', '#16A34A', '#0891B2', '#7C3AED', '#DB2777'];
  levels.forEach((l, i) => {
    const y = p[0].y + (p[1].y - p[0].y) * l.lv;
    drawCtx.strokeStyle = colors[i];
    drawCtx.lineWidth = 1.5;
    drawCtx.beginPath();
    drawCtx.moveTo(Math.min(p[0].x, p[1].x), y);
    drawCtx.lineTo(Math.max(p[0].x, p[1].x), y);
    drawCtx.stroke();
    // Label with bg
    drawCtx.fillStyle = colors[i];
    drawCtx.fillRect(Math.max(p[0].x, p[1].x) + 4, y - 9, 50, 18);
    drawCtx.fillStyle = '#FFF';
    drawCtx.font = 'bold 10px sans-serif';
    drawCtx.fillText(l.name, Math.max(p[0].x, p[1].x) + 8, y + 3);
  });
  // Diagonal line
  drawCtx.strokeStyle = d.color;
  drawCtx.lineWidth = 1.5;
  drawCtx.setLineDash([4, 4]);
  drawCtx.beginPath();
  drawCtx.moveTo(p[0].x, p[0].y);
  drawCtx.lineTo(p[1].x, p[1].y);
  drawCtx.stroke();
  drawCtx.setLineDash([]);
}

function drawFibFan(d) {
  const p = d.points.map(chartToScreen).filter(Boolean);
  if (p.length < 2) return;
  const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
  const colors = ['#EF4444', '#F97316', '#F59E0B', '#FBBF24', '#A3E635', '#16A34A', '#0891B2'];
  levels.forEach((lv, i) => {
    const angle = Math.atan2(p[1].y - p[0].y, p[1].x - p[0].x);
    const baseAngle = Math.atan2(1, 0);
    const targetAngle = baseAngle + (angle - baseAngle) * lv;
    const ex = p[0].x + Math.cos(targetAngle) * 2000;
    const ey = p[0].y + Math.sin(targetAngle) * 2000;
    drawCtx.strokeStyle = colors[i];
    drawCtx.lineWidth = 1.5;
    drawCtx.beginPath();
    drawCtx.moveTo(p[0].x, p[0].y);
    drawCtx.lineTo(ex, ey);
    drawCtx.stroke();
  });
}

function drawFibExt(d) {
  const p = d.points.map(chartToScreen).filter(Boolean);
  if (p.length < 3) return;
  const levels = [0, 0.618, 1, 1.272, 1.618, 2];
  const colors = ['#EF4444', '#F59E0B', '#16A34A', '#0891B2', '#7C3AED', '#DB2777'];
  levels.forEach((lv, i) => {
    const y = p[1].y + (p[2].y - p[1].y) * lv;
    drawCtx.strokeStyle = colors[i];
    drawCtx.lineWidth = 1.5;
    drawCtx.beginPath();
    drawCtx.moveTo(p[0].x, y);
    drawCtx.lineTo(drawCanvas.width, y);
    drawCtx.stroke();
    drawCtx.fillStyle = colors[i];
    drawCtx.font = 'bold 10px sans-serif';
    drawCtx.fillText(lv.toFixed(3), drawCanvas.width - 60, y - 3);
  });
}

function drawText(d) {
  const p = chartToScreen(d.points[0]);
  if (!p) return;
  drawCtx.fillStyle = d.color;
  drawCtx.font = 'bold 16px sans-serif';
  drawCtx.fillText(d.text, p.x, p.y);
}

function drawNote(d) {
  const p = chartToScreen(d.points[0]);
  if (!p) return;
  // Bubble
  drawCtx.font = 'bold 12px sans-serif';
  const w = drawCtx.measureText(d.text).width + 20;
  drawCtx.fillStyle = '#FBBF24';
  drawCtx.beginPath();
  drawCtx.roundRect(p.x, p.y - 30, w, 28, 8);
  drawCtx.fill();
  // Pointer
  drawCtx.beginPath();
  drawCtx.moveTo(p.x, p.y - 4);
  drawCtx.lineTo(p.x + 8, p.y - 4);
  drawCtx.lineTo(p.x + 4, p.y);
  drawCtx.closePath();
  drawCtx.fill();
  drawCtx.fillStyle = '#000';
  drawCtx.fillText(d.text, p.x + 10, p.y - 11);
}

function drawMeasure(d) {
  const p = d.points.map(chartToScreen).filter(Boolean);
  if (p.length < 2) return;
  const priceDiff = d.points[1].price - d.points[0].price;
  const pctDiff = (priceDiff / d.points[0].price) * 100;
  const bars = Math.round(Math.abs(p[1].x - p[0].x) / 8);
  const up = priceDiff >= 0;

  // Line
  drawCtx.strokeStyle = up ? '#16A34A' : '#DC2626';
  drawCtx.lineWidth = 2;
  drawCtx.beginPath();
  drawCtx.moveTo(p[0].x, p[0].y);
  drawCtx.lineTo(p[1].x, p[1].y);
  drawCtx.stroke();

  // Box
  const x = Math.min(p[0].x, p[1].x);
  const y = Math.min(p[0].y, p[1].y);
  const w = Math.abs(p[1].x - p[0].x);
  const h = Math.abs(p[1].y - p[0].y);
  drawCtx.fillStyle = up ? '#16A34A25' : '#DC262625';
  drawCtx.fillRect(x, y, w, h);
  drawCtx.strokeRect(x, y, w, h);

  // Label
  const label = document.getElementById('measure-label');
  const dec = d.points[0].price > 100 ? 2 : 4;
  label.textContent = (up ? '+' : '') + priceDiff.toFixed(dec) + '  (' + (up ? '+' : '') + pctDiff.toFixed(2) + '%)  •  ' + bars + ' کندل';
  label.style.background = up ? '#16A34AEE' : '#DC2626EE';
  label.style.left = (x + w + 10) + 'px';
  label.style.top = (y + h / 2 - 18) + 'px';
  label.classList.add('active');
}

function drawPosition(d, dir) {
  const p = d.points.map(chartToScreen).filter(Boolean);
  if (p.length < 2) return;
  const isLong = dir === 'long';
  const entryY = p[0].y;
  const targetY = p[1].y;
  const riskY = isLong ? entryY + (entryY - targetY) * 0.5 : entryY - (targetY - entryY) * 0.5;

  // Profit zone
  drawCtx.fillStyle = '#16A34A40';
  drawCtx.fillRect(Math.min(p[0].x, p[1].x), Math.min(entryY, targetY), Math.abs(p[1].x - p[0].x), Math.abs(targetY - entryY));
  // Loss zone
  drawCtx.fillStyle = '#DC262640';
  drawCtx.fillRect(Math.min(p[0].x, p[1].x), Math.min(entryY, riskY), Math.abs(p[1].x - p[0].x), Math.abs(riskY - entryY));

  // Entry line
  drawCtx.strokeStyle = '#2563EB';
  drawCtx.lineWidth = 2;
  drawCtx.beginPath();
  drawCtx.moveTo(Math.min(p[0].x, p[1].x), entryY);
  drawCtx.lineTo(Math.max(p[0].x, p[1].x), entryY);
  drawCtx.stroke();

  // Labels
  drawCtx.fillStyle = '#2563EB';
  drawCtx.font = 'bold 11px sans-serif';
  drawCtx.fillText('Entry ' + d.points[0].price.toFixed(2), Math.max(p[0].x, p[1].x) + 4, entryY + 4);
  drawCtx.fillStyle = '#16A34A';
  drawCtx.fillText('TP ' + d.points[1].price.toFixed(2), Math.max(p[0].x, p[1].x) + 4, targetY + 4);
  drawCtx.fillStyle = '#DC2626';
  drawCtx.fillText('SL ' + (2 * d.points[0].price - d.points[1].price).toFixed(2), Math.max(p[0].x, p[1].x) + 4, riskY + 4);
}

// =====================================================
// HINT
// =====================================================
let hintTimer = null;
function showHint(text) {
  const h = document.getElementById('hint');
  h.textContent = text;
  h.classList.add('active');
  if (hintTimer) clearTimeout(hintTimer);
  hintTimer = setTimeout(hideHint, 3500);
}
function hideHint() {
  document.getElementById('hint').classList.remove('active');
}

// =====================================================
// RN COMMUNICATION
// =====================================================
function notifyRN(data) {
  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(JSON.stringify(data));
  }
}

// =====================================================
// PUBLIC API (called from RN)
// =====================================================
window.setCandles = function (candles, symbol) {
  currentCandles = candles || [];
  currentSymbol = symbol || '';
  applyData();
};

window.setChartType = function (type) {
  chartType = type;
  createSeries();
  document.querySelectorAll('#toolbar-bottom .tbtn[id^="ct-"]').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('ct-' + type);
  if (btn) btn.classList.add('active');
};

window.setIndicator = function (name, show) {
  if (name === 'ma') { showMA = show; applyData(); }
  else if (name === 'ema200') { showEMA200 = show; applyData(); }
  else if (name === 'bb') { showBB = show; applyData(); }
  else if (name === 'volume') { showVolume = show; applyData(); }
  else if (name === 'rsi') {
    showRSI = show;
    document.getElementById('rsi-chart').style.display = show ? 'block' : 'none';
    updateLayout();
    if (show && currentCandles.length) rsiSeries.setData(calcRSI(currentCandles, 14));
  } else if (name === 'macd') {
    showMACD = show;
    document.getElementById('macd-chart').style.display = show ? 'block' : 'none';
    updateLayout();
    if (show && currentCandles.length) {
      const macd = calcMACD(currentCandles, 12, 26, 9);
      macdLineSeries.setData(macd.macd);
      macdSignalSeries.setData(macd.signal);
      macdHistSeries.setData(macd.hist);
    }
  }
};

function updateLayout() {
  const rsiH = showRSI ? 100 : 0;
  const macdH = showMACD ? 100 : 0;
  const offset = rsiH + macdH;
  const mainEl = document.getElementById('main-chart');
  mainEl.style.bottom = offset + 'px';
  if (chart) chart.applyOptions({ width: mainEl.clientWidth, height: mainEl.clientHeight });
  let bottom = 0;
  if (showMACD) {
    const el = document.getElementById('macd-chart');
    el.style.bottom = bottom + 'px';
    bottom += 100;
    if (macdChart) macdChart.applyOptions({ width: el.clientWidth });
  }
  if (showRSI) {
    const el = document.getElementById('rsi-chart');
    el.style.bottom = bottom + 'px';
    if (rsiChart) rsiChart.applyOptions({ width: el.clientWidth });
  }
  resizeDrawCanvas();
  redrawDrawings();
}

window.loadDrawings = function (list) {
  drawings = list || [];
  drawingsHistory = [drawings];
  historyIndex = 0;
  redrawDrawings();
};

window.getDrawings = function () {
  return drawings;
};

// Polyfill roundRect
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    this.beginPath();
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
    return this;
  };
}

if (document.readyState === 'complete') initChart();
else window.addEventListener('load', initChart);
</script>
</body>
</html>`;
};

// =========================================================
// MAIN COMPONENT
// =========================================================

export default function ChartScreen() {
  const { colors, isDark } = useNavasanTheme();
  const webViewRef = useRef<WebView>(null);

  const [selected, setSelected] = useState(SYMBOLS[0]);
  const [timeframe, setTimeframe] = useState<Timeframe>('1h');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState('');
  const [chartReady, setChartReady] = useState(false);

  const [showMA, setShowMA] = useState(true);
  const [showEMA200, setShowEMA200] = useState(false);
  const [showBB, setShowBB] = useState(false);
  const [showVolume, setShowVolume] = useState(true);
  const [showRSI, setShowRSI] = useState(false);
  const [showMACD, setShowMACD] = useState(false);

  const html = useMemo(() => buildHTML(isDark), [isDark]);
  const webViewKey = useMemo(() => `chart-${isDark ? 'dark' : 'light'}`, [isDark]);

  // Load candles
  const loadCandles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCandles(selected.id, timeframe, 1000);
      setCandles(data);
    } catch (e) {
      console.log('Load error:', e);
      setCandles([]);
    } finally {
      setLoading(false);
    }
  }, [selected.id, timeframe]);

  useEffect(() => { loadCandles(); }, [loadCandles]);

  // Send data
  useEffect(() => {
    if (!webViewRef.current || !chartReady || candles.length === 0) return;
    webViewRef.current.injectJavaScript(
      `window.setCandles(${JSON.stringify(candles)}, '${selected.id}'); true;`
    );
  }, [candles, chartReady, selected.id]);

  // Indicators
  useEffect(() => {
    if (!webViewRef.current || !chartReady) return;
    webViewRef.current.injectJavaScript(`window.setIndicator('ma', ${showMA}); true;`);
  }, [showMA, chartReady]);

  useEffect(() => {
    if (!webViewRef.current || !chartReady) return;
    webViewRef.current.injectJavaScript(`window.setIndicator('ema200', ${showEMA200}); true;`);
  }, [showEMA200, chartReady]);

  useEffect(() => {
    if (!webViewRef.current || !chartReady) return;
    webViewRef.current.injectJavaScript(`window.setIndicator('bb', ${showBB}); true;`);
  }, [showBB, chartReady]);

  useEffect(() => {
    if (!webViewRef.current || !chartReady) return;
    webViewRef.current.injectJavaScript(`window.setIndicator('volume', ${showVolume}); true;`);
  }, [showVolume, chartReady]);

  useEffect(() => {
    if (!webViewRef.current || !chartReady) return;
    webViewRef.current.injectJavaScript(`window.setIndicator('rsi', ${showRSI}); true;`);
  }, [showRSI, chartReady]);

  useEffect(() => {
    if (!webViewRef.current || !chartReady) return;
    webViewRef.current.injectJavaScript(`window.setIndicator('macd', ${showMACD}); true;`);
  }, [showMACD, chartReady]);

  // Load saved drawings on symbol change
  useEffect(() => {
    if (!chartReady) return;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(`${DRAWINGS_KEY}_${selected.id}`);
        const list = raw ? JSON.parse(raw) : [];
        webViewRef.current?.injectJavaScript(
          `window.loadDrawings(${JSON.stringify(list)}); true;`
        );
      } catch {}
    })();
  }, [selected.id, chartReady]);

  // Handle messages from WebView
  const onMessage = useCallback(
    async (event: any) => {
      try {
        const msg = JSON.parse(event.nativeEvent.data);
        if (msg.type === 'ready') {
          setChartReady(true);
        } else if (msg.type === 'fullscreen') {
          Alert.alert('تمام‌صفحه', 'این قابلیت به‌زودی...');
        }
      } catch {}
    },
    []
  );

  // Save drawings when unmounted or symbol changes
  useEffect(() => {
    return () => {
      // Save on unmount
    };
  }, [selected.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return SYMBOLS;
    return SYMBOLS.filter(
      (s) => s.id.toLowerCase().includes(q) || s.label.toLowerCase().includes(q)
    );
  }, [search]);

  const latest = candles.length > 0 ? candles[candles.length - 1] : null;
  const previous = candles.length > 1 ? candles[candles.length - 2] : null;
  const change = latest && previous ? latest.close - previous.close : 0;
  const changePct = latest && previous && previous.close !== 0
    ? (change / previous.close) * 100 : 0;
  const isUp = change >= 0;
  const dec = latest ? (latest.close > 100 ? 2 : 4) : 2;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* HEADER */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => setShowPicker(true)}
          style={styles.symbolBtn}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.symbolId, { color: colors.text }]}>
              {selected.id}
            </Text>
            <Text style={[styles.symbolLabel, { color: colors.mutedText }]}>
              {selected.label}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={18} color={colors.mutedText} />
        </TouchableOpacity>

        {latest && (
          <View style={styles.priceBox}>
            <Text style={[styles.priceText, { color: colors.text }]}>
              {latest.close.toFixed(dec)}
            </Text>
            <Text style={[styles.changeText, { color: isUp ? GREEN : RED }]}>
              {isUp ? '▲' : '▼'} {Math.abs(changePct).toFixed(2)}%
            </Text>
          </View>
        )}
      </View>

      {/* TIMEFRAMES */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tfRow}
        style={[styles.tfBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
      >
        {TIMEFRAMES.map((tf) => {
          const active = tf.id === timeframe;
          return (
            <TouchableOpacity
              key={tf.id}
              onPress={() => setTimeframe(tf.id)}
              style={[
                styles.tfBtn,
                {
                  backgroundColor: active ? BLUE : colors.input,
                  borderColor: active ? BLUE : colors.border,
                },
              ]}
            >
              <Text style={[styles.tfText, { color: active ? '#FFF' : colors.mutedText }]}>
                {tf.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* INDICATORS */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.indRow}
      >
        <Ind label="MA" color={AMBER} active={showMA} onPress={() => setShowMA(!showMA)} colors={colors} />
        <Ind label="EMA200" color={PINK} active={showEMA200} onPress={() => setShowEMA200(!showEMA200)} colors={colors} />
        <Ind label="BB" color={CYAN} active={showBB} onPress={() => setShowBB(!showBB)} colors={colors} />
        <Ind label="Volume" color={BLUE} active={showVolume} onPress={() => setShowVolume(!showVolume)} colors={colors} />
        <Ind label="RSI" color={PURPLE} active={showRSI} onPress={() => setShowRSI(!showRSI)} colors={colors} />
        <Ind label="MACD" color={BLUE} active={showMACD} onPress={() => setShowMACD(!showMACD)} colors={colors} />
      </ScrollView>

      {/* CHART */}
      <View style={styles.chartWrap}>
        {loading && candles.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={BLUE} />
            <Text style={{ color: colors.mutedText, marginTop: 10, fontSize: 12, fontWeight: '600' }}>
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
            onMessage={onMessage}
          />
        )}
      </View>

      {/* SYMBOL PICKER */}
      <Modal
        visible={showPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.pickerModal, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>انتخاب نماد</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Ionicons name="close" size={24} color={colors.mutedText} />
              </TouchableOpacity>
            </View>
            <View style={[styles.searchWrap, { backgroundColor: colors.input, borderColor: colors.border }]}>
              <Ionicons name="search" size={18} color={colors.mutedText} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="جستجو..."
                placeholderTextColor={colors.mutedText}
                style={[styles.searchInput, { color: colors.text }]}
              />
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {CATEGORIES.map((cat) => {
                const items = filtered.filter((s) => s.cat === cat);
                if (items.length === 0) return null;
                return (
                  <View key={cat} style={styles.section}>
                    <Text style={[styles.sectionLabel, { color: colors.mutedText }]}>
                      {CATEGORY_LABELS[cat]}
                    </Text>
                    {items.map((s) => {
                      const active = s.id === selected.id;
                      return (
                        <TouchableOpacity
                          key={s.id}
                          onPress={() => { setSelected(s); setShowPicker(false); setSearch(''); }}
                          style={[
                            styles.row,
                            {
                              backgroundColor: active ? `${BLUE}15` : colors.card,
                              borderColor: active ? BLUE : colors.border,
                            },
                          ]}
                        >
                          <Text style={[styles.rowLabel, { color: colors.text }]}>{s.label}</Text>
                          <Text style={[styles.rowId, { color: colors.mutedText }]}>{s.id}</Text>
                          {active && <Ionicons name="checkmark-circle" size={20} color={BLUE} />}
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

function Ind({
  label, color, active, onPress, colors,
}: {
  label: string; color: string; active: boolean; onPress: () => void; colors: any;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.indChip,
        {
          backgroundColor: active ? `${color}25` : colors.input,
          borderColor: active ? color : colors.border,
        },
      ]}
    >
      <View style={[styles.indDot, { backgroundColor: color }]} />
      <Text style={[styles.indLabel, { color: active ? color : colors.mutedText }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 50,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  symbolBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  symbolId: { fontSize: 18, fontWeight: '900' },
  symbolLabel: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  priceBox: { alignItems: 'flex-end' },
  priceText: { fontSize: 17, fontWeight: '900' },
  changeText: { fontSize: 11, fontWeight: '800', marginTop: 2 },

  tfBar: { borderBottomWidth: 1 },
  tfRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 6 },
  tfBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 42,
    alignItems: 'center',
  },
  tfText: { fontSize: 11, fontWeight: '900' },

  indRow: { paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  indChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  indDot: { width: 8, height: 8, borderRadius: 4 },
  indLabel: { fontSize: 10, fontWeight: '900' },

  chartWrap: { flex: 1, position: 'relative' },
  webview: { flex: 1, backgroundColor: 'transparent' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
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
    height: 48,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 13, textAlign: 'right' },
  section: { marginBottom: 16 },
  sectionLabel: { fontSize: 11, fontWeight: '800', marginBottom: 7, textAlign: 'right' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 13,
    borderWidth: 1,
    marginBottom: 7,
  },
  rowLabel: { flex: 1, fontSize: 13, fontWeight: '800', textAlign: 'right' },
  rowId: { fontSize: 10, fontWeight: '700' },
});