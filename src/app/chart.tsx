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
import { fetchCandles, type Candle, type Timeframe } from '@/lib/market-data';

const BLUE = '#2563EB';
const GREEN = '#16A34A';
const RED = '#DC2626';
const AMBER = '#F59E0B';
const PURPLE = '#7C3AED';
const CYAN = '#0891B2';
const PINK = '#DB2777';

// =========================================================
// SYMBOLS
// =========================================================

type SymbolItem = {
  id: string;
  label: string;
  category: 'crypto' | 'metal' | 'forex' | 'index';
};

const SYMBOLS: SymbolItem[] = [
  // Metals
  { id: 'XAUUSD', label: 'طلا', category: 'metal' },
  { id: 'XAGUSD', label: 'نقره', category: 'metal' },
  { id: 'XPTUSD', label: 'پلاتین', category: 'metal' },
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
  { id: '1m', label: '1د' },
  { id: '5m', label: '5د' },
  { id: '15m', label: '15د' },
  { id: '1h', label: '1س' },
  { id: '4h', label: '4س' },
  { id: '1d', label: 'روز' },
  { id: '1w', label: 'هفته' },
];

type ChartType = 'candles' | 'line' | 'area' | 'bars';

const CHART_TYPES: { id: ChartType; label: string; icon: string }[] = [
  { id: 'candles', label: 'کندل', icon: 'stats-chart' },
  { id: 'line', label: 'خط', icon: 'trending-up' },
  { id: 'area', label: 'ناحیه', icon: 'analytics' },
  { id: 'bars', label: 'میله', icon: 'bar-chart' },
];

const CATEGORY_LABELS: Record<SymbolItem['category'], string> = {
  metal: 'فلزات',
  crypto: 'کریپتو',
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
// HTML BUILDER — Ultra Professional Chart
// =========================================================

const buildChartHTML = (isDark: boolean): string => {
  const bg = isDark ? '#0A0A0A' : '#FFFFFF';
  const textColor = isDark ? '#E5E7EB' : '#0F172A';
  const mutedColor = isDark ? '#71717A' : '#94A3B8';
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

    /* TOP BAR (OHLC) */
    #ohlc-bar {
      position: absolute; top: 0; left: 0; right: 0; height: 32px;
      background: ${panelBg}; border-bottom: 1px solid ${borderColor};
      padding: 0 8px; display: flex; align-items: center; gap: 10px;
      font-size: 10px; font-weight: 700; color: ${mutedColor};
      z-index: 20; overflow-x: auto;
      scrollbar-width: none;
    }
    #ohlc-bar::-webkit-scrollbar { display: none; }
    #ohlc-bar span { white-space: nowrap; }
    #ohlc-bar span b { color: ${textColor}; font-weight: 800; }
    #ohlc-bar .up { color: #16A34A; }
    #ohlc-bar .down { color: #DC2626; }
    #ohlc-bar .change-up { color: #16A34A; }
    #ohlc-bar .change-down { color: #DC2626; }

    /* LEGEND */
    #legend {
      position: absolute; top: 40px; left: 8px; z-index: 15;
      font-size: 9px; font-weight: 800;
      background: ${bg}CC; backdrop-filter: blur(4px);
      padding: 4px 8px; border-radius: 6px;
      display: flex; flex-direction: column; gap: 3px;
      pointer-events: none;
    }
    #legend .row { display: flex; align-items: center; gap: 5px; }
    #legend .dot { width: 8px; height: 8px; border-radius: 50%; }

    /* MAIN CHART */
    #main-chart {
      position: absolute; top: 32px; left: 0; right: 0; bottom: 0;
    }

    /* SUB CHARTS (RSI / MACD) */
    .sub-chart {
      position: absolute; left: 0; right: 0;
      height: 0;
      background: ${bg};
      border-top: 1px solid ${borderColor};
      display: none;
      overflow: hidden;
    }
    .sub-chart.active { display: block; }

    #rsi-chart { bottom: 0; height: 110px; }
    #macd-chart { bottom: 0; height: 110px; }

    /* PRICE INFO PANEL */
    #price-info {
      position: absolute; top: 40px; right: 8px; z-index: 15;
      background: ${bg}CC; backdrop-filter: blur(4px);
      padding: 6px 10px; border-radius: 8px;
      font-size: 11px; font-weight: 800;
      text-align: right;
      pointer-events: none;
      display: none;
    }
    #price-info.active { display: block; }
    #price-info .price { font-size: 15px; font-weight: 900; }
    #price-info .diff { font-size: 10px; margin-top: 2px; }

    /* LOADING */
    .loading {
      position: absolute; inset: 0;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      gap: 12px; color: ${mutedColor};
      background: ${bg}; z-index: 100;
    }
    .spinner {
      width: 32px; height: 32px;
      border: 3px solid ${gridColor};
      border-top-color: #2563EB; border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ERROR */
    .error {
      color: ${RED};
      font-size: 12px;
      text-align: center;
      padding: 20px;
      line-height: 20px;
    }

    /* TOOLBAR (bottom-left) */
    #toolbar {
      position: absolute; bottom: 8px; left: 8px; z-index: 15;
      display: flex; gap: 4px;
      background: ${bg}EE; backdrop-filter: blur(6px);
      padding: 4px; border-radius: 8px;
      border: 1px solid ${borderColor};
      font-size: 10px; font-weight: 800;
    }
    #toolbar button {
      background: transparent; border: none; color: ${mutedColor};
      padding: 6px 8px; border-radius: 5px; cursor: pointer;
      font-weight: 800; font-size: 10px;
      font-family: inherit;
    }
    #toolbar button.active { background: #2563EB; color: #FFF; }
  </style>
