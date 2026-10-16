import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
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

const SESSION_KEY = 'navasan_bt_session_v2';

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
  { id: 'SOLUSD', label: 'Solana' },
];

const TIMEFRAMES: { id: Timeframe; label: string }[] = [
  { id: '5m', label: '5m' },
  { id: '15m', label: '15m' },
  { id: '1h', label: '1H' },
  { id: '4h', label: '4H' },
  { id: '1d', label: '1D' },
];

const SPEEDS = [
  { label: '0.5×', value: 800 },
  { label: '1×', value: 400 },
  { label: '2×', value: 200 },
  { label: '5×', value: 80 },
  { label: '10×', value: 30 },
  { label: 'MAX', value: 5 },
];

const TOTAL_CANDLES = 5000;
const INITIAL_VISIBLE = 100;

// =========================================================
// HTML — PRO BACKTEST
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
html,body{width:100%;height:100%;overflow:hidden;background:${bg};color:${text};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;user-select:none;touch-action:manipulation}

/* ====== TOP BAR ====== */
#topbar{position:absolute;top:0;left:0;right:0;height:30px;background:${panel};border-bottom:1px solid ${border};display:flex;align-items:center;padding:0 6px;gap:8px;font-size:10px;font-weight:700;color:${muted};z-index:60;overflow-x:auto;scrollbar-width:none}
#topbar::-webkit-scrollbar{display:none}
#topbar span{white-space:nowrap}
#topbar b{color:${text};font-weight:900;font-size:11px}
#topbar .up{color:#16A34A}
#topbar .down{color:#DC2626}
#topbar .candles{margin-left:auto;padding-right:4px;color:${accent};font-weight:900}

