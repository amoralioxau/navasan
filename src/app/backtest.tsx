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
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

import { useNavasanTheme } from '@/context/theme-context';
import { fetchCandles, type Candle, type Timeframe } from '@/lib/market-data';

const BLUE = '#2563EB';
const GREEN = '#16A34A';
const RED = '#DC2626';

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
// HTML
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
  const up = '#16A34A';
  const down = '#DC2626';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover" />
<style>
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{width:100%;height:100%;overflow:hidden;background:${bg};color:${text};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;user-select:none;touch-action:manipulation}
#topbar{position:absolute;top:0;left:0;right:0;height:30px;background:${panel};border-bottom:1px solid ${border};display:flex;align-items:center;padding:0 6px;gap:8px;font-size:10px;font-weight:700;color:${muted};z-index:60;overflow-x:auto;scrollbar-width:none}
#topbar::-webkit-scrollbar{display:none}
#topbar span{white-space:nowrap}
#topbar b{color:${text};font-weight:900;font-size:11px}
#topbar .up{color:${up}}
#topbar .down{color:${down}}
#topbar .candles{margin-left:auto;padding-right:4px;color:${accent};font-weight:900}
#leftbar{position:absolute;top:30px;left:0;bottom:0;width:40px;background:${panel};border-right:1px solid ${border};z-index:55;overflow-y:auto;scrollbar-width:none;display:flex;flex-direction:column;padding:2px 0}
#leftbar::-webkit-scrollbar{display:none}
.tg{display:flex;flex-direction:column;padding:1px 0;border-bottom:1px solid ${border}}
.tg .gl{font-size:5px;color:${muted};text-align:center;padding:1px 0;font-weight:800;letter-spacing:.3px}
.tool{width:40px;height:32px;background:transparent;border:none;color:${text};cursor:pointer;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;font-family:inherit;transition:background .1s}
.tool:hover{background:${hover}}
.tool.on{background:${accent};color:#FFF}
#chart-root{position:absolute;top:30px;left:40px;right:0;bottom:0}
#chart-panel{position:absolute;top:0;left:0;right:0;bottom:0;overflow:hidden}
#main-chart{width:100%;height:100%}
#overlay{position:absolute;top:0;left:0;right:0;bottom:0;pointer-events:none;z-index:10}
.sub-pane{position:absolute;left:0;right:0;height:70px;background:${bg};border-top:1px solid ${border};display:none;z-index:5}
.sub-pane.on{display:block}
#pos-panel{position:absolute;top:36px;right:8px;background:${card}F2;backdrop-filter:blur(10px);border:1px solid ${border};border-radius:12px;padding:10px 12px;font-size:10px;font-weight:700;z-index:20;min-width:180px;box-shadow:0 6px 20px #00000050;display:none}
#pos-panel.on{display:block}
#pos-panel .hd{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid ${border}}
#pos-panel .dir{font-size:11px;font-weight:900;padding:2px 8px;border-radius:4px}
#pos-panel .dir.buy{background:${up}30;color:${up}}
#pos-panel .dir.sell{background:${down}30;color:${down}}
#pos-panel .row{display:flex;justify-content:space-between;gap:8px;padding:2px 0}
#pos-panel .lbl{color:${muted}}
#pos-panel .val{font-weight:900}
#pos-panel .pnl{font-size:16px;font-weight:900;text-align:center;margin-top:6px;padding-top:6px;border-top:1px solid ${border}}
#pos-panel .badges{display:flex;gap:4px;justify-content:center;margin-top:4px}
#pos-panel .badge{font-size:8px;font-weight:900;padding:1px 5px;border-radius:3px}
#floats{position:absolute;bottom:44px;right:8px;display:flex;flex-direction:column;gap:6px;z-index:56}
.fbtn{width:52px;height:52px;border-radius:50%;border:none;font-size:10px;font-weight:900;cursor:pointer;color:#FFF;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 4px 14px #00000040;font-family:inherit;transition:transform .1s}
.fbtn:active{transform:scale(.92)}
.fbtn.buy{background:${up}}
.fbtn.sell{background:${down}}
.fbtn.close{background:#D97706;width:auto;height:38px;border-radius:19px;padding:0 14px;flex-direction:row;gap:6px;font-size:11px}
.fbtn.inds{background:${accent}}
#ind-chips{position:absolute;bottom:44px;left:8px;display:flex;flex-wrap:wrap;gap:3px;max-width:60%;z-index:56}
.ichip{height:20px;padding:0 7px;background:${panel}F0;border:1px solid ${border};color:${text};border-radius:5px;font-size:9px;font-weight:800;font-family:inherit;cursor:pointer;display:flex;align-items:center;gap:3px;box-shadow:0 2px 6px #00000030}
.ichip .x{color:${muted};font-size:10px}
#controls{position:absolute;bottom:0;left:0;right:0;height:38px;background:${panel};border-top:1px solid ${border};display:flex;align-items:center;padding:0 5px;gap:3px;z-index:55;overflow-x:auto;scrollbar-width:none}
#controls::-webkit-scrollbar{display:none}
.ctrl{height:26px;min-width:26px;padding:0 6px;background:transparent;border:1px solid ${border};color:${text};border-radius:5px;font-size:10px;font-weight:900;font-family:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:3px;white-space:nowrap}
.ctrl:hover{background:${hover}}
.ctrl.on{background:${accent};border-color:${accent};color:#FFF}
.ctrl.play{background:${up};border-color:${up};color:#FFF;padding:0 12px}
.ctrl.play.on{background:${down};border-color:${down}}
.sep{width:1px;height:18px;background:${border}}
#hint{position:absolute;top:36px;left:50%;transform:translateX(-50%);background:${accent}EE;color:#FFF;padding:6px 14px;border-radius:8px;font-size:11px;font-weight:800;z-index:57;display:none;white-space:nowrap;box-shadow:0 4px 14px ${accent}60;max-width:80%;overflow:hidden;text-overflow:ellipsis}
#hint.on{display:block}
.modal{position:absolute;inset:0;background:#00000080;display:none;align-items:center;justify-content:center;z-index:70;padding:16px;backdrop-filter:blur(4px)}
.modal.on{display:flex}
.mc{background:${card};border-radius:14px;max-width:420px;width:100%;max-height:85vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 20px 60px #00000060}
.mh{padding:12px 14px;border-bottom:1px solid ${border};font-size:14px;font-weight:900;display:flex;justify-content:space-between;align-items:center;background:${panel}}
.mh button{background:transparent;border:none;color:${muted};font-size:20px;cursor:pointer;font-family:inherit;padding:0 4px}
.mb{padding:14px;overflow-y:auto;display:flex;flex-direction:column;gap:10px}
.mrow{display:flex;flex-direction:column;gap:4px}
.mrow label{font-size:10px;font-weight:800;color:${muted}}
.mrow input,.mrow select{padding:9px 10px;background:${panel};border:1px solid ${border};border-radius:8px;color:${text};font-size:12px;font-weight:700;font-family:inherit;outline:none}
.mrow input:focus{border-color:${accent}}
.mrow .row{display:flex;gap:6px;align-items:center}
.mrow .row input{flex:1}
.mrow .row button{padding:0 10px;height:36px;background:${panel};border:1px solid ${border};color:${text};border-radius:6px;font-size:11px;font-weight:800;font-family:inherit;cursor:pointer}
.mrow .hint{font-size:9px;color:${muted};font-weight:600}
.acts{display:flex;gap:8px;margin-top:4px}
.acts button{flex:1;padding:11px;border-radius:9px;border:none;font-size:12px;font-weight:900;font-family:inherit;cursor:pointer}
.acts .ok{background:${accent};color:#FFF}
.acts .ok.buy{background:${up}}
.acts .ok.sell{background:${down}}
.acts .cancel{background:${panel};color:${text};border:1px solid ${border}}
.ind-cats{display:flex;flex-direction:column;gap:4px}
.ind-cat{padding:8px 10px;border-radius:8px;background:${panel};border:1px solid ${border}}
.ind-cat .ttl{font-size:11px;font-weight:900;display:flex;justify-content:space-between;align-items:center;cursor:pointer}
.ind-cat .arrow{color:${muted};font-size:12px}
.ind-cat .sub{font-size:9px;color:${muted};margin-top:3px}
.ind-items{padding:6px 0 0 0;display:none;flex-wrap:wrap;gap:4px}
.ind-item{padding:5px 10px;background:${card};border:1px solid ${border};border-radius:6px;font-size:10px;font-weight:700;cursor:pointer}
.ind-item.on{background:${accent};color:#FFF;border-color:${accent}}
.stats-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.stat-box{padding:10px;background:${panel};border:1px solid ${border};border-radius:9px;display:flex;flex-direction:column;gap:3px}
.stat-box .lbl{font-size:9px;color:${muted};font-weight:700}
.stat-box .val{font-size:14px;font-weight:900}
.stats-section{margin-top:10px;padding-top:10px;border-top:1px solid ${border}}
.stats-section h4{font-size:11px;font-weight:900;color:${muted};margin-bottom:6px}
.tlist{display:flex;flex-direction:column;gap:4px}
.trade-item{padding:8px 10px;background:${panel};border:1px solid ${border};border-radius:8px;display:flex;justify-content:space-between;align-items:center;font-size:10px;font-weight:700}
.trade-item .left{display:flex;flex-direction:column;gap:2px;flex:1}
.trade-item .dir{font-size:10px;font-weight:900}
.trade-item .dir.buy{color:${up}}
.trade-item .dir.sell{color:${down}}
.trade-item .meta{font-size:9px;color:${muted}}
.trade-item .right{text-align:right;font-weight:900}
.trade-item .right.win{color:${up}}
.trade-item .right.loss{color:${down}}
.trade-item .right .r{font-size:9px;color:${muted};font-weight:700;display:block;margin-top:2px}
#equity-chart{width:100%;height:220px;background:${panel};border-radius:8px}
#load{position:absolute;inset:0;background:${bg};z-index:100;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;font-size:12px;font-weight:700;color:${muted}}
.sp{width:34px;height:34px;border:3px solid ${grid};border-top-color:${accent};border-radius:50%;animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
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
<div id="ind-chips"></div>

<div id="floats">
  <button class="fbtn inds" id="btn-ind">📊<br/>IND</button>
  <button class="fbtn close" id="btn-close" style="display:none">✕ بستن</button>
  <button class="fbtn buy" id="btn-buy">▲<br/>BUY</button>
  <button class="fbtn sell" id="btn-sell">▼<br/>SELL</button>
</div>

<div id="controls"></div>
<div id="hint"></div>

<div class="modal" id="modal-trade"><div class="mc">
  <div class="mh"><span id="trade-title">ورود جدید</span><button onclick="closeModal('modal-trade')">✕</button></div>
  <div class="mb" id="trade-body"></div>
</div></div>

<div class="modal" id="modal-ind"><div class="mc">
  <div class="mh"><span>اندیکاتورها</span><button onclick="closeModal('modal-ind')">✕</button></div>
  <div class="mb" id="ind-body"></div>
</div></div>

<div class="modal" id="modal-stats"><div class="mc">
  <div class="mh"><span>آمار حرفه‌ای</span><button onclick="closeModal('modal-stats')">✕</button></div>
  <div class="mb" id="stats-body"></div>
</div></div>

<div class="modal" id="equity"><div class="mc">
  <div class="mh"><span>منحنی سرمایه</span><button onclick="closeModal('equity')">✕</button></div>
  <div class="mb"><div id="equity-chart"></div></div>
</div></div>

<div id="load"><div class="sp"></div><div>راه‌اندازی...</div></div>

<script src="https://unpkg.com/lightweight-charts@4.2.3/dist/lightweight-charts.standalone.production.js"></script>
<script>
'use strict';

var C = {
  up: '${up}', down: '${down}', accent: '${accent}',
  text: '${text}', muted: '${muted}', bg: '${bg}', card: '${card}',
  border: '${border}', panel: '${panel}'
};

var chart, candleSeries, overlay, ctx;
var panes = {};
var candles = [];
var visibleCount = 100;
var currentTF = '1h';
var chartType = 'candles';
var activeTool = 'cursor';
var drawings = [];
var drawHistory = [[]];
var histIdx = 0;
var drawInProg = null;
var isDrawing = false;
var activePanes = [];
var indicators = {};
var hideDrawings = false;
var currentTrade = null;
var closedTrades = [];

var settings = {
  capital: 10000, riskPct: 1, atrMult: 1.5, rr: 3,
  breakeven: true, breakevenAtR: 1, trailing: false, trailingATR: 1
};

var isPlaying = false;
var speedIdx = 1;
var playTimer = null;

var TOOL_GROUPS = [
  { label: 'BASE', tools: [{ id: 'cursor', icon: '✛' }, { id: 'cross', icon: '✚' }] },
  { label: 'LINE', tools: [{ id: 'trend', icon: '╱' }, { id: 'ray', icon: '↗' }, { id: 'hline', icon: '━' }, { id: 'vline', icon: '┃' }] },
  { label: 'FIB', tools: [{ id: 'fib', icon: '≋' }, { id: 'fibext', icon: '⋮' }] },
  { label: 'SHAPE', tools: [{ id: 'rect', icon: '▭' }, { id: 'circle', icon: '◯' }, { id: 'triangle', icon: '△' }] },
  { label: 'TEXT', tools: [{ id: 'text', icon: 'T' }, { id: 'arrow', icon: '➤' }] },
  { label: 'PRED', tools: [{ id: 'long', icon: '▲' }, { id: 'short', icon: '▼' }] },
  { label: 'MEAS', tools: [{ id: 'ruler', icon: '📏' }] }
];

var INDICATORS = [
  { id: 'sma', cat: 'میانگین', name: 'SMA', params: [{ k: 'period', def: 20 }], main: true, color: '#F59E0B' },
  { id: 'ema', cat: 'میانگین', name: 'EMA', params: [{ k: 'period', def: 20 }], main: true, color: '#7C3AED' },
  { id: 'wma', cat: 'میانگین', name: 'WMA', params: [{ k: 'period', def: 20 }], main: true, color: '#0891B2' },
  { id: 'hma', cat: 'میانگین', name: 'HMA', params: [{ k: 'period', def: 20 }], main: true, color: '#DB2777' },
  { id: 'vwma', cat: 'میانگین', name: 'VWMA', params: [{ k: 'period', def: 20 }], main: true, color: '#16A34A' },
  { id: 'bb', cat: 'باند', name: 'Bollinger', params: [{ k: 'period', def: 20 }, { k: 'mult', def: 2 }], main: true },
  { id: 'keltner', cat: 'باند', name: 'Keltner', params: [{ k: 'period', def: 20 }, { k: 'mult', def: 2 }], main: true },
  { id: 'donchian', cat: 'باند', name: 'Donchian', params: [{ k: 'period', def: 20 }], main: true },
  { id: 'psar', cat: 'روند', name: 'PSAR', params: [{ k: 'step', def: 0.02 }, { k: 'max', def: 0.2 }], main: true },
  { id: 'supertrend', cat: 'روند', name: 'Supertrend', params: [{ k: 'period', def: 10 }, { k: 'mult', def: 3 }], main: true },
  { id: 'vwap', cat: 'روند', name: 'VWAP', params: [], main: true, color: '#F59E0B' },
  { id: 'rsi', cat: 'مومنتوم', name: 'RSI', params: [{ k: 'period', def: 14 }], pane: 'rsi' },
  { id: 'stoch', cat: 'مومنتوم', name: 'Stochastic', params: [{ k: 'k', def: 14 }, { k: 'd', def: 3 }], pane: 'rsi' },
  { id: 'cci', cat: 'مومنتوم', name: 'CCI', params: [{ k: 'period', def: 20 }], pane: 'rsi' },
  { id: 'willr', cat: 'مومنتوم', name: 'Williams %R', params: [{ k: 'period', def: 14 }], pane: 'rsi' },
  { id: 'macd', cat: 'مومنتوم', name: 'MACD', params: [{ k: 'fast', def: 12 }, { k: 'slow', def: 26 }, { k: 'signal', def: 9 }], pane: 'rsi' },
  { id: 'atr', cat: 'نوسان', name: 'ATR', params: [{ k: 'period', def: 14 }], pane: 'volume' },
  { id: 'volume', cat: 'نوسان', name: 'Volume', params: [], pane: 'volume' }
];

var M = {
  sma: function(c, p) { var r = []; for (var i = 0; i < c.length; i++) { if (i < p - 1) continue; var s = 0; for (var j = 0; j < p; j++) s += c[i - j].close; r.push({ time: Math.floor(c[i].timestamp / 1000), value: s / p }); } return r; },
  ema: function(c, p) { if (c.length < p) return []; var k = 2 / (p + 1), r = []; var e = 0; for (var i = 0; i < p; i++) e += c[i].close; e /= p; r.push({ time: Math.floor(c[p-1].timestamp / 1000), value: e }); for (var i = p; i < c.length; i++) { e = c[i].close * k + e * (1 - k); r.push({ time: Math.floor(c[i].timestamp / 1000), value: e }); } return r; },
  wma: function(c, p) { var r = [], ws = (p * (p + 1)) / 2; for (var i = 0; i < c.length; i++) { if (i < p - 1) continue; var s = 0; for (var j = 0; j < p; j++) s += c[i - j].close * (p - j); r.push({ time: Math.floor(c[i].timestamp / 1000), value: s / ws }); } return r; },
  hma: function(c, p) { var half = Math.floor(p / 2), sp = Math.floor(Math.sqrt(p)); var wH = M.wma(c, half), wF = M.wma(c, p); var m = {}; wH.forEach(function(x) { m[x.time] = x.value; }); var diff = []; wF.forEach(function(x) { if (m[x.time] !== undefined) diff.push({ time: x.time, value: 2 * m[x.time] - x.value }); }); var r = []; for (var i = 0; i < diff.length; i++) { if (i < sp - 1) continue; var s = 0, ws = 0; for (var j = 0; j < sp; j++) { s += diff[i - j].value * (sp - j); ws += (sp - j); } r.push({ time: diff[i].time, value: s / ws }); } return r; },
  vwma: function(c, p) { var r = []; for (var i = 0; i < c.length; i++) { if (i < p - 1) continue; var sv = 0, spv = 0; for (var j = 0; j < p; j++) { var v = c[i - j].volume || 1; sv += v; spv += c[i - j].close * v; } r.push({ time: Math.floor(c[i].timestamp / 1000), value: spv / sv }); } return r; },
  bb: function(c, p, m) { var u = [], mid = [], l = []; for (var i = 0; i < c.length; i++) { if (i < p - 1) continue; var s = 0; for (var j = 0; j < p; j++) s += c[i - j].close; var sma = s / p; var v = 0; for (var j = 0; j < p; j++) v += Math.pow(c[i - j].close - sma, 2); var sd = Math.sqrt(v / p); var t = Math.floor(c[i].timestamp / 1000); u.push({ time: t, value: sma + sd * m }); mid.push({ time: t, value: sma }); l.push({ time: t, value: sma - sd * m }); } return { u: u, m: mid, l: l }; },
  keltner: function(c, p, m) { var ema = M.ema(c, p), atr = M.atr(c, p); var am = {}; atr.forEach(function(x) { am[x.time] = x.value; }); var u = [], mid = [], l = []; ema.forEach(function(x) { var a = am[x.time]; if (a === undefined) return; u.push({ time: x.time, value: x.value + a * m }); mid.push({ time: x.time, value: x.value }); l.push({ time: x.time, value: x.value - a * m }); }); return { u: u, m: mid, l: l }; },
  donchian: function(c, p) { var u = [], mid = [], l = []; for (var i = 0; i < c.length; i++) { if (i < p - 1) continue; var hi = -Infinity, lo = Infinity; for (var j = 0; j < p; j++) { if (c[i - j].high > hi) hi = c[i - j].high; if (c[i - j].low < lo) lo = c[i - j].low; } var t = Math.floor(c[i].timestamp / 1000); u.push({ time: t, value: hi }); mid.push({ time: t, value: (hi + lo) / 2 }); l.push({ time: t, value: lo }); } return { u: u, m: mid, l: l }; },
  atr: function(c, p) { if (c.length < p + 1) return []; var tr = []; for (var i = 1; i < c.length; i++) tr.push(Math.max(c[i].high - c[i].low, Math.abs(c[i].high - c[i - 1].close), Math.abs(c[i].low - c[i - 1].close))); var r = []; var a = 0; for (var i = 0; i < p; i++) a += tr[i]; a /= p; r.push({ time: Math.floor(c[p].timestamp / 1000), value: a }); for (var i = p; i < tr.length; i++) { a = (a * (p - 1) + tr[i]) / p; r.push({ time: Math.floor(c[i + 1].timestamp / 1000), value: a }); } return r; },
  rsi: function(c, p) { if (c.length <= p) return []; var r = []; var ag = 0, al = 0; for (var i = 1; i <= p; i++) { var d = c[i].close - c[i - 1].close; if (d >= 0) ag += d; else al -= d; } ag /= p; al /= p; var rs = al === 0 ? 100 : ag / al; r.push({ time: Math.floor(c[p].timestamp / 1000), value: 100 - 100 / (1 + rs) }); for (var i = p + 1; i < c.length; i++) { var d = c[i].close - c[i - 1].close; var g = d > 0 ? d : 0, lo = d < 0 ? -d : 0; ag = (ag * (p - 1) + g) / p; al = (al * (p - 1) + lo) / p; rs = al === 0 ? 100 : ag / al; r.push({ time: Math.floor(c[i].timestamp / 1000), value: 100 - 100 / (1 + rs) }); } return r; },
  stoch: function(c, k, d) { var kv = []; for (var i = 0; i < c.length; i++) { if (i < k - 1) continue; var hi = -Infinity, lo = Infinity; for (var j = 0; j < k; j++) { if (c[i - j].high > hi) hi = c[i - j].high; if (c[i - j].low < lo) lo = c[i - j].low; } var v = hi === lo ? 50 : ((c[i].close - lo) / (hi - lo)) * 100; kv.push({ time: Math.floor(c[i].timestamp / 1000), value: v }); } var dv = []; for (var i = 0; i < kv.length; i++) { if (i < d - 1) continue; var s = 0; for (var j = 0; j < d; j++) s += kv[i - j].value; dv.push({ time: kv[i].time, value: s / d }); } return { k: kv, d: dv }; },
  cci: function(c, p) { var r = []; for (var i = 0; i < c.length; i++) { if (i < p - 1) continue; var sum = 0; for (var j = 0; j < p; j++) sum += (c[i - j].high + c[i - j].low + c[i - j].close) / 3; var tp = sum / p; var md = 0; for (var j = 0; j < p; j++) md += Math.abs((c[i - j].high + c[i - j].low + c[i - j].close) / 3 - tp); md /= p; r.push({ time: Math.floor(c[i].timestamp / 1000), value: md === 0 ? 0 : ((c[i].high + c[i].low + c[i].close) / 3 - tp) / (0.015 * md) }); } return r; },
  willr: function(c, p) { var r = []; for (var i = 0; i < c.length; i++) { if (i < p - 1) continue; var hi = -Infinity, lo = Infinity; for (var j = 0; j < p; j++) { if (c[i - j].high > hi) hi = c[i - j].high; if (c[i - j].low < lo) lo = c[i - j].low; } r.push({ time: Math.floor(c[i].timestamp / 1000), value: hi === lo ? -50 : ((hi - c[i].close) / (hi - lo)) * -100 }); } return r; },
  macd: function(c, f, s, sig) { var ef = M.ema(c, f), es = M.ema(c, s); var m = {}; es.forEach(function(x) { m[x.time] = x.value; }); var macd = []; ef.forEach(function(x) { if (m[x.time] !== undefined) macd.push({ time: x.time, value: x.value - m[x.time] }); }); if (!macd.length) return { m: [], s: [], h: [] }; var k = 2 / (sig + 1); var sg = 0; for (var i = 0; i < Math.min(sig, macd.length); i++) sg += macd[i].value; sg /= sig; var sl = [], hl = []; for (var i = sig - 1; i < macd.length; i++) { if (i === sig - 1) sl.push({ time: macd[i].time, value: sg }); else { sg = macd[i].value * k + sg * (1 - k); sl.push({ time: macd[i].time, value: sg }); } var h = macd[i].value - sg; hl.push({ time: macd[i].time, value: h, color: h >= 0 ? '#16A34A80' : '#DC262680' }); } return { m: macd, s: sl, h: hl }; },
  psar: function(c, step, max) { var r = []; var up = true, af = step, ep = c[0].low, sar = c[0].high; for (var i = 1; i < c.length; i++) { var p = sar; sar = p + af * (ep - p); if (up) { if (c[i].low < sar) { up = false; sar = ep; ep = c[i].low; af = step; } else { if (c[i].high > ep) { ep = c[i].high; af = Math.min(af + step, max); } } } else { if (c[i].high > sar) { up = true; sar = ep; ep = c[i].high; af = step; } else { if (c[i].low < ep) { ep = c[i].low; af = Math.min(af + step, max); } } } r.push({ time: Math.floor(c[i].timestamp / 1000), value: sar }); } return r; },
  supertrend: function(c, p, m) { var atr = M.atr(c, p); var am = {}; atr.forEach(function(x) { am[x.time] = x.value; }); var r = []; var prev = null, dir = 1; c.forEach(function(x) { var t = Math.floor(x.timestamp / 1000); var a = am[t]; if (a === undefined) return; var hl2 = (x.high + x.low) / 2; var u = hl2 - m * a, d = hl2 + m * a; var st, dd; if (prev === null) { st = u; dd = 1; } else { if (dir === 1) { st = x.close > prev ? Math.max(u, prev) : d; dd = x.close > prev ? 1 : -1; } else { st = x.close < prev ? Math.min(d, prev) : u; dd = x.close < prev ? -1 : 1; } } r.push({ time: t, value: st }); prev = st; dir = dd; }); return r; },
  vwap: function(c) { var r = []; var spv = 0, sv = 0, cd = null; c.forEach(function(x) { var d = new Date(x.timestamp).toDateString(); if (d !== cd) { cd = d; spv = 0; sv = 0; } var tp = (x.high + x.low + x.close) / 3; var v = x.volume || 1; spv += tp * v; sv += v; r.push({ time: Math.floor(x.timestamp / 1000), value: spv / sv }); }); return r; }
};

function init() {
  try {
    document.getElementById('load').style.display = 'none';
    var panel = document.getElementById('chart-panel');
    var mainEl = document.getElementById('main-chart');
    overlay = document.getElementById('overlay');
    ctx = overlay.getContext('2d');

    chart = LightweightCharts.createChart(mainEl, {
      width: mainEl.clientWidth, height: mainEl.clientHeight,
      layout: { background: { type: 'solid', color: C.bg }, textColor: C.text, fontSize: 11 },
      grid: { vertLines: { color: C.border }, horzLines: { color: C.border } },
      rightPriceScale: { borderColor: C.border, scaleMargins: { top: 0.06, bottom: 0.1 } },
      timeScale: { borderColor: C.border, timeVisible: true, rightOffset: 8, barSpacing: 8, minBarSpacing: 0.3 },
      crosshair: { mode: 0 },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true }
    });

    createSeries();
    setupPanes();
    setupToolbar();
    setupControls();
    setupEvents();
    document.getElementById('btn-ind').onclick = function() { openIndPicker(); };
    document.getElementById('btn-buy').onclick = function() { openTradeModal('buy'); };
    document.getElementById('btn-sell').onclick = function() { openTradeModal('sell'); };
    document.getElementById('btn-close').onclick = function() { if (confirm('پوزیشن بسته شود؟')) { if (currentTrade) { closePosition('manual'); } } };

    chart.subscribeCrosshairMove(function(p) { updateOHLC(p); });
    chart.timeScale().subscribeVisibleLogicalRangeChange(syncPanes);

    new ResizeObserver(resizeAll).observe(panel);
    resizeAll();
    notifyRN({ type: 'ready' });
  } catch (e) {
    document.getElementById('load').innerHTML = '<div style="color:#DC2626;padding:20px">' + e.message + '</div>';
  }
}

function createSeries() {
  if (candleSeries) try { chart.removeSeries(candleSeries); } catch(e) {}
  if (chartType === 'candles') candleSeries = chart.addCandlestickSeries({ upColor: C.up, downColor: C.down, borderUpColor: C.up, borderDownColor: C.down, wickUpColor: C.up, wickDownColor: C.down, priceLineVisible: false });
  else if (chartType === 'bars') candleSeries = chart.addBarSeries({ upColor: C.up, downColor: C.down, priceLineVisible: false });
  else if (chartType === 'line') candleSeries = chart.addLineSeries({ color: C.accent, lineWidth: 2, priceLineVisible: false });
  else if (chartType === 'area') candleSeries = chart.addAreaSeries({ topColor: C.accent + '50', bottomColor: C.accent + '05', lineColor: C.accent, lineWidth: 2, priceLineVisible: false });
  if (candles.length) applyCandles();
}

function setupPanes() {
  ['volume', 'rsi'].forEach(function(name) {
    var el = document.getElementById('pane-' + name);
    var c = LightweightCharts.createChart(el, {
      width: el.clientWidth, height: 70,
      layout: { background: { type: 'solid', color: C.bg }, textColor: C.muted, fontSize: 9 },
      grid: { vertLines: { color: C.border }, horzLines: { color: C.border } },
      rightPriceScale: { borderColor: C.border },
      timeScale: { visible: false },
      handleScroll: false, handleScale: false
    });
    panes[name] = { chart: c, series: {}, el: el };
  });
}

function setupToolbar() {
  var bar = document.getElementById('leftbar');
  bar.innerHTML = '';
  TOOL_GROUPS.forEach(function(g) {
    var w = document.createElement('div'); w.className = 'tg';
    var l = document.createElement('div'); l.className = 'gl'; l.textContent = g.label;
    w.appendChild(l);
    g.tools.forEach(function(t) {
      var b = document.createElement('button');
      b.className = 'tool' + (t.id === 'cursor' ? ' on' : '');
      b.dataset.tool = t.id; b.textContent = t.icon;
      b.onclick = function() { selectTool(t.id); };
      w.appendChild(b);
    });
    bar.appendChild(w);
  });
}

function selectTool(id) {
  activeTool = id;
  document.querySelectorAll('#leftbar .tool').forEach(function(el) { el.classList.toggle('on', el.dataset.tool === id); });
  var isCursor = id === 'cursor' || id === 'cross';
  chart.applyOptions({
    handleScroll: { mouseWheel: isCursor, pressedMouseMove: isCursor, horzTouchDrag: isCursor, vertTouchDrag: false },
    handleScale: { axisPressedMouseMove: isCursor, mouseWheel: isCursor, pinch: isCursor }
  });
  if (!isCursor) showHint('بکش'); else hideHint();
}

function setupControls() {
  var c = document.getElementById('controls');
  c.innerHTML = '';
  var play = document.createElement('button');
  play.className = 'ctrl play'; play.id = 'btn-play'; play.innerHTML = '▶';
  play.onclick = togglePlay; c.appendChild(play);
  [['⏮','restart'],['⏪','back50'],['◀','back'],['▶','step'],['⏩','fwd50'],['⏭','end']].forEach(function(a) {
    var b = document.createElement('button'); b.className = 'ctrl'; b.textContent = a[0];
    b.onclick = function() { stepAction(a[1]); }; c.appendChild(b);
  });
  c.appendChild(sep());
  SPEEDS.forEach(function(sp, i) {
    var b = document.createElement('button');
    b.className = 'ctrl' + (i === speedIdx ? ' on' : ''); b.dataset.speed = i; b.textContent = sp.label;
    b.onclick = function() { speedIdx = i; document.querySelectorAll('[data-speed]').forEach(function(el) { el.classList.toggle('on', +el.dataset.speed === i); }); };
    c.appendChild(b);
  });
  c.appendChild(sep());
  [['📈','equity'],['📊','stats'],['⚙','settings'],['🗑','reset']].forEach(function(a) {
    var b = document.createElement('button'); b.className = 'ctrl'; b.textContent = a[0];
    b.onclick = function() { handleAction(a[1]); }; c.appendChild(b);
  });
}

function sep() { var s = document.createElement('div'); s.className = 'sep'; return s; }

function openIndPicker() {
  var body = document.getElementById('ind-body');
  var cats = {};
  INDICATORS.forEach(function(i) { if (!cats[i.cat]) cats[i.cat] = []; cats[i.cat].push(i); });
  var html = '<div class="ind-cats">';
  Object.keys(cats).forEach(function(cat) {
    html += '<div class="ind-cat"><div class="ttl">' + cat + '<span class="arrow">▸</span></div><div class="sub">' + cats[cat].length + ' اندیکاتور</div><div class="ind-items">';
    cats[cat].forEach(function(ind) {
      var on = Object.keys(indicators).some(function(k) { return indicators[k].def.id === ind.id; });
      html += '<div class="ind-item' + (on ? ' on' : '') + '" data-ind="' + ind.id + '">' + ind.name + '</div>';
    });
    html += '</div></div>';
  });
  html += '</div>';
  body.innerHTML = html;
  body.querySelectorAll('.ttl').forEach(function(el) {
    el.onclick = function() {
      var items = el.parentNode.querySelector('.ind-items');
      var isOpen = items.style.display === 'flex';
      items.style.display = isOpen ? 'none' : 'flex';
    };
  });
  body.querySelectorAll('.ind-item').forEach(function(el) {
    el.onclick = function() { addIndicator(el.dataset.ind); };
  });
  document.getElementById('modal-ind').classList.add('on');
}

window.closeModal = function(id) { document.getElementById(id).classList.remove('on'); };

function addIndicator(id) {
  var def = INDICATORS.find(function(i) { return i.id === id; });
  if (!def) return;
  var existing = null;
  Object.keys(indicators).forEach(function(k) { if (indicators[k].def.id === id) existing = k; });
  if (existing) {
    indicators[existing].series.forEach(function(s) { try { chart.removeSeries(s); } catch(e) {} });
    delete indicators[existing];
  } else {
    var params = {};
    def.params.forEach(function(p) { params[p.k] = p.def; });
    if (def.pane) {
      if (activePanes.indexOf(def.pane) === -1) activePanes.push(def.pane);
      updatePaneLayout();
      renderPaneIndicator(def.pane, def, params);
    } else {
      renderMainIndicator(def, params, id + ':default');
    }
  }
  renderIndChips();
  closeModal('modal-ind');
}

function renderIndChips() {
  var el = document.getElementById('ind-chips');
  var seen = {};
  var html = '';
  Object.keys(indicators).forEach(function(k) {
    var e = indicators[k];
    if (seen[e.def.id]) return;
    seen[e.def.id] = 1;
    html += '<div class="ichip" data-ind="' + e.def.id + '">' + e.def.name + '<span class="x">✕</span></div>';
  });
  if (activePanes.indexOf('volume') !== -1) html += '<div class="ichip" data-pane="volume">Vol<span class="x">✕</span></div>';
  if (activePanes.indexOf('rsi') !== -1) html += '<div class="ichip" data-pane="rsi">RSI<span class="x">✕</span></div>';
  el.innerHTML = html;
  el.querySelectorAll('.ichip').forEach(function(chip) {
    chip.onclick = function() {
      var indId = chip.dataset.ind;
      if (indId) {
        Object.keys(indicators).forEach(function(k) {
          if (indicators[k].def.id === indId) {
            indicators[k].series.forEach(function(s) { try { chart.removeSeries(s); } catch(e) {} });
            delete indicators[k];
          }
        });
      }
      var paneId = chip.dataset.pane;
      if (paneId) activePanes = activePanes.filter(function(p) { return p !== paneId; });
      updatePaneLayout();
      renderIndChips();
    };
  });
}

function renderMainIndicator(def, params, key) {
  if (!candleSeries || !candles.length) return;
  var c = candles.slice(0, visibleCount);
  var lo = { priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false };
  var series = [];
  try {
    if (def.id === 'sma') { var s = chart.addLineSeries({ color: def.color, lineWidth: 2, ...lo }); s.setData(M.sma(c, params.period)); series.push(s); }
    else if (def.id === 'ema') { var s = chart.addLineSeries({ color: def.color, lineWidth: 2, ...lo }); s.setData(M.ema(c, params.period)); series.push(s); }
    else if (def.id === 'wma') { var s = chart.addLineSeries({ color: def.color, lineWidth: 2, ...lo }); s.setData(M.wma(c, params.period)); series.push(s); }
    else if (def.id === 'hma') { var s = chart.addLineSeries({ color: def.color, lineWidth: 2, ...lo }); s.setData(M.hma(c, params.period)); series.push(s); }
    else if (def.id === 'vwma') { var s = chart.addLineSeries({ color: def.color, lineWidth: 2, ...lo }); s.setData(M.vwma(c, params.period)); series.push(s); }
    else if (def.id === 'bb') { var bb = M.bb(c, params.period, params.mult); var u = chart.addLineSeries({ color: '#0891B2', lineWidth: 1, lineStyle: 2, ...lo }); u.setData(bb.u); var m = chart.addLineSeries({ color: '#0891B280', lineWidth: 1, ...lo }); m.setData(bb.m); var l = chart.addLineSeries({ color: '#0891B2', lineWidth: 1, lineStyle: 2, ...lo }); l.setData(bb.l); series.push(u, m, l); }
    else if (def.id === 'keltner') { var kc = M.keltner(c, params.period, params.mult); var u = chart.addLineSeries({ color: '#F59E0B', lineWidth: 1, lineStyle: 2, ...lo }); u.setData(kc.u); var m = chart.addLineSeries({ color: '#F59E0B80', lineWidth: 1, ...lo }); m.setData(kc.m); var l = chart.addLineSeries({ color: '#F59E0B', lineWidth: 1, lineStyle: 2, ...lo }); l.setData(kc.l); series.push(u, m, l); }
    else if (def.id === 'donchian') { var dc = M.donchian(c, params.period); var u = chart.addLineSeries({ color: '#DC2626', lineWidth: 1, lineStyle: 2, ...lo }); u.setData(dc.u); var l = chart.addLineSeries({ color: '#16A34A', lineWidth: 1, lineStyle: 2, ...lo }); l.setData(dc.l); series.push(u, l); }
    else if (def.id === 'psar') { var s = chart.addLineSeries({ color: '#0891B2', lineWidth: 0, pointMarkersVisible: true, ...lo }); s.setData(M.psar(c, params.step, params.max)); series.push(s); }
    else if (def.id === 'supertrend') { var s = chart.addLineSeries({ color: '#16A34A', lineWidth: 2, ...lo }); s.setData(M.supertrend(c, params.period, params.mult)); series.push(s); }
    else if (def.id === 'vwap') { var s = chart.addLineSeries({ color: '#F59E0B', lineWidth: 2, lineStyle: 2, ...lo }); s.setData(M.vwap(c)); series.push(s); }
  } catch (e) { console.log(e); return; }
  indicators[key] = { def: def, params: params, series: series };
}

function renderPaneIndicator(paneName, def, params) {
  var p = panes[paneName];
  if (!p || !candles.length) return;
  var c = candles.slice(0, visibleCount);
  if (p.series[def.id]) try { p.chart.removeSeries(p.series[def.id]); } catch(e) {}
  if (def.id === 'volume') {
    p.series[def.id] = p.chart.addHistogramSeries({ color: '#2563EB40', priceFormat: { type: 'volume' }, lastValueVisible: false });
    p.series[def.id].setData(c.map(function(x) { return { time: Math.floor(x.timestamp / 1000), value: x.volume || 0, color: x.close >= x.open ? C.up + '60' : C.down + '60' }; }));
  } else if (def.id === 'rsi') {
    p.series[def.id] = p.chart.addLineSeries({ color: '#7C3AED', lineWidth: 2, priceLineVisible: false });
    p.series[def.id].setData(M.rsi(c, params.period));
  } else if (def.id === 'stoch') {
    var st = M.stoch(c, params.k, params.d);
    p.series[def.id] = p.chart.addLineSeries({ color: '#2563EB', lineWidth: 2, priceLineVisible: false });
    p.series[def.id].setData(st.k);
  } else if (def.id === 'atr') {
    p.series[def.id] = p.chart.addLineSeries({ color: '#16A34A', lineWidth: 2, priceLineVisible: false });
    p.series[def.id].setData(M.atr(c, params.period));
  }
  p.el.style.display = 'block';
}

function updatePaneLayout() {
  var bottom = 0;
  ['volume', 'rsi'].forEach(function(name) {
    var p = panes[name];
    if (!p) return;
    if (activePanes.indexOf(name) !== -1) {
      p.el.classList.add('on');
      p.el.style.bottom = bottom + 'px';
      bottom += 70;
      p.chart.applyOptions({ width: p.el.clientWidth });
    } else {
      p.el.classList.remove('on');
    }
  });
  var panel = document.getElementById('chart-panel');
  panel.style.bottom = bottom + 'px';
  if (chart) chart.applyOptions({ width: panel.clientWidth, height: panel.clientHeight });
  resizeAll();
}

function syncPanes() {
  var r = chart.timeScale().getVisibleLogicalRange();
  if (!r) return;
  Object.keys(panes).forEach(function(k) { if (panes[k].chart) panes[k].chart.timeScale().setVisibleLogicalRange(r); });
}

function applyCandles() {
  if (!candleSeries || !candles.length) return;
  var vis = candles.slice(0, visibleCount);
  if (chartType === 'line' || chartType === 'area') {
    candleSeries.setData(vis.map(function(x) { return { time: Math.floor(x.timestamp / 1000), value: x.close }; }));
  } else {
    candleSeries.setData(vis.map(function(x) { return { time: Math.floor(x.timestamp / 1000), open: x.open, high: x.high, low: x.low, close: x.close }; }));
  }
  updateOHLC(null);
  updateMarkers();
  document.getElementById('cn').textContent = visibleCount;
  document.getElementById('ct').textContent = candles.length;
  activePanes.forEach(function(pane) {
    var p = panes[pane]; if (!p) return;
    Object.keys(p.series).forEach(function(id) {
      var def = INDICATORS.find(function(i) { return i.id === id; });
      if (def) {
        var params = {};
        def.params.forEach(function(pp) { params[pp.k] = pp.def; });
        renderPaneIndicator(pane, def, params);
      }
    });
  });
  var snapshot = {};
  Object.keys(indicators).forEach(function(k) { snapshot[k] = indicators[k]; });
  Object.keys(indicators).forEach(function(k) {
    indicators[k].series.forEach(function(s) { try { chart.removeSeries(s); } catch(e) {} });
  });
  indicators = {};
  Object.keys(snapshot).forEach(function(k) { renderMainIndicator(snapshot[k].def, snapshot[k].params, k); });
  updateUI();
}

function updateMarkers() {
  if (!candleSeries) return;
  var markers = [];
  closedTrades.forEach(function(t) {
    if (t.entryIdx < visibleCount) markers.push({ time: Math.floor(candles[t.entryIdx].timestamp / 1000), position: t.direction === 'buy' ? 'belowBar' : 'aboveBar', color: t.direction === 'buy' ? C.up : C.down, shape: t.direction === 'buy' ? 'arrowUp' : 'arrowDown', text: t.direction === 'buy' ? 'B' : 'S' });
    if (t.exitIdx !== undefined && t.exitIdx < visibleCount) markers.push({ time: Math.floor(candles[t.exitIdx].timestamp / 1000), position: t.result >= 0 ? 'aboveBar' : 'belowBar', color: t.result >= 0 ? C.up : C.down, shape: 'circle', text: t.result >= 0 ? '✓' : '✗' });
  });
  if (currentTrade && currentTrade.entryIdx < visibleCount) markers.push({ time: Math.floor(candles[currentTrade.entryIdx].timestamp / 1000), position: currentTrade.direction === 'buy' ? 'belowBar' : 'aboveBar', color: C.accent, shape: 'square', text: 'L' });
  markers.sort(function(a, b) { return a.time - b.time; });
  try { candleSeries.setMarkers(markers); } catch(e) {}
}

function openTradeModal(direction) {
  if (visibleCount >= candles.length) { showHint('به آخر رسیدی'); return; }
  if (currentTrade) { showHint('پوزیشن باز داری'); return; }
  var idx = visibleCount - 1;
  var c = candles[idx];
  var atrArr = M.atr(candles.slice(0, idx + 1), 14);
  var atr = atrArr.length ? atrArr[atrArr.length - 1].value : c.close * 0.005;
  var entry = c.close;
  var risk = atr * settings.atrMult;
  var sl = direction === 'buy' ? entry - risk : entry + risk;
  var tp = direction === 'buy' ? entry + risk * settings.rr : entry - risk * settings.rr;

  document.getElementById('trade-title').textContent = direction === 'buy' ? '🟢 ورود خرید' : '🔴 ورود فروش';
  var body = document.getElementById('trade-body');

  var bgAccent = C.accent;
  var bgPanel = C.panel;
  var clText = C.text;
  var bdColor = C.border;

  body.innerHTML = '<div class="mrow"><label>قیمت ورود</label><input type="number" id="te" value="' + entry.toFixed(4) + '" step="any"/></div>'
    + '<div class="mrow"><label>حد ضرر (SL)</label><input type="number" id="tsl" value="' + sl.toFixed(4) + '" step="any"/></div>'
    + '<div class="mrow"><label>حد سود (TP)</label><input type="number" id="ttp" value="' + tp.toFixed(4) + '" step="any"/></div>'
    + '<div class="mrow"><label>حجم (Risk ' + settings.riskPct + '%)</label><div class="row"><input type="number" id="tsz" step="any" readonly/><span class="hint" id="trisk"></span></div></div>'
    + '<div class="acts"><button class="cancel" onclick="closeModal(\\'modal-trade\\')">انصراف</button><button class="ok ' + direction + '" onclick="confirmTrade(\\'' + direction + '\\')">ثبت</button></div>';

  var updateSize = function() {
    var e = parseFloat(document.getElementById('te').value);
    var s = parseFloat(document.getElementById('tsl').value);
    if (!isFinite(e) || !isFinite(s) || e === s) { document.getElementById('tsz').value = ''; return; }
    var rk = Math.abs(e - s);
    var riskUSD = settings.capital * settings.riskPct / 100;
    document.getElementById('tsz').value = (riskUSD / rk).toFixed(4);
    document.getElementById('trisk').textContent = '= $' + riskUSD.toFixed(2);
  };
  document.getElementById('te').oninput = updateSize;
  document.getElementById('tsl').oninput = updateSize;
  updateSize();
  document.getElementById('modal-trade').classList.add('on');
}

window.confirmTrade = function(direction) {
  var e = parseFloat(document.getElementById('te').value);
  var sl = parseFloat(document.getElementById('tsl').value);
  var tp = parseFloat(document.getElementById('ttp').value);
  var size = parseFloat(document.getElementById('tsz').value);
  if (!isFinite(e) || !isFinite(sl) || !isFinite(tp) || !isFinite(size)) { alert('اعداد نامعتبر'); return; }
  if (direction === 'buy' && !(sl < e && tp > e)) { alert('BUY: باید SL < Entry < TP'); return; }
  if (direction === 'sell' && !(sl > e && tp < e)) { alert('SELL: باید SL > Entry > TP'); return; }

  var idx = visibleCount - 1;
  var risk = Math.abs(e - sl);
  var riskUSD = risk * size;
  currentTrade = {
    direction: direction, entryPrice: e, sl: sl, tp: tp, size: size,
    risk: riskUSD, riskPerUnit: risk, entryIdx: idx, entryTime: candles[idx].timestamp,
    breakeven: false, trailingStop: sl, maxFavorable: 0, maxAdverse: 0
  };
  closeModal('modal-trade');
  updateUI();
  updateMarkers();
  showHint('پوزیشن باز شد ✓');
};

function closePosition(reason) {
  if (!currentTrade) return;
  var pos = currentTrade;
  var idx = visibleCount - 1;
  var c = candles[idx];
  var exit = c.close;
  if (reason === 'sl') exit = pos.trailingStop;
  else if (reason === 'tp') exit = pos.tp;

  var perUnit = pos.direction === 'buy' ? exit - pos.entryPrice : pos.entryPrice - exit;
  var result = perUnit * pos.size;
  var resultR = pos.risk > 0 ? result / pos.risk : 0;

  closedTrades.push({
    direction: pos.direction, entryPrice: pos.entryPrice, exitPrice: exit,
    size: pos.size, risk: pos.risk, riskPerUnit: pos.riskPerUnit,
    entryIdx: pos.entryIdx, exitIdx: idx, entryTime: pos.entryTime,
    exitTime: c.timestamp, result: result, resultR: resultR,
    maxFavorable: pos.maxFavorable, maxAdverse: pos.maxAdverse,
    closeReason: reason || 'manual'
  });
  currentTrade = null;
  updateUI();
  updateMarkers();
  showHint('بسته شد: ' + (result >= 0 ? '+' : '') + '$' + result.toFixed(2));
}

function checkTrade() {
  if (!currentTrade) return;
  var idx = visibleCount - 1;
  var c = candles[idx];
  var pos = currentTrade;
  var risk = pos.riskPerUnit;

  var fav = pos.direction === 'buy' ? c.high : c.low;
  var adv = pos.direction === 'buy' ? c.low : c.high;
  pos.maxFavorable = Math.max(pos.maxFavorable, Math.abs(fav - pos.entryPrice) / risk);
  pos.maxAdverse = Math.max(pos.maxAdverse, Math.abs(adv - pos.entryPrice) / risk);

  var hitSL = pos.direction === 'buy' ? c.low <= pos.trailingStop : c.high >= pos.trailingStop;
  if (hitSL) { closePosition('sl'); return; }

  var hitTP = pos.direction === 'buy' ? c.high >= pos.tp : c.low <= pos.tp;
  if (hitTP) { closePosition('tp'); return; }

  if (settings.breakeven && !pos.breakeven && risk > 0) {
    var r = pos.direction === 'buy' ? (c.high - pos.entryPrice) / risk : (pos.entryPrice - c.low) / risk;
    if (r >= settings.breakevenAtR) { pos.breakeven = true; pos.sl = pos.entryPrice; pos.trailingStop = pos.entryPrice; }
  }

  if (settings.trailing) {
    var atrArr = M.atr(candles.slice(0, idx + 1), 14);
    var atr = atrArr.length ? atrArr[atrArr.length - 1].value : 0;
    var dist = atr * settings.trailingATR;
    if (pos.direction === 'buy') { var n = c.close - dist; if (n > pos.trailingStop) pos.trailingStop = n; }
    else { var n = c.close + dist; if (n < pos.trailingStop) pos.trailingStop = n; }
  }
}

function updateUI() {
  var panel = document.getElementById('pos-panel');
  if (!currentTrade) {
    panel.classList.remove('on');
    document.getElementById('btn-close').style.display = 'none';
    return;
  }
  panel.classList.add('on');
  document.getElementById('btn-close').style.display = 'flex';
  var pos = currentTrade;
  var c = candles[visibleCount - 1];
  var pnl = pos.direction === 'buy' ? (c.close - pos.entryPrice) * pos.size : (pos.entryPrice - c.close) * pos.size;
  var risk = pos.riskPerUnit;
  var r = risk > 0 ? (pos.direction === 'buy' ? (c.close - pos.entryPrice) / risk : (pos.entryPrice - c.close) / risk) : 0;
  var html = '<div class="hd"><span class="dir ' + pos.direction + '">' + (pos.direction === 'buy' ? '▲ BUY' : '▼ SELL') + '</span></div>';
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

function togglePlay() {
  if (visibleCount >= candles.length) { showHint('به آخر رسیدی'); return; }
  isPlaying = !isPlaying;
  var b = document.getElementById('btn-play');
  b.classList.toggle('on', isPlaying);
  b.innerHTML = isPlaying ? '⏸' : '▶';
  if (isPlaying) {
    playTimer = setInterval(function() {
      if (visibleCount >= candles.length) { togglePlay(); return; }
      visibleCount++;
      applyCandles();
      checkTrade();
      updateUI();
    }, SPEEDS[speedIdx].value);
  } else if (playTimer) { clearInterval(playTimer); playTimer = null; }
}

function stepAction(act) {
  if (playTimer) { clearInterval(playTimer); playTimer = null; isPlaying = false; document.getElementById('btn-play').classList.remove('on'); document.getElementById('btn-play').innerHTML = '▶'; }
  if (act === 'restart') visibleCount = 100;
  else if (act === 'back50') visibleCount = Math.max(100, visibleCount - 50);
  else if (act === 'back') visibleCount = Math.max(100, visibleCount - 1);
  else if (act === 'step') visibleCount = Math.min(candles.length, visibleCount + 1);
  else if (act === 'fwd50') {
    for (var i = 0; i < 50; i++) {
      if (visibleCount >= candles.length) break;
      visibleCount++;
      checkTrade();
    }
  }
  else if (act === 'end') visibleCount = candles.length;
  applyCandles();
  checkTrade();
  updateUI();
}

function handleAction(a) {
  if (a === 'equity') { openEquity(); }
  else if (a === 'stats') { openStats(); }
  else if (a === 'settings') notifyRN({ type: 'open-settings' });
  else if (a === 'reset') {
    if (!confirm('همه چیز ریست شود؟')) return;
    visibleCount = 100; currentTrade = null; closedTrades = []; drawings = []; drawHistory = [[]]; histIdx = 0; indicators = {}; activePanes = [];
    applyCandles(); updateUI(); updateMarkers(); redraw(); renderIndChips(); updatePaneLayout();
    showHint('ریست شد');
  }
}

function computeStats() {
  var wins = closedTrades.filter(function(t) { return t.result > 0; });
  var losses = closedTrades.filter(function(t) { return t.result < 0; });
  var gw = wins.reduce(function(s, t) { return s + t.result; }, 0);
  var gl = Math.abs(losses.reduce(function(s, t) { return s + t.result; }, 0));
  var total = closedTrades.reduce(function(s, t) { return s + t.result; }, 0);
  var totalR = closedTrades.reduce(function(s, t) { return s + t.resultR; }, 0);
  var rets = closedTrades.map(function(t) { return t.result; });
  var avg = rets.length ? rets.reduce(function(a, b) { return a + b; }, 0) / rets.length : 0;
  var v = rets.length ? rets.reduce(function(s, r) { return s + Math.pow(r - avg, 2); }, 0) / rets.length : 0;
  var sd = Math.sqrt(v);
  var bal = settings.capital, peak = bal, maxDD = 0;
  closedTrades.forEach(function(t) { bal += t.result; if (bal > peak) peak = bal; var dd = peak > 0 ? ((peak - bal) / peak) * 100 : 0; if (dd > maxDD) maxDD = dd; });
  return {
    total: closedTrades.length, wins: wins.length, losses: losses.length,
    winRate: closedTrades.length ? (wins.length / closedTrades.length) * 100 : 0,
    totalPnL: total, totalR: totalR, avgR: closedTrades.length ? totalR / closedTrades.length : 0,
    profitFactor: gl > 0 ? gw / gl : gw > 0 ? 99 : 0,
    sharpe: sd > 0 ? avg / sd : 0,
    largestWin: rets.length ? Math.max.apply(null, rets.concat([0])) : 0,
    largestLoss: rets.length ? Math.min.apply(null, rets.concat([0])) : 0,
    maxDD: maxDD
  };
}

function openStats() {
  var s = computeStats();
  var body = document.getElementById('stats-body');
  var rows = [
    ['معاملات', s.total, C.text],
    ['برد', s.wins, C.up],
    ['باخت', s.losses, C.down],
    ['وین‌ریت', s.winRate.toFixed(1) + '%', C.text],
    ['سود/زیان', (s.totalPnL >= 0 ? '+' : '') + '$' + s.totalPnL.toFixed(2), s.totalPnL >= 0 ? C.up : C.down],
    ['کل R', (s.totalR >= 0 ? '+' : '') + s.totalR.toFixed(2) + 'R', s.totalR >= 0 ? C.up : C.down],
    ['Profit Factor', s.profitFactor.toFixed(2), C.text],
    ['Sharpe', s.sharpe.toFixed(2), C.text],
    ['میانگین R', s.avgR.toFixed(2) + 'R', C.text],
    ['بزرگ‌ترین برد', '+$' + s.largestWin.toFixed(2), C.up],
    ['بزرگ‌ترین باخت', '$' + s.largestLoss.toFixed(2), C.down],
    ['Max DD', s.maxDD.toFixed(1) + '%', C.down]
  ];
  var html = '<div class="stats-grid">';
  rows.forEach(function(r) {
    html += '<div class="stat-box"><span class="lbl">' + r[0] + '</span><span class="val" style="color:' + r[2] + '">' + r[1] + '</span></div>';
  });
  html += '</div>';
  html += '<div class="stats-section"><h4>معاملات اخیر</h4><div class="tlist">';
  var recent = closedTrades.slice(-20).reverse();
  recent.forEach(function(t) {
    var dirClass = t.direction === 'buy' ? 'buy' : 'sell';
    var dirText = t.direction === 'buy' ? '▲ BUY' : '▼ SELL';
    html += '<div class="trade-item"><div class="left"><span class="dir ' + dirClass + '">' + dirText + '</span><span class="meta">@ ' + t.entryPrice.toFixed(2) + ' → ' + t.exitPrice.toFixed(2) + '</span></div><div class="right ' + (t.result >= 0 ? 'win' : 'loss') + '">' + (t.result >= 0 ? '+' : '') + '$' + t.result.toFixed(2) + '<span class="r">' + (t.resultR >= 0 ? '+' : '') + t.resultR.toFixed(2) + 'R</span></div></div>';
  });
  html += '</div></div>';
  body.innerHTML = html;
  document.getElementById('modal-stats').classList.add('on');
}

function openEquity() {
  document.getElementById('equity').classList.add('on');
  setTimeout(function() {
    var el = document.getElementById('equity-chart');
    el.innerHTML = '';
    var c = LightweightCharts.createChart(el, {
      width: el.clientWidth, height: 220,
      layout: { background: { type: 'solid', color: C.bg }, textColor: C.text, fontSize: 10 },
      grid: { vertLines: { color: C.border }, horzLines: { color: C.border } },
      rightPriceScale: { borderColor: C.border },
      timeScale: { borderColor: C.border, timeVisible: true }
    });
    if (closedTrades.length > 0) {
      var bal = settings.capital;
      var data = [{ time: Math.floor(candles[0].timestamp / 1000), value: bal }];
      closedTrades.forEach(function(t) { bal += t.result; if (t.exitTime) data.push({ time: Math.floor(t.exitTime / 1000), value: bal }); });
      var s = c.addAreaSeries({ topColor: '#16A34A40', bottomColor: '#16A34A05', lineColor: '#16A34A', lineWidth: 2 });
      s.setData(data);
    }
  }, 100);
}

function resizeAll() {
  var panel = document.getElementById('chart-panel');
  overlay.width = panel.clientWidth; overlay.height = panel.clientHeight;
  if (chart) chart.applyOptions({ width: panel.clientWidth, height: panel.clientHeight });
  Object.keys(panes).forEach(function(k) { if (panes[k]) panes[k].chart.applyOptions({ width: panes[k].el.clientWidth }); });
  redraw();
}

function redraw() {
  if (!ctx) return;
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  if (hideDrawings) return;
  var all = drawInProg ? drawings.concat([drawInProg]) : drawings;
  all.forEach(drawOne);
}

function evtPos(e) {
  var r = document.getElementById('chart-panel').getBoundingClientRect();
  var cx, cy;
  if (e.touches && e.touches.length) { cx = e.touches[0].clientX; cy = e.touches[0].clientY; }
  else if (e.changedTouches && e.changedTouches.length) { cx = e.changedTouches[0].clientX; cy = e.changedTouches[0].clientY; }
  else { cx = e.clientX; cy = e.clientY; }
  return { x: cx - r.left, y: cy - r.top };
}

function toChart(pos) {
  if (!chart || !candleSeries) return null;
  var t = chart.timeScale().coordinateToTime(pos.x);
  var p = candleSeries.coordinateToPrice(pos.y);
  if (t === null || p === null) return null;
  return { time: t, price: p };
}

function toScreen(pt) {
  if (!chart || !candleSeries || !pt) return null;
  var x = chart.timeScale().timeToCoordinate(pt.time);
  var y = candleSeries.priceToCoordinate(pt.price);
  if (x === null || y === null) return null;
  return { x: x, y: y };
}

function setupEvents() {
  var el = document.getElementById('chart-panel');
  el.addEventListener('mousedown', onDown);
  el.addEventListener('mousemove', onMove);
  el.addEventListener('mouseup', onUp);
  el.addEventListener('mouseleave', onUp);
  el.addEventListener('touchstart', onDown, { passive: false });
  el.addEventListener('touchmove', onMove, { passive: false });
  el.addEventListener('touchend', onUp);
}

function onDown(e) {
  if (activeTool === 'cursor' || activeTool === 'cross') return;
  e.preventDefault();
  var pt = toChart(evtPos(e));
  if (!pt) return;
  isDrawing = true;
  if (['hline','vline','text'].indexOf(activeTool) !== -1) {
    if (activeTool === 'text') {
      var txt = prompt('متن:', '');
      if (!txt) { isDrawing = false; return; }
      pushDraw({ tool: activeTool, pts: [pt], color: C.accent, text: txt });
    } else pushDraw({ tool: activeTool, pts: [pt], color: C.accent });
    isDrawing = false;
    return;
  }
  var req = activeTool === 'fibext' ? 3 : 2;
  drawInProg = { tool: activeTool, pts: [pt], color: C.accent, required: req };
  redraw();
}

function onMove(e) {
  if (!isDrawing || !drawInProg) return;
  e.preventDefault();
  var pt = toChart(evtPos(e));
  if (!pt) return;
  if (drawInProg.pts.length === 1) drawInProg.pts.push(pt);
  else drawInProg.pts[drawInProg.pts.length - 1] = pt;
  redraw();
}

function onUp() {
  if (!isDrawing || !drawInProg) return;
  isDrawing = false;
  if (drawInProg.pts.length < (drawInProg.required || 2)) return;
  pushDraw(drawInProg);
  drawInProg = null;
  redraw();
}

function pushDraw(d) {
  drawings.push(d);
  drawHistory = drawHistory.slice(0, histIdx + 1);
  drawHistory.push(JSON.parse(JSON.stringify(drawings)));
  histIdx = drawHistory.length - 1;
  redraw();
}

function drawOne(d) {
  var S = d.pts.map(toScreen);
  if (S.some(function(s) { return !s; })) return;
  var c = d.color || C.accent;
  ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = 2; ctx.lineCap = 'round';
  function line(a, b) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
  if (d.tool === 'trend') line(S[0], S[1]);
  else if (d.tool === 'ray') { var dx = S[1].x - S[0].x, dy = S[1].y - S[0].y, l = Math.hypot(dx, dy); if (!l) return; var sc = 3000 / l; ctx.beginPath(); ctx.moveTo(S[0].x, S[0].y); ctx.lineTo(S[0].x + dx * sc, S[0].y + dy * sc); ctx.stroke(); }
  else if (d.tool === 'hline') { ctx.setLineDash([8,4]); ctx.beginPath(); ctx.moveTo(0, S[0].y); ctx.lineTo(overlay.width, S[0].y); ctx.stroke(); ctx.setLineDash([]); }
  else if (d.tool === 'vline') { ctx.setLineDash([8,4]); ctx.beginPath(); ctx.moveTo(S[0].x, 0); ctx.lineTo(S[0].x, overlay.height); ctx.stroke(); ctx.setLineDash([]); }
  else if (d.tool === 'fib') { var lv = [0,0.236,0.382,0.5,0.618,0.786,1,1.272,1.618]; var cl = ['#EF4444','#F97316','#F59E0B','#FBBF24','#A3E635','#16A34A','#0891B2','#7C3AED','#DB2777']; var x1 = Math.min(S[0].x, S[1].x), x2 = Math.max(S[0].x, S[1].x); lv.forEach(function(l, i) { var y = S[0].y + (S[1].y - S[0].y) * l; ctx.strokeStyle = cl[i]; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke(); ctx.fillStyle = cl[i]; ctx.font = 'bold 9px sans-serif'; ctx.fillText((l*100).toFixed(1)+'%', x2+3, y+3); }); }
  else if (d.tool === 'rect') { var x = Math.min(S[0].x, S[1].x), y = Math.min(S[0].y, S[1].y); ctx.fillStyle = c + '25'; ctx.fillRect(x, y, Math.abs(S[1].x - S[0].x), Math.abs(S[1].y - S[0].y)); ctx.strokeRect(x, y, Math.abs(S[1].x - S[0].x), Math.abs(S[1].y - S[0].y)); }
  else if (d.tool === 'circle') { var r = Math.hypot(S[1].x - S[0].x, S[1].y - S[0].y); ctx.fillStyle = c + '25'; ctx.beginPath(); ctx.arc(S[0].x, S[0].y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  else if (d.tool === 'triangle') { var cx = (S[0].x + S[1].x) / 2; ctx.fillStyle = c + '25'; ctx.beginPath(); ctx.moveTo(cx, Math.min(S[0].y, S[1].y)); ctx.lineTo(S[0].x, Math.max(S[0].y, S[1].y)); ctx.lineTo(S[1].x, Math.max(S[0].y, S[1].y)); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  else if (d.tool === 'text') { ctx.font = 'bold 14px sans-serif'; ctx.fillText(d.text || '', S[0].x, S[0].y); }
  else if (d.tool === 'arrow') { line(S[0], S[1]); var ang = Math.atan2(S[1].y - S[0].y, S[1].x - S[0].x); var sz = 12; ctx.beginPath(); ctx.moveTo(S[1].x, S[1].y); ctx.lineTo(S[1].x - sz * Math.cos(ang - Math.PI/6), S[1].y - sz * Math.sin(ang - Math.PI/6)); ctx.lineTo(S[1].x - sz * Math.cos(ang + Math.PI/6), S[1].y - sz * Math.sin(ang + Math.PI/6)); ctx.closePath(); ctx.fill(); }
  else if (d.tool === 'ruler' || d.tool === 'long' || d.tool === 'short') {
    var pd = d.pts[1].price - d.pts[0].price;
    var pct = (pd / d.pts[0].price) * 100;
    var up = pd >= 0;
    var cc = d.tool === 'long' ? C.up : d.tool === 'short' ? C.down : (up ? C.up : C.down);
    ctx.strokeStyle = cc; ctx.fillStyle = cc + '25';
    var x = Math.min(S[0].x, S[1].x), y = Math.min(S[0].y, S[1].y);
    var w = Math.abs(S[1].x - S[0].x), h = Math.abs(S[1].y - S[0].y);
    ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = cc; ctx.font = 'bold 11px sans-serif';
    ctx.fillText((up ? '+' : '') + pd.toFixed(2) + ' (' + (up ? '+' : '') + pct.toFixed(2) + '%)', x + 3, y - 4);
  }
}

function updateOHLC(param) {
  var o, h, l, c;
  if (!param || !param.time || !param.seriesData || !candleSeries || !param.seriesData.has(candleSeries)) {
    var last = candles[visibleCount - 1];
    if (!last) return;
    o = last.open; h = last.high; l = last.low; c = last.close;
  } else {
    var d = param.seriesData.get(candleSeries);
    if (!d) return;
    o = d.open; h = d.high; l = d.low; c = d.close;
  }
  var dec = c > 100 ? 2 : c > 1 ? 3 : 5;
  document.getElementById('o').textContent = o.toFixed(dec);
  document.getElementById('h').textContent = h.toFixed(dec);
  document.getElementById('l').textContent = l.toFixed(dec);
  document.getElementById('c').textContent = c.toFixed(dec);
  var diff = c - o, pct = o !== 0 ? (diff / o) * 100 : 0;
  var chg = document.getElementById('chg');
  chg.textContent = (diff >= 0 ? '+' : '') + pct.toFixed(2) + '%';
  chg.className = diff >= 0 ? 'up' : 'down';
}

var hintTimer;
function showHint(t) {
  var h = document.getElementById('hint');
  h.textContent = t;
  h.classList.add('on');
  clearTimeout(hintTimer);
  hintTimer = setTimeout(function() { h.classList.remove('on'); }, 2500);
}
function hideHint() { document.getElementById('hint').classList.remove('on'); }

function notifyRN(d) { if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(d)); }

window.setCandles = function(data, tf) {
  candles = data || [];
  currentTF = tf || currentTF;
  visibleCount = Math.min(100, candles.length);
  if (activePanes.indexOf('volume') === -1) { activePanes.push('volume'); updatePaneLayout(); renderIndChips(); }
  applyCandles();
};

window.setSettings = function(s) {
  settings = Object.assign({}, settings, s);
  showHint('تنظیمات اعمال شد ✓');
};

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
              <Text style={[styles.lbl, { color: colors.mutedText }]}>سرمایه کل ($)</Text>
              <TextInput value={capital} onChangeText={setCapital} keyboardType="decimal-pad"
                style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]} />
              <Text style={[styles.lbl, { color: colors.mutedText }]}>ریسک هر معامله (%)</Text>
              <TextInput value={riskPct} onChangeText={setRiskPct} keyboardType="decimal-pad"
                style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]} />
              <Text style={[styles.lbl, { color: colors.mutedText }]}>ATR × (SL)</Text>
              <TextInput value={atrMult} onChangeText={setAtrMult} keyboardType="decimal-pad"
                style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]} />
              <Text style={[styles.lbl, { color: colors.mutedText }]}>R:R هدف</Text>
              <TextInput value={rr} onChangeText={setRr} keyboardType="decimal-pad"
                style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]} />
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