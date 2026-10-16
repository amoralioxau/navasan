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
    View,
} from 'react-native';
import { WebView } from 'react-native-webview';

import { useNavasanTheme } from '@/context/theme-context';
import { fetchCandles, type Candle, type Timeframe } from '@/lib/market-data';

const BLUE = '#2563EB';
const GREEN = '#16A34A';
const RED = '#DC2626';

// =========================================================
// DATA
// =========================================================

type SymbolItem = { id: string; label: string; cat: 'metal' | 'crypto' | 'forex' | 'index' };

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
  { id: '1m', label: '1m' },
  { id: '5m', label: '5m' },
  { id: '15m', label: '15m' },
  { id: '1h', label: '1H' },
  { id: '4h', label: '4H' },
  { id: '1d', label: '1D' },
  { id: '1w', label: '1W' },
];

const CATEGORY_LABELS: Record<SymbolItem['cat'], string> = {
  metal: 'فلزات', crypto: 'کریپتو', forex: 'فارکس', index: 'شاخص‌ها',
};
const CATEGORIES: SymbolItem['cat'][] = ['metal', 'crypto', 'forex', 'index'];

const DRAWINGS_STORAGE_KEY = 'navasan_chart_drawings_v2';

// =========================================================
// BUILD HTML
// =========================================================