/* ====== LEFT TOOLS ====== */
#leftbar{position:absolute;top:30px;left:0;bottom:0;width:40px;background:${panel};border-right:1px solid ${border};z-index:55;overflow-y:auto;scrollbar-width:none;display:flex;flex-direction:column;padding:2px 0}
#leftbar::-webkit-scrollbar{display:none}
.tg{display:flex;flex-direction:column;padding:1px 0;border-bottom:1px solid ${border}}
.tg .gl{font-size:5px;color:${muted};text-align:center;padding:1px 0;font-weight:800;letter-spacing:.3px}
.tool{width:40px;height:32px;background:transparent;border:none;color:${text};cursor:pointer;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;position:relative;font-family:inherit;transition:background .1s}
.tool:hover{background:${hover}}
.tool.on{background:${accent};color:#FFF}

/* ====== CHART ====== */
#chart-root{position:absolute;top:30px;left:40px;right:0;bottom:0}
#chart-panel{position:absolute;top:0;left:0;right:0;bottom:0;overflow:hidden}
#main-chart{width:100%;height:100%}
#overlay{position:absolute;top:0;left:0;right:0;bottom:0;pointer-events:none;z-index:10}

/* ====== SUB PANES ====== */
.sub-pane{position:absolute;left:0;right:0;height:70px;background:${bg};border-top:1px solid ${border};display:none;z-index:5}
.sub-pane.on{display:block}

/* ====== POSITION PANEL ====== */
#pos-panel{position:absolute;top:36px;right:8px;background:${card}F2;backdrop-filter:blur(10px);border:1px solid ${border};border-radius:12px;padding:10px 12px;font-size:10px;font-weight:700;z-index:20;min-width:180px;box-shadow:0 6px 20px #00000050;display:none}
#pos-panel.on{display:block}
#pos-panel .hd{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid ${border}}
#pos-panel .dir{font-size:11px;font-weight:900;padding:2px 8px;border-radius:4px}
#pos-panel .dir.buy{background:${GREEN}30;color:${GREEN}}
#pos-panel .dir.sell{background:${RED}30;color:${RED}}
#pos-panel .row{display:flex;justify-content:space-between;gap:8px;padding:2px 0}
#pos-panel .lbl{color:${muted}}
#pos-panel .val{font-weight:900}
#pos-panel .pnl{font-size:16px;font-weight:900;text-align:center;margin-top:6px;padding-top:6px;border-top:1px solid ${border}}
#pos-panel .badges{display:flex;gap:4px;justify-content:center;margin-top:4px}
#pos-panel .badge{font-size:8px;font-weight:900;padding:1px 5px;border-radius:3px}

/* ====== FLOATING BUTTONS ====== */
#floats{position:absolute;bottom:44px;right:8px;display:flex;flex-direction:column;gap:6px;z-index:56}
.fbtn{width:52px;height:52px;border-radius:50%;border:none;font-size:10px;font-weight:900;cursor:pointer;color:#FFF;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 4px 14px #00000040;font-family:inherit;transition:transform .1s}
.fbtn:active{transform:scale(.92)}
.fbtn.buy{background:${GREEN}}
.fbtn.sell{background:${RED}}
.fbtn.close{background:${AMBER};width:auto;height:38px;border-radius:19px;padding:0 14px;flex-direction:row;gap:6px;font-size:11px}
.fbtn.inds{background:${accent}}

/* ====== INDICATOR CHIPS (bottom-right of chart) ====== */
#ind-chips{position:absolute;bottom:44px;left:8px;display:flex;flex-wrap:wrap;gap:3px;max-width:60%;z-index:56}
.ichip{height:20px;padding:0 7px;background:${panel}F0;border:1px solid ${border};color:${text};border-radius:5px;font-size:9px;font-weight:800;font-family:inherit;cursor:pointer;display:flex;align-items:center;gap:3px;box-shadow:0 2px 6px #00000030}
.ichip .x{color:${muted};font-size:10px}
.ichip:hover .x{color:#DC2626}

/* ====== PENDING ORDERS ====== */
#pending{position:absolute;top:36px;left:8px;background:${card}F2;backdrop-filter:blur(10px);border:1px solid ${AMBER};border-radius:10px;padding:8px 10px;font-size:10px;font-weight:700;z-index:20;display:none;max-width:200px}
#pending.on{display:block}
#pending .hd{font-size:11px;font-weight:900;color:${AMBER};margin-bottom:6px}
.porder{display:flex;justify-content:space-between;gap:8px;padding:3px 0;font-size:9px;align-items:center}
.porder .x{cursor:pointer;color:${muted};font-size:11px;font-weight:900}
.porder .x:hover{color:#DC2626}

/* ====== CONTROLS ====== */
#controls{position:absolute;bottom:0;left:0;right:0;height:38px;background:${panel};border-top:1px solid ${border};display:flex;align-items:center;padding:0 5px;gap:3px;z-index:55;overflow-x:auto;scrollbar-width:none}
#controls::-webkit-scrollbar{display:none}
.ctrl{height:26px;min-width:26px;padding:0 6px;background:transparent;border:1px solid ${border};color:${text};border-radius:5px;font-size:10px;font-weight:900;font-family:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:3px;white-space:nowrap}
.ctrl:hover{background:${hover}}
.ctrl.on{background:${accent};border-color:${accent};color:#FFF}
.ctrl.play{background:${GREEN};border-color:${GREEN};color:#FFF;padding:0 12px}
.ctrl.play.on{background:${RED};border-color:${RED}}
.ctrl:disabled{opacity:.4;cursor:not-allowed}
.sep{width:1px;height:18px;background:${border}}

/* ====== HINT ====== */
#hint{position:absolute;top:36px;left:50%;transform:translateX(-50%);background:${accent}EE;color:#FFF;padding:6px 14px;border-radius:8px;font-size:11px;font-weight:800;z-index:57;display:none;white-space:nowrap;box-shadow:0 4px 14px ${accent}60;max-width:80%;overflow:hidden;text-overflow:ellipsis}
#hint.on{display:block;animation:pop .2s}
@keyframes pop{from{opacity:0}to{opacity:1}}

/* ====== MODAL ====== */
.modal{position:absolute;inset:0;background:#00000080;display:none;align-items:center;justify-content:center;z-index:70;padding:16px;backdrop-filter:blur(4px)}
.modal.on{display:flex}
.mc{background:${card};border-radius:14px;max-width:420px;width:100%;max-height:85vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 20px 60px #00000060}
.mh{padding:12px 14px;border-bottom:1px solid ${border};font-size:14px;font-weight:900;display:flex;justify-content:space-between;align-items:center;background:${panel}}
.mh button{background:transparent;border:none;color:${muted};font-size:20px;cursor:pointer;font-family:inherit;padding:0 4px}
.mb{padding:14px;overflow-y:auto;display:flex;flex-direction:column;gap:10px}
.mb::-webkit-scrollbar{width:4px}
.mb::-webkit-scrollbar-thumb{background:${border};border-radius:2px}
.mrow{display:flex;flex-direction:column;gap:4px}
.mrow label{font-size:10px;font-weight:800;color:${muted};letter-spacing:.3px}
.mrow input,.mrow select{padding:9px 10px;background:${panel};border:1px solid ${border};border-radius:8px;color:${text};font-size:12px;font-weight:700;font-family:inherit;outline:none}
.mrow input:focus{border-color:${accent}}
.mrow .row{display:flex;gap:6px;align-items:center}
.mrow .row input{flex:1}
.mrow .row button{padding:0 10px;height:36px;background:${accent}22;border:1px solid ${accent};color:${accent};border-radius:6px;font-size:11px;font-weight:800;font-family:inherit;cursor:pointer}
.mrow .hint{font-size:9px;color:${muted};font-weight:600}
.acts{display:flex;gap:8px;margin-top:4px}
.acts button{flex:1;padding:11px;border-radius:9px;border:none;font-size:12px;font-weight:900;font-family:inherit;cursor:pointer}
.acts .ok{background:${accent};color:#FFF}
.acts .ok.buy{background:${GREEN}}
.acts .ok.sell{background:${RED}}
.acts .cancel{background:${panel};color:${text};border:1px solid ${border}}
.acts .danger{background:${RED}22;color:${RED}}

/* ====== INDICATOR PICKER ====== */
.ind-cats{display:flex;flex-direction:column;gap:4px}
.ind-cat{padding:8px 10px;border-radius:8px;cursor:pointer;background:${panel};border:1px solid ${border};transition:all .15s}
.ind-cat:hover{border-color:${accent}}
.ind-cat .ttl{font-size:11px;font-weight:900;display:flex;justify-content:space-between;align-items:center}
.ind-cat .arrow{color:${muted};font-size:12px}
.ind-cat .sub{font-size:9px;color:${muted};margin-top:3px}
.ind-cat.open .arrow{transform:rotate(90deg)}
.ind-items{padding:6px 0 0 0;display:flex;flex-wrap:wrap;gap:4px}
.ind-item{padding:5px 10px;background:${card};border:1px solid ${border};border-radius:6px;font-size:10px;font-weight:700;cursor:pointer}
.ind-item:hover{background:${accent}22;border-color:${accent};color:${accent}}
.ind-item.on{background:${accent};color:#FFF;border-color:${accent}}

/* ====== STATS ====== */
.stats-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.stat-box{padding:10px;background:${panel};border:1px solid ${border};border-radius:9px;display:flex;flex-direction:column;gap:3px}
.stat-box .lbl{font-size:9px;color:${muted};font-weight:700}
.stat-box .val{font-size:14px;font-weight:900}
.stats-section{margin-top:10px;padding-top:10px;border-top:1px solid ${border}}
.stats-section h4{font-size:11px;font-weight:900;color:${muted};margin-bottom:6px;letter-spacing:.3px}

/* ====== TRADE LIST ====== */
.tlist{display:flex;flex-direction:column;gap:4px}
.trade-item{padding:8px 10px;background:${panel};border:1px solid ${border};border-radius:8px;display:flex;justify-content:space-between;align-items:center;font-size:10px;font-weight:700;cursor:pointer}
.trade-item:hover{border-color:${accent}}
.trade-item .left{display:flex;flex-direction:column;gap:2px;flex:1}
.trade-item .dir{font-size:10px;font-weight:900}
.trade-item .dir.buy{color:${GREEN}}
.trade-item .dir.sell{color:${RED}}
.trade-item .meta{font-size:9px;color:${muted}}
.trade-item .right{text-align:right;font-weight:900}
.trade-item .right.win{color:${GREEN}}
.trade-item .right.loss{color:${RED}}
.trade-item .right .r{font-size:9px;color:${muted};font-weight:700;display:block;margin-top:2px}

/* ====== LOADING ====== */
#load{position:absolute;inset:0;background:${bg};z-index:100;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;font-size:12px;font-weight:700;color:${muted}}
.sp{width:34px;height:34px;border:3px solid ${grid};border-top-color:${accent};border-radius:50%;animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

/* ====== EQUITY PANEL ====== */
#equity{position:absolute;inset:0;background:#00000080;display:none;align-items:center;justify-content:center;z-index:75;padding:16px}
#equity.on{display:flex}
#equity .mc{max-width:500px}
#equity-chart{width:100%;height:220px;background:${panel};border-radius:8px}
</style>
</head>
<body>

<div id="topbar">
  <span>O <b id="o">—</b></span>
  <span>H <b id="h">—</b></span>
  <span>L <b id="l">—</b></span>
  <span>C <b id="c">—</b></span>
  <span id="chg">—</span>
  <span class="candles">📊 <b id="cn">0</b>/<b id="ct">0</b></span>
</div>

<div id="leftbar"></div>

<div id="chart-root">
  <div id="chart-panel">
    <div id="main-chart"></div>
    <canvas id="overlay"></canvas>
  </div>
  <div class="sub-pane" id="pane-volume"></div>
  <div class="sub-pane" id="pane-rsi"></div>
</div>

<div id="pos-panel"></div>
<div id="pending"></div>
<div id="ind-chips"></div>

<div id="floats">
  <button class="fbtn inds" id="btn-ind" title="اندیکاتورها">📊<br/>IND</button>
  <button class="fbtn close" id="btn-close" style="display:none">✕ بستن</button>
  <button class="fbtn buy" id="btn-buy">▲<br/>BUY</button>
  <button class="fbtn sell" id="btn-sell">▼<br/>SELL</button>
</div>

<div id="controls"></div>

<div id="hint"></div>

<!-- TRADE MODAL -->
<div class="modal" id="modal-trade"><div class="mc">
  <div class="mh"><span id="trade-title">ورود جدید</span><button onclick="closeModal('modal-trade')">✕</button></div>
  <div class="mb" id="trade-body"></div>
</div></div>

<!-- INDICATOR PICKER -->
<div class="modal" id="modal-ind"><div class="mc">
  <div class="mh"><span>اندیکاتورها</span><button onclick="closeModal('modal-ind')">✕</button></div>
  <div class="mb" id="ind-body"></div>
</div></div>

<!-- STATS -->
<div class="modal" id="modal-stats"><div class="mc">
  <div class="mh"><span>آمار حرفه‌ای</span><button onclick="closeModal('modal-stats')">✕</button></div>
  <div class="mb" id="stats-body"></div>
</div></div>

<!-- EQUITY CURVE -->
<div class="modal" id="equity"><div class="mc">
  <div class="mh"><span>منحنی سرمایه</span><button onclick="closeModal('equity')">✕</button></div>
  <div class="mb"><div id="equity-chart"></div></div>
</div></div>

<div id="load"><div class="sp"></div><div>راه‌اندازی بک‌تست پیشرفته...</div></div>

<script src="https://unpkg.com/lightweight-charts@4.2.3/dist/lightweight-charts.standalone.production.js"></script>
<script>
'use strict';

// =========================================================
// CONFIG
// =========================================================
const C = {
  up: '#16A34A', down: '#DC2626', accent: '#2563EB',
  text: '${text}', muted: '${muted}', bg: '${bg}', card: '${card}',
  border: '${border}', panel: '${panel}',
};

// =========================================================
// STATE
// =========================================================
let chart, candleSeries, overlay, ctx;
let panes = {};
let candles = [];
let visibleCount = 100;
let currentTF = '1h';
let chartType = 'candles';
let activeTool = 'cursor';
let drawings = [];
let drawHistory = [[]];
let histIdx = 0;
let drawInProg = null;
let isDrawing = false;
let activePanes = [];
let indicators = new Map();   // key -> { def, series }
let hideDrawings = false;

// Trading
let settings = {
  capital: 10000,
  riskPct: 1,
  atrMult: 1.5,
  rr: 3,
  breakeven: true,
  breakevenAtR: 1,
  trailing: false,
  trailingATR: 1,
  feePercent: 0.05,
  slippage: 0,
};
let positions = [];  // multiple positions
let pending = [];    // pending orders (limit/stop)
let closedTrades = [];
let equity = [];     // [{time, value}]

// Playback
let isPlaying = false;
let speedIdx = 1;
let playTimer = null;

// =========================================================
// TOOL GROUPS
// =========================================================
const TOOL_GROUPS = [
  { label: 'BASE', tools: [
    { id: 'cursor', icon: '✛' }, { id: 'cross', icon: '✚' }, { id: 'dot', icon: '•' },
  ]},
  { label: 'LINE', tools: [
    { id: 'trend', icon: '╱' }, { id: 'ray', icon: '↗' }, { id: 'ext', icon: '⇿' }, { id: 'angle', icon: '∡' },
  ]},
  { label: 'HORIZ', tools: [
    { id: 'hline', icon: '━' }, { id: 'hray', icon: '➡' }, { id: 'vline', icon: '┃' }, { id: 'crossline', icon: '╋' },
  ]},
  { label: 'CHAN', tools: [
    { id: 'channel', icon: '∥' }, { id: 'flattop', icon: '⌐' },
  ]},
  { label: 'FIB', tools: [
    { id: 'fib', icon: '≋' }, { id: 'fibext', icon: '⋮' }, { id: 'fibfan', icon: '⌒' }, { id: 'fibarc', icon: '◜' },
  ]},
  { label: 'FORK', tools: [
    { id: 'pitchfork', icon: '⩡' }, { id: 'schiff', icon: '⩢' },
  ]},
  { label: 'SHAPE', tools: [
    { id: 'rect', icon: '▭' }, { id: 'circle', icon: '◯' }, { id: 'ellipse', icon: '⬭' }, { id: 'triangle', icon: '△' }, { id: 'arc', icon: '◜' },
  ]},
  { label: 'BRUSH', tools: [
    { id: 'brush', icon: '✎' }, { id: 'marker', icon: '🖍' },
  ]},
  { label: 'TEXT', tools: [
    { id: 'text', icon: 'T' }, { id: 'note', icon: '📝' }, { id: 'arrow', icon: '➤' }, { id: 'label', icon: '🏷' },
  ]},
  { label: 'PRED', tools: [
    { id: 'long', icon: '▲' }, { id: 'short', icon: '▼' }, { id: 'ruler', icon: '📏' },
  ]},
];

// =========================================================
// INDICATORS
// =========================================================
const INDICATORS = [
  { id: 'sma', cat: 'میانگین', name: 'SMA', params: [{ k: 'period', def: 20, label: 'دوره' }], main: true, color: '#F59E0B' },
  { id: 'ema', cat: 'میانگین', name: 'EMA', params: [{ k: 'period', def: 20, label: 'دوره' }], main: true, color: '#7C3AED' },
  { id: 'wma', cat: 'میانگین', name: 'WMA', params: [{ k: 'period', def: 20, label: 'دوره' }], main: true, color: '#0891B2' },
  { id: 'hma', cat: 'میانگین', name: 'HMA', params: [{ k: 'period', def: 20, label: 'دوره' }], main: true, color: '#DB2777' },
  { id: 'vwma', cat: 'میانگین', name: 'VWMA', params: [{ k: 'period', def: 20, label: 'دوره' }], main: true, color: '#16A34A' },
  { id: 'bb', cat: 'باند', name: 'Bollinger', params: [{ k: 'period', def: 20, label: 'دوره' }, { k: 'mult', def: 2, label: 'ضریب' }], main: true },
  { id: 'keltner', cat: 'باند', name: 'Keltner', params: [{ k: 'period', def: 20, label: 'دوره' }, { k: 'mult', def: 2, label: 'ضریب' }], main: true },
  { id: 'donchian', cat: 'باند', name: 'Donchian', params: [{ k: 'period', def: 20, label: 'دوره' }], main: true },
  { id: 'psar', cat: 'روند', name: 'PSAR', params: [{ k: 'step', def: 0.02, label: 'Step' }, { k: 'max', def: 0.2, label: 'Max' }], main: true },
  { id: 'supertrend', cat: 'روند', name: 'Supertrend', params: [{ k: 'period', def: 10, label: 'دوره' }, { k: 'mult', def: 3, label: 'ضریب' }], main: true },
  { id: 'vwap', cat: 'روند', name: 'VWAP', params: [], main: true, color: '#F59E0B' },
  { id: 'rsi', cat: 'مومنتوم', name: 'RSI', params: [{ k: 'period', def: 14, label: 'دوره' }], pane: 'rsi' },
  { id: 'stoch', cat: 'مومنتوم', name: 'Stochastic', params: [{ k: 'k', def: 14, label: 'K' }, { k: 'd', def: 3, label: 'D' }], pane: 'rsi' },
  { id: 'cci', cat: 'مومنتوم', name: 'CCI', params: [{ k: 'period', def: 20, label: 'دوره' }], pane: 'rsi' },
  { id: 'willr', cat: 'مومنتوم', name: 'Williams %R', params: [{ k: 'period', def: 14, label: 'دوره' }], pane: 'rsi' },
  { id: 'macd', cat: 'مومنتوم', name: 'MACD', params: [{ k: 'fast', def: 12, label: 'Fast' }, { k: 'slow', def: 26, label: 'Slow' }, { k: 'signal', def: 9, label: 'Signal' }], pane: 'rsi' },
  { id: 'atr', cat: 'نوسان', name: 'ATR', params: [{ k: 'period', def: 14, label: 'دوره' }], pane: 'volume' },
  { id: 'volume', cat: 'نوسان', name: 'Volume', params: [], pane: 'volume' },
];

// =========================================================
// MATH
// =========================================================
const M = {
  sma(c, p) { const r = []; for (let i = 0; i < c.length; i++) { if (i < p - 1) continue; let s = 0; for (let j = 0; j < p; j++) s += c[i - j].close; r.push({ time: Math.floor(c[i].timestamp / 1000), value: s / p }); } return r; },
  ema(c, p) { if (c.length < p) return []; const k = 2 / (p + 1), r = []; let e = 0; for (let i = 0; i < p; i++) e += c[i].close; e /= p; r.push({ time: Math.floor(c[p-1].timestamp / 1000), value: e }); for (let i = p; i < c.length; i++) { e = c[i].close * k + e * (1 - k); r.push({ time: Math.floor(c[i].timestamp / 1000), value: e }); } return r; },
  wma(c, p) { const r = [], wsum = (p * (p + 1)) / 2; for (let i = 0; i < c.length; i++) { if (i < p - 1) continue; let s = 0; for (let j = 0; j < p; j++) s += c[i - j].close * (p - j); r.push({ time: Math.floor(c[i].timestamp / 1000), value: s / wsum }); } return r; },
  hma(c, p) { const half = Math.floor(p / 2), sqrtP = Math.floor(Math.sqrt(p)); const wH = M.wma(c, half), wF = M.wma(c, p); const map = new Map(); wH.forEach(x => map.set(x.time, x.value)); const diff = []; wF.forEach(x => { if (map.has(x.time)) diff.push({ time: x.time, value: 2 * map.get(x.time) - x.value }); }); const r = []; for (let i = 0; i < diff.length; i++) { if (i < sqrtP - 1) continue; let s = 0, ws = 0; for (let j = 0; j < sqrtP; j++) { s += diff[i - j].value * (sqrtP - j); ws += (sqrtP - j); } r.push({ time: diff[i].time, value: s / ws }); } return r; },
  vwma(c, p) { const r = []; for (let i = 0; i < c.length; i++) { if (i < p - 1) continue; let sv = 0, spv = 0; for (let j = 0; j < p; j++) { const v = c[i - j].volume || 1; sv += v; spv += c[i - j].close * v; } r.push({ time: Math.floor(c[i].timestamp / 1000), value: spv / sv }); } return r; },
  bb(c, p, m) { const u = [], mid = [], l = []; for (let i = 0; i < c.length; i++) { if (i < p - 1) continue; let s = 0; for (let j = 0; j < p; j++) s += c[i - j].close; const sma = s / p; let v = 0; for (let j = 0; j < p; j++) v += Math.pow(c[i - j].close - sma, 2); const sd = Math.sqrt(v / p); const t = Math.floor(c[i].timestamp / 1000); u.push({ time: t, value: sma + sd * m }); mid.push({ time: t, value: sma }); l.push({ time: t, value: sma - sd * m }); } return { u, m: mid, l }; },
  keltner(c, p, m) { const ema = M.ema(c, p), atr = M.atr(c, p); const am = new Map(); atr.forEach(x => am.set(x.time, x.value)); const u = [], mid = [], l = []; ema.forEach(x => { const a = am.get(x.time); if (a === undefined) return; u.push({ time: x.time, value: x.value + a * m }); mid.push({ time: x.time, value: x.value }); l.push({ time: x.time, value: x.value - a * m }); }); return { u, m: mid, l }; },
  donchian(c, p) { const u = [], mid = [], l = []; for (let i = 0; i < c.length; i++) { if (i < p - 1) continue; let hi = -Infinity, lo = Infinity; for (let j = 0; j < p; j++) { if (c[i - j].high > hi) hi = c[i - j].high; if (c[i - j].low < lo) lo = c[i - j].low; } const t = Math.floor(c[i].timestamp / 1000); u.push({ time: t, value: hi }); mid.push({ time: t, value: (hi + lo) / 2 }); l.push({ time: t, value: lo }); } return { u, m: mid, l }; },
  atr(c, p) { if (c.length < p + 1) return []; const tr = []; for (let i = 1; i < c.length; i++) tr.push(Math.max(c[i].high - c[i].low, Math.abs(c[i].high - c[i - 1].close), Math.abs(c[i].low - c[i - 1].close))); const r = []; let a = 0; for (let i = 0; i < p; i++) a += tr[i]; a /= p; r.push({ time: Math.floor(c[p].timestamp / 1000), value: a }); for (let i = p; i < tr.length; i++) { a = (a * (p - 1) + tr[i]) / p; r.push({ time: Math.floor(c[i + 1].timestamp / 1000), value: a }); } return r; },
  rsi(c, p) { if (c.length <= p) return []; const r = []; let ag = 0, al = 0; for (let i = 1; i <= p; i++) { const d = c[i].close - c[i - 1].close; if (d >= 0) ag += d; else al -= d; } ag /= p; al /= p; let rs = al === 0 ? 100 : ag / al; r.push({ time: Math.floor(c[p].timestamp / 1000), value: 100 - 100 / (1 + rs) }); for (let i = p + 1; i < c.length; i++) { const d = c[i].close - c[i - 1].close; const g = d > 0 ? d : 0, lo = d < 0 ? -d : 0; ag = (ag * (p - 1) + g) / p; al = (al * (p - 1) + lo) / p; rs = al === 0 ? 100 : ag / al; r.push({ time: Math.floor(c[i].timestamp / 1000), value: 100 - 100 / (1 + rs) }); } return r; },
  stoch(c, k, d) { const kv = []; for (let i = 0; i < c.length; i++) { if (i < k - 1) continue; let hi = -Infinity, lo = Infinity; for (let j = 0; j < k; j++) { if (c[i - j].high > hi) hi = c[i - j].high; if (c[i - j].low < lo) lo = c[i - j].low; } const v = hi === lo ? 50 : ((c[i].close - lo) / (hi - lo)) * 100; kv.push({ time: Math.floor(c[i].timestamp / 1000), value: v }); } const dv = []; for (let i = 0; i < kv.length; i++) { if (i < d - 1) continue; let s = 0; for (let j = 0; j < d; j++) s += kv[i - j].value; dv.push({ time: kv[i].time, value: s / d }); } return { k: kv, d: dv }; },
  cci(c, p) { const r = []; for (let i = 0; i < c.length; i++) { if (i < p - 1) continue; let sum = 0; for (let j = 0; j < p; j++) sum += (c[i - j].high + c[i - j].low + c[i - j].close) / 3; const tp = sum / p; let md = 0; for (let j = 0; j < p; j++) md += Math.abs((c[i - j].high + c[i - j].low + c[i - j].close) / 3 - tp); md /= p; r.push({ time: Math.floor(c[i].timestamp / 1000), value: md === 0 ? 0 : ((c[i].high + c[i].low + c[i].close) / 3 - tp) / (0.015 * md) }); } return r; },
  willr(c, p) { const r = []; for (let i = 0; i < c.length; i++) { if (i < p - 1) continue; let hi = -Infinity, lo = Infinity; for (let j = 0; j < p; j++) { if (c[i - j].high > hi) hi = c[i - j].high; if (c[i - j].low < lo) lo = c[i - j].low; } r.push({ time: Math.floor(c[i].timestamp / 1000), value: hi === lo ? -50 : ((hi - c[i].close) / (hi - lo)) * -100 }); } return r; },
  macd(c, f, s, sig) { const ef = M.ema(c, f), es = M.ema(c, s); const m = new Map(); es.forEach(x => m.set(x.time, x.value)); const macd = []; ef.forEach(x => { if (m.has(x.time)) macd.push({ time: x.time, value: x.value - m.get(x.time) }); }); if (!macd.length) return { m: [], s: [], h: [] }; const k = 2 / (sig + 1); let sg = 0; for (let i = 0; i < Math.min(sig, macd.length); i++) sg += macd[i].value; sg /= sig; const sl = [], hl = []; for (let i = sig - 1; i < macd.length; i++) { if (i === sig - 1) sl.push({ time: macd[i].time, value: sg }); else { sg = macd[i].value * k + sg * (1 - k); sl.push({ time: macd[i].time, value: sg }); } const h = macd[i].value - sg; hl.push({ time: macd[i].time, value: h, color: h >= 0 ? '#16A34A80' : '#DC262680' }); } return { m: macd, s: sl, h: hl }; },
  psar(c, step, max) { const r = []; let up = true, af = step, ep = c[0].low, sar = c[0].high; for (let i = 1; i < c.length; i++) { const p = sar; sar = p + af * (ep - p); if (up) { if (c[i].low < sar) { up = false; sar = ep; ep = c[i].low; af = step; } else { if (c[i].high > ep) { ep = c[i].high; af = Math.min(af + step, max); } } } else { if (c[i].high > sar) { up = true; sar = ep; ep = c[i].high; af = step; } else { if (c[i].low < ep) { ep = c[i].low; af = Math.min(af + step, max); } } } r.push({ time: Math.floor(c[i].timestamp / 1000), value: sar }); } return r; },
  supertrend(c, p, m) { const atr = M.atr(c, p); const am = new Map(); atr.forEach(x => am.set(x.time, x.value)); const r = []; let prev = null, dir = 1; c.forEach(x => { const t = Math.floor(x.timestamp / 1000); const a = am.get(t); if (a === undefined) return; const hl2 = (x.high + x.low) / 2; const up = hl2 - m * a, dn = hl2 + m * a; let st, d; if (prev === null) { st = up; d = 1; } else { if (dir === 1) { st = x.close > prev ? Math.max(up, prev) : dn; d = x.close > prev ? 1 : -1; } else { st = x.close < prev ? Math.min(dn, prev) : up; d = x.close < prev ? -1 : 1; } } r.push({ time: t, value: st }); prev = st; dir = d; }); return r; },
  vwap(c) { const r = []; let spv = 0, sv = 0, cd = null; c.forEach(x => { const d = new Date(x.timestamp).toDateString(); if (d !== cd) { cd = d; spv = 0; sv = 0; } const tp = (x.high + x.low + x.close) / 3; const v = x.volume || 1; spv += tp * v; sv += v; r.push({ time: Math.floor(x.timestamp / 1000), value: spv / sv }); }); return r; },
};

// =========================================================
// INIT
// =========================================================
function init() {
  try {
    document.getElementById('load').style.display = 'none';
    const panel = document.getElementById('chart-panel');
    const mainEl = document.getElementById('main-chart');
    overlay = document.getElementById('overlay');
    ctx = overlay.getContext('2d');

    chart = LightweightCharts.createChart(mainEl, {
      width: mainEl.clientWidth, height: mainEl.clientHeight,
      layout: { background: { type: 'solid', color: C.bg }, textColor: C.text, fontSize: 11 },
      grid: { vertLines: { color: C.border }, horzLines: { color: C.border } },
      rightPriceScale: { borderColor: C.border, scaleMargins: { top: 0.06, bottom: 0.1 } },
      timeScale: { borderColor: C.border, timeVisible: true, secondsVisible: false, rightOffset: 8, barSpacing: 8, minBarSpacing: 0.3 },
      crosshair: {
        mode: 0,
        vertLine: { color: '#2563EB66', width: 1, style: 3, labelBackgroundColor: C.accent },
        horzLine: { color: '#2563EB66', width: 1, style: 3, labelBackgroundColor: C.accent },
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
    });

    createMainSeries();
    setupPanes();
    setupToolbar();
    setupControls();
    setupEvents();
    setupIndicatorPicker();
    document.getElementById('btn-ind').onclick = () => openIndPicker();
    document.getElementById('btn-buy').onclick = () => openTradeModal('buy');
    document.getElementById('btn-sell').onclick = () => openTradeModal('sell');
    document.getElementById('btn-close').onclick = () => { if (confirm('همه پوزیشن‌ها بسته شود؟')) { positions.forEach(p => closePos(p, 'manual')); positions = []; updateUI(); } };

    chart.subscribeCrosshairMove(param => { updateOHLC(param); syncCrosshair(param); });
    chart.timeScale().subscribeVisibleLogicalRangeChange(syncPanes);

    new ResizeObserver(resizeAll).observe(panel);
    resizeAll();
    notifyRN({ type: 'ready' });
  } catch (e) {
    document.getElementById('load').innerHTML = '<div style="color:#DC2626;padding:20px">خطا: ' + e.message + '</div>';
  }
}

function createMainSeries() {
  if (candleSeries) try { chart.removeSeries(candleSeries); } catch(e) {}
  const o = { priceLineVisible: false, lastValueVisible: true };
  if (chartType === 'candles') candleSeries = chart.addCandlestickSeries({ upColor: C.up, downColor: C.down, borderUpColor: C.up, borderDownColor: C.down, wickUpColor: C.up, wickDownColor: C.down, ...o });
  else if (chartType === 'bars') candleSeries = chart.addBarSeries({ upColor: C.up, downColor: C.down, ...o });
  else if (chartType === 'line') candleSeries = chart.addLineSeries({ color: C.accent, lineWidth: 2, ...o });
  else if (chartType === 'area') candleSeries = chart.addAreaSeries({ topColor: C.accent + '50', bottomColor: C.accent + '05', lineColor: C.accent, lineWidth: 2, ...o });
  if (candles.length) applyCandles();
}

function setupPanes() {
  ['volume', 'rsi'].forEach(name => {
    const el = document.getElementById('pane-' + name);
    const c = LightweightCharts.createChart(el, {
      width: el.clientWidth, height: 70,
      layout: { background: { type: 'solid', color: C.bg }, textColor: C.muted, fontSize: 9 },
      grid: { vertLines: { color: C.border }, horzLines: { color: C.border } },
      rightPriceScale: { borderColor: C.border },
      timeScale: { visible: false, borderColor: C.border },
      handleScroll: false, handleScale: false,
    });
    panes[name] = { chart: c, series: {}, el };
  });
}

function setupToolbar() {
  const bar = document.getElementById('leftbar');
  bar.innerHTML = '';
  TOOL_GROUPS.forEach(g => {
    const w = document.createElement('div');
    w.className = 'tg';
    const l = document.createElement('div');
    l.className = 'gl';
    l.textContent = g.label;
    w.appendChild(l);
    g.tools.forEach(t => {
      const b = document.createElement('button');
      b.className = 'tool' + (t.id === 'cursor' ? ' on' : '');
      b.dataset.tool = t.id;
      b.textContent = t.icon;
      b.onclick = () => selectTool(t.id);
      w.appendChild(b);
    });
    bar.appendChild(w);
  });
}

function selectTool(id) {
  activeTool = id;
  document.querySelectorAll('#leftbar .tool').forEach(el => el.classList.toggle('on', el.dataset.tool === id));
  const isCursor = id === 'cursor' || id === 'cross';
  chart.applyOptions({
    handleScroll: { mouseWheel: isCursor, pressedMouseMove: isCursor, horzTouchDrag: isCursor, vertTouchDrag: false },
    handleScale: { axisPressedMouseMove: isCursor, mouseWheel: isCursor, pinch: isCursor },
  });
  const hints = { trend: 'بکش', ray: 'بکش', ext: 'بکش', angle: 'بکش', hline: 'نقطه بزن', hray: 'نقطه بزن', vline: 'نقطه بزن', crossline: 'نقطه بزن', channel: 'بکش', flattop: 'بکش', fib: 'بکش', fibext: '۳ نقطه', fibfan: 'بکش', fibarc: 'بکش', pitchfork: '۳ نقطه', schiff: '۳ نقطه', rect: 'بکش', circle: 'بکش', ellipse: 'بکش', triangle: 'بکش', arc: 'بکش', brush: 'بکش', marker: 'بکش', text: 'نقطه بزن', note: 'نقطه بزن', arrow: 'بکش', label: 'نقطه بزن', long: 'بکش', short: 'بکش', ruler: 'بکش' };
  if (!isCursor) showHint(hints[id] || 'بکش'); else hideHint();
}

function setupControls() {
  const c = document.getElementById('controls');
  c.innerHTML = '';
  const play = document.createElement('button');
  play.className = 'ctrl play'; play.id = 'btn-play'; play.innerHTML = '▶';
  play.onclick = togglePlay; c.appendChild(play);

  [['⏮', 'restart'], ['⏪', 'back50'], ['◀', 'back'], ['▶', 'step'], ['⏩', 'fwd50'], ['⏭', 'end']].forEach(([ic, act]) => {
    const b = document.createElement('button');
    b.className = 'ctrl'; b.textContent = ic;
    b.onclick = () => stepAction(act); c.appendChild(b);
  });
  c.appendChild(sep());
  SPEEDS.forEach((sp, i) => {
    const b = document.createElement('button');
    b.className = 'ctrl' + (i === speedIdx ? ' on' : '');
    b.dataset.speed = i; b.textContent = sp.label;
    b.onclick = () => { speedIdx = i; document.querySelectorAll('[data-speed]').forEach(el => el.classList.toggle('on', +el.dataset.speed === i)); };
    c.appendChild(b);
  });
  c.appendChild(sep());
  [['📈', 'equity', 'منحنی سرمایه'], ['📊', 'stats', 'آمار'], ['⚙', 'settings', 'تنظیمات'], ['🗑', 'reset', 'ریست']].forEach(([ic, act, ttl]) => {
    const b = document.createElement('button');
    b.className = 'ctrl'; b.textContent = ic; b.title = ttl;
    b.onclick = () => handleAction(act); c.appendChild(b);
  });
}

function sep() { const s = document.createElement('div'); s.className = 'sep'; return s; }

function setupIndicatorPicker() {
  const body = document.getElementById('ind-body');
  const cats = {};
  INDICATORS.forEach(i => { if (!cats[i.cat]) cats[i.cat] = []; cats[i.cat].push(i); });
  let html = '<div class="ind-cats">';
  Object.keys(cats).forEach(cat => {
    html += '<div class="ind-cat" data-cat="' + cat + '"><div class="ttl">' + cat + '<span class="arrow">▸</span></div><div class="sub">' + cats[cat].length + ' اندیکاتور</div><div class="ind-items" style="display:none">';
    cats[cat].forEach(ind => {
      const on = Array.from(indicators.values()).some(e => e.def.id === ind.id);
      html += '<div class="ind-item' + (on ? ' on' : '') + '" data-ind="' + ind.id + '">' + ind.name + '</div>';
    });
    html += '</div></div>';
  });
  html += '</div>';
  body.innerHTML = html;

  body.querySelectorAll('.ind-cat').forEach(el => {
    el.querySelector('.ttl').onclick = () => {
      const items = el.querySelector('.ind-items');
      const isOpen = items.style.display !== 'none';
      items.style.display = isOpen ? 'none' : 'flex';
      el.classList.toggle('open', !isOpen);
    };
  });
  body.querySelectorAll('.ind-item').forEach(el => {
    el.onclick = () => addIndicator(el.dataset.ind);
  });
}

function openIndPicker() {
  setupIndicatorPicker();
  document.getElementById('modal-ind').classList.add('on');
}

window.closeModal = function(id) { document.getElementById(id).classList.remove('on'); };

function addIndicator(id) {
  const def = INDICATORS.find(i => i.id === id);
  if (!def) return;
  // Check existing with default params
  const key = id + ':default';
  if (Array.from(indicators.values()).some(e => e.def.id === id)) {
    // Remove existing
    removeIndicatorByDef(id);
    setupIndicatorPicker();
    return;
  }
  // Build params from def defaults
  const params = {};
  def.params.forEach(p => { params[p.k] = p.def; });

  if (def.pane) {
    if (!activePanes.includes(def.pane)) activePanes.push(def.pane);
    updatePaneLayout();
    renderPaneIndicator(def.pane, def, params);
  } else {
    renderMainIndicator(def, params, key);
  }
  renderIndChips();
  setupIndicatorPicker();
  showHint(def.name + ' اضافه شد');
}

function removeIndicatorByDef(id) {
  const toRemove = [];
  indicators.forEach((entry, key) => { if (entry.def.id === id) toRemove.push(key); });
  toRemove.forEach(key => {
    const entry = indicators.get(key);
    entry.series.forEach(s => { try { chart.removeSeries(s); } catch(e) {} });
    indicators.delete(key);
  });
  // Also check panes
  Object.keys(panes).forEach(paneName => {
    const p = panes[paneName];
    if (p.series[id]) {
      try { p.chart.removeSeries(p.series[id]); } catch(e) {}
      delete p.series[id];
    }
  });
  renderIndChips();
}

function renderIndChips() {
  const el = document.getElementById('ind-chips');
  const seen = new Set();
  let html = '';
  indicators.forEach(entry => {
    if (seen.has(entry.def.id)) return;
    seen.add(entry.def.id);
    html += '<div class="ichip" data-ind="' + entry.def.id + '">' + entry.def.name + '<span class="x">✕</span></div>';
  });
  // pane indicators (rsi, stoch, etc)
  activePanes.forEach(pane => {
    if (pane === 'volume') html += '<div class="ichip">Vol<span class="x" data-pane="volume">✕</span></div>';
    if (pane === 'rsi') html += '<div class="ichip">RSI<span class="x" data-pane="rsi">✕</span></div>';
  });
  el.innerHTML = html;
  el.querySelectorAll('.ichip').forEach(chip => {
    const indId = chip.dataset.ind;
    if (indId) {
      chip.onclick = () => { removeIndicatorByDef(indId); showHint('حذف شد'); };
    }
    const paneId = chip.querySelector('[data-pane]')?.dataset.pane;
    if (paneId) {
      chip.onclick = () => { activePanes = activePanes.filter(p => p !== paneId); updatePaneLayout(); renderIndChips(); };
    }
  });
}

function renderMainIndicator(def, params, key) {
  if (!candleSeries || !candles.length) return;
  const c = candles.slice(0, visibleCount);
  const lo = { priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false };
  const series = [];
  try {
    if (def.id === 'sma') { const s = chart.addLineSeries({ color: def.color, lineWidth: 2, ...lo }); s.setData(M.sma(c, params.period)); series.push(s); }
    else if (def.id === 'ema') { const s = chart.addLineSeries({ color: def.color, lineWidth: 2, ...lo }); s.setData(M.ema(c, params.period)); series.push(s); }
    else if (def.id === 'wma') { const s = chart.addLineSeries({ color: def.color, lineWidth: 2, ...lo }); s.setData(M.wma(c, params.period)); series.push(s); }
    else if (def.id === 'hma') { const s = chart.addLineSeries({ color: def.color, lineWidth: 2, ...lo }); s.setData(M.hma(c, params.period)); series.push(s); }
    else if (def.id === 'vwma') { const s = chart.addLineSeries({ color: def.color, lineWidth: 2, ...lo }); s.setData(M.vwma(c, params.period)); series.push(s); }
    else if (def.id === 'bb') { const bb = M.bb(c, params.period, params.mult); const u = chart.addLineSeries({ color: '#0891B2', lineWidth: 1, lineStyle: 2, ...lo }); u.setData(bb.u); const m = chart.addLineSeries({ color: '#0891B280', lineWidth: 1, ...lo }); m.setData(bb.m); const l = chart.addLineSeries({ color: '#0891B2', lineWidth: 1, lineStyle: 2, ...lo }); l.setData(bb.l); series.push(u, m, l); }
    else if (def.id === 'keltner') { const kc = M.keltner(c, params.period, params.mult); const u = chart.addLineSeries({ color: '#F59E0B', lineWidth: 1, lineStyle: 2, ...lo }); u.setData(kc.u); const m = chart.addLineSeries({ color: '#F59E0B80', lineWidth: 1, ...lo }); m.setData(kc.m); const l = chart.addLineSeries({ color: '#F59E0B', lineWidth: 1, lineStyle: 2, ...lo }); l.setData(kc.l); series.push(u, m, l); }
    else if (def.id === 'donchian') { const dc = M.donchian(c, params.period); const u = chart.addLineSeries({ color: '#DC2626', lineWidth: 1, lineStyle: 2, ...lo }); u.setData(dc.u); const l = chart.addLineSeries({ color: '#16A34A', lineWidth: 1, lineStyle: 2, ...lo }); l.setData(dc.l); series.push(u, l); }
    else if (def.id === 'psar') { const s = chart.addLineSeries({ color: '#0891B2', lineWidth: 0, pointMarkersVisible: true, pointMarkersRadius: 2, ...lo }); s.setData(M.psar(c, params.step, params.max)); series.push(s); }
    else if (def.id === 'supertrend') { const s = chart.addLineSeries({ color: '#16A34A', lineWidth: 2, ...lo }); s.setData(M.supertrend(c, params.period, params.mult)); series.push(s); }
    else if (def.id === 'vwap') { const s = chart.addLineSeries({ color: '#F59E0B', lineWidth: 2, lineStyle: 2, ...lo }); s.setData(M.vwap(c)); series.push(s); }
  } catch (e) { console.log(e); return; }
  indicators.set(key, { def, params, series });
}

function renderPaneIndicator(paneName, def, params) {
  const p = panes[paneName];
  if (!p || !candles.length) return;
  const c = candles.slice(0, visibleCount);
  // Clear old for this pane
  if (p.series[def.id]) try { p.chart.removeSeries(p.series[def.id]); } catch(e) {}

  if (def.id === 'volume') {
    p.series[def.id] = p.chart.addHistogramSeries({ color: '#2563EB40', priceFormat: { type: 'volume' }, lastValueVisible: false });
    p.series[def.id].setData(c.map(x => ({ time: Math.floor(x.timestamp / 1000), value: x.volume || 0, color: x.close >= x.open ? C.up + '60' : C.down + '60' })));
  } else if (def.id === 'rsi') {
    p.series[def.id] = p.chart.addLineSeries({ color: '#7C3AED', lineWidth: 2, priceLineVisible: false });
    p.series[def.id].setData(M.rsi(c, params.period));
  } else if (def.id === 'stoch') {
    const st = M.stoch(c, params.k, params.d);
    p.series[def.id] = p.chart.addLineSeries({ color: '#2563EB', lineWidth: 2, priceLineVisible: false });
    p.series[def.id].setData(st.k);
    p.series[def.id + '_d'] = p.chart.addLineSeries({ color: '#F59E0B', lineWidth: 2, priceLineVisible: false });
    p.series[def.id + '_d'].setData(st.d);
  } else if (def.id === 'cci') {
    p.series[def.id] = p.chart.addLineSeries({ color: '#DB2777', lineWidth: 2, priceLineVisible: false });
    p.series[def.id].setData(M.cci(c, params.period));
  } else if (def.id === 'willr') {
    p.series[def.id] = p.chart.addLineSeries({ color: '#0891B2', lineWidth: 2, priceLineVisible: false });
    p.series[def.id].setData(M.willr(c, params.period));
  } else if (def.id === 'macd') {
    const mc = M.macd(c, params.fast, params.slow, params.signal);
    p.series[def.id + '_h'] = p.chart.addHistogramSeries({ priceLineVisible: false, lastValueVisible: false });
    p.series[def.id + '_h'].setData(mc.h);
    p.series[def.id] = p.chart.addLineSeries({ color: '#2563EB', lineWidth: 2, priceLineVisible: false });
    p.series[def.id].setData(mc.m);
    p.series[def.id + '_s'] = p.chart.addLineSeries({ color: '#F59E0B', lineWidth: 2, priceLineVisible: false });
    p.series[def.id + '_s'].setData(mc.s);
  } else if (def.id === 'atr') {
    p.series[def.id] = p.chart.addLineSeries({ color: '#16A34A', lineWidth: 2, priceLineVisible: false });
    p.series[def.id].setData(M.atr(c, params.period));
  }
  p.el.style.display = 'block';
}

function updatePaneLayout() {
  let bottom = 0;
  ['volume', 'rsi'].forEach(name => {
    const p = panes[name];
    if (!p) return;
    if (activePanes.includes(name)) {
      p.el.classList.add('on');
      p.el.style.bottom = bottom + 'px';
      bottom += 70;
      p.chart.applyOptions({ width: p.el.clientWidth });
    } else {
      p.el.classList.remove('on');
    }
  });
  const panel = document.getElementById('chart-panel');
  panel.style.bottom = bottom + 'px';
  if (chart) chart.applyOptions({ width: panel.clientWidth, height: panel.clientHeight });
  resizeAll();
}

function syncPanes() {
  const r = chart.timeScale().getVisibleLogicalRange();
  if (!r) return;
  Object.values(panes).forEach(p => { if (p && p.chart) p.chart.timeScale().setVisibleLogicalRange(r); });
}

// =========================================================
// CANDLES
// =========================================================
function applyCandles() {
  if (!candleSeries || !candles.length) return;
  const vis = candles.slice(0, visibleCount);
  candleSeries.setData(vis.map(x => chartType === 'line' || chartType === 'area' ? { time: Math.floor(x.timestamp / 1000), value: x.close } : { time: Math.floor(x.timestamp / 1000), open: x.open, high: x.high, low: x.low, close: x.close }));
  updateOHLC(null);
  updateMarkers();
  document.getElementById('cn').textContent = visibleCount;
  document.getElementById('ct').textContent = candles.length;

  // Update pane indicators
  activePanes.forEach(pane => {
    const p = panes[pane];
    if (!p) return;
    Object.keys(p.series).forEach(id => {
      const def = INDICATORS.find(i => i.id === id);
      if (def) renderPaneIndicator(pane, def, indicators.get(id + ':default')?.params || def.params.reduce((a, x) => ({ ...a, [x.k]: x.def }), {}));
    });
  });
  // Update main indicators
  const snapshot = new Map(indicators);
  indicators.clear();
  snapshot.forEach((entry, key) => {
    entry.series.forEach(s => { try { chart.removeSeries(s); } catch(e) {} });
    renderMainIndicator(entry.def, entry.params, key);
  });

  updateUI();
}

function updateMarkers() {
  if (!candleSeries) return;
  const markers = [];
  closedTrades.forEach(t => {
    if (t.entryIdx < visibleCount) markers.push({ time: Math.floor(candles[t.entryIdx].timestamp / 1000), position: t.direction === 'buy' ? 'belowBar' : 'aboveBar', color: t.direction === 'buy' ? C.up : C.down, shape: t.direction === 'buy' ? 'arrowUp' : 'arrowDown', text: t.direction === 'buy' ? 'B' : 'S' });
    if (t.exitIdx !== undefined && t.exitIdx < visibleCount) markers.push({ time: Math.floor(candles[t.exitIdx].timestamp / 1000), position: t.result >= 0 ? 'aboveBar' : 'belowBar', color: t.result >= 0 ? C.up : C.down, shape: 'circle', text: (t.result >= 0 ? '✓' : '✗') });
  });
  positions.forEach(t => {
    if (t.entryIdx < visibleCount) markers.push({ time: Math.floor(candles[t.entryIdx].timestamp / 1000), position: t.direction === 'buy' ? 'belowBar' : 'aboveBar', color: C.accent, shape: 'square', text: 'L' });
  });
  markers.sort((a, b) => a.time - b.time);
  try { candleSeries.setMarkers(markers); } catch(e) {}
}

// =========================================================
// TRADING
// =========================================================
function openTradeModal(direction) {
  if (visibleCount >= candles.length) { showHint('به آخر رسیدی'); return; }
  const idx = visibleCount - 1;
  const c = candles[idx];
  const atrArr = M.atr(candles.slice(0, idx + 1), 14);
  const atr = atrArr.length ? atrArr[atrArr.length - 1].value : c.close * 0.005;
  const entry = c.close;
  const risk = atr * settings.atrMult;
  const sl = direction === 'buy' ? entry - risk : entry + risk;
  const tp = direction === 'buy' ? entry + risk * settings.rr : entry - risk * settings.rr;

  document.getElementById('trade-title').textContent = direction === 'buy' ? '🟢 ورود خرید' : '🔴 ورود فروش';
  const body = document.getElementById('trade-body');
  body.innerHTML = \`
    <div class="mrow"><label>نوع سفارش</label>
      <div class="row">
        <button id="ot-mkt" class="ok" style="background:${C.accent};color:#FFF">Market</button>
        <button id="ot-lim" style="background:${C.panel};color:${C.text};border:1px solid ${C.border}">Limit</button>
        <button id="ot-stp" style="background:${C.panel};color:${C.text};border:1px solid ${C.border}">Stop</button>
      </div>
    </div>
    <div class="mrow"><label>قیمت ورود</label><input type="number" id="te" value="\${entry.toFixed(4)}" step="any"/></div>
    <div class="mrow"><label>حد ضرر (SL)</label><input type="number" id="tsl" value="\${sl.toFixed(4)}" step="any"/></div>
    <div class="mrow"><label>حد سود (TP)</label><input type="number" id="ttp" value="\${tp.toFixed(4)}" step="any"/></div>
    <div class="mrow"><label>حجم پیشنهادی (Risk \${settings.riskPct}%)</label><div class="row"><input type="number" id="tsz" value="" step="any" readonly/><span class="hint" id="trisk"></span></div></div>
    <div class="acts">
      <button class="cancel" onclick="closeModal('modal-trade')">انصراف</button>
      <button class="ok \${direction}" onclick="confirmTrade('\${direction}')">ثبت</button>
    </div>
  \`;
  let orderType = 'market';
  const setOT = (t) => { orderType = t; ['mkt','lim','stp'].forEach(x => { const el = document.getElementById('ot-' + x); el.style.background = (x === t === 'market' ? C.accent : t === 'limit' && x === 'lim' ? C.accent : t === 'stop' && x === 'stp' ? C.accent : C.panel); el.style.color = (x === t === 'market' || (t === 'limit' && x === 'lim') || (t === 'stop' && x === 'stp')) ? '#FFF' : C.text; }); };
  ['mkt','lim','stp'].forEach(x => { document.getElementById('ot-' + x).onclick = () => { orderType = x === 'mkt' ? 'market' : x === 'lim' ? 'limit' : 'stop'; ['mkt','lim','stp'].forEach(y => { const el = document.getElementById('ot-' + y); const on = y === x; el.style.background = on ? C.accent : C.panel; el.style.color = on ? '#FFF' : C.text; }); }; });
  const updateSize = () => {
    const e = parseFloat(document.getElementById('te').value);
    const s = parseFloat(document.getElementById('tsl').value);
    if (!isFinite(e) || !isFinite(s) || e === s) { document.getElementById('tsz').value = ''; return; }
    const risk = Math.abs(e - s);
    const riskUSD = settings.capital * settings.riskPct / 100;
    const size = riskUSD / risk;
    document.getElementById('tsz').value = size.toFixed(4);
    document.getElementById('trisk').textContent = '= $' + riskUSD.toFixed(2);
  };
  ['te','tsl'].forEach(id => document.getElementById(id).oninput = updateSize);
  updateSize();
  document.getElementById('modal-trade').classList.add('on');
}

window.confirmTrade = function(direction) {
  const e = parseFloat(document.getElementById('te').value);
  const sl = parseFloat(document.getElementById('tsl').value);
  const tp = parseFloat(document.getElementById('ttp').value);
  const size = parseFloat(document.getElementById('tsz').value);
  if (!isFinite(e) || !isFinite(sl) || !isFinite(tp) || !isFinite(size)) { alert('اعداد نامعتبر'); return; }
  if (direction === 'buy' && !(sl < e && tp > e)) { alert('BUY: باید SL < Entry < TP'); return; }
  if (direction === 'sell' && !(sl > e && tp < e)) { alert('SELL: باید SL > Entry > TP'); return; }

  const idx = visibleCount - 1;
  const risk = Math.abs(e - sl);
  const riskUSD = risk * size;
  const pos = {
    id: 'p' + Date.now(),
    direction, entryPrice: e, sl, tp, size, risk: riskUSD, riskPerUnit: risk,
    entryIdx: idx, entryTime: candles[idx].timestamp,
    breakeven: false, trailingStop: sl,
    maxFavorable: 0, maxAdverse: 0,
    partial: [],
  };
  positions.push(pos);
  closeModal('modal-trade');
  updateUI();
  updateMarkers();
  showHint('پوزیشن باز شد ✓');
};

function closePos(pos, reason) {
  const idx = visibleCount - 1;
  const c = candles[idx];
  let exit = c.close;
  if (reason === 'sl') exit = pos.sl;
  else if (reason === 'tp') exit = pos.tp;
  else if (reason === 'trail') exit = pos.trailingStop;

  const perUnit = pos.direction === 'buy' ? exit - pos.entryPrice : pos.entryPrice - exit;
  const result = perUnit * pos.size;
  const resultR = pos.risk > 0 ? result / pos.risk : 0;

  closedTrades.push({ ...pos, exitIdx: idx, exitPrice: exit, exitTime: c.timestamp, result, resultR, closeReason: reason || 'manual' });
  positions = positions.filter(p => p.id !== pos.id);
  updateStats();
  updateUI();
  updateMarkers();
  showHint('بسته شد: ' + (result >= 0 ? '+' : '') + '$' + result.toFixed(2));
}

function checkPositions() {
  const idx = visibleCount - 1;
  const c = candles[idx];
  if (!c) return;
  [...positions].forEach(pos => {
    const risk = pos.riskPerUnit;

    // Max F/A
    const fav = pos.direction === 'buy' ? c.high : c.low;
    const adv = pos.direction === 'buy' ? c.low : c.high;
    pos.maxFavorable = Math.max(pos.maxFavorable, Math.abs(fav - pos.entryPrice) / risk);
    pos.maxAdverse = Math.max(pos.maxAdverse, Math.abs(adv - pos.entryPrice) / risk);

    // SL
    const hitSL = pos.direction === 'buy' ? c.low <= pos.trailingStop : c.high >= pos.trailingStop;
    if (hitSL) { closePos(pos, 'sl'); return; }

    // TP
    const hitTP = pos.direction === 'buy' ? c.high >= pos.tp : c.low <= pos.tp;
    if (hitTP) { closePos(pos, 'tp'); return; }

    // Breakeven
    if (settings.breakeven && !pos.breakeven && risk > 0) {
      const r = pos.direction === 'buy' ? (c.high - pos.entryPrice) / risk : (pos.entryPrice - c.low) / risk;
      if (r >= settings.breakevenAtR) { pos.breakeven = true; pos.sl = pos.entryPrice; pos.trailingStop = pos.entryPrice; }
    }

    // Trailing
    if (settings.trailing) {
      const atrArr = M.atr(candles.slice(0, idx + 1), 14);
      const atr = atrArr.length ? atrArr[atrArr.length - 1].value : 0;
      const dist = atr * settings.trailingATR;
      if (pos.direction === 'buy') { const n = c.close - dist; if (n > pos.trailingStop) pos.trailingStop = n; }
      else { const n = c.close + dist; if (n < pos.trailingStop) pos.trailingStop = n; }
    }
  });
}

function updateStats() {
  const closed = closedTrades;
  if (!closed.length) return;
  const wins = closed.filter(t => t.result > 0);
  const losses = closed.filter(t => t.result < 0);
  const grossWin = wins.reduce((s, t) => s + t.result, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.result, 0));
  const total = closed.reduce((s, t) => s + t.result, 0);
  const totalR = closed.reduce((s, t) => s + t.resultR, 0);
  const returns = closed.map(t => t.result);
  const avgR = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + Math.pow(r - avgR, 2), 0) / returns.length;
  const std = Math.sqrt(variance);
  const sharpe = std > 0 ? avgR / std : 0;
  // Equity curve
  let bal = settings.capital;
  equity = [{ time: Math.floor(candles[0].timestamp / 1000), value: bal }];
  closed.forEach(t => { bal += t.result; if (t.exitTime) equity.push({ time: Math.floor(t.exitTime / 1000), value: bal }); });
}

function updateUI() {
  // Position panel
  const panel = document.getElementById('pos-panel');
  if (positions.length === 0) {
    panel.classList.remove('on');
    document.getElementById('btn-close').style.display = 'none';
  } else {
    panel.classList.add('on');
    document.getElementById('btn-close').style.display = 'flex';
    const pos = positions[0];  // show first
    const c = candles[visibleCount - 1];
    const pnl = pos.direction === 'buy' ? (c.close - pos.entryPrice) * pos.size : (pos.entryPrice - c.close) * pos.size;
    const risk = pos.riskPerUnit;
    const r = risk > 0 ? (pos.direction === 'buy' ? (c.close - pos.entryPrice) / risk : (pos.entryPrice - c.close) / risk) : 0;
    let html = '<div class="hd"><span class="dir ' + pos.direction + '">' + (pos.direction === 'buy' ? '▲ BUY' : '▼ SELL') + '</span>';
    if (positions.length > 1) html += '<span style="color:' + C.muted + '">+' + (positions.length - 1) + '</span>';
    html += '</div>';
    html += '<div class="row"><span class="lbl">ورود</span><span class="val">' + pos.entryPrice.toFixed(4) + '</span></div>';
    html += '<div class="row"><span class="lbl">SL</span><span class="val" style="color:' + C.down + '">' + pos.trailingStop.toFixed(4) + '</span></div>';
    html += '<div class="row"><span class="lbl">TP</span><span class="val" style="color:' + C.up + '">' + pos.tp.toFixed(4) + '</span></div>';
    html += '<div class="row"><span class="lbl">حجم</span><span class="val">' + pos.size.toFixed(3) + '</span></div>';
    html += '<div class="pnl" style="color:' + (pnl >= 0 ? C.up : C.down) + '">' + (pnl >= 0 ? '+' : '') + '$' + pnl.toFixed(2) + ' (' + (r >= 0 ? '+' : '') + r.toFixed(2) + 'R)</div>';
    html += '<div class="badges">';
    if (pos.breakeven) html += '<span class="badge" style="background:' + C.panel + ';color:' + C.muted + '">BE</span>';
    if (settings.trailing) html += '<span class="badge" style="background:' + C.panel + ';color:' + C.muted + '">TR</span>';
    html += '</div>';
    panel.innerHTML = html;
  }
}

// =========================================================
// PLAY
// =========================================================
function togglePlay() {
  if (visibleCount >= candles.length) { showHint('به آخر رسیدی'); return; }
  isPlaying = !isPlaying;
  const b = document.getElementById('btn-play');
  b.classList.toggle('on', isPlaying);
  b.innerHTML = isPlaying ? '⏸' : '▶';
  if (isPlaying) {
    playTimer = setInterval(() => {
      if (visibleCount >= candles.length) { togglePlay(); return; }
      visibleCount++;
      applyCandles();
      checkPositions();
      updateUI();
    }, SPEEDS[speedIdx].value);
  } else if (playTimer) { clearInterval(playTimer); playTimer = null; }
}

function stepAction(act) {
  if (playTimer) { clearInterval(playTimer); playTimer = null; isPlaying = false; document.getElementById('btn-play').classList.remove('on'); document.getElementById('btn-play').innerHTML = '▶'; }
  const step = (n) => {
    for (let i = 0; i < n; i++) {
      if (visibleCount >= candles.length) break;
      visibleCount++;
      checkPositions();
    }
    applyCandles();
    updateUI();
  };
  if (act === 'restart') { visibleCount = 100; applyCandles(); updateUI(); }
  else if (act === 'back50') { visibleCount = Math.max(100, visibleCount - 50); applyCandles(); updateUI(); }
  else if (act === 'back') { visibleCount = Math.max(100, visibleCount - 1); applyCandles(); updateUI(); }
  else if (act === 'step') step(1);
  else if (act === 'fwd50') step(50);
  else if (act === 'end') { visibleCount = candles.length; applyCandles(); updateUI(); }
}

function handleAction(a) {
  if (a === 'equity') openEquity();
  else if (a === 'stats') openStats();
  else if (a === 'settings') notifyRN({ type: 'open-settings' });
  else if (a === 'reset') {
    if (!confirm('همه چیز ریست شود؟')) return;
    visibleCount = 100; positions = []; closedTrades = []; drawings = []; drawHistory = [[]]; histIdx = 0; indicators.clear(); activePanes = []; equity = [];
    Object.keys(panes).forEach(k => { Object.keys(panes[k].series).forEach(s => { try { panes[k].chart.removeSeries(panes[k].series[s]); } catch(e) {} }); panes[k].series = {}; });
    applyCandles(); updateUI(); updateMarkers(); redraw(); renderIndChips(); updatePaneLayout();
    showHint('ریست شد');
  }
}

function openStats() {
  const s = computeStats();
  const body = document.getElementById('stats-body');
  body.innerHTML = \`
    <div class="stats-grid">
      <div class="stat-box"><span class="lbl">معاملات</span><span class="val">\${s.total}</span></div>
      <div class="stat-box"><span class="lbl">برد</span><span class="val" style="color:\${C.up}">\${s.wins}</span></div>
      <div class="stat-box"><span class="lbl">باخت</span><span class="val" style="color:\${C.down}">\${s.losses}</span></div>
      <div class="stat-box"><span class="lbl">وین‌ریت</span><span class="val">\${s.winRate.toFixed(1)}%</span></div>
      <div class="stat-box"><span class="lbl">سود/زیان</span><span class="val" style="color:\${s.totalPnL >= 0 ? C.up : C.down}">\${s.totalPnL >= 0 ? '+' : ''}$\${s.totalPnL.toFixed(2)}</span></div>
      <div class="stat-box"><span class="lbl">کل R</span><span class="val" style="color:\${s.totalR >= 0 ? C.up : C.down}">\${s.totalR >= 0 ? '+' : ''}\${s.totalR.toFixed(2)}R</span></div>
      <div class="stat-box"><span class="lbl">Profit Factor</span><span class="val">\${s.profitFactor.toFixed(2)}</span></div>
      <div class="stat-box"><span class="lbl">Sharpe</span><span class="val">\${s.sharpe.toFixed(2)}</span></div>
      <div class="stat-box"><span class="lbl">میانگین R</span><span class="val">\${s.avgR.toFixed(2)}R</span></div>
      <div class="stat-box"><span class="lbl">بزرگ‌ترین برد</span><span class="val" style="color:\${C.up}">+$\${s.largestWin.toFixed(2)}</span></div>
      <div class="stat-box"><span class="lbl">بزرگ‌ترین باخت</span><span class="val" style="color:\${C.down}">$\${s.largestLoss.toFixed(2)}</span></div>
      <div class="stat-box"><span class="lbl">Max DD</span><span class="val" style="color:\${C.down}">\${s.maxDD.toFixed(1)}%</span></div>
    </div>
    <div class="stats-section">
      <h4>معاملات اخیر</h4>
      <div class="tlist">
        \${closedTrades.slice(-20).reverse().map(t => \`
          <div class="trade-item">
            <div class="left">
              <span class="dir \${t.direction}">\${t.direction === 'buy' ? '▲ BUY' : '▼ SELL'}</span>
              <span class="meta">@ \${t.entryPrice.toFixed(2)} → \${t.exitPrice?.toFixed(2)} · \${t.entryIdx}→\${t.exitIdx}</span>
            </div>
            <div class="right \${t.result >= 0 ? 'win' : 'loss'}">\${t.result >= 0 ? '+' : ''}$\${t.result.toFixed(2)}<span class="r">\${t.resultR >= 0 ? '+' : ''}\${t.resultR.toFixed(2)}R</span></div>
          </div>
        \`).join('')}
      </div>
    </div>
  \`;
  document.getElementById('modal-stats').classList.add('on');
}

function computeStats() {
  const closed = closedTrades;
  const wins = closed.filter(t => t.result > 0);
  const losses = closed.filter(t => t.result < 0);
  const gw = wins.reduce((s, t) => s + t.result, 0);
  const gl = Math.abs(losses.reduce((s, t) => s + t.result, 0));
  const total = closed.reduce((s, t) => s + t.result, 0);
  const totalR = closed.reduce((s, t) => s + t.resultR, 0);
  const rets = closed.map(t => t.result);
  const avg = rets.length ? rets.reduce((a, b) => a + b, 0) / rets.length : 0;
  const v = rets.length ? rets.reduce((s, r) => s + Math.pow(r - avg, 2), 0) / rets.length : 0;
  const sd = Math.sqrt(v);
  let bal = settings.capital, peak = settings.capital, maxDD = 0;
  closed.forEach(t => { bal += t.result; if (bal > peak) peak = bal; const dd = peak > 0 ? ((peak - bal) / peak) * 100 : 0; if (dd > maxDD) maxDD = dd; });
  return {
    total: closed.length, wins: wins.length, losses: losses.length,
    winRate: closed.length ? (wins.length / closed.length) * 100 : 0,
    totalPnL: total, totalR, avgR: closed.length ? totalR / closed.length : 0,
    profitFactor: gl > 0 ? gw / gl : gw > 0 ? 99 : 0,
    sharpe: sd > 0 ? avg / sd : 0,
    largestWin: Math.max(...rets, 0), largestLoss: Math.min(...rets, 0), maxDD,
  };
}

function openEquity() {
  document.getElementById('equity').classList.add('on');
  setTimeout(() => {
    const el = document.getElementById('equity-chart');
    const c = LightweightCharts.createChart(el, {
      width: el.clientWidth, height: 220,
      layout: { background: { type: 'solid', color: C.bg }, textColor: C.text, fontSize: 10 },
      grid: { vertLines: { color: C.border }, horzLines: { color: C.border } },
      rightPriceScale: { borderColor: C.border },
      timeScale: { borderColor: C.border, timeVisible: true },
    });
    if (equity.length > 1) {
      const s = c.addAreaSeries({ topColor: '#16A34A40', bottomColor: '#16A34A05', lineColor: '#16A34A', lineWidth: 2 });
      s.setData(equity);
    }
  }, 100);
}

// =========================================================
// DRAWING
// =========================================================
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
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  if (hideDrawings) return;
  const all = drawInProg ? [...drawings, drawInProg] : drawings;
  all.forEach(drawOne);
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
  const t = chart.timeScale().coordinateToTime(pos.x);
  const p = candleSeries.coordinateToPrice(pos.y);
  if (t === null || p === null) return null;
  return { time: t, price: p };
}
function toScreen(pt) {
  if (!chart || !candleSeries || !pt) return null;
  const x = chart.timeScale().timeToCoordinate(pt.time);
  const y = candleSeries.priceToCoordinate(pt.price);
  if (x === null || y === null) return null;
  return { x, y };
}
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
}
function onDown(e) {
  if (activeTool === 'cursor' || activeTool === 'cross' || activeTool === 'dot') return;
  e.preventDefault();
  const pt = toChart(evtPos(e));
  if (!pt) return;
  isDrawing = true;
  if (['hline','hray','vline','crossline','text','note','label'].includes(activeTool)) {
    if (activeTool === 'text' || activeTool === 'note') {
      const txt = prompt('متن:', ''); if (!txt) { isDrawing = false; return; }
      pushDraw({ tool: activeTool, pts: [pt], color: C.accent, text: txt });
    } else pushDraw({ tool: activeTool, pts: [pt], color: C.accent });
    isDrawing = false; return;
  }
  const req = { fibext: 3, pitchfork: 3, schiff: 3 }[activeTool] || 2;
  drawInProg = { tool: activeTool, pts: [pt], color: C.accent, required: req };
  redraw();
}
function onMove(e) {
  if (!isDrawing || !drawInProg) return;
  e.preventDefault();
  const pt = toChart(evtPos(e)); if (!pt) return;
  if (drawInProg.pts.length === 1) drawInProg.pts.push(pt);
  else drawInProg.pts[drawInProg.pts.length - 1] = pt;
  redraw();
}
function onUp() {
  if (!isDrawing || !drawInProg) return;
  isDrawing = false;
  if (drawInProg.pts.length < (drawInProg.required || 2)) return;
  pushDraw(drawInProg); drawInProg = null; redraw();
}
function pushDraw(d) {
  drawings.push(d);
  drawHistory = drawHistory.slice(0, histIdx + 1);
  drawHistory.push(JSON.parse(JSON.stringify(drawings)));
  histIdx = drawHistory.length - 1;
  redraw();
}
function drawOne(d) {
  const S = d.pts.map(toScreen);
  if (S.some(s => !s)) return;
  const c = d.color || C.accent;
  ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = 2; ctx.lineCap = 'round';
  const line = (a, b) => { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); };
  if (d.tool === 'trend') line(S[0], S[1]);
  else if (d.tool === 'ray') { const dx = S[1].x - S[0].x, dy = S[1].y - S[0].y, l = Math.hypot(dx, dy); if (!l) return; const sc = 3000/l; ctx.beginPath(); ctx.moveTo(S[0].x, S[0].y); ctx.lineTo(S[0].x + dx*sc, S[0].y + dy*sc); ctx.stroke(); }
  else if (d.tool === 'ext') { const dx = S[1].x - S[0].x, dy = S[1].y - S[0].y, l = Math.hypot(dx, dy); if (!l) return; const sc = 3000/l; ctx.beginPath(); ctx.moveTo(S[0].x - dx*sc, S[0].y - dy*sc); ctx.lineTo(S[1].x + dx*sc, S[1].y + dy*sc); ctx.stroke(); }
  else if (d.tool === 'hline') { ctx.setLineDash([8,4]); ctx.beginPath(); ctx.moveTo(0, S[0].y); ctx.lineTo(overlay.width, S[0].y); ctx.stroke(); ctx.setLineDash([]); }
  else if (d.tool === 'vline') { ctx.setLineDash([8,4]); ctx.beginPath(); ctx.moveTo(S[0].x, 0); ctx.lineTo(S[0].x, overlay.height); ctx.stroke(); ctx.setLineDash([]); }
  else if (d.tool === 'hray') { ctx.beginPath(); ctx.moveTo(S[0].x, S[0].y); ctx.lineTo(overlay.width, S[0].y); ctx.stroke(); }
  else if (d.tool === 'crossline') { ctx.setLineDash([8,4]); ctx.beginPath(); ctx.moveTo(0, S[0].y); ctx.lineTo(overlay.width, S[0].y); ctx.moveTo(S[0].x, 0); ctx.lineTo(S[0].x, overlay.height); ctx.stroke(); ctx.setLineDash([]); }
  else if (d.tool === 'fib') { const lv = [0,0.236,0.382,0.5,0.618,0.786,1,1.272,1.618]; const cl = ['#EF4444','#F97316','#F59E0B','#FBBF24','#A3E635','#16A34A','#0891B2','#7C3AED','#DB2777']; const x1 = Math.min(S[0].x, S[1].x), x2 = Math.max(S[0].x, S[1].x); lv.forEach((l, i) => { const y = S[0].y + (S[1].y - S[0].y) * l; ctx.strokeStyle = cl[i]; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke(); ctx.fillStyle = cl[i]; ctx.font = 'bold 9px sans-serif'; ctx.fillText((l*100).toFixed(1)+'%', x2+3, y+3); }); }
  else if (d.tool === 'rect') { const x = Math.min(S[0].x, S[1].x), y = Math.min(S[0].y, S[1].y); ctx.fillStyle = c+'25'; ctx.fillRect(x, y, Math.abs(S[1].x-S[0].x), Math.abs(S[1].y-S[0].y)); ctx.strokeRect(x, y, Math.abs(S[1].x-S[0].x), Math.abs(S[1].y-S[0].y)); }
  else if (d.tool === 'circle') { const r = Math.hypot(S[1].x-S[0].x, S[1].y-S[0].y); ctx.fillStyle = c+'25'; ctx.beginPath(); ctx.arc(S[0].x, S[0].y, r, 0, Math.PI*2); ctx.fill(); ctx.stroke(); }
  else if (d.tool === 'triangle') { ctx.fillStyle = c+'25'; const cx = (S[0].x+S[1].x)/2; ctx.beginPath(); ctx.moveTo(cx, Math.min(S[0].y, S[1].y)); ctx.lineTo(S[0].x, Math.max(S[0].y, S[1].y)); ctx.lineTo(S[1].x, Math.max(S[0].y, S[1].y)); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  else if (d.tool === 'text') { ctx.font = 'bold 14px sans-serif'; ctx.fillText(d.text || '', S[0].x, S[0].y); }
  else if (d.tool === 'note') { ctx.font = 'bold 12px sans-serif'; const w = ctx.measureText(d.text||'').width+20; ctx.fillStyle = '#FBBF24'; ctx.fillRect(S[0].x, S[0].y-28, w, 26); ctx.beginPath(); ctx.moveTo(S[0].x, S[0].y-2); ctx.lineTo(S[0].x+8, S[0].y-2); ctx.lineTo(S[0].x+4, S[0].y+4); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#000'; ctx.fillText(d.text||'', S[0].x+10, S[0].y-10); }
  else if (d.tool === 'arrow') { line(S[0], S[1]); const ang = Math.atan2(S[1].y-S[0].y, S[1].x-S[0].x); const sz = 12; ctx.beginPath(); ctx.moveTo(S[1].x, S[1].y); ctx.lineTo(S[1].x-sz*Math.cos(ang-Math.PI/6), S[1].y-sz*Math.sin(ang-Math.PI/6)); ctx.lineTo(S[1].x-sz*Math.cos(ang+Math.PI/6), S[1].y-sz*Math.sin(ang+Math.PI/6)); ctx.closePath(); ctx.fill(); }
  else if (d.tool === 'ruler' || d.tool === 'long' || d.tool === 'short') {
    const pd = d.pts[1].price - d.pts[0].price;
    const pct = (pd / d.pts[0].price) * 100;
    const up = pd >= 0;
    const cc = d.tool === 'long' ? C.up : d.tool === 'short' ? C.down : (up ? C.up : C.down);
    ctx.strokeStyle = cc; ctx.fillStyle = cc + '25';
    const x = Math.min(S[0].x, S[1].x), y = Math.min(S[0].y, S[1].y);
    const w = Math.abs(S[1].x - S[0].x), h = Math.abs(S[1].y - S[0].y);
    ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = cc; ctx.font = 'bold 11px sans-serif';
    ctx.fillText((up?'+':'') + pd.toFixed(2) + ' (' + (up?'+':'') + pct.toFixed(2) + '%)', x + 3, y - 4);
  }
  else if (d.tool === 'brush') { ctx.beginPath(); S.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)); ctx.stroke(); }
  else if (d.tool === 'marker') { ctx.globalAlpha = .4; ctx.lineWidth = 14; ctx.beginPath(); S.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)); ctx.stroke(); ctx.globalAlpha = 1; ctx.lineWidth = 2; }
}

// =========================================================
// TOPBAR
// =========================================================
function updateOHLC(param) {
  let o, h, l, c;
  if (!param || !param.time || !param.seriesData || !candleSeries || !param.seriesData.has(candleSeries)) {
    const last = candles[visibleCount - 1]; if (!last) return;
    ({ open: o, high: h, low: l, close: c } = last);
  } else { const d = param.seriesData.get(candleSeries); if (!d) return; ({ open: o, high: h, low: l, close: c } = d); }
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

function syncCrosshair(param) {
  if (!param.time) return;
  activePanes.forEach(name => {
    const p = panes[name];
    if (p && p.series.volume) p.chart.setCrosshairPosition(0, param.time, p.series.volume);
    if (p && p.series.rsi) p.chart.setCrosshairPosition(50, param.time, p.series.rsi);
    if (p && p.series.atr) p.chart.setCrosshairPosition(0, param.time, p.series.atr);
  });
}

let hintTimer;
function showHint(t) { const h = document.getElementById('hint'); h.textContent = t; h.classList.add('on'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.remove('on'), 2500); }

function notifyRN(d) { if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(d)); }

// =========================================================
// PUBLIC API
// =========================================================
window.setCandles = function(data, tf) {
  candles = data || []; currentTF = tf || currentTF;
  visibleCount = Math.min(100, candles.length);
  // Add volume indicator by default
  if (!activePanes.includes('volume')) { activePanes.push('volume'); updatePaneLayout(); }
  applyCandles();
};

window.setSettings = function(s) {
  settings = { ...settings, ...s };
  showHint('تنظیمات اعمال شد ✓');
};

window.resetAll = function() { handleAction('reset'); };
window.getStats = function() { return computeStats(); };

if (document.readyState === 'complete') init();
else window.addEventListener('load', init);
</script>
</body>
</html>`;
};

// =========================================================
// RN COMPONENT
// =========================================================

export default function BacktestScreen() {
  const { colors, isDark } = useNavasanTheme();
  const router = useRouter();
  const webViewRef = useRef<WebView>(null);

  const [symbol, setSymbol] = useState('XAUUSD');
  const [timeframe, setTimeframe] = useState<Timeframe>('1h');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartReady, setChartReady] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const [capital, setCapital] = useState('10000');
  const [riskPct, setRiskPct] = useState('1');
  const [atrMult, setAtrMult] = useState('1.5');
  const [rr, setRr] = useState('3');
  const [breakeven, setBreakeven] = useState(true);
  const [breakevenAtR, setBreakevenAtR] = useState('1');
  const [trailing, setTrailing] = useState(false);
  const [trailingATR, setTrailingATR] = useState('1');

  const html = useMemo(() => buildHTML(isDark), [isDark]);
  const webViewKey = useMemo(() => `bt-${isDark ? 'd' : 'l'}`, [isDark]);

  const loadCandles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCandles(symbol, timeframe, TOTAL_CANDLES);
      setCandles(data);
    } catch { setCandles([]); }
    finally { setLoading(false); }
  }, [symbol, timeframe]);

  useEffect(() => { loadCandles(); }, [loadCandles]);

  useEffect(() => {
    if (!webViewRef.current || !chartReady || candles.length === 0) return;
    webViewRef.current.injectJavaScript(`window.setCandles(${JSON.stringify(candles)}, '${timeframe}'); true;`);
  }, [candles, chartReady, timeframe]);

  const applySettings = () => {
    const s = {
      capital: parseFloat(capital) || 10000,
      riskPct: parseFloat(riskPct) || 1,
      atrMult: parseFloat(atrMult) || 1.5,
      rr: parseFloat(rr) || 3,
      breakeven, breakevenAtR: parseFloat(breakevenAtR) || 1,
      trailing, trailingATR: parseFloat(trailingATR) || 1,
    };
    webViewRef.current?.injectJavaScript(`window.setSettings(${JSON.stringify(s)}); true;`);
    setShowSettings(false);
  };

  const onMessage = useCallback((event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'ready') setChartReady(true);
      else if (msg.type === 'open-settings') setShowSettings(true);
    } catch {}
  }, []);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}
          style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="arrow-back" size={18} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowPicker(true)} style={{ flex: 1 }}>
          <Text style={[styles.symbolId, { color: colors.text }]}>{symbol}</Text>
          <Text style={[styles.symbolLabel, { color: colors.mutedText }]}>
            {timeframe} • {TOTAL_CANDLES} کندل
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowSettings(true)}
          style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="options-outline" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.chartWrap}>
        {loading && candles.length === 0 ? (
          <View style={styles.center}><ActivityIndicator size="large" color={BLUE} /></View>
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
          />
        )}
      </View>

      {/* SETTINGS MODAL */}
      <Modal visible={showSettings} animationType="slide" transparent onRequestClose={() => setShowSettings(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: isDark ? '#0F172A' : '#FFF' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>تنظیمات بک‌تست</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <Ionicons name="close" size={22} color={colors.mutedText} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                ['سرمایه کل ($)', capital, setCapital],
                ['ریسک هر معامله (%)', riskPct, setRiskPct],
                ['ATR × (SL)', atrMult, setAtrMult],
                ['R:R هدف', rr, setRr],
              ].map(([lbl, val, set]: any) => (
                <View key={lbl}>
                  <Text style={[styles.lbl, { color: colors.mutedText }]}>{lbl}</Text>
                  <TextInput value={val} onChangeText={set} keyboardType="decimal-pad"
                    style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]} />
                </View>
              ))}
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.toggleLabel, { color: colors.text }]}>Breakeven</Text>
                  <Text style={[styles.toggleSub, { color: colors.mutedText }]}>انتقال SL به ورود</Text>
                </View>
                <Switch value={breakeven} onValueChange={setBreakeven}
                  trackColor={{ false: '#CBD5E1', true: '#93C5FD' }} thumbColor={breakeven ? BLUE : '#FFF'} />
              </View>
              {breakeven && (
                <>
                  <Text style={[styles.lbl, { color: colors.mutedText }]}>در چند R؟</Text>
                  <TextInput value={breakevenAtR} onChangeText={setBreakevenAtR} keyboardType="decimal-pad"
                    style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]} />
                </>
              )}
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.toggleLabel, { color: colors.text }]}>Trailing Stop</Text>
                  <Text style={[styles.toggleSub, { color: colors.mutedText }]}>حد ضرر متحرک</Text>
                </View>
                <Switch value={trailing} onValueChange={setTrailing}
                  trackColor={{ false: '#CBD5E1', true: '#93C5FD' }} thumbColor={trailing ? BLUE : '#FFF'} />
              </View>
              {trailing && (
                <>
                  <Text style={[styles.lbl, { color: colors.mutedText }]}>Trailing ATR ×</Text>
                  <TextInput value={trailingATR} onChangeText={setTrailingATR} keyboardType="decimal-pad"
                    style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]} />
                </>
              )}
              <TouchableOpacity onPress={applySettings}
                style={[styles.applyBtn, { backgroundColor: BLUE }]}>
                <Ionicons name="checkmark" size={18} color="#FFF" />
                <Text style={styles.applyBtnText}>اعمال و شروع مجدد</Text>
              </TouchableOpacity>
              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* SYMBOL PICKER */}
      <Modal visible={showPicker} animationType="slide" transparent onRequestClose={() => setShowPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: isDark ? '#0F172A' : '#FFF' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>انتخاب نماد</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Ionicons name="close" size={22} color={colors.mutedText} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.lbl, { color: colors.mutedText }]}>نماد</Text>
            <View style={styles.chips}>
              {SYMBOLS.map(s => {
                const active = s.id === symbol;
                return (
                  <TouchableOpacity key={s.id}
                    onPress={() => { setSymbol(s.id); setShowPicker(false); }}
                    style={[styles.chip, { backgroundColor: active ? BLUE : colors.input, borderColor: active ? BLUE : colors.border }]}>
                    <Text style={[styles.chipText, { color: active ? '#FFF' : colors.text }]}>{s.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={[styles.lbl, { color: colors.mutedText, marginTop: 16 }]}>تایم‌فریم</Text>
            <View style={styles.chips}>
              {TIMEFRAMES.map(tf => {
                const active = tf.id === timeframe;
                return (
                  <TouchableOpacity key={tf.id}
                    onPress={() => { setTimeframe(tf.id); setShowPicker(false); }}
                    style={[styles.chip, { backgroundColor: active ? BLUE : colors.input, borderColor: active ? BLUE : colors.border }]}>
                    <Text style={[styles.chipText, { color: active ? '#FFF' : colors.text }]}>{tf.label}</Text>
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

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'ios' ? 48 : 42,
    paddingBottom: 8, borderBottomWidth: 1, gap: 8,
  },
  iconBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  symbolId: { fontSize: 16, fontWeight: '900' },
  symbolLabel: { fontSize: 10, fontWeight: '700', marginTop: 1 },
  chartWrap: { flex: 1 },
  webview: { flex: 1, backgroundColor: 'transparent' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modal: { maxHeight: '90%', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 17, fontWeight: '900' },
  lbl: { fontSize: 11, fontWeight: '800', marginTop: 10, marginBottom: 5, textAlign: 'right' },
  input: { height: 44, borderWidth: 1, borderRadius: 11, paddingHorizontal: 12, fontSize: 13, fontWeight: '700', textAlign: 'right' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10, marginTop: 6 },
  toggleLabel: { fontSize: 13, fontWeight: '900', textAlign: 'right' },
  toggleSub: { fontSize: 10, fontWeight: '600', marginTop: 2, textAlign: 'right' },
  applyBtn: { marginTop: 16, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  applyBtnText: { color: '#FFF', fontSize: 13, fontWeight: '900' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '800' },
});