</head>
<body>
  <div id="ohlc-bar">
    <span>O <b id="o-val">—</b></span>
    <span>H <b id="h-val">—</b></span>
    <span>L <b id="l-val">—</b></span>
    <span>C <b id="c-val">—</b></span>
    <span class="change-up" id="chg-val">—</span>
  </div>

  <div id="legend"></div>

  <div id="price-info">
    <div class="price" id="pi-price">—</div>
    <div class="diff" id="pi-diff">—</div>
  </div>

  <div id="main-chart"></div>
  <div id="rsi-chart" class="sub-chart"></div>
  <div id="macd-chart" class="sub-chart"></div>

  <div id="toolbar">
    <button id="btn-reset" onclick="resetZoom()">ریست</button>
    <button id="btn-realtime" onclick="scrollRealtime()">آخرین</button>
    <button id="btn-screenshot" onclick="takeScreenshot()">اسکرین</button>
  </div>

  <div class="loading" id="loading">
    <div class="spinner"></div>
    <div>در حال بارگذاری چارت...</div>
  </div>

  <script src="https://unpkg.com/lightweight-charts@4.2.3/dist/lightweight-charts.standalone.production.js"></script>
  <script>
    // =====================================================
    // GLOBAL STATE
    // =====================================================
    let mainChart = null;
    let rsiChart = null;
    let macdChart = null;

    let candleSeries = null;
    let volumeSeries = null;
    let ma20Series = null;
    let ma50Series = null;
    let ema200Series = null;
    let bbUpperSeries = null;
    let bbLowerSeries = null;
    let bbMiddleSeries = null;

    let rsiSeries = null;
    let macdLineSeries = null;
    let macdSignalSeries = null;
    let macdHistSeries = null;

    let currentCandles = [];
    let currentChartType = 'candles';
    let showMA = true;
    let showEMA200 = false;
    let showBB = false;
    let showVolume = true;
    let showRSI = false;
    let showMACD = false;

    const COLOR_UP = '#16A34A';
    const COLOR_DOWN = '#DC2626';

    // =====================================================
    // INIT
    // =====================================================
    function initChart() {
      try {
        document.getElementById('loading').style.display = 'none';

        const mainEl = document.getElementById('main-chart');

        mainChart = LightweightCharts.createChart(mainEl, {
          width: mainEl.clientWidth,
          height: mainEl.clientHeight,
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
            scaleMargins: { top: 0.08, bottom: 0.22 },
          },
          timeScale: {
            borderColor: '${borderColor}',
            timeVisible: true,
            secondsVisible: false,
            rightOffset: 8,
            barSpacing: 7,
            minBarSpacing: 0.5,
            fixLeftEdge: false,
            lockVisibleTimeRangeOnResize: true,
          },
          crosshair: {
            mode: 0,
            vertLine: {
              color: '#2563EB',
              width: 1,
              style: 3,
              labelBackgroundColor: '#2563EB',
            },
            horzLine: {
              color: '#2563EB',
              width: 1,
              style: 3,
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

        // Candlestick series
        candleSeries = mainChart.addCandlestickSeries({
          upColor: COLOR_UP,
          downColor: COLOR_DOWN,
          borderUpColor: COLOR_UP,
          borderDownColor: COLOR_DOWN,
          wickUpColor: COLOR_UP,
          wickDownColor: COLOR_DOWN,
          priceLineVisible: true,
          priceLineColor: '#2563EB',
          priceLineWidth: 1,
        });

        // Volume
        volumeSeries = mainChart.addHistogramSeries({
          color: '#2563EB40',
          priceFormat: { type: 'volume' },
          priceScaleId: 'volume',
          lastValueVisible: false,
          priceLineVisible: false,
        });
        mainChart.priceScale('volume').applyOptions({
          scaleMargins: { top: 0.82, bottom: 0 },
        });

        // MA20
        ma20Series = mainChart.addLineSeries({
          color: '#F59E0B',
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });

        // MA50
        ma50Series = mainChart.addLineSeries({
          color: '#7C3AED',
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });

        // EMA200
        ema200Series = mainChart.addLineSeries({
          color: '#DB2777',
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });

        // BB
        bbUpperSeries = mainChart.addLineSeries({
          color: '#0891B2',
          lineWidth: 1,
          lineStyle: 2,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
        bbMiddleSeries = mainChart.addLineSeries({
          color: '#0891B2AA',
          lineWidth: 1,
          lineStyle: 0,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
        bbLowerSeries = mainChart.addLineSeries({
          color: '#0891B2',
          lineWidth: 1,
          lineStyle: 2,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });

        // RSI chart
        const rsiEl = document.getElementById('rsi-chart');
        rsiChart = LightweightCharts.createChart(rsiEl, {
          width: rsiEl.clientWidth,
          height: 110,
          layout: { background: { type: 'solid', color: '${bg}' }, textColor: '${textColor}', fontSize: 9 },
          grid: { vertLines: { color: '${gridColor}' }, horzLines: { color: '${gridColor}' } },
          rightPriceScale: { borderColor: '${borderColor}', scaleMargins: { top: 0.1, bottom: 0.1 } },
          timeScale: { visible: false, borderColor: '${borderColor}' },
          crosshair: { mode: 0 },
          handleScroll: false,
          handleScale: false,
        });
        rsiSeries = rsiChart.addLineSeries({
          color: '#7C3AED',
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: true,
        });

        // MACD chart
        const macdEl = document.getElementById('macd-chart');
        macdChart = LightweightCharts.createChart(macdEl, {
          width: macdEl.clientWidth,
          height: 110,
          layout: { background: { type: 'solid', color: '${bg}' }, textColor: '${textColor}', fontSize: 9 },
          grid: { vertLines: { color: '${gridColor}' }, horzLines: { color: '${gridColor}' } },
          rightPriceScale: { borderColor: '${borderColor}', scaleMargins: { top: 0.1, bottom: 0.1 } },
          timeScale: { visible: false, borderColor: '${borderColor}' },
          crosshair: { mode: 0 },
          handleScroll: false,
          handleScale: false,
        });
        macdHistSeries = macdChart.addHistogramSeries({
          priceLineVisible: false,
          lastValueVisible: false,
        });
        macdLineSeries = macdChart.addLineSeries({
          color: '#2563EB',
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        macdSignalSeries = macdChart.addLineSeries({
          color: '#F59E0B',
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false,
        });

        // Sync time scales
        mainChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
          if (range) {
            if (rsiChart) rsiChart.timeScale().setVisibleLogicalRange(range);
            if (macdChart) macdChart.timeScale().setVisibleLogicalRange(range);
          }
        });

        // Crosshair sync + OHLC update
        mainChart.subscribeCrosshairMove((param) => {
          updateOHLCFromCrosshair(param);
          syncCrosshair(param);
        });

        // Resize
        const resizeObs = new ResizeObserver(() => {
          if (mainChart && mainEl) {
            mainChart.applyOptions({ width: mainEl.clientWidth, height: mainEl.clientHeight });
          }
          if (rsiChart && rsiEl) {
            rsiChart.applyOptions({ width: rsiEl.clientWidth });
          }
          if (macdChart && macdEl) {
            macdChart.applyOptions({ width: macdEl.clientWidth });
          }
        });
        resizeObs.observe(mainEl);

      } catch (e) {
        console.error('Init error:', e);
        document.getElementById('loading').innerHTML =
          '<div class="error">خطا در راه‌اندازی چارت<br/>' + (e.message || '') + '</div>';
        document.getElementById('loading').style.display = 'flex';
      }
    }

    // =====================================================
    // SYNC CROSSHAIR
    // =====================================================
    function syncCrosshair(param) {
      if (!param.time) return;
      if (rsiChart) rsiChart.setCrosshairPosition(50, param.time, rsiSeries);
      if (macdChart) macdChart.setCrosshairPosition(0, param.time, macdLineSeries);
    }

    // =====================================================
    // UPDATE OHLC BAR
    // =====================================================
    function updateOHLCFromCrosshair(param) {
      if (!param.time || !param.seriesData.has(candleSeries)) {
        const last = currentCandles[currentCandles.length - 1];
        if (last) {
          renderOHLC(last.open, last.high, last.low, last.close);
        } else {
          clearOHLC();
        }
        document.getElementById('price-info').classList.remove('active');
        return;
      }
      const d = param.seriesData.get(candleSeries);
      if (d) {
        renderOHLC(d.open, d.high, d.low, d.close);
        const diff = d.close - d.open;
        const pct = d.open !== 0 ? (diff / d.open) * 100 : 0;
        document.getElementById('pi-price').textContent = d.close.toFixed(d.close > 100 ? 2 : 4);
        document.getElementById('pi-diff').textContent =
          (diff >= 0 ? '+' : '') + diff.toFixed(4) + ' (' + (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%)';
        document.getElementById('pi-diff').style.color = diff >= 0 ? COLOR_UP : COLOR_DOWN;
        document.getElementById('price-info').classList.add('active');
      }
    }

    function renderOHLC(o, h, l, c) {
      document.getElementById('o-val').textContent = o.toFixed(o > 100 ? 2 : 4);
      document.getElementById('h-val').textContent = h.toFixed(h > 100 ? 2 : 4);
      document.getElementById('l-val').textContent = l.toFixed(l > 100 ? 2 : 4);
      document.getElementById('c-val').textContent = c.toFixed(c > 100 ? 2 : 4);
      const cls = c >= o ? 'up' : 'down';
      document.getElementById('c-val').className = cls;

      const diff = c - o;
      const pct = o !== 0 ? (diff / o) * 100 : 0;
      const chgEl = document.getElementById('chg-val');
      chgEl.textContent = (diff >= 0 ? '+' : '') + diff.toFixed(4) + ' (' + (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%)';
      chgEl.className = diff >= 0 ? 'change-up' : 'change-down';
    }

    function clearOHLC() {
      ['o-val','h-val','l-val','c-val','chg-val'].forEach(id => {
        document.getElementById(id).textContent = '—';
        document.getElementById(id).className = '';
      });
    }

    // =====================================================
    // INDICATOR CALCULATIONS
    // =====================================================
    function calcSMA(candles, period) {
      const result = [];
      for (let i = 0; i < candles.length; i++) {
        if (i < period - 1) continue;
        let sum = 0;
        for (let j = 0; j < period; j++) sum += candles[i - j].close;
        result.push({ time: Math.floor(candles[i].timestamp / 1000), value: sum / period });
      }
      return result;
    }

    function calcEMA(candles, period) {
      if (candles.length < period) return [];
      const k = 2 / (period + 1);
      const result = [];
      let ema = 0;
      for (let i = 0; i < period; i++) ema += candles[i].close;
      ema = ema / period;
      result.push({ time: Math.floor(candles[period - 1].timestamp / 1000), value: ema });
      for (let i = period; i < candles.length; i++) {
        ema = candles[i].close * k + ema * (1 - k);
        result.push({ time: Math.floor(candles[i].timestamp / 1000), value: ema });
      }
      return result;
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
      const result = [];
      let avgGain = 0, avgLoss = 0;
      for (let i = 1; i <= period; i++) {
        const diff = candles[i].close - candles[i - 1].close;
        if (diff >= 0) avgGain += diff; else avgLoss -= diff;
      }
      avgGain /= period; avgLoss /= period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      result.push({ time: Math.floor(candles[period].timestamp / 1000), value: 100 - 100 / (1 + rs) });

      for (let i = period + 1; i < candles.length; i++) {
        const diff = candles[i].close - candles[i - 1].close;
        const gain = diff > 0 ? diff : 0;
        const loss = diff < 0 ? -diff : 0;
        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;
        const r = avgLoss === 0 ? 100 : avgGain / avgLoss;
        result.push({ time: Math.floor(candles[i].timestamp / 1000), value: 100 - 100 / (1 + r) });
      }
      return result;
    }

    function calcMACD(candles, fast, slow, signal) {
      const emaFast = calcEMA(candles, fast);
      const emaSlow = calcEMA(candles, slow);
      const map = new Map();
      emaSlow.forEach(e => map.set(e.time, e.value));
      const macd = [];
      emaFast.forEach(e => {
        if (map.has(e.time)) {
          macd.push({ time: e.time, value: e.value - map.get(e.time) });
        }
      });
      if (macd.length === 0) return { macd: [], signal: [], hist: [] };
      const signalPeriod = signal;
      const k = 2 / (signalPeriod + 1);
      let sig = 0;
      for (let i = 0; i < Math.min(signalPeriod, macd.length); i++) sig += macd[i].value;
      sig = sig / signalPeriod;
      const signalLine = [];
      const histLine = [];
      for (let i = signalPeriod - 1; i < macd.length; i++) {
        if (i === signalPeriod - 1) {
          signalLine.push({ time: macd[i].time, value: sig });
        } else {
          sig = macd[i].value * k + sig * (1 - k);
          signalLine.push({ time: macd[i].time, value: sig });
        }
        const h = macd[i].value - sig;
        histLine.push({
          time: macd[i].time,
          value: h,
          color: h >= 0 ? '#16A34A80' : '#DC262680',
        });
      }
      return { macd, signal: signalLine, hist: histLine };
    }

    // =====================================================
    // UPDATE LEGEND
    // =====================================================
    function updateLegend() {
      const legend = document.getElementById('legend');
      let html = '';
      if (showMA) {
        html += '<div class="row"><div class="dot" style="background:#F59E0B"></div><span>MA 20</span></div>';
        html += '<div class="row"><div class="dot" style="background:#7C3AED"></div><span>MA 50</span></div>';
      }
      if (showEMA200) {
        html += '<div class="row"><div class="dot" style="background:#DB2777"></div><span>EMA 200</span></div>';
      }
      if (showBB) {
        html += '<div class="row"><div class="dot" style="background:#0891B2"></div><span>Bollinger 20</span></div>';
      }
      legend.innerHTML = html;
    }

    // =====================================================
    // SET CANDLES
    // =====================================================
    window.setCandles = function (candles) {
      if (!mainChart || !candleSeries || !candles || candles.length === 0) return;

      currentCandles = candles;

      const formatted = candles.map(c => ({
        time: Math.floor(c.timestamp / 1000),
        open: c.open, high: c.high, low: c.low, close: c.close,
      }));

      candleSeries.setData(formatted);

      // Volume
      if (volumeSeries) {
        const volumeData = candles.map(c => ({
          time: Math.floor(c.timestamp / 1000),
          value: c.volume || 0,
          color: c.close >= c.open ? '#16A34A30' : '#DC262630',
        }));
        volumeSeries.setData(volumeData);
        volumeSeries.applyOptions({ visible: showVolume });
      }

      // Indicators
      if (ma20Series) { ma20Series.setData(showMA ? calcSMA(candles, 20) : []); ma20Series.applyOptions({ visible: showMA }); }
      if (ma50Series) { ma50Series.setData(showMA ? calcSMA(candles, 50) : []); ma50Series.applyOptions({ visible: showMA }); }
      if (ema200Series) { ema200Series.setData(showEMA200 ? calcEMA(candles, 200) : []); ema200Series.applyOptions({ visible: showEMA200 }); }

      if (bbUpperSeries && bbMiddleSeries && bbLowerSeries) {
        if (showBB) {
          const bb = calcBB(candles, 20, 2);
          bbUpperSeries.setData(bb.upper);
          bbMiddleSeries.setData(bb.middle);
          bbLowerSeries.setData(bb.lower);
        } else {
          bbUpperSeries.setData([]);
          bbMiddleSeries.setData([]);
          bbLowerSeries.setData([]);
        }
        bbUpperSeries.applyOptions({ visible: showBB });
        bbMiddleSeries.applyOptions({ visible: showBB });
        bbLowerSeries.applyOptions({ visible: showBB });
      }

      // RSI
      if (showRSI && rsiSeries) {
        const rsi = calcRSI(candles, 14);
        rsiSeries.setData(rsi);
      }

      // MACD
      if (showMACD && macdLineSeries && macdSignalSeries && macdHistSeries) {
        const macd = calcMACD(candles, 12, 26, 9);
        macdLineSeries.setData(macd.macd);
        macdSignalSeries.setData(macd.signal);
        macdHistSeries.setData(macd.hist);
      }

      updateLegend();
      mainChart.timeScale().fitContent();

      // Update OHLC with last candle
      const last = candles[candles.length - 1];
      if (last) renderOHLC(last.open, last.high, last.low, last.close);
    };

    // =====================================================
    // SET CHART TYPE
    // =====================================================
    window.setChartType = function (type) {
      if (!mainChart) return;
      currentChartType = type;
      
      // Remove old series
      if (candleSeries) { mainChart.removeSeries(candleSeries); candleSeries = null; }

      const commonOptions = {
        priceLineVisible: true,
        priceLineColor: '#2563EB',
        priceLineWidth: 1,
      };

      if (type === 'candles') {
        candleSeries = mainChart.addCandlestickSeries({
          upColor: COLOR_UP, downColor: COLOR_DOWN,
          borderUpColor: COLOR_UP, borderDownColor: COLOR_DOWN,
          wickUpColor: COLOR_UP, wickDownColor: COLOR_DOWN,
          ...commonOptions,
        });
      } else if (type === 'line') {
        candleSeries = mainChart.addLineSeries({
          color: '#2563EB', lineWidth: 2, ...commonOptions,
        });
      } else if (type === 'area') {
        candleSeries = mainChart.addAreaSeries({
          topColor: '#2563EB50', bottomColor: '#2563EB05',
          lineColor: '#2563EB', lineWidth: 2, ...commonOptions,
        });
      } else if (type === 'bars') {
        candleSeries = mainChart.addBarSeries({
          upColor: COLOR_UP, downColor: COLOR_DOWN, ...commonOptions,
        });
      }

      // Re-apply data
      if (currentCandles.length > 0) {
        window.setCandles(currentCandles);
      }
    };

    // =====================================================
    // TOGGLES
    // =====================================================
    window.toggleMA = function (show) {
      showMA = show;
      if (ma20Series) ma20Series.applyOptions({ visible: show });
      if (ma50Series) ma50Series.applyOptions({ visible: show });
      updateLegend();
    };

    window.toggleEMA200 = function (show) {
      showEMA200 = show;
      if (ema200Series) ema200Series.applyOptions({ visible: show });
      if (show && currentCandles.length) {
        ema200Series.setData(calcEMA(currentCandles, 200));
      }
      updateLegend();
    };

    window.toggleBB = function (show) {
      showBB = show;
      if (bbUpperSeries) bbUpperSeries.applyOptions({ visible: show });
      if (bbMiddleSeries) bbMiddleSeries.applyOptions({ visible: show });
      if (bbLowerSeries) bbLowerSeries.applyOptions({ visible: show });
      if (show && currentCandles.length) {
        const bb = calcBB(currentCandles, 20, 2);
        bbUpperSeries.setData(bb.upper);
        bbMiddleSeries.setData(bb.middle);
        bbLowerSeries.setData(bb.lower);
      }
      updateLegend();
    };

    window.toggleVolume = function (show) {
      showVolume = show;
      if (volumeSeries) volumeSeries.applyOptions({ visible: show });
    };

    window.toggleRSI = function (show) {
      showRSI = show;
      const el = document.getElementById('rsi-chart');
      if (show) {
        el.classList.add('active');
        if (currentCandles.length && rsiSeries) {
          rsiSeries.setData(calcRSI(currentCandles, 14));
        }
      } else {
        el.classList.remove('active');
      }
      // adjust main chart height
      setTimeout(() => resizeAll(), 50);
    };

    window.toggleMACD = function (show) {
      showMACD = show;
      const el = document.getElementById('macd-chart');
      if (show) {
        el.classList.add('active');
        if (currentCandles.length && macdLineSeries) {
          const macd = calcMACD(currentCandles, 12, 26, 9);
          macdLineSeries.setData(macd.macd);
          macdSignalSeries.setData(macd.signal);
          macdHistSeries.setData(macd.hist);
        }
      } else {
        el.classList.remove('active');
      }
      setTimeout(() => resizeAll(), 50);
    };

    // =====================================================
    // RESIZE
    // =====================================================
    function resizeAll() {
      const mainEl = document.getElementById('main-chart');
      const rsiEl = document.getElementById('rsi-chart');
      const macdEl = document.getElementById('macd-chart');
      const rsiActive = rsiEl.classList.contains('active');
      const macdActive = macdEl.classList.contains('active');
      const bottomOffset = (rsiActive ? 110 : 0) + (macdActive ? 110 : 0);
      
      mainEl.style.bottom = bottomOffset + 'px';
      
      if (mainChart && mainEl) mainChart.applyOptions({ width: mainEl.clientWidth, height: mainEl.clientHeight });
      if (rsiChart && rsiEl) rsiChart.applyOptions({ width: rsiEl.clientWidth });
      if (macdChart && macdEl) macdChart.applyOptions({ width: macdEl.clientWidth });
    }

    // =====================================================
    // ACTIONS
    // =====================================================
    window.fitContent = function () { if (mainChart) mainChart.timeScale().fitContent(); };
    window.scrollRealtime = function () { if (mainChart) mainChart.timeScale().scrollToRealTime(); };
    window.resetZoom = function () { if (mainChart) mainChart.timeScale().fitContent(); };

    window.takeScreenshot = function () {
      try {
        const canvas = mainChart.takeScreenshot();
        const dataUrl = canvas.toDataURL('image/png');
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'screenshot', data: dataUrl }));
        }
      } catch (e) {
        console.log('Screenshot error:', e);
      }
    };

    // =====================================================
    // START
    // =====================================================
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

  const [chartType, setChartType] = useState<ChartType>('candles');
  const [showMA, setShowMA] = useState(true);
  const [showEMA200, setShowEMA200] = useState(false);
  const [showBB, setShowBB] = useState(false);
  const [showVolume, setShowVolume] = useState(true);
  const [showRSI, setShowRSI] = useState(false);
  const [showMACD, setShowMACD] = useState(false);
  const [chartReady, setChartReady] = useState(false);

  const html = useMemo(() => buildChartHTML(isDark), [isDark]);
  const webViewKey = useMemo(() => `chart-${isDark ? 'dark' : 'light'}`, [isDark]);

  // =========================================================
  // LOAD CANDLES
  // =========================================================

  const loadCandles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCandles(selectedSymbol.id, selectedTimeframe, 1000);
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
  // SEND DATA
  // =========================================================

  useEffect(() => {
    if (!webViewRef.current || candles.length === 0 || !chartReady) return;
    webViewRef.current.injectJavaScript(
      `window.setCandles(${JSON.stringify(candles)}); true;`
    );
  }, [candles, chartReady]);

  // Toggle indicators
  useEffect(() => {
    if (!webViewRef.current || !chartReady) return;
    webViewRef.current.injectJavaScript(`window.toggleMA(${showMA}); true;`);
  }, [showMA, chartReady]);

  useEffect(() => {
    if (!webViewRef.current || !chartReady) return;
    webViewRef.current.injectJavaScript(`window.toggleEMA200(${showEMA200}); true;`);
  }, [showEMA200, chartReady]);

  useEffect(() => {
    if (!webViewRef.current || !chartReady) return;
    webViewRef.current.injectJavaScript(`window.toggleBB(${showBB}); true;`);
  }, [showBB, chartReady]);

  useEffect(() => {
    if (!webViewRef.current || !chartReady) return;
    webViewRef.current.injectJavaScript(`window.toggleVolume(${showVolume}); true;`);
  }, [showVolume, chartReady]);

  useEffect(() => {
    if (!webViewRef.current || !chartReady) return;
    webViewRef.current.injectJavaScript(`window.toggleRSI(${showRSI}); true;`);
  }, [showRSI, chartReady]);

  useEffect(() => {
    if (!webViewRef.current || !chartReady) return;
    webViewRef.current.injectJavaScript(`window.toggleMACD(${showMACD}); true;`);
  }, [showMACD, chartReady]);

  // Chart type
  useEffect(() => {
    if (!webViewRef.current || !chartReady) return;
    webViewRef.current.injectJavaScript(`window.setChartType('${chartType}'); true;`);
  }, [chartType, chartReady]);

  // =========================================================
  // FILTER SYMBOLS
  // =========================================================

  const filteredSymbols = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return SYMBOLS;
    return SYMBOLS.filter(
      (s) => s.id.toLowerCase().includes(q) || s.label.toLowerCase().includes(q)
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
        <TouchableOpacity
          onPress={() => setShowSymbolPicker(true)}
          style={styles.symbolBtn}
          activeOpacity={0.7}
        >
          <View style={styles.headerLeft}>
            <View style={styles.brandRow}>
              <Text style={[styles.brand, { color: colors.text }]}>
                {selectedSymbol.id}
              </Text>
              <View style={[styles.liveBadge, { backgroundColor: `${GREEN}22` }]}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            </View>
            <Text style={[styles.subtitle, { color: colors.mutedText }]}>
              {selectedSymbol.label}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={18} color={colors.mutedText} />
        </TouchableOpacity>

        <View style={styles.headerRight}>
          {latest && (
            <View style={styles.priceBox}>
              <Text style={[styles.priceText, { color: colors.text }]}>
                {latest.close.toFixed(latest.close > 100 ? 2 : 4)}
              </Text>
              <Text
                style={[
                  styles.changeText,
                  { color: isUp ? GREEN : RED },
                ]}
              >
                {isUp ? '▲' : '▼'} {Math.abs(priceChangePct).toFixed(2)}%
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* TIMEFRAME + CHART TYPE ROW */}
      <View
        style={[
          styles.toolbar,
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tfRow}
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
                    backgroundColor: active ? BLUE : 'transparent',
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

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {CHART_TYPES.map((ct) => {
            const active = ct.id === chartType;
            return (
              <TouchableOpacity
                key={ct.id}
                onPress={() => setChartType(ct.id)}
                style={[
                  styles.typeBtn,
                  {
                    backgroundColor: active ? `${BLUE}22` : 'transparent',
                  },
                ]}
              >
                <Ionicons
                  name={ct.icon as any}
                  size={14}
                  color={active ? BLUE : colors.mutedText}
                />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* INDICATORS ROW */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.indicatorsRow}
      >
        <IndicatorChip
          label="MA"
          color={AMBER}
          active={showMA}
          onPress={() => setShowMA(!showMA)}
          colors={colors}
        />
        <IndicatorChip
          label="EMA 200"
          color={PINK}
          active={showEMA200}
          onPress={() => setShowEMA200(!showEMA200)}
          colors={colors}
        />
        <IndicatorChip
          label="Bollinger"
          color={CYAN}
          active={showBB}
          onPress={() => setShowBB(!showBB)}
          colors={colors}
        />
        <IndicatorChip
          label="Volume"
          color={BLUE}
          active={showVolume}
          onPress={() => setShowVolume(!showVolume)}
          colors={colors}
          icon="bar-chart-outline"
        />
        <IndicatorChip
          label="RSI"
          color={PURPLE}
          active={showRSI}
          onPress={() => setShowRSI(!showRSI)}
          colors={colors}
        />
        <IndicatorChip
          label="MACD"
          color={BLUE}
          active={showMACD}
          onPress={() => setShowMACD(!showMACD)}
          colors={colors}
        />
      </ScrollView>

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
            onError={(e) => console.log('[Chart] WebView error:', e.nativeEvent)}
            onMessage={(event) => {
              try {
                const msg = JSON.parse(event.nativeEvent.data);
                if (msg.type === 'screenshot') {
                  console.log('Screenshot received, length:', msg.data.length);
                }
              } catch {}
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
                const items = filteredSymbols.filter((s) => s.category === cat);
                if (items.length === 0) return null;
                return (
                  <View key={cat} style={styles.categorySection}>
                    <Text
                      style={[styles.categoryLabel, { color: colors.mutedText }]}
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
                              style={[styles.pickerLabel, { color: colors.text }]}
                            >
                              {s.label}
                            </Text>
                            <Text
                              style={[styles.pickerId, { color: colors.mutedText }]}
                            >
                              {s.id}
                            </Text>
                          </View>
                          {active && (
                            <Ionicons name="checkmark-circle" size={20} color={BLUE} />
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
// INDICATOR CHIP
// =========================================================

function IndicatorChip({
  label,
  color,
  active,
  onPress,
  colors,
  icon,
}: {
  label: string;
  color: string;
  active: boolean;
  onPress: () => void;
  colors: any;
  icon?: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.indicatorChip,
        {
          backgroundColor: active ? `${color}22` : colors.input,
          borderColor: active ? color : colors.border,
        },
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon as any}
          size={11}
          color={active ? color : colors.mutedText}
        />
      ) : (
        <View style={[styles.indicatorDot, { backgroundColor: color }]} />
      )}
      <Text
        style={[
          styles.indicatorLabel,
          { color: active ? color : colors.mutedText },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// =========================================================
// STYLES
// =========================================================

const styles = StyleSheet.create({
  screen: { flex: 1 },

  header: {
    paddingHorizontal: 14,
    paddingTop: Platform.OS === 'ios' ? 56 : 50,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  symbolBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerLeft: { flex: 1 },
  headerRight: { alignItems: 'flex-end' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brand: { fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
  },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: GREEN },
  liveText: {
    color: GREEN,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  subtitle: { fontSize: 10, fontWeight: '600', marginTop: 2 },

  priceBox: { alignItems: 'flex-end' },
  priceText: { fontSize: 16, fontWeight: '900' },
  changeText: { fontSize: 11, fontWeight: '800', marginTop: 2 },

  toolbar: { borderBottomWidth: 1 },
  tfRow: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 5,
    alignItems: 'center',
  },
  tfBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 36,
    alignItems: 'center',
  },
  tfText: { fontSize: 10, fontWeight: '900' },

  divider: { width: 1, height: 20, marginHorizontal: 4 },

  typeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  indicatorsRow: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  indicatorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
    borderWidth: 1,
  },
  indicatorDot: { width: 7, height: 7, borderRadius: 4 },
  indicatorLabel: { fontSize: 10, fontWeight: '900' },

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