const buildHTML = (isDark: boolean): string => {
  const bg = isDark ? '#0B0B0F' : '#FFFFFF';
  const panel = isDark ? '#131319' : '#F8FAFC';
  const card = isDark ? '#1A1A22' : '#FFFFFF';
  const hover = isDark ? '#26262E' : '#F1F5F9';
  const text = isDark ? '#E5E7EB' : '#0F172A';
  const muted = isDark ? '#71717A' : '#94A3B8';
  const grid = isDark ? '#18181F' : '#F1F5F9';
  const border = isDark ? '#26262E' : '#E2E8F0';
  const accent = '#2563EB';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover" />
<style>
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{width:100%;height:100%;overflow:hidden;background:${bg};color:${text};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;user-select:none;-webkit-user-select:none;touch-action:manipulation}

/* ====== TOP BAR ====== */
#topbar{position:absolute;top:0;left:0;right:0;height:32px;background:${panel};border-bottom:1px solid ${border};display:flex;align-items:center;padding:0 8px;gap:10px;font-size:11px;font-weight:700;color:${muted};z-index:60;overflow-x:auto;scrollbar-width:none}
#topbar::-webkit-scrollbar{display:none}
#topbar span{white-space:nowrap}
#topbar b{color:${text};font-weight:900}
#topbar .up{color:#16A34A}
#topbar .down{color:#DC2626}

/* ====== MAIN AREA ====== */
#main-area{position:absolute;top:32px;left:0;right:0;bottom:0}
#chart-panel{position:absolute;top:0;left:0;right:0;bottom:0;overflow:hidden}
#main-chart{width:100%;height:100%}
#overlay{position:absolute;top:0;left:0;right:0;bottom:0;pointer-events:none;z-index:10}

/* ====== LEFT TOOLBAR ====== */
#leftbar{position:absolute;top:32px;left:0;bottom:0;width:44px;background:${panel};border-right:1px solid ${border};z-index:50;overflow-y:auto;overflow-x:hidden;scrollbar-width:none;display:flex;flex-direction:column;padding:4px 0}
#leftbar::-webkit-scrollbar{display:none}
.tool-grp{display:flex;flex-direction:column;gap:2px;padding:2px 0;border-bottom:1px solid ${border}}
.tool-grp:last-child{border-bottom:none}
.tool-grp .grp-label{font-size:7px;color:${muted};text-align:center;padding:2px 0;font-weight:800;letter-spacing:0.5px}
.tool{width:44px;height:38px;background:transparent;border:none;color:${text};cursor:pointer;font-size:15px;font-weight:700;display:flex;align-items:center;justify-content:center;position:relative;font-family:inherit;transition:background .1s}
.tool:hover{background:${hover}}
.tool.on{background:${accent};color:#FFF}
.tool.on::after{content:'';position:absolute;left:0;top:4px;bottom:4px;width:2px;background:#FFF}
.tool.sub{font-size:12px;height:32px}

/* ====== CHART CONTAINER (right of leftbar) ====== */
#chart-root{position:absolute;top:32px;left:44px;right:0;bottom:0}
#chart-root.has-sub{overflow:hidden}

/* ====== SUB PANES ====== */
.sub-pane{position:absolute;left:0;right:0;height:90px;background:${bg};border-top:1px solid ${border};display:none;z-index:5}
.sub-pane.on{display:block}

/* ====== INDICATOR BAR ====== */
#ind-bar{position:absolute;bottom:0;left:0;right:0;height:28px;background:${panel};border-top:1px solid ${border};display:flex;align-items:center;padding:0 4px;gap:3px;z-index:55;overflow-x:auto;scrollbar-width:none}
#ind-bar::-webkit-scrollbar{display:none}
.ind{height:20px;padding:0 7px;background:transparent;border:1px solid ${border};color:${muted};border-radius:5px;font-size:9px;font-weight:800;font-family:inherit;white-space:nowrap;display:flex;align-items:center;gap:3px;cursor:pointer}
.ind .d{width:5px;height:5px;border-radius:50%}
.ind.on{background:${accent}22;border-color:${accent};color:${accent}}
.ind.add{padding:0 5px;color:${accent};border-style:dashed}

/* ====== BOTTOM BAR ====== */
#botbar{position:absolute;bottom:28px;left:0;right:0;height:26px;background:${panel};border-top:1px solid ${border};display:flex;align-items:center;padding:0 4px;gap:3px;z-index:55;overflow-x:auto;scrollbar-width:none}
#botbar::-webkit-scrollbar{display:none}
.tfb{height:18px;padding:0 6px;background:transparent;border:1px solid ${border};color:${muted};border-radius:4px;font-size:9px;font-weight:900;font-family:inherit;cursor:pointer;white-space:nowrap;transition:all .1s}
.tfb.on{background:${accent};border-color:${accent};color:#FFF}

/* ====== FLOATING FAB ====== */
#fab-draw{position:absolute;right:10px;bottom:60px;width:42px;height:42px;border-radius:50%;background:${accent};color:#FFF;border:none;font-size:18px;cursor:pointer;box-shadow:0 4px 14px ${accent}66;z-index:58;display:flex;align-items:center;justify-content:center;transition:transform .1s}
#fab-draw:active{transform:scale(.92)}
#fab-draw.on{background:#DC2626}

/* ====== DRAWER ====== */
#drawer{position:absolute;top:32px;right:0;bottom:54px;width:280px;background:${card};border-left:1px solid ${border};z-index:59;transform:translateX(100%);transition:transform .25s;overflow-y:auto;scrollbar-width:thin}
#drawer.on{transform:translateX(0)}
#drawer::-webkit-scrollbar{width:4px}
#drawer::-webkit-scrollbar-thumb{background:${border};border-radius:2px}
.dr-hd{padding:10px 12px;border-bottom:1px solid ${border};display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;background:${card};z-index:1}
.dr-hd h3{font-size:13px;font-weight:900}
.dr-hd button{background:transparent;border:none;color:${muted};font-size:18px;cursor:pointer;font-family:inherit;padding:0 4px}
.dr-grp{padding:8px 12px;border-bottom:1px solid ${border}}
.dr-grp h4{font-size:10px;font-weight:800;color:${muted};margin-bottom:6px;letter-spacing:.5px;text-transform:uppercase}
.dr-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:4px}
.dr-btn{aspect-ratio:1;background:${panel};border:1px solid ${border};color:${text};cursor:pointer;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;font-family:inherit;transition:all .1s}
.dr-btn:hover{background:${hover};border-color:${accent}}
.dr-btn.on{background:${accent};border-color:${accent};color:#FFF}
.dr-btn .lbl{position:absolute;bottom:2px;font-size:6px;font-weight:800;opacity:.5;letter-spacing:.3px}
.dr-btn{position:relative}

/* ====== INDICATOR PICKER ====== */
#ind-picker{position:absolute;inset:0;background:#00000080;display:none;align-items:center;justify-content:center;z-index:65;padding:20px}
#ind-picker.on{display:flex}
.ind-modal{background:${card};border-radius:14px;max-width:400px;width:100%;max-height:80vh;overflow-y:auto;scrollbar-width:thin}
.ind-modal h3{padding:12px 14px;font-size:14px;font-weight:900;border-bottom:1px solid ${border};position:sticky;top:0;background:${card};display:flex;justify-content:space-between;align-items:center}
.ind-modal h3 button{background:transparent;border:none;color:${muted};font-size:18px;cursor:pointer;font-family:inherit}
.ind-cat{padding:10px 14px;border-bottom:1px solid ${border}}
.ind-cat h4{font-size:10px;font-weight:800;color:${muted};margin-bottom:6px;letter-spacing:.5px}
.ind-item{display:flex;align-items:center;gap:8px;padding:8px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700}
.ind-item:hover{background:${hover}}
.ind-item .plus{width:20px;height:20px;border-radius:4px;background:${accent}22;color:${accent};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900}

/* ====== HINT ====== */
#hint{position:absolute;top:40px;left:50%;transform:translateX(-50%);background:${accent}EE;color:#FFF;padding:6px 14px;border-radius:8px;font-size:11px;font-weight:800;z-index:57;display:none;white-space:nowrap;box-shadow:0 4px 14px ${accent}60;max-width:85%;overflow:hidden;text-overflow:ellipsis}
#hint.on{display:block;animation:pop .2s}
@keyframes pop{from{opacity:0;transform:translate(-50%,-6px)}to{opacity:1;transform:translate(-50%,0)}}

/* ====== MEASURE ====== */
#measure{position:absolute;background:${accent}EE;color:#FFF;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:900;z-index:57;display:none;pointer-events:none;white-space:nowrap}
#measure.on{display:block}

/* ====== LEGEND ====== */
#legend{position:absolute;top:38px;left:50px;background:${card}DD;backdrop-filter:blur(6px);padding:6px 10px;border-radius:8px;font-size:10px;font-weight:700;z-index:15;display:none;border:1px solid ${border};min-width:140px}
#legend.on{display:block}
#legend .row{display:flex;align-items:center;gap:6px;padding:2px 0}
#legend .dot{width:8px;height:8px;border-radius:50%}
#legend .v{margin-left:auto;font-weight:900;color:${text}}

/* ====== SETTINGS ====== */
#settings{position:absolute;inset:0;background:#00000080;display:none;align-items:center;justify-content:center;z-index:70;padding:20px}
#settings.on{display:flex}
.s-modal{background:${card};border-radius:14px;max-width:380px;width:100%;max-height:80vh;overflow-y:auto}
.s-modal h3{padding:12px 14px;font-size:14px;font-weight:900;border-bottom:1px solid ${border};position:sticky;top:0;background:${card};display:flex;justify-content:space-between;align-items:center}
.s-modal h3 button{background:transparent;border:none;color:${muted};font-size:18px;cursor:pointer;font-family:inherit}
.s-body{padding:14px;display:flex;flex-direction:column;gap:12px}
.s-row{display:flex;flex-direction:column;gap:4px}
.s-row label{font-size:11px;font-weight:800;color:${muted}}
.s-row input,.s-row select{padding:8px 10px;background:${panel};border:1px solid ${border};border-radius:8px;color:${text};font-size:12px;font-weight:700;font-family:inherit}
.s-actions{display:flex;gap:8px;margin-top:8px}
.s-actions button{flex:1;padding:10px;border-radius:8px;border:none;font-size:12px;font-weight:900;font-family:inherit;cursor:pointer}
.s-actions .save{background:${accent};color:#FFF}
.s-actions .del{background:#DC262622;color:#DC2626}

/* ====== LOADING ====== */
#load{position:absolute;inset:0;background:${bg};z-index:100;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;font-size:12px;font-weight:700;color:${muted}}
.sp{width:34px;height:34px;border:3px solid ${grid};border-top-color:${accent};border-radius:50%;animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

/* ====== TEMPLATE SAVE ====== */
#save-toast{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:${card};border:1px solid ${accent};border-radius:12px;padding:16px 20px;font-size:13px;font-weight:800;z-index:80;display:none;box-shadow:0 8px 24px #00000066;text-align:center}
#save-toast.on{display:block;animation:pop2 .3s}
@keyframes pop2{from{opacity:0;transform:translate(-50%,-50%) scale(.9)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
</style>
</head>
<body>

<div id="topbar">
  <span>O <b id="o">—</b></span>
  <span>H <b id="h">—</b></span>
  <span>L <b id="l">—</b></span>
  <span>C <b id="c">—</b></span>
  <span id="chg">—</span>
</div>

<div id="leftbar"></div>

<div id="chart-root">
  <div id="chart-panel">
    <div id="main-chart"></div>
    <canvas id="overlay"></canvas>
  </div>
  <div class="sub-pane" id="pane-volume" data-pane="volume"></div>
  <div class="sub-pane" id="pane-rsi" data-pane="rsi"></div>
  <div class="sub-pane" id="pane-macd" data-pane="macd"></div>
  <div class="sub-pane" id="pane-stoch" data-pane="stoch"></div>
  <div class="sub-pane" id="pane-atr" data-pane="atr"></div>
  <div class="sub-pane" id="pane-adx" data-pane="adx"></div>
</div>

<div id="legend"></div>

<div id="ind-bar"></div>

<div id="botbar"></div>

<button id="fab-draw" title="ابزارها">✎</button>

<div id="drawer">
  <div class="dr-hd">
    <h3>ابزارها</h3>
    <button id="dr-close">✕</button>
  </div>
  <div id="dr-content"></div>
</div>

<div id="hint"></div>
<div id="measure"></div>

<div id="ind-picker"><div class="ind-modal" id="ind-modal"></div></div>
<div id="settings"><div class="s-modal" id="s-modal"></div></div>
<div id="save-toast"></div>

<div id="load">
  <div class="sp"></div>
  <div>راه‌اندازی چارت حرفه‌ای...</div>
</div>

<script src="https://unpkg.com/lightweight-charts@4.2.3/dist/lightweight-charts.standalone.production.js"></script>
<script>
'use strict';

// ====================================================
// CONFIG
// ====================================================
const COL = {
  up: '#16A34A', down: '#DC2626', accent: '#2563EB',
  text: '${text}', muted: '${muted}', bg: '${bg}', card: '${card}',
  border: '${border}', panel: '${panel}',
};

// ====================================================
// STATE
// ====================================================
let chart, candleSeries, overlay, ctx;
let panes = {};  // { paneName: { chart, series: {} } }
let candles = [];
let currentTF = '1h';
let chartType = 'candles';
let activeTool = 'cursor';
let drawings = [];
let drawingHistory = [[]];
let historyIdx = 0;
let drawingInProgress = null;
let isDrawing = false;
let dragging = null;
let dragOffset = null;
let selectedDrawing = null;
let paneOrder = ['volume', 'rsi', 'macd', 'stoch', 'atr', 'adx'];
let activePanes = ['volume'];
let indicators = new Map();  // key -> { name, params, series }
let hideDrawings = false;

// ====================================================
// TOOLS DEFINITION
// ====================================================
const TOOL_GROUPS = [
  { label: 'BASIC', tools: [
    { id: 'cursor', icon: '✛', title: 'کرسر' },
    { id: 'cross', icon: '✚', title: 'کراس' },
    { id: 'dot', icon: '•', title: 'نقطه' },
  ]},
  { label: 'LINES', tools: [
    { id: 'trend', icon: '╱', title: 'خط روند' },
    { id: 'ray', icon: '↗', title: 'شعاع' },
    { id: 'extline', icon: '⇿', title: 'خط گسترده' },
    { id: 'infoline', icon: 'ⓘ', title: 'خط اطلاعات' },
    { id: 'angle', icon: '∡', title: 'زاویه' },
  ]},
  { label: 'HORIZ', tools: [
    { id: 'hline', icon: '━', title: 'افقی' },
    { id: 'hray', icon: '➡', title: 'شعاع افقی' },
    { id: 'vline', icon: '┃', title: 'عمودی' },
    { id: 'crossline', icon: '╋', title: 'کراس‌لاین' },
  ]},
  { label: 'CHANNELS', tools: [
    { id: 'channel', icon: '∥', title: 'کانال موازی' },
    { id: 'dchannel', icon: '⟨⟩', title: 'کانال مجزا' },
    { id: 'flattop', icon: '⌐', title: 'فلت تاپ' },
  ]},
  { label: 'FIB', tools: [
    { id: 'fib', icon: '≋', title: 'فیبو ریتریس' },
    { id: 'fibext', icon: '⋮', title: 'فیبو اکستنشن' },
    { id: 'fibchan', icon: '⟊', title: 'فیبو کانال' },
    { id: 'fibtime', icon: '⊦', title: 'فیبو تایم' },
    { id: 'fibfan', icon: '⌒', title: 'فیبو فن' },
    { id: 'fibarc', icon: '◜', title: 'فیبو آرک' },
  ]},
  { label: 'PITCHFORK', tools: [
    { id: 'pitchfork', icon: '⩡', title: 'پیچ فورک' },
    { id: 'schiff', icon: '⩢', title: 'شیف' },
    { id: 'mschiff', icon: '⩣', title: 'شیف اصلاح‌شده' },
    { id: 'inside', icon: '⋀', title: 'اینساید' },
  ]},
  { label: 'SHAPES', tools: [
    { id: 'rect', icon: '▭', title: 'مستطیل' },
    { id: 'rrect', icon: '◪', title: 'مستطیل چرخیده' },
    { id: 'circle', icon: '◯', title: 'دایره' },
    { id: 'ellipse', icon: '⬭', title: 'بیضی' },
    { id: 'triangle', icon: '△', title: 'مثلث' },
    { id: 'arc', icon: '◜', title: 'کمان' },
  ]},
  { label: 'BRUSH', tools: [
    { id: 'brush', icon: '✎', title: 'قلم' },
    { id: 'marker', icon: '🖍', title: 'هایلایتر' },
  ]},
  { label: 'TEXT', tools: [
    { id: 'text', icon: 'T', title: 'متن' },
    { id: 'note', icon: '📝', title: 'یادداشت' },
    { id: 'label', icon: '🏷', title: 'برچسب قیمت' },
    { id: 'arrow', icon: '➤', title: 'فلش' },
    { id: 'marker2', icon: '⬆', title: 'نشانگر' },
  ]},
  { label: 'PREDICT', tools: [
    { id: 'long', icon: '▲', title: 'پوزیشن لانگ' },
    { id: 'short', icon: '▼', title: 'پوزیشن شورت' },
    { id: 'daterange', icon: '↔', title: 'بازه تاریخ' },
  ]},
  { label: 'PATTERNS', tools: [
    { id: 'xabcd', icon: 'X', title: 'XABCD' },
    { id: 'hs', icon: 'M', title: 'سر و شانه' },
    { id: 'elliott', icon: '⑤', title: 'الیوت' },
  ]},
  { label: 'MEASURE', tools: [
    { id: 'measure', icon: '📏', title: 'اندازه‌گیری' },
    { id: 'zoom', icon: '🔍', title: 'زوم' },
  ]},
];

// ====================================================
// INDICATORS
// ====================================================
const INDICATOR_DEFS = [
  { cat: 'میانگین متحرک', items: [
    { id: 'sma', name: 'SMA', params: { period: 20 } },
    { id: 'ema', name: 'EMA', params: { period: 20 } },
    { id: 'wma', name: 'WMA', params: { period: 20 } },
    { id: 'hma', name: 'HMA', params: { period: 20 } },
    { id: 'vwma', name: 'VWMA', params: { period: 20 } },
  ]},
  { cat: 'باندها', items: [
    { id: 'bb', name: 'Bollinger Bands', params: { period: 20, mult: 2 } },
    { id: 'keltner', name: 'Keltner Channel', params: { period: 20, mult: 2 } },
    { id: 'donchian', name: 'Donchian Channel', params: { period: 20 } },
  ]},
  { cat: 'روند', items: [
    { id: 'psar', name: 'Parabolic SAR', params: { step: 0.02, max: 0.2 } },
    { id: 'supertrend', name: 'Supertrend', params: { period: 10, mult: 3 } },
    { id: 'ichimoku', name: 'Ichimoku', params: {} },
  ]},
  { cat: 'مومنتوم', items: [
    { id: 'rsi', name: 'RSI', params: { period: 14 }, pane: 'rsi' },
    { id: 'stoch', name: 'Stochastic', params: { k: 14, d: 3, smooth: 3 }, pane: 'stoch' },
    { id: 'stochrsi', name: 'Stoch RSI', params: { period: 14 }, pane: 'rsi' },
    { id: 'macd', name: 'MACD', params: { fast: 12, slow: 26, signal: 9 }, pane: 'macd' },
    { id: 'cci', name: 'CCI', params: { period: 20 }, pane: 'rsi' },
    { id: 'willr', name: 'Williams %R', params: { period: 14 }, pane: 'rsi' },
    { id: 'mfi', name: 'MFI', params: { period: 14 }, pane: 'rsi' },
  ]},
  { cat: 'نوسان', items: [
    { id: 'atr', name: 'ATR', params: { period: 14 }, pane: 'atr' },
    { id: 'stdev', name: 'Std Dev', params: { period: 20 }, pane: 'atr' },
    { id: 'adx', name: 'ADX', params: { period: 14 }, pane: 'adx' },
  ]},
  { cat: 'حجم', items: [
    { id: 'volume', name: 'Volume', params: {}, pane: 'volume' },
    { id: 'obv', name: 'OBV', params: {}, pane: 'volume' },
    { id: 'vwap', name: 'VWAP', params: {} },
  ]},
  { cat: 'پیوت', items: [
    { id: 'pivot', name: 'Pivot Points', params: {} },
  ]},
];

// ====================================================
// INDICATOR MATH
// ====================================================
const Math2 = {
  sma(c, p) {
    const r = [];
    for (let i = 0; i < c.length; i++) {
      if (i < p - 1) continue;
      let s = 0;
      for (let j = 0; j < p; j++) s += c[i - j].close;
      r.push({ time: Math.floor(c[i].timestamp / 1000), value: s / p });
    }
    return r;
  },
  ema(c, p) {
    if (c.length < p) return [];
    const k = 2 / (p + 1), r = [];
    let e = 0;
    for (let i = 0; i < p; i++) e += c[i].close;
    e /= p;
    r.push({ time: Math.floor(c[p - 1].timestamp / 1000), value: e });
    for (let i = p; i < c.length; i++) {
      e = c[i].close * k + e * (1 - k);
      r.push({ time: Math.floor(c[i].timestamp / 1000), value: e });
    }
    return r;
  },
  wma(c, p) {
    const r = [], wsum = (p * (p + 1)) / 2;
    for (let i = 0; i < c.length; i++) {
      if (i < p - 1) continue;
      let s = 0;
      for (let j = 0; j < p; j++) s += c[i - j].close * (p - j);
      r.push({ time: Math.floor(c[i].timestamp / 1000), value: s / wsum });
    }
    return r;
  },
  hma(c, p) {
    const half = Math.floor(p / 2);
    const sqrtP = Math.floor(Math.sqrt(p));
    const wmaHalf = Math2.wma(c, half);
    const wmaFull = Math2.wma(c, p);
    const diff = [];
    const map = new Map();
    wmaHalf.forEach(x => map.set(x.time, x.value));
    wmaFull.forEach(x => { if (map.has(x.time)) diff.push({ time: x.time, value: 2 * map.get(x.time) - x.value }); });
    const wmaDiff = [];
    for (let i = 0; i < diff.length; i++) {
      if (i < sqrtP - 1) continue;
      let s = 0, wsum = 0;
      for (let j = 0; j < sqrtP; j++) { s += diff[i - j].value * (sqrtP - j); wsum += (sqrtP - j); }
      wmaDiff.push({ time: diff[i].time, value: s / wsum });
    }
    return wmaDiff;
  },
  vwma(c, p) {
    const r = [];
    for (let i = 0; i < c.length; i++) {
      if (i < p - 1) continue;
      let sv = 0, spv = 0;
      for (let j = 0; j < p; j++) { const v = c[i - j].volume || 1; sv += v; spv += c[i - j].close * v; }
      r.push({ time: Math.floor(c[i].timestamp / 1000), value: spv / sv });
    }
    return r;
  },
  bb(c, p, m) {
    const u = [], mid = [], l = [];
    for (let i = 0; i < c.length; i++) {
      if (i < p - 1) continue;
      let s = 0;
      for (let j = 0; j < p; j++) s += c[i - j].close;
      const sma = s / p;
      let v = 0;
      for (let j = 0; j < p; j++) v += Math.pow(c[i - j].close - sma, 2);
      const sd = Math.sqrt(v / p);
      const t = Math.floor(c[i].timestamp / 1000);
      u.push({ time: t, value: sma + sd * m });
      mid.push({ time: t, value: sma });
      l.push({ time: t, value: sma - sd * m });
    }
    return { upper: u, middle: mid, lower: l };
  },
  keltner(c, p, m) {
    const ema = Math2.ema(c, p);
    const atr = Math2.atr(c, p);
    const atrMap = new Map();
    atr.forEach(x => atrMap.set(x.time, x.value));
    const u = [], mid = [], l = [];
    ema.forEach(x => {
      const a = atrMap.get(x.time);
      if (a === undefined) return;
      u.push({ time: x.time, value: x.value + a * m });
      mid.push({ time: x.time, value: x.value });
      l.push({ time: x.time, value: x.value - a * m });
    });
    return { upper: u, middle: mid, lower: l };
  },
  donchian(c, p) {
    const u = [], mid = [], l = [];
    for (let i = 0; i < c.length; i++) {
      if (i < p - 1) continue;
      let hi = -Infinity, lo = Infinity;
      for (let j = 0; j < p; j++) {
        if (c[i - j].high > hi) hi = c[i - j].high;
        if (c[i - j].low < lo) lo = c[i - j].low;
      }
      const t = Math.floor(c[i].timestamp / 1000);
      u.push({ time: t, value: hi });
      mid.push({ time: t, value: (hi + lo) / 2 });
      l.push({ time: t, value: lo });
    }
    return { upper: u, middle: mid, lower: l };
  },
  atr(c, p) {
    if (c.length < p + 1) return [];
    const tr = [];
    for (let i = 1; i < c.length; i++) {
      tr.push(Math.max(c[i].high - c[i].low, Math.abs(c[i].high - c[i - 1].close), Math.abs(c[i].low - c[i - 1].close)));
    }
    const r = [];
    let a = 0;
    for (let i = 0; i < p; i++) a += tr[i];
    a /= p;
    r.push({ time: Math.floor(c[p].timestamp / 1000), value: a });
    for (let i = p; i < tr.length; i++) {
      a = (a * (p - 1) + tr[i]) / p;
      r.push({ time: Math.floor(c[i + 1].timestamp / 1000), value: a });
    }
    return r;
  },
  stdev(c, p) {
    const r = [];
    for (let i = 0; i < c.length; i++) {
      if (i < p - 1) continue;
      let s = 0;
      for (let j = 0; j < p; j++) s += c[i - j].close;
      const m = s / p;
      let v = 0;
      for (let j = 0; j < p; j++) v += Math.pow(c[i - j].close - m, 2);
      r.push({ time: Math.floor(c[i].timestamp / 1000), value: Math.sqrt(v / p) });
    }
    return r;
  },
  rsi(c, p) {
    if (c.length <= p) return [];
    const r = [];
    let ag = 0, al = 0;
    for (let i = 1; i <= p; i++) { const d = c[i].close - c[i - 1].close; if (d >= 0) ag += d; else al -= d; }
    ag /= p; al /= p;
    let rs = al === 0 ? 100 : ag / al;
    r.push({ time: Math.floor(c[p].timestamp / 1000), value: 100 - 100 / (1 + rs) });
    for (let i = p + 1; i < c.length; i++) {
      const d = c[i].close - c[i - 1].close;
      const g = d > 0 ? d : 0, lo = d < 0 ? -d : 0;
      ag = (ag * (p - 1) + g) / p;
      al = (al * (p - 1) + lo) / p;
      rs = al === 0 ? 100 : ag / al;
      r.push({ time: Math.floor(c[i].timestamp / 1000), value: 100 - 100 / (1 + rs) });
    }
    return r;
  },
  macd(c, f, s, sig) {
    const ef = Math2.ema(c, f), es = Math2.ema(c, s);
    const m = new Map(); es.forEach(e => m.set(e.time, e.value));
    const macd = [];
    ef.forEach(e => { if (m.has(e.time)) macd.push({ time: e.time, value: e.value - m.get(e.time) }); });
    if (!macd.length) return { macd: [], signal: [], hist: [] };
    const k = 2 / (sig + 1);
    let sg = 0;
    for (let i = 0; i < Math.min(sig, macd.length); i++) sg += macd[i].value;
    sg /= sig;
    const sl = [], hl = [];
    for (let i = sig - 1; i < macd.length; i++) {
      if (i === sig - 1) sl.push({ time: macd[i].time, value: sg });
      else { sg = macd[i].value * k + sg * (1 - k); sl.push({ time: macd[i].time, value: sg }); }
      const h = macd[i].value - sg;
      hl.push({ time: macd[i].time, value: h, color: h >= 0 ? '#16A34A80' : '#DC262680' });
    }
    return { macd, signal: sl, hist: hl };
  },
  stoch(c, k, d, smooth) {
    const kv = [];
    for (let i = 0; i < c.length; i++) {
      if (i < k - 1) continue;
      let hi = -Infinity, lo = Infinity;
      for (let j = 0; j < k; j++) {
        if (c[i - j].high > hi) hi = c[i - j].high;
        if (c[i - j].low < lo) lo = c[i - j].low;
      }
      const kVal = hi === lo ? 50 : ((c[i].close - lo) / (hi - lo)) * 100;
      kv.push({ time: Math.floor(c[i].timestamp / 1000), value: kVal });
    }
    // Smooth K
    const kSm = [];
    for (let i = 0; i < kv.length; i++) {
      if (i < smooth - 1) continue;
      let s = 0;
      for (let j = 0; j < smooth; j++) s += kv[i - j].value;
      kSm.push({ time: kv[i].time, value: s / smooth });
    }
    // D
    const dV = [];
    for (let i = 0; i < kSm.length; i++) {
      if (i < d - 1) continue;
      let s = 0;
      for (let j = 0; j < d; j++) s += kSm[i - j].value;
      dV.push({ time: kSm[i].time, value: s / d });
    }
    return { k: kSm, d: dV };
  },
  cci(c, p) {
    const r = [];
    for (let i = 0; i < c.length; i++) {
      if (i < p - 1) continue;
      let sum = 0;
      for (let j = 0; j < p; j++) sum += (c[i - j].high + c[i - j].low + c[i - j].close) / 3;
      const tp = sum / p;
      let md = 0;
      for (let j = 0; j < p; j++) md += Math.abs((c[i - j].high + c[i - j].low + c[i - j].close) / 3 - tp);
      md /= p;
      const cci = md === 0 ? 0 : ((c[i].high + c[i].low + c[i].close) / 3 - tp) / (0.015 * md);
      r.push({ time: Math.floor(c[i].timestamp / 1000), value: cci });
    }
    return r;
  },
  willr(c, p) {
    const r = [];
    for (let i = 0; i < c.length; i++) {
      if (i < p - 1) continue;
      let hi = -Infinity, lo = Infinity;
      for (let j = 0; j < p; j++) {
        if (c[i - j].high > hi) hi = c[i - j].high;
        if (c[i - j].low < lo) lo = c[i - j].low;
      }
      r.push({ time: Math.floor(c[i].timestamp / 1000), value: hi === lo ? -50 : ((hi - c[i].close) / (hi - lo)) * -100 });
    }
    return r;
  },
  mfi(c, p) {
    const r = [];
    for (let i = 0; i < c.length; i++) {
      if (i < p) continue;
      let pos = 0, neg = 0;
      for (let j = 0; j < p; j++) {
        const tp = (c[i - j].high + c[i - j].low + c[i - j].close) / 3;
        const tpP = (c[i - j - 1].high + c[i - j - 1].low + c[i - j - 1].close) / 3;
        const mf = tp * (c[i - j].volume || 1);
        if (tp > tpP) pos += mf;
        else if (tp < tpP) neg += mf;
      }
      const ratio = neg === 0 ? 100 : pos / neg;
      r.push({ time: Math.floor(c[i].timestamp / 1000), value: 100 - 100 / (1 + ratio) });
    }
    return r;
  },
  obv(c) {
    const r = [];
    let o = 0;
    r.push({ time: Math.floor(c[0].timestamp / 1000), value: 0 });
    for (let i = 1; i < c.length; i++) {
      o += c[i].close > c[i - 1].close ? (c[i].volume || 0) : c[i].close < c[i - 1].close ? -(c[i].volume || 0) : 0;
      r.push({ time: Math.floor(c[i].timestamp / 1000), value: o });
    }
    return r;
  },
  vwap(c) {
    const r = [];
    let spv = 0, sv = 0;
    let currentDay = null;
    c.forEach(x => {
      const d = new Date(x.timestamp).toDateString();
      if (d !== currentDay) { currentDay = d; spv = 0; sv = 0; }
      const tp = (x.high + x.low + x.close) / 3;
      const v = x.volume || 1;
      spv += tp * v;
      sv += v;
      r.push({ time: Math.floor(x.timestamp / 1000), value: spv / sv });
    });
    return r;
  },
  psar(c, step, max) {
    const r = [];
    let up = true, af = step, ep = c[0].low, sar = c[0].high;
    for (let i = 1; i < c.length; i++) {
      const prev = sar;
      sar = prev + af * (ep - prev);
      if (up) {
        if (c[i].low < sar) { up = false; sar = ep; ep = c[i].low; af = step; }
        else { if (c[i].high > ep) { ep = c[i].high; af = Math.min(af + step, max); } }
      } else {
        if (c[i].high > sar) { up = true; sar = ep; ep = c[i].high; af = step; }
        else { if (c[i].low < ep) { ep = c[i].low; af = Math.min(af + step, max); } }
      }
      r.push({ time: Math.floor(c[i].timestamp / 1000), value: sar });
    }
    return r;
  },
  supertrend(c, p, m) {
    const atr = Math2.atr(c, p);
    const atrMap = new Map();
    atr.forEach(x => atrMap.set(x.time, x.value));
    const r = [];
    let prevST = null, prevDir = 1;
    c.forEach((x, i) => {
      const t = Math.floor(x.timestamp / 1000);
      const a = atrMap.get(t);
      if (a === undefined) return;
      const hl2 = (x.high + x.low) / 2;
      const up = hl2 - m * a;
      const dn = hl2 + m * a;
      let st, dir;
      if (prevST === null) { st = up; dir = 1; }
      else {
        if (prevDir === 1) { st = x.close > prevST ? Math.max(up, prevST) : dn; dir = x.close > prevST ? 1 : -1; }
        else { st = x.close < prevST ? Math.min(dn, prevST) : up; dir = x.close < prevST ? -1 : 1; }
      }
      r.push({ time: t, value: st, color: dir === 1 ? '#16A34A' : '#DC2626' });
      prevST = st; prevDir = dir;
    });
    return r;
  },
  ichimoku(c) {
    const hiLo = (n) => {
      const r = [];
      for (let i = 0; i < c.length; i++) {
        if (i < n - 1) continue;
        let hi = -Infinity, lo = Infinity;
        for (let j = 0; j < n; j++) {
          if (c[i - j].high > hi) hi = c[i - j].high;
          if (c[i - j].low < lo) lo = c[i - j].low;
        }
        r.push({ time: Math.floor(c[i].timestamp / 1000), value: (hi + lo) / 2 });
      }
      return r;
    };
    const tenkan = hiLo(9);
    const kijun = hiLo(26);
    const senkouA = [];
    const km = new Map(); kijun.forEach(x => km.set(x.time, x.value));
    tenkan.forEach(x => {
      if (km.has(x.time)) senkouA.push({ time: x.time, value: (x.value + km.get(x.time)) / 2 });
    });
    const senkouB = hiLo(52);
    const chikou = c.map((x, i) => ({ time: Math.floor(x.timestamp / 1000), value: x.close })).slice(0, -26).map(x => ({ time: x.time + 26 * 86400, value: x.value }));
    return { tenkan, kijun, senkouA, senkouB, chikou };
  },
  adx(c, p) {
    if (c.length < p * 2) return { adx: [], pdi: [], ndi: [] };
    const tr = [], pdm = [], ndm = [];
    for (let i = 1; i < c.length; i++) {
      const up = c[i].high - c[i - 1].high;
      const dn = c[i - 1].low - c[i].low;
      pdm.push(up > dn && up > 0 ? up : 0);
      ndm.push(dn > up && dn > 0 ? dn : 0);
      tr.push(Math.max(c[i].high - c[i].low, Math.abs(c[i].high - c[i - 1].close), Math.abs(c[i].low - c[i - 1].close)));
    }
    let atr = 0, apdm = 0, andm = 0;
    for (let i = 0; i < p; i++) { atr += tr[i]; apdm += pdm[i]; andm += ndm[i]; }
    const adx = [], pdiArr = [], ndiArr = [];
    const dxArr = [];
    for (let i = p; i < tr.length; i++) {
      atr = atr - atr / p + tr[i];
      apdm = apdm - apdm / p + pdm[i];
      andm = andm - andm / p + ndm[i];
      const pdi = atr === 0 ? 0 : (apdm / atr) * 100;
      const ndi = atr === 0 ? 0 : (andm / atr) * 100;
      const dx = pdi + ndi === 0 ? 0 : Math.abs(pdi - ndi) / (pdi + ndi) * 100;
      pdiArr.push({ time: Math.floor(c[i + 1].timestamp / 1000), value: pdi });
      ndiArr.push({ time: Math.floor(c[i + 1].timestamp / 1000), value: ndi });
      dxArr.push(dx);
    }
    let adxV = 0;
    for (let i = 0; i < p && i < dxArr.length; i++) adxV += dxArr[i];
    adxV /= p;
    adx.push({ time: pdiArr[p]?.time, value: adxV });
    for (let i = p; i < dxArr.length; i++) {
      adxV = (adxV * (p - 1) + dxArr[i]) / p;
      adx.push({ time: pdiArr[i].time, value: adxV });
    }
    return { adx, pdi: pdiArr, ndi: ndiArr };
  },
  pivot(c) {
    const last = c[c.length - 1];
    const t = Math.floor(last.timestamp / 1000);
    const prevDay = c[Math.max(0, c.length - 2)];
    const hi = prevDay.high, lo = prevDay.low, cl = prevDay.close;
    const pp = (hi + lo + cl) / 3;
    return {
      levels: [
        { name: 'R3', value: hi + 2 * (pp - lo), color: '#DC2626' },
        { name: 'R2', value: hi + (pp - lo), color: '#F59E0B' },
        { name: 'R1', value: 2 * pp - lo, color: '#FBBF24' },
        { name: 'P', value: pp, color: '#2563EB' },
        { name: 'S1', value: 2 * pp - hi, color: '#A3E635' },
        { name: 'S2', value: lo - (hi - pp), color: '#16A34A' },
        { name: 'S3', value: lo - 2 * (hi - pp), color: '#0891B2' },
      ],
      time: t,
    };
  },
};

// ====================================================
// INIT
// ====================================================
function init() {
  try {
    document.getElementById('load').style.display = 'none';

    const panel = document.getElementById('chart-panel');
    const mainEl = document.getElementById('main-chart');
    overlay = document.getElementById('overlay');
    ctx = overlay.getContext('2d');

    chart = LightweightCharts.createChart(mainEl, {
      width: mainEl.clientWidth,
      height: mainEl.clientHeight,
      layout: { background: { type: 'solid', color: COL.bg }, textColor: COL.text, fontSize: 11 },
      grid: { vertLines: { color: COL.border }, horzLines: { color: COL.border } },
      rightPriceScale: { borderColor: COL.border, scaleMargins: { top: 0.08, bottom: 0.1 } },
      timeScale: { borderColor: COL.border, timeVisible: true, secondsVisible: false, rightOffset: 6, barSpacing: 6, minBarSpacing: 0.3 },
      crosshair: {
        mode: 0,
        vertLine: { color: '#2563EB66', width: 1, style: 3, labelBackgroundColor: COL.accent },
        horzLine: { color: '#2563EB66', width: 1, style: 3, labelBackgroundColor: COL.accent },
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
    });

    createMainSeries();
    setupSubPanes();
    setupToolbar();
    setupBotBar();
    setupIndicatorBar();
    setupDrawer();
    setupEvents();

    chart.subscribeCrosshairMove(handleCrosshair);
    chart.timeScale().subscribeVisibleLogicalRangeChange(syncPanes);

    new ResizeObserver(resizeAll).observe(panel);

    updateTopbar();
    resizeAll();

    notifyRN({ type: 'ready' });
  } catch (e) {
    console.error(e);
    document.getElementById('load').innerHTML = '<div style="color:#DC2626;font-size:12px;padding:20px;text-align:center">خطا: ' + e.message + '</div>';
  }
}

function createMainSeries() {
  // remove old candle
  if (candleSeries) try { chart.removeSeries(candleSeries); } catch(e) {}
  const o = { priceLineVisible: false, lastValueVisible: true };

  if (chartType === 'candles') {
    candleSeries = chart.addCandlestickSeries({ upColor: COL.up, downColor: COL.down, borderUpColor: COL.up, borderDownColor: COL.down, wickUpColor: COL.up, wickDownColor: COL.down, ...o });
  } else if (chartType === 'bars') {
    candleSeries = chart.addBarSeries({ upColor: COL.up, downColor: COL.down, ...o });
  } else if (chartType === 'line') {
    candleSeries = chart.addLineSeries({ color: COL.accent, lineWidth: 2, ...o });
  } else if (chartType === 'area') {
    candleSeries = chart.addAreaSeries({ topColor: COL.accent + '50', bottomColor: COL.accent + '05', lineColor: COL.accent, lineWidth: 2, ...o });
  } else if (chartType === 'baseline') {
    candleSeries = chart.addBaselineSeries({ baseValue: { type: 'price', price: candles[candles.length - 1]?.close || 0 }, topLineColor: COL.up, topFillColor1: COL.up + '40', topFillColor2: COL.up + '05', bottomLineColor: COL.down, bottomFillColor1: COL.down + '05', bottomFillColor2: COL.down + '40', lineWidth: 2, ...o });
  } else if (chartType === 'heikin') {
    candleSeries = chart.addCandlestickSeries({ upColor: COL.up, downColor: COL.down, borderUpColor: COL.up, borderDownColor: COL.down, wickUpColor: COL.up, wickDownColor: COL.down, ...o });
  }

  if (candles.length) applyCandles();
}

// ====================================================
// PANES
// ====================================================
function setupSubPanes() {
  paneOrder.forEach(name => {
    const el = document.getElementById('pane-' + name);
    if (!el) return;
    const c = LightweightCharts.createChart(el, {
      width: el.clientWidth, height: 90,
      layout: { background: { type: 'solid', color: COL.bg }, textColor: COL.muted, fontSize: 9 },
      grid: { vertLines: { color: COL.border }, horzLines: { color: COL.border } },
      rightPriceScale: { borderColor: COL.border },
      timeScale: { visible: false, borderColor: COL.border },
      handleScroll: false, handleScale: false,
    });
    panes[name] = { chart: c, series: {}, el };
  });
}

function getPane(name) {
  if (!panes[name]) {
    // create pane dynamically
    const chartRoot = document.getElementById('chart-root');
    const el = document.createElement('div');
    el.id = 'pane-' + name;
    el.className = 'sub-pane';
    el.dataset.pane = name;
    chartRoot.appendChild(el);
    const c = LightweightCharts.createChart(el, {
      width: el.clientWidth, height: 90,
      layout: { background: { type: 'solid', color: COL.bg }, textColor: COL.muted, fontSize: 9 },
      grid: { vertLines: { color: COL.border }, horzLines: { color: COL.border } },
      rightPriceScale: { borderColor: COL.border },
      timeScale: { visible: false, borderColor: COL.border },
      handleScroll: false, handleScale: false,
    });
    panes[name] = { chart: c, series: {}, el };
  }
  return panes[name];
}

function updatePaneLayout() {
  let bottom = 0;
  const sortedPanes = paneOrder.filter(n => activePanes.includes(n));
  // Reverse so first is bottom-most
  [...sortedPanes].reverse().forEach(name => {
    const p = panes[name];
    if (!p) return;
    p.el.style.bottom = bottom + 'px';
    bottom += 90;
    p.el.classList.add('on');
    p.chart.applyOptions({ width: p.el.clientWidth });
  });
  paneOrder.filter(n => !activePanes.includes(n)).forEach(name => {
    const p = panes[name];
    if (!p) return;
    p.el.classList.remove('on');
  });

  // Adjust main chart
  const chartPanel = document.getElementById('chart-panel');
  chartPanel.style.bottom = bottom + 'px';
  if (chart) chart.applyOptions({ width: chartPanel.clientWidth, height: chartPanel.clientHeight });
  panes[Object.keys(panes)[0]] && Object.values(panes).forEach(p => p.chart.applyOptions({ width: p.el.clientWidth }));
  resizeAll();
}

function syncPanes() {
  const range = chart.timeScale().getVisibleLogicalRange();
  if (!range) return;
  Object.values(panes).forEach(p => {
    if (p && p.chart) p.chart.timeScale().setVisibleLogicalRange(range);
  });
}

function handleCrosshair(param) {
  updateTopbar(param);
  if (activePanes.length) {
    activePanes.forEach(name => {
      if (panes[name]) {
        const s = panes[name].series.main;
        if (s) panes[name].chart.setCrosshairPosition(0, param.time || 0, s);
      }
    });
  }
  updateLegend();
}

// ====================================================
// TOOLBAR
// ====================================================
function setupToolbar() {
  const bar = document.getElementById('leftbar');
  bar.innerHTML = '';
  TOOL_GROUPS.forEach(grp => {
    const g = document.createElement('div');
    g.className = 'tool-grp';
    const lbl = document.createElement('div');
    lbl.className = 'grp-label';
    lbl.textContent = grp.label;
    g.appendChild(lbl);
    grp.tools.forEach(t => {
      const b = document.createElement('button');
      b.className = 'tool' + (t.id === 'cursor' ? ' on' : '');
      b.id = 'tool-' + t.id;
      b.title = t.title;
      b.textContent = t.icon;
      b.dataset.tool = t.id;
      b.onclick = () => selectTool(t.id);
      g.appendChild(b);
    });
    bar.appendChild(g);
  });
}

function selectTool(id) {
  if (id === 'cursor' || id === 'cross' || id === 'dot') {
    activeTool = id;
  } else {
    activeTool = id;
  }
  document.querySelectorAll('#leftbar .tool').forEach(el => el.classList.toggle('on', el.dataset.tool === activeTool));
  document.querySelectorAll('#dr-content .dr-btn').forEach(el => el.classList.toggle('on', el.dataset.tool === activeTool));
  updateInteractionMode();
}

function updateInteractionMode() {
  const isCursor = activeTool === 'cursor' || activeTool === 'cross' || activeTool === 'dot' || activeTool === 'zoom';
  chart.applyOptions({
    handleScroll: { mouseWheel: isCursor, pressedMouseMove: isCursor, horzTouchDrag: isCursor, vertTouchDrag: false },
    handleScale: { axisPressedMouseMove: isCursor, mouseWheel: isCursor, pinch: isCursor },
  });
  if (!isCursor) {
    const hints = {
      trend: 'خط روند: بکش', ray: 'شعاع: بکش', extline: 'خط گسترده: بکش', infoline: 'خط اطلاعات: بکش',
      angle: 'زاویه: بکش', hline: 'افقی: یه نقطه بزن', hray: 'شعاع افقی: یه نقطه بزن',
      vline: 'عمودی: یه نقطه بزن', crossline: 'کراس‌لاین: یه نقطه بزن',
      channel: 'کانال موازی: بکش', dchannel: 'کانال مجزا: ۲ بکش', flattop: 'فلت تاپ: بکش',
      fib: 'فیبو: از بالا به پایین بکش', fibext: 'فیبو Extension: ۳ نقطه',
      fibchan: 'فیبو کانال: ۲ بکش', fibtime: 'فیبو تایم: بکش',
      fibfan: 'فیبو فن: بکش', fibarc: 'فیبو آرک: بکش',
      pitchfork: 'پیچ فورک: ۳ نقطه', schiff: 'شیف: ۳ نقطه',
      mschiff: 'شیف اصلاح‌شده: ۳ نقطه', inside: 'اینساید: ۳ نقطه',
      rect: 'مستطیل: بکش', rrect: 'مستطیل چرخیده: بکش',
      circle: 'دایره: بکش', ellipse: 'بیضی: بکش', triangle: 'مثلث: بکش', arc: 'کمان: بکش',
      brush: 'قلم: بکش', marker: 'هایلایتر: بکش',
      text: 'متن: یه نقطه بزن', note: 'یادداشت: یه نقطه بزن',
      label: 'برچسب: یه نقطه بزن', arrow: 'فلش: بکش', marker2: 'نشانگر: یه نقطه بزن',
      long: 'لانگ: بکش', short: 'شورت: بکش', daterange: 'بازه تاریخ: بکش',
      xabcd: 'XABCD: ۵ نقطه', hs: 'سر و شانه: ۵ نقطه', elliott: 'الیوت: ۶ نقطه',
      measure: 'اندازه‌گیری: بکش',
    };
    showHint(hints[activeTool] || '');
  } else {
    hideHint();
  }
  document.getElementById('chart-panel').style.cursor = isCursor ? 'default' : 'crosshair';
}

// ====================================================
// BOTTOM BAR
// ====================================================
function setupBotBar() {
  const bar = document.getElementById('botbar');
  bar.innerHTML = '';
  TIMEFRAMES.forEach(tf => {
    const b = document.createElement('button');
    b.className = 'tfb' + (tf.id === currentTF ? ' on' : '');
    b.textContent = tf.label;
    b.onclick = () => changeTF(tf.id);
    bar.appendChild(b);
  });
  // Separator
  const sep = document.createElement('div');
  sep.style.cssText = 'width:1px;height:14px;background:' + COL.border + ';margin:0 2px;';
  bar.appendChild(sep);
  // Chart type icons
  [['candles', '🕯', 'کندل'], ['bars', '▮', 'میله'], ['line', '∿', 'خط'], ['area', '▨', 'ناحیه'], ['baseline', '⩗', 'Baseline'], ['heikin', '🕯', 'Heikin']].forEach(([id, ic, tt]) => {
    const b = document.createElement('button');
    b.className = 'tfb' + (id === chartType ? ' on' : '');
    b.dataset.ctype = id;
    b.textContent = ic;
    b.title = tt;
    b.onclick = () => {
      chartType = id;
      document.querySelectorAll('[data-ctype]').forEach(el => el.classList.toggle('on', el.dataset.ctype === id));
      createMainSeries();
    };
    bar.appendChild(b);
  });
  // Separator
  const sep2 = document.createElement('div');
  sep2.style.cssText = 'width:1px;height:14px;background:' + COL.border + ';margin:0 2px;';
  bar.appendChild(sep2);
  // Actions
  [['↶', 'undo', 'واگرد'], ['↷', 'redo', 'جلو'], ['👁', 'hide', 'مخفی'], ['🗑', 'clear', 'پاک'],
   ['⟲', 'reset', 'ریست'], ['⏭', 'last', 'آخرین'], ['📷', 'shot', 'اسکرین'], ['💾', 'save', 'ذخیره']].forEach(([ic, id, tt]) => {
    const b = document.createElement('button');
    b.className = 'tfb';
    b.textContent = ic;
    b.title = tt;
    b.onclick = () => action(id);
    bar.appendChild(b);
  });
}

function changeTF(tf) {
  currentTF = tf;
  document.querySelectorAll('#botbar .tfb').forEach((el, i) => {
    if (i < TIMEFRAMES.length) el.classList.toggle('on', TIMEFRAMES[i].id === tf);
  });
  notifyRN({ type: 'change-timeframe', timeframe: tf });
}

function action(id) {
  if (id === 'undo') undo();
  else if (id === 'redo') redo();
  else if (id === 'clear') clearAll();
  else if (id === 'hide') { hideDrawings = !hideDrawings; redraw(); showHint(hideDrawings ? 'ترسیمات مخفی' : 'ترسیمات نمایش'); }
  else if (id === 'reset') chart.timeScale().fitContent();
  else if (id === 'last') chart.timeScale().scrollToRealTime();
  else if (id === 'shot') takeScreenshot();
  else if (id === 'save') saveDrawings();
}

// ====================================================
// INDICATOR BAR
// ====================================================
function setupIndicatorBar() {
  const bar = document.getElementById('ind-bar');
  bar.innerHTML = '';
  activePanes.forEach(name => {
    addIndicatorChip(name);
  });
  const add = document.createElement('button');
  add.className = 'ind add';
  add.textContent = '+ اندیکاتور';
  add.onclick = openIndicatorPicker;
  bar.appendChild(add);
}

function addIndicatorChip(name) {
  const bar = document.getElementById('ind-bar');
  const add = bar.querySelector('.ind.add');
  const b = document.createElement('button');
  b.className = 'ind on';
  b.dataset.ind = name;
  b.innerHTML = '<span class="d" style="background:' + (name === 'rsi' ? '#7C3AED' : name === 'macd' ? '#2563EB' : name === 'volume' ? '#0891B2' : name === 'stoch' ? '#F59E0B' : name === 'atr' ? '#16A34A' : '#DB2777') + '"></span>' + name.toUpperCase();
  b.onclick = () => removeIndicator(name);
  bar.insertBefore(b, add);
}

function removeIndicator(name) {
  if (!activePanes.includes(name)) return;
  activePanes = activePanes.filter(n => n !== name);
  const chip = document.querySelector('[data-ind="' + name + '"]');
  if (chip) chip.remove();
  // Clear pane series
  if (panes[name]) {
    Object.values(panes[name].series).forEach(s => { try { panes[name].chart.removeSeries(s); } catch(e) {} });
    panes[name].series = {};
  }
  updatePaneLayout();
}

function openIndicatorPicker() {
  const picker = document.getElementById('ind-picker');
  const modal = document.getElementById('ind-modal');
  let html = '<h3>افزودن اندیکاتور <button onclick="closeIndPicker()">✕</button></h3>';
  INDICATOR_DEFS.forEach(cat => {
    html += '<div class="ind-cat"><h4>' + cat.cat + '</h4>';
    cat.items.forEach(it => {
      html += '<div class="ind-item" onclick="addIndicator(\'' + it.id + '\')"><span class="plus">+</span>' + it.name + '</div>';
    });
    html += '</div>';
  });
  modal.innerHTML = html;
  picker.classList.add('on');
}

window.closeIndPicker = function() { document.getElementById('ind-picker').classList.remove('on'); };

window.addIndicator = function(id) {
  closeIndPicker();
  const def = INDICATOR_DEFS.flatMap(c => c.items).find(i => i.id === id);
  if (!def) return;

  if (def.pane) {
    // Sub-pane indicator
    if (!activePanes.includes(def.pane)) {
      activePanes.push(def.pane);
      addIndicatorChip(def.pane);
      updatePaneLayout();
    }
    renderPaneIndicator(def.pane, def);
  } else {
    // Main chart indicator
    renderMainIndicator(id, def.params);
  }
  showHint(def.name + ' اضافه شد');
};

function renderPaneIndicator(paneName, def) {
  const p = getPane(paneName);
  if (!p || !candles.length) return;

  // Clear existing
  Object.values(p.series).forEach(s => { try { p.chart.removeSeries(s); } catch(e) {} });
  p.series = {};

  if (def.id === 'volume') {
    p.series.main = p.chart.addHistogramSeries({ color: '#2563EB40', priceFormat: { type: 'volume' }, lastValueVisible: false });
    p.series.main.setData(candles.map(c => ({ time: Math.floor(c.timestamp / 1000), value: c.volume || 0, color: c.close >= c.open ? COL.up + '60' : COL.down + '60' })));
  } else if (def.id === 'rsi' || def.id === 'stochrsi' || def.id === 'cci' || def.id === 'willr' || def.id === 'mfi') {
    const period = def.params.period || 14;
    let data;
    if (def.id === 'rsi') data = Math2.rsi(candles, period);
    else if (def.id === 'stochrsi') { const r = Math2.rsi(candles, period); const mx = Math.max(...r.map(x => x.value)), mn = Math.min(...r.map(x => x.value)); data = r.map(x => ({ time: x.time, value: mx === mn ? 50 : ((x.value - mn) / (mx - mn)) * 100 })); }
    else if (def.id === 'cci') data = Math2.cci(candles, period);
    else if (def.id === 'willr') data = Math2.willr(candles, period);
    else if (def.id === 'mfi') data = Math2.mfi(candles, period);
    p.series.main = p.chart.addLineSeries({ color: '#7C3AED', lineWidth: 2, priceLineVisible: false });
    p.series.main.setData(data);
  } else if (def.id === 'macd') {
    const { fast, slow, signal } = def.params;
    const mc = Math2.macd(candles, fast, slow, signal);
    p.series.hist = p.chart.addHistogramSeries({ priceLineVisible: false, lastValueVisible: false });
    p.series.hist.setData(mc.hist);
    p.series.main = p.chart.addLineSeries({ color: '#2563EB', lineWidth: 2, priceLineVisible: false });
    p.series.main.setData(mc.macd);
    p.series.signal = p.chart.addLineSeries({ color: '#F59E0B', lineWidth: 2, priceLineVisible: false });
    p.series.signal.setData(mc.signal);
  } else if (def.id === 'stoch') {
    const { k, d, smooth } = def.params;
    const st = Math2.stoch(candles, k, d, smooth);
    p.series.main = p.chart.addLineSeries({ color: '#2563EB', lineWidth: 2, priceLineVisible: false });
    p.series.main.setData(st.k);
    p.series.d = p.chart.addLineSeries({ color: '#F59E0B', lineWidth: 2, priceLineVisible: false });
    p.series.d.setData(st.d);
  } else if (def.id === 'atr') {
    p.series.main = p.chart.addLineSeries({ color: '#16A34A', lineWidth: 2, priceLineVisible: false });
    p.series.main.setData(Math2.atr(candles, def.params.period || 14));
  } else if (def.id === 'stdev') {
    p.series.main = p.chart.addLineSeries({ color: '#DB2777', lineWidth: 2, priceLineVisible: false });
    p.series.main.setData(Math2.stdev(candles, def.params.period || 20));
  } else if (def.id === 'adx') {
    const { period } = def.params;
    const ad = Math2.adx(candles, period);
    p.series.main = p.chart.addLineSeries({ color: '#DB2777', lineWidth: 2, priceLineVisible: false });
    p.series.main.setData(ad.adx);
    p.series.pdi = p.chart.addLineSeries({ color: '#16A34A', lineWidth: 1, priceLineVisible: false });
    p.series.pdi.setData(ad.pdi);
    p.series.ndi = p.chart.addLineSeries({ color: '#DC2626', lineWidth: 1, priceLineVisible: false });
    p.series.ndi.setData(ad.ndi);
  } else if (def.id === 'obv') {
    p.series.main = p.chart.addLineSeries({ color: '#0891B2', lineWidth: 2, priceLineVisible: false });
    p.series.main.setData(Math2.obv(candles));
  }

  p.el.style.display = 'block';
}

function renderMainIndicator(id, params) {
  if (!candleSeries || !candles.length) return;
  const key = id + JSON.stringify(params);

  if (indicators.has(key)) {
    // Remove
    const entry = indicators.get(key);
    entry.series.forEach(s => { try { chart.removeSeries(s); } catch(e) {} });
    indicators.delete(key);
    return;
  }

  const lineOpts = { priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false };
  let series = [];

  try {
    if (id === 'sma') {
      const s = chart.addLineSeries({ color: '#F59E0B', lineWidth: 2, ...lineOpts });
      s.setData(Math2.sma(candles, params.period));
      series.push(s);
    } else if (id === 'ema') {
      const s = chart.addLineSeries({ color: '#7C3AED', lineWidth: 2, ...lineOpts });
      s.setData(Math2.ema(candles, params.period));
      series.push(s);
    } else if (id === 'wma') {
      const s = chart.addLineSeries({ color: '#0891B2', lineWidth: 2, ...lineOpts });
      s.setData(Math2.wma(candles, params.period));
      series.push(s);
    } else if (id === 'hma') {
      const s = chart.addLineSeries({ color: '#DB2777', lineWidth: 2, ...lineOpts });
      s.setData(Math2.hma(candles, params.period));
      series.push(s);
    } else if (id === 'vwma') {
      const s = chart.addLineSeries({ color: '#16A34A', lineWidth: 2, ...lineOpts });
      s.setData(Math2.vwma(candles, params.period));
      series.push(s);
    } else if (id === 'bb') {
      const bb = Math2.bb(candles, params.period, params.mult);
      const u = chart.addLineSeries({ color: '#0891B2', lineWidth: 1, lineStyle: 2, ...lineOpts });
      u.setData(bb.upper);
      const m = chart.addLineSeries({ color: '#0891B280', lineWidth: 1, ...lineOpts });
      m.setData(bb.middle);
      const l = chart.addLineSeries({ color: '#0891B2', lineWidth: 1, lineStyle: 2, ...lineOpts });
      l.setData(bb.lower);
      series.push(u, m, l);
    } else if (id === 'keltner') {
      const kc = Math2.keltner(candles, params.period, params.mult);
      const u = chart.addLineSeries({ color: '#F59E0B', lineWidth: 1, lineStyle: 2, ...lineOpts });
      u.setData(kc.upper);
      const m = chart.addLineSeries({ color: '#F59E0B80', lineWidth: 1, ...lineOpts });
      m.setData(kc.middle);
      const l = chart.addLineSeries({ color: '#F59E0B', lineWidth: 1, lineStyle: 2, ...lineOpts });
      l.setData(kc.lower);
      series.push(u, m, l);
    } else if (id === 'donchian') {
      const dc = Math2.donchian(candles, params.period);
      const u = chart.addLineSeries({ color: '#DC2626', lineWidth: 1, lineStyle: 2, ...lineOpts });
      u.setData(dc.upper);
      const l = chart.addLineSeries({ color: '#16A34A', lineWidth: 1, lineStyle: 2, ...lineOpts });
      l.setData(dc.lower);
      series.push(u, l);
    } else if (id === 'psar') {
      const s = chart.addLineSeries({ color: '#0891B2', lineWidth: 0, lineStyle: 0, pointMarkersVisible: true, pointMarkersRadius: 2, ...lineOpts });
      s.setData(Math2.psar(candles, params.step, params.max));
      series.push(s);
    } else if (id === 'supertrend') {
      const s = chart.addLineSeries({ color: '#16A34A', lineWidth: 2, ...lineOpts });
      s.setData(Math2.supertrend(candles, params.period, params.mult).map(x => ({ time: x.time, value: x.value, color: x.color })));
      series.push(s);
    } else if (id === 'ichimoku') {
      const ic = Math2.ichimoku(candles);
      const t = chart.addLineSeries({ color: '#2563EB', lineWidth: 1, ...lineOpts });
      t.setData(ic.tenkan);
      const k = chart.addLineSeries({ color: '#DC2626', lineWidth: 1, ...lineOpts });
      k.setData(ic.kijun);
      const sa = chart.addLineSeries({ color: '#16A34A80', lineWidth: 1, ...lineOpts });
      sa.setData(ic.senkouA);
      const sb = chart.addLineSeries({ color: '#F59E0B80', lineWidth: 1, ...lineOpts });
      sb.setData(ic.senkouB);
      series.push(t, k, sa, sb);
    } else if (id === 'vwap') {
      const s = chart.addLineSeries({ color: '#DB2777', lineWidth: 2, lineStyle: 2, ...lineOpts });
      s.setData(Math2.vwap(candles));
      series.push(s);
    } else if (id === 'pivot') {
      const pv = Math2.pivot(candles);
      pv.levels.forEach(lv => {
        const s = chart.addLineSeries({ color: lv.color, lineWidth: 1, lineStyle: 2, ...lineOpts });
        s.setData([{ time: pv.time, value: lv.value }]);
        series.push(s);
      });
    }

    indicators.set(key, { id, params, series });
    showHint((INDICATOR_DEFS.flatMap(c => c.items).find(i => i.id === id)?.name || id) + ' اضافه شد');
  } catch (e) {
    console.log('indicator error', e);
  }
}

// ====================================================
// DRAWER
// ====================================================
function setupDrawer() {
  const content = document.getElementById('dr-content');
  content.innerHTML = '';
  TOOL_GROUPS.forEach(grp => {
    const g = document.createElement('div');
    g.className = 'dr-grp';
    g.innerHTML = '<h4>' + grp.label + '</h4>';
    const grid = document.createElement('div');
    grid.className = 'dr-grid';
    grp.tools.forEach(t => {
      const b = document.createElement('button');
      b.className = 'dr-btn';
      b.dataset.tool = t.id;
      b.innerHTML = t.icon + '<span class="lbl">' + t.title + '</span>';
      b.onclick = () => { selectTool(t.id); };
      grid.appendChild(b);
    });
    g.appendChild(grid);
    content.appendChild(g);
  });
  document.getElementById('dr-close').onclick = () => closeDrawer();
  document.getElementById('fab-draw').onclick = () => toggleDrawer();
}

function toggleDrawer() {
  const d = document.getElementById('drawer');
  const f = document.getElementById('fab-draw');
  const on = d.classList.toggle('on');
  f.classList.toggle('on', on);
  if (on) {
    chart.applyOptions({ handleScroll: { mouseWheel: false, pressedMouseMove: false, horzTouchDrag: false, vertTouchDrag: false }, handleScale: { axisPressedMouseMove: false, mouseWheel: false, pinch: false } });
  } else {
    updateInteractionMode();
  }
}
function closeDrawer() {
  document.getElementById('drawer').classList.remove('on');
  document.getElementById('fab-draw').classList.remove('on');
  updateInteractionMode();
}

// ====================================================
// EVENTS
// ====================================================
function setupEvents() {
  const el = document.getElementById('chart-panel');
  el.addEventListener('mousedown', onDown);
  el.addEventListener('mousemove', onMove);
  el.addEventListener('mouseup', onUp);
  el.addEventListener('mouseleave', onUp);
  el.addEventListener('touchstart', onDown, { passive: false });
  el.addEventListener('touchmove', onMove, { passive: false });
  el.addEventListener('touchend', onUp);
  el.addEventListener('touchcancel', onUp);
  el.addEventListener('wheel', onWheel, { passive: false });
}

function onWheel(e) {
  if (!dragging && !drawingInProgress) return;
}

function evtPos(e) {
  const r = document.getElementById('chart-panel').getBoundingClientRect();
  let cx, cy;
  if (e.touches && e.touches.length) { cx = e.touches[0].clientX; cy = e.touches[0].clientY; }
  else if (e.changedTouches && e.changedTouches.length) { cx = e.changedTouches[0].clientX; cy = e.changedTouches[0].clientY; }
  else { cx = e.clientX; cy = e.clientY; }
  return { x: cx - r.left, y: cy - r.top };
}

function toChart(pos) {
  if (!chart || !candleSeries) return null;
  const time = chart.timeScale().coordinateToTime(pos.x);
  const price = candleSeries.coordinateToPrice(pos.y);
  if (time === null || price === null) return null;
  return { time, price };
}

function toScreen(pt) {
  if (!chart || !candleSeries || !pt) return null;
  const x = chart.timeScale().timeToCoordinate(pt.time);
  const y = candleSeries.priceToCoordinate(pt.price);
  if (x === null || y === null) return null;
  return { x, y };
}

function onDown(e) {
  if (activeTool === 'cursor' || activeTool === 'cross' || activeTool === 'dot') return;
  if (activeTool === 'zoom') return;
  e.preventDefault();
  const pt = toChart(evtPos(e));
  if (!pt) return;
  isDrawing = true;

  // Single-click tools
  if (['hline', 'hray', 'vline', 'crossline', 'text', 'note', 'label', 'marker2'].includes(activeTool)) {
    if (activeTool === 'text' || activeTool === 'note') {
      const txt = prompt('متن:', '');
      if (!txt) { isDrawing = false; return; }
      pushDraw({ tool: activeTool, pts: [pt], color: COL.accent, text: txt });
    } else {
      pushDraw({ tool: activeTool, pts: [pt], color: COL.accent });
    }
    isDrawing = false;
    return;
  }
  if (activeTool === 'pivot') {
    pushDraw({ tool: 'pivot', pts: [pt], color: COL.accent });
    isDrawing = false;
    return;
  }

  // Multi-point tools
  const neededPoints = { xabcd: 5, hs: 5, elliott: 6, dchannel: 2, fibext: 3, pitchfork: 3, schiff: 3, mschiff: 3, inside: 3 };
  const required = neededPoints[activeTool] || 2;

  drawingInProgress = { tool: activeTool, pts: [pt], color: COL.accent, required };
  redraw();
}

function onMove(e) {
  if (!isDrawing || !drawingInProgress) return;
  e.preventDefault();
  const pt = toChart(evtPos(e));
  if (!pt) return;

  const req = drawingInProgress.required || 2;
  if (drawingInProgress.pts.length < req) {
    // Update last point
    if (drawingInProgress.pts.length === 1) {
      drawingInProgress.pts.push(pt);
    } else {
      drawingInProgress.pts[drawingInProgress.pts.length - 1] = pt;
    }
  } else {
    drawingInProgress.pts[drawingInProgress.pts.length - 1] = pt;
  }
  redraw();
}

function onUp(e) {
  if (!isDrawing || !drawingInProgress) return;
  isDrawing = false;

  const req = drawingInProgress.required || 2;
  if (drawingInProgress.pts.length < req) {
    // Need more clicks - keep in progress (for multi-point)
    return;
  }

  pushDraw(drawingInProgress);
  drawingInProgress = null;
  document.getElementById('measure').classList.remove('on');
}

function pushDraw(d) {
  drawings.push(d);
  drawingHistory = drawingHistory.slice(0, historyIdx + 1);
  drawingHistory.push(JSON.parse(JSON.stringify(drawings)));
  historyIdx = drawingHistory.length - 1;
  redraw();
  notifyRN({ type: 'drawings-changed', count: drawings.length });
}

function undo() {
  if (historyIdx <= 0) return;
  historyIdx--;
  drawings = JSON.parse(JSON.stringify(drawingHistory[historyIdx]));
  redraw();
}
function redo() {
  if (historyIdx >= drawingHistory.length - 1) return;
  historyIdx++;
  drawings = JSON.parse(JSON.stringify(drawingHistory[historyIdx]));
  redraw();
}
function clearAll() {
  if (!drawings.length) return;
  if (!confirm('همه ترسیمات پاک شود؟')) return;
  drawings = [];
  drawingHistory = [[]];
  historyIdx = 0;
  redraw();
  notifyRN({ type: 'drawings-cleared' });
}
function saveDrawings() {
  notifyRN({ type: 'save-drawings', drawings });
  const t = document.getElementById('save-toast');
  t.textContent = 'ذخیره شد ✓';
  t.classList.add('on');
  setTimeout(() => t.classList.remove('on'), 1200);
}

// ====================================================
// DRAW
// ====================================================
function resizeAll() {
  const panel = document.getElementById('chart-panel');
  overlay.width = panel.clientWidth;
  overlay.height = panel.clientHeight;
  if (chart) chart.applyOptions({ width: panel.clientWidth, height: panel.clientHeight });
  Object.values(panes).forEach(p => { if (p) p.chart.applyOptions({ width: p.el.clientWidth }); });
  redraw();
}

function redraw() {
  if (!ctx) return;
  resizeOverlay();
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  if (hideDrawings) return;

  const all = drawingInProgress ? [...drawings, drawingInProgress] : drawings;
  all.forEach(d => drawOne(d));
}

function resizeOverlay() {
  const panel = document.getElementById('chart-panel');
  if (overlay.width !== panel.clientWidth || overlay.height !== panel.clientHeight) {
    overlay.width = panel.clientWidth;
    overlay.height = panel.clientHeight;
  }
}

function drawOne(d) {
  const screens = d.pts.map(toScreen);
  const valid = screens.every(s => s !== null);
  if (!valid) return;
  const tool = d.tool, c = d.color || COL.accent;

  ctx.strokeStyle = c;
  ctx.fillStyle = c;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (tool === 'trend' || tool === 'infoline') {
    line(screens[0], screens[1]);
    dots(screens);
  } else if (tool === 'ray') {
    ray(screens[0], screens[1]);
    dots(screens);
  } else if (tool === 'extline') {
    extendLine(screens[0], screens[1]);
  } else if (tool === 'angle') {
    line(screens[0], screens[1]);
    dots(screens);
    const ang = Math.atan2(screens[1].y - screens[0].y, screens[1].x - screens[0].x) * 180 / Math.PI;
    ctx.fillStyle = c;
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(ang.toFixed(1) + '°', screens[1].x + 8, screens[1].y - 4);
  } else if (tool === 'hline') {
    hline(screens[0]);
  } else if (tool === 'hray') {
    ctx.beginPath();
    ctx.moveTo(screens[0].x, screens[0].y);
    ctx.lineTo(overlay.width, screens[0].y);
    ctx.stroke();
    dots([screens[0]]);
  } else if (tool === 'vline') {
    ctx.beginPath();
    ctx.moveTo(screens[0].x, 0);
    ctx.lineTo(screens[0].x, overlay.height);
    ctx.stroke();
  } else if (tool === 'crossline') {
    hline(screens[0]);
    ctx.beginPath();
    ctx.moveTo(screens[0].x, 0);
    ctx.lineTo(screens[0].x, overlay.height);
    ctx.stroke();
  } else if (tool === 'channel' || tool === 'dchannel') {
    if (screens[2]) {
      // Channel with offset
      ctx.beginPath();
      ctx.moveTo(screens[0].x, screens[0].y);
      ctx.lineTo(screens[1].x, screens[1].y);
      ctx.lineTo(screens[2].x, screens[2].y);
      ctx.stroke();
      if (screens[3]) {
        ctx.beginPath();
        ctx.moveTo(screens[2].x, screens[2].y);
        ctx.lineTo(screens[3].x, screens[3].y);
        ctx.stroke();
      }
    } else {
      // Parallel
      line(screens[0], screens[1]);
      const dx = screens[1].x - screens[0].x;
      const dy = screens[1].y - screens[0].y;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(screens[0].x + dx * 0.5, screens[0].y + dy * 0.5);
      ctx.lineTo(screens[1].x + dx * 0.5, screens[1].y + dy * 0.5);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  } else if (tool === 'flattop') {
    line(screens[0], screens[1]);
    ctx.beginPath();
    ctx.moveTo(screens[0].x, screens[0].y);
    ctx.lineTo(screens[1].x, screens[0].y);
    ctx.stroke();
  } else if (tool === 'fib') {
    fibRetr(screens[0], screens[1], [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.272, 1.618]);
  } else if (tool === 'fibext') {
    if (screens[2]) fibExt(screens, [0, 0.618, 1, 1.272, 1.618, 2, 2.618]);
  } else if (tool === 'fibchan') {
    fibChannel(screens[0], screens[1]);
  } else if (tool === 'fibtime') {
    fibTime(screens[0], screens[1]);
  } else if (tool === 'fibfan') {
    fibFan(screens[0], screens[1]);
  } else if (tool === 'fibarc') {
    fibArc(screens[0], screens[1]);
  } else if (tool === 'pitchfork' || tool === 'schiff' || tool === 'mschiff' || tool === 'inside') {
    if (screens[2]) pitchfork(screens, tool);
  } else if (tool === 'rect') {
    rectShape(screens[0], screens[1]);
  } else if (tool === 'rrect') {
    rotatedRect(screens[0], screens[1]);
  } else if (tool === 'circle') {
    circleShape(screens[0], screens[1]);
  } else if (tool === 'ellipse') {
    ellipseShape(screens[0], screens[1]);
  } else if (tool === 'triangle') {
    triangleShape(screens[0], screens[1]);
  } else if (tool === 'arc') {
    arcShape(screens[0], screens[1]);
  } else if (tool === 'brush') {
    brushStroke(screens, c, 2, 1);
  } else if (tool === 'marker') {
    brushStroke(screens, c + '60', 14, 0.4);
  } else if (tool === 'text') {
    textAt(screens[0], d.text || '', c);
  } else if (tool === 'note') {
    noteAt(screens[0], d.text || '');
  } else if (tool === 'label') {
    priceLabel(screens[0], d.pts[0].price);
  } else if (tool === 'arrow') {
    arrowShape(screens[0], screens[1]);
  } else if (tool === 'marker2') {
    markerAt(screens[0], c);
  } else if (tool === 'long' || tool === 'short') {
    positionShape(screens[0], screens[1], tool === 'long', d.pts[0].price, d.pts[1].price);
  } else if (tool === 'daterange') {
    dateRange(screens[0], screens[1]);
  } else if (tool === 'xabcd' || tool === 'hs' || tool === 'elliott') {
    patternShape(screens, tool);
  } else if (tool === 'measure') {
    measureShape(screens[0], screens[1], d.pts[0].price, d.pts[1].price);
  } else if (tool === 'pivot') {
    // handled as indicator
  }
}

function line(a, b) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
function dots(pts) {
  const prev = ctx.fillStyle;
  pts.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#FFF';
    ctx.fill();
    ctx.strokeStyle = ctx.strokeStyle;
    ctx.lineWidth = 2;
    ctx.stroke();
  });
  ctx.fillStyle = prev;
}
function ray(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (!len) return;
  const sc = 3000 / len;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(a.x + dx * sc, a.y + dy * sc);
  ctx.stroke();
}
function extendLine(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (!len) return;
  const sc = 3000 / len;
  ctx.beginPath();
  ctx.moveTo(a.x - dx * sc, a.y - dy * sc);
  ctx.lineTo(b.x + dx * sc, b.y + dy * sc);
  ctx.stroke();
}
function hline(p) {
  ctx.setLineDash([8, 4]);
  ctx.beginPath();
  ctx.moveTo(0, p.y);
  ctx.lineTo(overlay.width, p.y);
  ctx.stroke();
  ctx.setLineDash([]);
}

function fibRetr(a, b, levels) {
  const colors = ['#EF4444', '#F97316', '#F59E0B', '#FBBF24', '#A3E635', '#16A34A', '#0891B2', '#7C3AED', '#DB2777', '#EC4899'];
  const x1 = Math.min(a.x, b.x), x2 = Math.max(a.x, b.x);
  levels.forEach((lv, i) => {
    const y = a.y + (b.y - a.y) * lv;
    ctx.strokeStyle = colors[i % colors.length];
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(x2 + 2, y - 8, 46, 16);
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText((lv * 100).toFixed(1) + '%', x2 + 6, y + 3);
  });
  ctx.strokeStyle = ctx.strokeStyle;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.setLineDash([]);
}

function fibExt(screens, levels) {
  const colors = ['#EF4444', '#F59E0B', '#16A34A', '#0891B2', '#7C3AED', '#DB2777', '#EC4899'];
  levels.forEach((lv, i) => {
    const y = screens[1].y + (screens[2].y - screens[1].y) * lv;
    ctx.strokeStyle = colors[i % colors.length];
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(screens[0].x, y);
    ctx.lineTo(overlay.width, y);
    ctx.stroke();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(overlay.width - 55, y - 8, 52, 16);
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText(lv.toFixed(3), overlay.width - 52, y + 3);
  });
}

function fibChannel(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const levels = [-0.5, 0, 0.5, 1, 1.5];
  levels.forEach(lv => {
    ctx.strokeStyle = lv === 0 ? '#F59E0B' : COL.accent;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(a.x + dx * lv, a.y + dy * lv);
    ctx.lineTo(b.x + dx * lv, b.y + dy * lv);
    ctx.stroke();
    ctx.setLineDash([]);
  });
}

function fibTime(a, b) {
  const dist = Math.abs(b.x - a.x);
  const fibs = [1, 1, 2, 3, 5, 8, 13, 21];
  let pos = b.x;
  const dir = b.x > a.x ? 1 : -1;
  fibs.forEach((f, i) => {
    pos += dist * dir / fibs[Math.max(0, i - 1)] * f * 0.1;
    ctx.strokeStyle = COL.accent;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, overlay.height);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = COL.accent;
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText(f, pos + 2, 12);
  });
}

function fibFan(a, b) {
  const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
  const colors = ['#EF4444', '#F97316', '#F59E0B', '#FBBF24', '#A3E635', '#16A34A', '#0891B2'];
  const baseAngle = Math.atan2(b.y - a.y, b.x - a.x);
  levels.forEach((lv, i) => {
    const targetAngle = (Math.PI / 2) * lv;
    const ang = baseAngle - Math.PI / 2 + targetAngle * 2;
    const sc = 2000;
    ctx.strokeStyle = colors[i];
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(a.x + Math.cos(ang) * sc, a.y + Math.sin(ang) * sc);
    ctx.stroke();
  });
}

function fibArc(a, b) {
  const radius = Math.abs(b.y - a.y);
  const levels = [0.236, 0.382, 0.5, 0.618, 0.786, 1];
  const colors = ['#EF4444', '#F97316', '#F59E0B', '#A3E635', '#16A34A', '#0891B2'];
  levels.forEach((lv, i) => {
    ctx.strokeStyle = colors[i];
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(a.x, a.y, radius * lv, 0, Math.PI, false);
    ctx.stroke();
  });
}

function pitchfork(screens, type) {
  const [a, b, c] = screens;
  let mid;
  if (type === 'schiff') mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  else if (type === 'mschiff') mid = { x: (a.x + b.x + c.x) / 3, y: (a.y + b.y + c.y) / 3 };
  else mid = { x: (b.x + c.x) / 2, y: (b.y + c.y) / 2 };

  const dx = mid.x - a.x, dy = mid.y - a.y;
  const sc = 2000 / Math.sqrt(dx * dx + dy * dy || 1);
  const end = { x: a.x + dx * sc, y: a.y + dy * sc };

  // Median line
  ctx.strokeStyle = COL.accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();

  // Parallel lines
  const dxb = b.x - mid.x, dyb = b.y - mid.y;
  const dxc = c.x - mid.x, dyc = c.y - mid.y;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.moveTo(b.x, b.y);
  ctx.lineTo(b.x + dx * sc, b.y + dy * sc);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(c.x, c.y);
  ctx.lineTo(c.x + dx * sc, c.y + dy * sc);
  ctx.stroke();
  ctx.globalAlpha = 1;
  dots(screens);
}

function rectShape(a, b) {
  const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
  const w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y);
  ctx.fillStyle = (ctx.strokeStyle as any) + '20';
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);
}
function rotatedRect(a, b) {
  const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
  const w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y);
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(ang);
  ctx.fillStyle = (ctx.strokeStyle as any) + '20';
  ctx.fillRect(-w/2, -h/2, w, h);
  ctx.strokeRect(-w/2, -h/2, w, h);
  ctx.restore();
}
function circleShape(a, b) {
  const r = Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
  ctx.beginPath();
  ctx.arc(a.x, a.y, r, 0, Math.PI * 2);
  ctx.fillStyle = (ctx.strokeStyle as any) + '20';
  ctx.fill();
  ctx.stroke();
}
function ellipseShape(a, b) {
  const rx = Math.abs(b.x - a.x);
  const ry = Math.abs(b.y - a.y);
  ctx.beginPath();
  ctx.ellipse(a.x, a.y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = (ctx.strokeStyle as any) + '20';
  ctx.fill();
  ctx.stroke();
}
function triangleShape(a, b) {
  const cx = (a.x + b.x) / 2;
  ctx.beginPath();
  ctx.moveTo(cx, Math.min(a.y, b.y));
  ctx.lineTo(a.x, Math.max(a.y, b.y));
  ctx.lineTo(b.x, Math.max(a.y, b.y));
  ctx.closePath();
  ctx.fillStyle = (ctx.strokeStyle as any) + '20';
  ctx.fill();
  ctx.stroke();
}
function arcShape(a, b) {
  const r = Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
  ctx.beginPath();
  ctx.arc(a.x, a.y, r, 0, Math.PI, false);
  ctx.stroke();
}
function brushStroke(screens, color, width, alpha) {
  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  screens.forEach((p, i) => { i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); });
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
}
function textAt(p, txt, color) {
  ctx.fillStyle = color;
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(txt, p.x, p.y);
}
function noteAt(p, txt) {
  ctx.font = 'bold 12px sans-serif';
  const w = ctx.measureText(txt).width + 20;
  ctx.fillStyle = '#FBBF24';
  ctx.fillRect(p.x, p.y - 28, w, 26);
  ctx.beginPath();
  ctx.moveTo(p.x, p.y - 2);
  ctx.lineTo(p.x + 8, p.y - 2);
  ctx.lineTo(p.x + 4, p.y + 4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.fillText(txt, p.x + 10, p.y - 10);
}
function priceLabel(p, price) {
  ctx.fillStyle = COL.accent;
  ctx.fillRect(p.x + 8, p.y - 10, 60, 20);
  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText(price.toFixed(price > 100 ? 2 : 4), p.x + 12, p.y + 4);
}
function arrowShape(a, b) {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  const sz = 12;
  ctx.beginPath();
  ctx.moveTo(b.x, b.y);
  ctx.lineTo(b.x - sz * Math.cos(ang - Math.PI / 6), b.y - sz * Math.sin(ang - Math.PI / 6));
  ctx.lineTo(b.x - sz * Math.cos(ang + Math.PI / 6), b.y - sz * Math.sin(ang + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}
function markerAt(p, c) {
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('★', p.x, p.y + 4);
  ctx.textAlign = 'left';
}
function positionShape(a, b, isLong, ePrice, tPrice) {
  const sY = isLong ? a.y + (a.y - b.y) * 0.5 : a.y - (b.y - a.y) * 0.5;
  const x1 = Math.min(a.x, b.x), x2 = Math.max(a.x, b.x);
  // Profit zone
  ctx.fillStyle = '#16A34A40';
  ctx.fillRect(x1, Math.min(a.y, b.y), x2 - x1, Math.abs(b.y - a.y));
  // Loss zone
  ctx.fillStyle = '#DC262640';
  ctx.fillRect(x1, Math.min(a.y, sY), x2 - x1, Math.abs(sY - a.y));
  // Entry line
  ctx.strokeStyle = '#2563EB';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x1, a.y);
  ctx.lineTo(x2, a.y);
  ctx.stroke();
  // Labels
  ctx.fillStyle = '#2563EB';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('Entry ' + ePrice.toFixed(2), x2 + 4, a.y + 4);
  ctx.fillStyle = '#16A34A';
  ctx.fillText('TP ' + tPrice.toFixed(2), x2 + 4, b.y + 4);
  ctx.fillStyle = '#DC2626';
  ctx.fillText('SL ' + (2 * ePrice - tPrice).toFixed(2), x2 + 4, sY + 4);
}
function dateRange(a, b) {
  const x1 = Math.min(a.x, b.x), x2 = Math.max(a.x, b.x);
  ctx.fillStyle = (ctx.strokeStyle as any) + '20';
  ctx.fillRect(x1, 0, x2 - x1, overlay.height);
  ctx.strokeStyle = ctx.strokeStyle;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(a.x, 0); ctx.lineTo(a.x, overlay.height);
  ctx.moveTo(b.x, 0); ctx.lineTo(b.x, overlay.height);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = ctx.strokeStyle;
  ctx.font = 'bold 11px sans-serif';
  const days = Math.round((b.x - a.x) / 6);
  ctx.fillText(days + ' کندل', x1 + 8, 20);
}
function patternShape(screens, type) {
  ctx.lineWidth = 2;
  ctx.beginPath();
  screens.forEach((p, i) => { i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); });
  ctx.stroke();
  const labels = type === 'xabcd' ? ['X', 'A', 'B', 'C', 'D'] : type === 'hs' ? ['LS', 'H1', 'H', 'H2', 'RS'] : ['0', '1', '2', '3', '4', '5'];
  ctx.fillStyle = COL.accent;
  ctx.font = 'bold 12px sans-serif';
  screens.forEach((p, i) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFF';
    ctx.fillText(labels[i] || i, p.x + 6, p.y - 6);
    ctx.fillStyle = COL.accent;
  });
}
function measureShape(a, b, pa, pb) {
  const pd = pb - pa;
  const pct = (pd / pa) * 100;
  const up = pd >= 0;
  const c = up ? '#16A34A' : '#DC2626';
  const x1 = Math.min(a.x, b.x), x2 = Math.max(a.x, b.x);
  const y1 = Math.min(a.y, b.y), y2 = Math.max(a.y, b.y);
  ctx.fillStyle = c + '25';
  ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
  ctx.strokeStyle = c;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.fillStyle = c;
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText((up ? '+' : '') + pd.toFixed(2) + ' (' + (up ? '+' : '') + pct.toFixed(2) + '%)', Math.min(x2 + 10, overlay.width - 200), y1 - 4);
}

// ====================================================
// HINT
// ====================================================
let hintTimer;
function showHint(t) {
  const h = document.getElementById('hint');
  h.textContent = t;
  h.classList.add('on');
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => h.classList.remove('on'), 2500);
}
function hideHint() { document.getElementById('hint').classList.remove('on'); }

// ====================================================
// LEGEND
// ====================================================
function updateLegend() {
  const el = document.getElementById('legend');
  const list = [];
  indicators.forEach((entry, key) => {
    if (entry.series[0]) {
      const d = entry.series[0].data();
      if (d.length) {
        const last = d[d.length - 1];
        list.push({ name: entry.id.toUpperCase(), value: last.value.toFixed(2), color: '#F59E0B' });
      }
    }
  });
  if (!list.length) { el.classList.remove('on'); return; }
  el.innerHTML = list.map(x => '<div class="row"><span class="dot" style="background:' + x.color + '"></span>' + x.name + '<span class="v">' + x.value + '</span></div>').join('');
  el.classList.add('on');
}

// ====================================================
// TOPBAR / OHLC
// ====================================================
function updateTopbar(param) {
  let o, h, l, c;
  if (!param || !param.time || !param.seriesData || !candleSeries || !param.seriesData.has(candleSeries)) {
    const last = candles[candles.length - 1];
    if (!last) return;
    o = last.open; h = last.high; l = last.low; c = last.close;
  } else {
    const d = param.seriesData.get(candleSeries);
    if (!d) return;
    o = d.open; h = d.high; l = d.low; c = d.close;
  }
  const dec = c > 100 ? 2 : c > 1 ? 3 : 5;
  document.getElementById('o').textContent = o.toFixed(dec);
  document.getElementById('h').textContent = h.toFixed(dec);
  document.getElementById('l').textContent = l.toFixed(dec);
  document.getElementById('c').textContent = c.toFixed(dec);
  const diff = c - o, pct = o !== 0 ? (diff / o) * 100 : 0;
  const chg = document.getElementById('chg');
  chg.textContent = (diff >= 0 ? '+' : '') + pct.toFixed(2) + '%';
  chg.className = diff >= 0 ? 'up' : 'down';
}

// ====================================================
// RN BRIDGE
// ====================================================
function notifyRN(data) {
  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(data));
}

function takeScreenshot() {
  try {
    const canvas = chart.takeScreenshot();
    const url = canvas.toDataURL('image/png');
    notifyRN({ type: 'screenshot', data: url });
    showHint('اسکرین‌شات گرفته شد');
  } catch (e) { showHint('خطا در اسکرین‌شات'); }
}

// ====================================================
// PUBLIC API
// ====================================================
window.setCandles = function(data) {
  candles = data || [];
  applyCandles();
  // re-render indicators
  indicators.forEach(entry => {
    entry.series.forEach(s => { try { chart.removeSeries(s); } catch(e) {} });
  });
  indicators.clear();
  activePanes.forEach(name => {
    const p = panes[name];
    if (p) {
      Object.values(p.series).forEach(s => { try { p.chart.removeSeries(s); } catch(e) {} });
      p.series = {};
    }
  });
};

function applyCandles() {
  if (!candleSeries || !candles.length) return;
  if (chartType === 'heikin') {
    const hk = [];
    let prevH = null;
    candles.forEach((x, i) => {
      const close = (x.open + x.high + x.low + x.close) / 4;
      const open = prevH ? (prevH.open + prevH.close) / 2 : (x.open + x.close) / 2;
      const high = Math.max(x.high, open, close);
      const low = Math.min(x.low, open, close);
      hk.push({ time: Math.floor(x.timestamp / 1000), open, high, low, close });
      prevH = { open, close };
    });
    candleSeries.setData(hk);
  } else {
    candleSeries.setData(candles.map(x => ({
      time: Math.floor(x.timestamp / 1000),
      open: x.open, high: x.high, low: x.low, close: x.close,
    })));
  }
  chart.timeScale().fitContent();
  updateTopbar(null);
}

window.setTimeframe = function(tf) {
  currentTF = tf;
  document.querySelectorAll('#botbar .tfb').forEach((el, i) => {
    if (i < TIMEFRAMES.length) el.classList.toggle('on', TIMEFRAMES[i].id === tf);
  });
};

window.loadDrawings = function(list) {
  drawings = list || [];
  drawingHistory = [JSON.parse(JSON.stringify(drawings))];
  historyIdx = 0;
  redraw();
};

window.getDrawings = function() { return drawings; };

if (document.readyState === 'complete') init();
else window.addEventListener('load', init);
</script>
</body>
</html>`;
};

// =========================================================
// RN COMPONENT
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

  const html = useMemo(() => buildHTML(isDark), [isDark]);
  const webViewKey = useMemo(() => `chart-${isDark ? 'dark' : 'light'}`, [isDark]);

  const loadCandles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCandles(selected.id, timeframe, 1000);
      setCandles(data);
    } catch (e) { setCandles([]); }
    finally { setLoading(false); }
  }, [selected.id, timeframe]);

  useEffect(() => { loadCandles(); }, [loadCandles]);

  useEffect(() => {
    if (!webViewRef.current || !chartReady || candles.length === 0) return;
    webViewRef.current.injectJavaScript(`window.setCandles(${JSON.stringify(candles)}); true;`);
  }, [candles, chartReady]);

  useEffect(() => {
    if (!webViewRef.current || !chartReady) return;
    webViewRef.current.injectJavaScript(`window.setTimeframe('${timeframe}'); true;`);
  }, [timeframe, chartReady]);

  // Load drawings
  useEffect(() => {
    if (!chartReady) return;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(`${DRAWINGS_STORAGE_KEY}_${selected.id}`);
        const list = raw ? JSON.parse(raw) : [];
        webViewRef.current?.injectJavaScript(`window.loadDrawings(${JSON.stringify(list)}); true;`);
      } catch {}
    })();
  }, [selected.id, chartReady]);

  const onMessage = useCallback(async (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'ready') setChartReady(true);
      else if (msg.type === 'change-timeframe') setTimeframe(msg.timeframe as Timeframe);
      else if (msg.type === 'save-drawings') {
        await AsyncStorage.setItem(
          `${DRAWINGS_STORAGE_KEY}_${selected.id}`,
          JSON.stringify(msg.drawings || [])
        );
      } else if (msg.type === 'screenshot') {
        Alert.alert('اسکرین‌شات', 'قابلیت ذخیره به‌زودی اضافه می‌شود.');
      }
    } catch {}
  }, [selected.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return SYMBOLS;
    return SYMBOLS.filter(s => s.id.toLowerCase().includes(q) || s.label.toLowerCase().includes(q));
  }, [search]);

  const latest = candles.length > 0 ? candles[candles.length - 1] : null;
  const previous = candles.length > 1 ? candles[candles.length - 2] : null;
  const change = latest && previous ? latest.close - previous.close : 0;
  const changePct = latest && previous && previous.close !== 0 ? (change / previous.close) * 100 : 0;
  const isUp = change >= 0;
  const dec = latest ? (latest.close > 100 ? 2 : 4) : 2;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => setShowPicker(true)} style={styles.symbolBtn}>
          <Text style={[styles.symbolId, { color: colors.text }]}>{selected.id}</Text>
          <Ionicons name="chevron-down" size={14} color={colors.mutedText} />
        </TouchableOpacity>
        {latest && (
          <View style={styles.priceBox}>
            <Text style={[styles.priceText, { color: colors.text }]}>{latest.close.toFixed(dec)}</Text>
            <Text style={[styles.changeText, { color: isUp ? GREEN : RED }]}>
              {isUp ? '▲' : '▼'} {Math.abs(changePct).toFixed(2)}%
            </Text>
          </View>
        )}
      </View>

      <View style={styles.chartWrap}>
        {loading && candles.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={BLUE} />
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
            mixedContentMode="always"
            allowsInlineMediaPlayback
            setSupportMultipleWindows={false}
          />
        )}
      </View>

      <Modal visible={showPicker} animationType="slide" transparent onRequestClose={() => setShowPicker(false)}>
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
              {CATEGORIES.map(cat => {
                const items = filtered.filter(s => s.cat === cat);
                if (!items.length) return null;
                return (
                  <View key={cat} style={styles.section}>
                    <Text style={[styles.sectionLabel, { color: colors.mutedText }]}>
                      {CATEGORY_LABELS[cat]}
                    </Text>
                    {items.map(s => {
                      const active = s.id === selected.id;
                      return (
                        <TouchableOpacity
                          key={s.id}
                          onPress={() => { setSelected(s); setShowPicker(false); setSearch(''); }}
                          style={[
                            styles.row,
                            { backgroundColor: active ? `${BLUE}15` : colors.card, borderColor: active ? BLUE : colors.border },
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

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: Platform.OS === 'ios' ? 48 : 40,
    paddingBottom: 6,
    borderBottomWidth: 1,
    minHeight: 44,
  },
  symbolBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  symbolId: { fontSize: 16, fontWeight: '900', letterSpacing: 0.3 },
  priceBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  priceText: { fontSize: 15, fontWeight: '900' },
  changeText: { fontSize: 11, fontWeight: '800' },
  chartWrap: { flex: 1, position: 'relative', overflow: 'hidden' },
  webview: { flex: 1, backgroundColor: 'transparent' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  pickerModal: { maxHeight: '88%', borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 18, paddingTop: 18 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  pickerTitle: { fontSize: 18, fontWeight: '900' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 46, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 13, textAlign: 'right' },
  section: { marginBottom: 16 },
  sectionLabel: { fontSize: 11, fontWeight: '800', marginBottom: 7, textAlign: 'right' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11, borderRadius: 12, borderWidth: 1, marginBottom: 6 },
  rowLabel: { flex: 1, fontSize: 13, fontWeight: '800', textAlign: 'right' },
  rowId: { fontSize: 10, fontWeight: '700' },
});