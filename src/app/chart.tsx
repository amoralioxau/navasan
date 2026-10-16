import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { useNavasanTheme } from '@/context/theme-context';
import { getChartLibrary } from '@/lib/chart-loader';
import { fetchCandles, type Candle, type Timeframe } from '@/lib/market-data';

const BLUE = '#2563EB';
const GREEN = '#16A34A';
const RED = '#DC2626';

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
  { id: 'AVAXUSD', label: 'Avalanche', cat: 'crypto' },
  { id: 'DOTUSD', label: 'Polkadot', cat: 'crypto' },
  { id: 'LINKUSD', label: 'Chainlink', cat: 'crypto' },
  { id: 'EURUSD', label: 'یورو/دلار', cat: 'forex' },
  { id: 'GBPUSD', label: 'پوند/دلار', cat: 'forex' },
  { id: 'USDJPY', label: 'دلار/ین', cat: 'forex' },
  { id: 'AUDUSD', label: 'دلار استرالیا', cat: 'forex' },
  { id: 'USDCAD', label: 'دلار/کانادا', cat: 'forex' },
  { id: 'EURJPY', label: 'یورو/ین', cat: 'forex' },
  { id: 'GBPJPY', label: 'پوند/ین', cat: 'forex' },
  { id: 'SPX', label: 'S&P 500', cat: 'index' },
  { id: 'NAS100', label: 'نزدک', cat: 'index' },
  { id: 'DJI', label: 'داو جونز', cat: 'index' },
  { id: 'DAX', label: 'DAX', cat: 'index' },
];

const CATEGORY_LABELS: Record<SymbolItem['cat'], string> = {
  metal: 'فلزات', crypto: 'کریپتو', forex: 'فارکس', index: 'شاخص‌ها',
};
const CATEGORIES: SymbolItem['cat'][] = ['metal', 'crypto', 'forex', 'index'];

// =========================================================
// HTML BUILDER — نسخه حرفه‌ای v2.0
// =========================================================
const buildHTML = (isDark: boolean, libraryCode: string): string => {
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
html,body{width:100%;height:100%;overflow:hidden;background:${bg};color:${text};font-family:-apple-system,BlinkMacSystemFont,sans-serif;user-select:none;touch-action:manipulation;font-feature-settings:'tnum'}
#topbar{position:absolute;top:0;left:0;right:0;height:30px;background:${panel};border-bottom:1px solid ${border};display:flex;align-items:center;padding:0 6px;gap:8px;font-size:10px;font-weight:700;color:${muted};z-index:60;overflow-x:auto;scrollbar-width:none}
#topbar::-webkit-scrollbar{display:none}
#topbar span{white-space:nowrap}
#topbar b{color:${text};font-weight:900;font-size:11px}
#topbar .up{color:#16A34A}#topbar .down{color:#DC2626}
#leftbar{position:absolute;top:30px;left:0;bottom:0;width:42px;background:${panel};border-right:1px solid ${border};z-index:55;overflow-y:auto;scrollbar-width:none;display:flex;flex-direction:column;padding:2px 0}
#leftbar::-webkit-scrollbar{display:none}
.tg{display:flex;flex-direction:column;padding:1px 0;border-bottom:1px solid ${border}}
.tg .gl{font-size:5px;color:${muted};text-align:center;padding:1px 0;font-weight:900;letter-spacing:.4px}
.tool{width:42px;height:30px;background:transparent;border:none;color:${text};cursor:pointer;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;font-family:inherit;transition:background .1s;position:relative}
.tool:hover{background:${hover}}
.tool.on{background:${accent};color:#FFF}
.tool.on::after{content:'';position:absolute;right:2px;top:50%;transform:translateY(-50%);width:2px;height:12px;background:#FFF;border-radius:1px}
#chart-root{position:absolute;top:30px;left:42px;right:0;bottom:0}
#chart-panel{position:absolute;top:0;left:0;right:0;bottom:0;overflow:hidden}
#main-chart{width:100%;height:100%}
#overlay{position:absolute;top:0;left:0;right:0;bottom:0;pointer-events:none;z-index:10}
.sub-pane{position:absolute;left:0;right:0;height:72px;background:${bg};border-top:1px solid ${border};display:none;z-index:5}
.sub-pane.on{display:block}
#floats{position:absolute;bottom:46px;right:8px;display:flex;flex-direction:column;gap:8px;z-index:56}
.fbtn{width:46px;height:46px;border-radius:50%;border:none;font-size:18px;cursor:pointer;color:#FFF;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 6px 18px #00000050;font-family:inherit;transition:transform .15s}
.fbtn:active{transform:scale(.9)}
.fbtn.inds{background:linear-gradient(135deg,#2563EB,#3B82F6)}
.fbtn.alert{background:linear-gradient(135deg,#D97706,#F59E0B)}
.fbtn.backtest{background:linear-gradient(135deg,#7C3AED,#A855F7)}
#ind-chips{position:absolute;bottom:46px;left:8px;display:flex;flex-wrap:wrap;gap:3px;max-width:55%;z-index:56}
.ichip{height:20px;padding:0 8px;background:${panel}F0;border:1px solid ${border};color:${text};border-radius:5px;font-size:9px;font-weight:800;font-family:inherit;cursor:pointer;display:flex;align-items:center;gap:4px;transition:all .12s}
.ichip:hover{border-color:${accent}}
.ichip .x{color:${muted};font-size:10px;font-weight:900}
.ichip:hover .x{color:#DC2626}
#controls{position:absolute;bottom:0;left:0;right:0;height:40px;background:${panel};border-top:1px solid ${border};display:flex;align-items:center;padding:0 5px;gap:3px;z-index:55;overflow-x:auto;scrollbar-width:none}
#controls::-webkit-scrollbar{display:none}
.ctrl{height:28px;min-width:28px;padding:0 8px;background:transparent;border:1px solid ${border};color:${text};border-radius:6px;font-size:10px;font-weight:900;font-family:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;white-space:nowrap;transition:all .12s}
.ctrl:hover{background:${hover}}
.ctrl.on{background:${accent};border-color:${accent};color:#FFF;box-shadow:0 2px 8px ${accent}66}
.sep{width:1px;height:20px;background:${border};margin:0 2px;flex-shrink:0}
#hint{position:absolute;top:38px;left:50%;transform:translateX(-50%);background:${accent}EE;color:#FFF;padding:7px 16px;border-radius:9px;font-size:11px;font-weight:800;z-index:57;display:none;white-space:nowrap;box-shadow:0 8px 24px ${accent}70;max-width:85%;overflow:hidden;text-overflow:ellipsis;letter-spacing:.2px}
#hint.on{display:block;animation:popIn .2s cubic-bezier(.2,.8,.4,1)}
@keyframes popIn{from{opacity:0;transform:translate(-50%,-8px) scale(.95)}to{opacity:1;transform:translate(-50%,0) scale(1)}}
#measure{position:absolute;background:${accent}EE;color:#FFF;padding:5px 12px;border-radius:7px;font-size:11px;font-weight:900;z-index:57;display:none;pointer-events:none;white-space:nowrap;box-shadow:0 4px 16px #00000060;font-feature-settings:'tnum'}
#measure.on{display:block}
.modal{position:absolute;inset:0;background:#00000080;display:none;align-items:center;justify-content:center;z-index:70;padding:16px;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
.modal.on{display:flex;animation:fadeIn .15s}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
.mc{background:${card};border-radius:16px;max-width:440px;width:100%;max-height:88vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 24px 80px #00000090;border:1px solid ${border}}
.mh{padding:14px 16px;border-bottom:1px solid ${border};font-size:15px;font-weight:900;display:flex;justify-content:space-between;align-items:center;background:${panel}}
.mh button{background:transparent;border:none;color:${muted};font-size:22px;cursor:pointer;font-family:inherit;padding:0 6px;line-height:1}
.mh button:hover{color:#DC2626}
.mb{padding:14px;overflow-y:auto;display:flex;flex-direction:column;gap:8px}
.mb::-webkit-scrollbar{width:5px}
.mb::-webkit-scrollbar-thumb{background:${border};border-radius:3px}
.search-box{width:100%;padding:10px 12px;background:${panel};border:1px solid ${border};border-radius:9px;color:${text};font-size:12px;font-family:inherit;font-weight:700;outline:none;margin-bottom:8px}
.search-box:focus{border-color:${accent}}
.ind-cat{background:${panel};border:1px solid ${border};border-radius:10px;overflow:hidden;margin-bottom:6px}
.ind-cat-hd{padding:10px 12px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;font-size:11.5px;font-weight:900;letter-spacing:.2px}
.ind-cat-hd .arrow{color:${muted};font-size:12px;transition:transform .2s}
.ind-cat.open .arrow{transform:rotate(90deg)}
.ind-cat-hd .cnt{color:${muted};font-size:9.5px;background:${card};padding:1px 6px;border-radius:8px;font-weight:800;margin-left:6px}
.ind-items{padding:0 8px 8px;display:none;flex-wrap:wrap;gap:5px}
.ind-cat.open .ind-items{display:flex}
.ind-item{padding:6px 11px;background:${card};border:1px solid ${border};border-radius:7px;font-size:10.5px;font-weight:800;cursor:pointer;transition:all .12s;display:flex;align-items:center;gap:5px}
.ind-item:hover{background:${accent}20;border-color:${accent};color:${accent};transform:translateY(-1px)}
.ind-item.on{background:${accent};color:#FFF;border-color:${accent}}
.ind-item.on::before{content:'✓';font-weight:900}
.alert-row{padding:10px;background:${panel};border:1px solid ${border};border-radius:10px;display:flex;flex-direction:column;gap:6px;margin-bottom:6px}
.alert-row .hd{display:flex;justify-content:space-between;align-items:center;font-size:11.5px;font-weight:900}
.alert-row .hd .x{color:${muted};cursor:pointer;font-size:14px}
.alert-row .hd .x:hover{color:#DC2626}
.alert-row .meta{font-size:9.5px;color:${muted};font-weight:700}
.alert-add{padding:10px;background:${accent}15;border:1px dashed ${accent};border-radius:10px;font-size:11px;font-weight:900;color:${accent};text-align:center;cursor:pointer}
.alert-add:hover{background:${accent}25}
#load{position:absolute;inset:0;background:${bg};z-index:100;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:14px;font-size:12px;font-weight:700;color:${muted}}
.sp{width:38px;height:38px;border:3px solid ${grid};border-top-color:${accent};border-radius:50%;animation:spin .75s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.load-steps{display:flex;gap:6px;margin-top:6px}
.load-step{width:6px;height:6px;border-radius:50%;background:${border};transition:all .3s}
.load-step.active{background:${accent};width:20px;border-radius:3px}
.toast{position:absolute;top:42px;left:50%;transform:translateX(-50%);background:${card};border:1px solid ${accent};border-radius:10px;padding:10px 18px;font-size:11.5px;font-weight:800;color:${text};z-index:90;box-shadow:0 8px 32px #00000080;display:none;white-space:nowrap;max-width:80%;overflow:hidden;text-overflow:ellipsis}
.toast.on{display:block;animation:popIn .2s}
.bt-result{padding:12px;background:${panel};border:1px solid ${border};border-radius:10px;display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
.bt-result .item{display:flex;flex-direction:column;gap:2px}
.bt-result .item .lbl{font-size:9.5px;color:${muted};font-weight:700}
.bt-result .item .val{font-size:13px;font-weight:900;font-feature-settings:'tnum'}
</style>
</head>
<body>

<div id="topbar">
  <span>O <b id="o">—</b></span><span>H <b id="h">—</b></span>
  <span>L <b id="l">—</b></span><span>C <b id="c">—</b></span>
  <span id="chg">—</span>
  <span class="candles" id="candles-info" style="margin-left:auto;padding-right:4px;color:${accent};font-weight:900;font-size:10px">— / —</span>
</div>
<div id="leftbar"></div>
<div id="chart-root">
  <div id="chart-panel">
    <div id="main-chart"></div>
    <canvas id="overlay"></canvas>
  </div>
  <div class="sub-pane" id="pane-volume"></div>
  <div class="sub-pane" id="pane-momentum"></div>
  <div class="sub-pane" id="pane-volatility"></div>
</div>
<div id="ind-chips"></div>
<div id="floats">
  <button class="fbtn inds" id="btn-ind" title="اندیکاتورها">📊</button>
  <button class="fbtn alert" id="btn-alert" title="آلرت‌ها">🔔</button>
  <button class="fbtn backtest" id="btn-bt" title="بک‌تست">⚡</button>
</div>
<div id="controls"></div>
<div id="hint"></div>
<div id="measure"></div>
<div class="toast" id="toast"></div>

<div class="modal" id="modal-ind">
  <div class="mc">
    <div class="mh"><span>📊 اندیکاتورها</span><button onclick="closeModal('modal-ind')">✕</button></div>
    <div class="mb">
      <input type="text" class="search-box" id="ind-search" placeholder="جستجوی اندیکاتور..." />
      <div id="ind-body"></div>
    </div>
  </div>
</div>

<div class="modal" id="modal-alert">
  <div class="mc">
    <div class="mh"><span>🔔 آلرت‌های قیمتی</span><button onclick="closeModal('modal-alert')">✕</button></div>
    <div class="mb" id="alert-body"></div>
  </div>
</div>

<div class="modal" id="modal-bt">
  <div class="mc">
    <div class="mh"><span>⚡ بک‌تست استراتژی</span><button onclick="closeModal('modal-bt')">✕</button></div>
    <div class="mb" id="bt-body">
      <div style="font-size:11.5px;font-weight:800;margin-bottom:6px">استراتژی:</div>
      <select id="bt-strategy" class="search-box" style="padding:10px">
        <option value="sma_cross">کراس SMA 20/50</option>
        <option value="ema_cross">کراس EMA 9/21</option>
        <option value="rsi_ob">RSI اشباع (30/70)</option>
        <option value="macd">کراس MACD</option>
        <option value="supertrend">سوپرترند</option>
        <option value="bb">برخورد بولینگر</option>
      </select>
      <div style="font-size:11.5px;font-weight:800;margin-top:10px;margin-bottom:6px">حجم معامله ($):</div>
      <input type="number" id="bt-size" class="search-box" value="1000" />
      <button onclick="runBacktest()" style="margin-top:12px;padding:12px;background:linear-gradient(135deg,#7C3AED,#A855F7);border:none;border-radius:10px;color:#FFF;font-weight:900;font-size:13px;cursor:pointer;font-family:inherit">شروع بک‌تست</button>
      <div id="bt-results"></div>
    </div>
  </div>
</div>

<div id="load">
  <div class="sp"></div>
  <div id="load-msg">راه‌اندازی چارت حرفه‌ای...</div>
  <div class="load-steps"><div class="load-step active"></div><div class="load-step"></div><div class="load-step"></div></div>
</div>

<script>${libraryCode || '/* fallback */'}</script>
${libraryCode ? '' : '<script src="https://cdn.jsdelivr.net/npm/lightweight-charts@4.2.3/dist/lightweight-charts.standalone.production.js"></script>'}
<script>
'use strict';

var C = {
  up:'#16A34A', down:'#DC2626', accent:'#2563EB', text:'${text}', muted:'${muted}',
  bg:'${bg}', card:'${card}', border:'${border}', panel:'${panel}'
};

// STATE
var chart, candleSeries, overlay, ctx;
var panes = {};
var candles = [];
var visibleCount = 400;
var chartType = 'candles';
var activeTool = 'cursor';
var drawings = [];
var drawInProg = null;
var isDrawing = false;
var activePanes = ['volume'];
var indicators = {};
var alerts = [];
var hideDrawings = false;
var hintTimer, toastTimer;

// TOOL GROUPS — 40+ tools
var TOOL_GROUPS = [
  { label: 'CUR', tools: [
    { id: 'cursor', icon: '✛', title: 'کرسر' },
    { id: 'cross', icon: '✚', title: 'کراس‌هیر' }
  ]},
  { label: 'LINE', tools: [
    { id: 'trend', icon: '╱', title: 'خط روند' },
    { id: 'ray', icon: '↗', title: 'شعاع' },
    { id: 'ext', icon: '⇿', title: 'خط گسترده' },
    { id: 'hline', icon: '━', title: 'افقی' },
    { id: 'vline', icon: '┃', title: 'عمودی' },
    { id: 'hray', icon: '➡', title: 'شعاع افقی' },
    { id: 'crossline', icon: '╋', title: 'کراس‌لاین' },
    { id: 'angle', icon: '∡', title: 'زاویه' }
  ]},
  { label: 'CHAN', tools: [
    { id: 'channel', icon: '∥', title: 'کانال موازی' },
    { id: 'dchannel', icon: '⟨⟩', title: 'کانال مجزا' },
    { id: 'flattop', icon: '⌐', title: 'فلت‌تاپ' },
    { id: 'regression', icon: '∿', title: 'رگرسیون' }
  ]},
  { label: 'FIB', tools: [
    { id: 'fib', icon: '≋', title: 'فیبوناچی' },
    { id: 'fibext', icon: '⋮', title: 'فیبوناچی Ext' },
    { id: 'fibtime', icon: '⊦', title: 'فیبوناچی تایم' },
    { id: 'fibfan', icon: '⌒', title: 'فیبوناچی فن' },
    { id: 'fibarc', icon: '◜', title: 'فیبوناچی آرک' }
  ]},
  { label: 'GANN', tools: [
    { id: 'gannfan', icon: '☀', title: 'گان فن' },
    { id: 'gannbox', icon: '⊞', title: 'گان باکس' }
  ]},
  { label: 'PITCH', tools: [
    { id: 'pitchfork', icon: '⩡', title: 'اندرو پیچ‌فورک' },
    { id: 'schiff', icon: '⩢', title: 'شیف' },
    { id: 'mschiff', icon: '⩣', title: 'شیف اصلاح‌شده' }
  ]},
  { label: 'SHAPE', tools: [
    { id: 'rect', icon: '▭', title: 'مستطیل' },
    { id: 'circle', icon: '◯', title: 'دایره' },
    { id: 'ellipse', icon: '⬭', title: 'بیضی' },
    { id: 'triangle', icon: '△', title: 'مثلث' }
  ]},
  { label: 'PAT', tools: [
    { id: 'xabcd', icon: 'X', title: 'XABCD' },
    { id: 'hs', icon: 'M', title: 'سر و شانه' },
    { id: 'elliott', icon: '⑤', title: 'الیوت' }
  ]},
  { label: 'BRUSH', tools: [
    { id: 'brush', icon: '✎', title: 'قلم' },
    { id: 'marker', icon: '🖍', title: 'هایلایتر' },
    { id: 'eraser', icon: '⌫', title: 'پاک‌کن' }
  ]},
  { label: 'TEXT', tools: [
    { id: 'text', icon: 'T', title: 'متن' },
    { id: 'note', icon: '📝', title: 'یادداشت' },
    { id: 'label', icon: '🏷', title: 'برچسب' },
    { id: 'arrow', icon: '➤', title: 'فلش' }
  ]},
  { label: 'TRADE', tools: [
    { id: 'long', icon: '▲', title: 'لانگ' },
    { id: 'short', icon: '▼', title: 'شورت' },
    { id: 'projection', icon: '⩗', title: 'پروجکشن' }
  ]},
  { label: 'MEAS', tools: [
    { id: 'ruler', icon: '📏', title: 'خط‌کش' },
    { id: 'daterange', icon: '↔', title: 'بازه تاریخ' },
    { id: 'priceRange', icon: '⩈', title: 'محدوده قیمت' }
  ]}
];

// INDICATORS — 30+
var INDICATORS = [
  // میانگین‌های متحرک
  { id:'sma', cat:'میانگین‌های متحرک', name:'SMA', params:[{k:'period',def:20}], main:true, color:'#F59E0B' },
  { id:'ema', cat:'میانگین‌های متحرک', name:'EMA', params:[{k:'period',def:20}], main:true, color:'#7C3AED' },
  { id:'wma', cat:'میانگین‌های متحرک', name:'WMA', params:[{k:'period',def:20}], main:true, color:'#0891B2' },
  { id:'hma', cat:'میانگین‌های متحرک', name:'HMA', params:[{k:'period',def:20}], main:true, color:'#DB2777' },
  { id:'vwma', cat:'میانگین‌های متحرک', name:'VWMA', params:[{k:'period',def:20}], main:true, color:'#16A34A' },
  { id:'dema', cat:'میانگین‌های متحرک', name:'DEMA', params:[{k:'period',def:20}], main:true, color:'#A855F7' },
  { id:'tema', cat:'میانگین‌های متحرک', name:'TEMA', params:[{k:'period',def:20}], main:true, color:'#06B6D4' },
  // باند و کانال
  { id:'bb', cat:'باندها و کانال‌ها', name:'Bollinger', params:[{k:'period',def:20},{k:'mult',def:2}], main:true },
  { id:'keltner', cat:'باندها و کانال‌ها', name:'Keltner', params:[{k:'period',def:20},{k:'mult',def:2}], main:true },
  { id:'donchian', cat:'باندها و کانال‌ها', name:'Donchian', params:[{k:'period',def:20}], main:true },
  { id:'envelope', cat:'باندها و کانال‌ها', name:'Envelope', params:[{k:'period',def:20},{k:'pct',def:2}], main:true },
  // روند
  { id:'psar', cat:'روند', name:'PSAR', params:[{k:'step',def:0.02},{k:'max',def:0.2}], main:true },
  { id:'supertrend', cat:'روند', name:'Supertrend', params:[{k:'period',def:10},{k:'mult',def:3}], main:true },
  { id:'ichimoku', cat:'روند', name:'Ichimoku', params:[], main:true },
  { id:'vwap', cat:'روند', name:'VWAP', params:[], main:true, color:'#F59E0B' },
  { id:'aroon', cat:'روند', name:'Aroon', params:[{k:'period',def:14}], pane:'momentum' },
  { id:'adx', cat:'روند', name:'ADX/DMI', params:[{k:'period',def:14}], pane:'volatility' },
  // مومنتوم
  { id:'rsi', cat:'مومنتوم', name:'RSI', params:[{k:'period',def:14}], pane:'momentum' },
  { id:'stoch', cat:'مومنتوم', name:'Stochastic', params:[{k:'k',def:14},{k:'d',def:3}], pane:'momentum' },
  { id:'stochrsi', cat:'مومنتوم', name:'Stoch RSI', params:[{k:'period',def:14}], pane:'momentum' },
  { id:'macd', cat:'مومنتوم', name:'MACD', params:[{k:'fast',def:12},{k:'slow',def:26},{k:'signal',def:9}], pane:'momentum' },
  { id:'cci', cat:'مومنتوم', name:'CCI', params:[{k:'period',def:20}], pane:'momentum' },
  { id:'willr', cat:'مومنتوم', name:'Williams %R', params:[{k:'period',def:14}], pane:'momentum' },
  { id:'mfi', cat:'مومنتوم', name:'MFI', params:[{k:'period',def:14}], pane:'momentum' },
  { id:'roc', cat:'مومنتوم', name:'ROC', params:[{k:'period',def:9}], pane:'momentum' },
  { id:'momentum', cat:'مومنتوم', name:'Momentum', params:[{k:'period',def:10}], pane:'momentum' },
  // نوسان
  { id:'atr', cat:'نوسان', name:'ATR', params:[{k:'period',def:14}], pane:'volatility' },
  { id:'stdev', cat:'نوسان', name:'Std Dev', params:[{k:'period',def:20}], pane:'volatility' },
  // حجم
  { id:'volume', cat:'حجم', name:'Volume', params:[], pane:'volume' },
  { id:'obv', cat:'حجم', name:'OBV', params:[], pane:'volume' }
];

// ==================== MATH ====================
var M = {
  sma: function(c,p){var r=[];for(var i=0;i<c.length;i++){if(i<p-1)continue;var s=0;for(var j=0;j<p;j++)s+=c[i-j].close;r.push({time:Math.floor(c[i].timestamp/1000),value:s/p});}return r;},
  ema: function(c,p){if(c.length<p)return[];var k=2/(p+1),r=[];var e=0;for(var i=0;i<p;i++)e+=c[i].close;e/=p;r.push({time:Math.floor(c[p-1].timestamp/1000),value:e});for(var i=p;i<c.length;i++){e=c[i].close*k+e*(1-k);r.push({time:Math.floor(c[i].timestamp/1000),value:e});}return r;},
  wma: function(c,p){var r=[],ws=p*(p+1)/2;for(var i=0;i<c.length;i++){if(i<p-1)continue;var s=0;for(var j=0;j<p;j++)s+=c[i-j].close*(p-j);r.push({time:Math.floor(c[i].timestamp/1000),value:s/ws});}return r;},
  hma: function(c,p){var half=Math.floor(p/2),sp=Math.floor(Math.sqrt(p));var wH=M.wma(c,half),wF=M.wma(c,p);var m={};wH.forEach(function(x){m[x.time]=x.value;});var diff=[];wF.forEach(function(x){if(m[x.time]!==undefined)diff.push({time:x.time,value:2*m[x.time]-x.value});});var r=[];for(var i=0;i<diff.length;i++){if(i<sp-1)continue;var s=0,ws=0;for(var j=0;j<sp;j++){s+=diff[i-j].value*(sp-j);ws+=(sp-j);}r.push({time:diff[i].time,value:s/ws});}return r;},
  vwma: function(c,p){var r=[];for(var i=0;i<c.length;i++){if(i<p-1)continue;var sv=0,spv=0;for(var j=0;j<p;j++){var v=c[i-j].volume||1;sv+=v;spv+=c[i-j].close*v;}r.push({time:Math.floor(c[i].timestamp/1000),value:spv/sv});}return r;},
  dema: function(c,p){var e1=M.ema(c,p);var e1v=e1.map(function(x){return{time:x.time,close:x.value,timestamp:x.time*1000};});var e2=M.ema(e1v,p);var m={};e2.forEach(function(x){m[x.time]=x.value;});return e1.map(function(x){return{time:x.time,value:2*x.value-(m[x.time]||x.value)};});},
  tema: function(c,p){var e1=M.ema(c,p);var e1v=e1.map(function(x){return{time:x.time,close:x.value,timestamp:x.time*1000};});var e2=M.ema(e1v,p);var e2v=e2.map(function(x){return{time:x.time,close:x.value,timestamp:x.time*1000};});var e3=M.ema(e2v,p);var m2={},m3={};e2.forEach(function(x){m2[x.time]=x.value;});e3.forEach(function(x){m3[x.time]=x.value;});return e1.map(function(x){return{time:x.time,value:3*x.value-3*(m2[x.time]||x.value)+(m3[x.time]||x.value)};});},
  bb: function(c,p,m){var u=[],mid=[],l=[];for(var i=0;i<c.length;i++){if(i<p-1)continue;var s=0;for(var j=0;j<p;j++)s+=c[i-j].close;var sma=s/p;var v=0;for(var j=0;j<p;j++)v+=Math.pow(c[i-j].close-sma,2);var sd=Math.sqrt(v/p);var t=Math.floor(c[i].timestamp/1000);u.push({time:t,value:sma+sd*m});mid.push({time:t,value:sma});l.push({time:t,value:sma-sd*m});}return{u:u,m:mid,l:l};},
  atr: function(c,p){if(c.length<p+1)return[];var tr=[];for(var i=1;i<c.length;i++)tr.push(Math.max(c[i].high-c[i].low,Math.abs(c[i].high-c[i-1].close),Math.abs(c[i].low-c[i-1].close)));var r=[];var a=0;for(var i=0;i<p;i++)a+=tr[i];a/=p;r.push({time:Math.floor(c[p].timestamp/1000),value:a});for(var i=p;i<tr.length;i++){a=(a*(p-1)+tr[i])/p;r.push({time:Math.floor(c[i+1].timestamp/1000),value:a});}return r;},
  keltner: function(c,p,m){var ema=M.ema(c,p),atr=M.atr(c,p);var am={};atr.forEach(function(x){am[x.time]=x.value;});var u=[],mid=[],l=[];ema.forEach(function(x){var a=am[x.time];if(a===undefined)return;u.push({time:x.time,value:x.value+a*m});mid.push({time:x.time,value:x.value});l.push({time:x.time,value:x.value-a*m});});return{u:u,m:mid,l:l};},
  donchian: function(c,p){var u=[],mid=[],l=[];for(var i=0;i<c.length;i++){if(i<p-1)continue;var hi=-Infinity,lo=Infinity;for(var j=0;j<p;j++){if(c[i-j].high>hi)hi=c[i-j].high;if(c[i-j].low<lo)lo=c[i-j].low;}var t=Math.floor(c[i].timestamp/1000);u.push({time:t,value:hi});mid.push({time:t,value:(hi+lo)/2});l.push({time:t,value:lo});}return{u:u,m:mid,l:l};},
  envelope: function(c,p,pct){var sma=M.sma(c,p);var u=[],l=[];sma.forEach(function(x){u.push({time:x.time,value:x.value*(1+pct/100)});l.push({time:x.time,value:x.value*(1-pct/100)});});return{u:u,m:sma,l:l};},
  psar: function(c,step,max){var r=[];var up=true,af=step,ep=c[0].low,sar=c[0].high;for(var i=1;i<c.length;i++){var p=sar;sar=p+af*(ep-p);if(up){if(c[i].low<sar){up=false;sar=ep;ep=c[i].low;af=step;}else{if(c[i].high>ep){ep=c[i].high;af=Math.min(af+step,max);}}}else{if(c[i].high>sar){up=true;sar=ep;ep=c[i].high;af=step;}else{if(c[i].low<ep){ep=c[i].low;af=Math.min(af+step,max);}}}r.push({time:Math.floor(c[i].timestamp/1000),value:sar});}return r;},
  supertrend: function(c,p,m){var atr=M.atr(c,p);var am={};atr.forEach(function(x){am[x.time]=x.value;});var r=[];var prev=null,dir=1;c.forEach(function(x){var t=Math.floor(x.timestamp/1000);var a=am[t];if(a===undefined)return;var hl2=(x.high+x.low)/2;var u=hl2-m*a,d=hl2+m*a;var st,dd;if(prev===null){st=u;dd=1;}else{if(dir===1){st=x.close>prev?Math.max(u,prev):d;dd=x.close>prev?1:-1;}else{st=x.close<prev?Math.min(d,prev):u;dd=x.close<prev?-1:1;}}r.push({time:t,value:st});prev=st;dir=dd;});return r;},
  vwap: function(c){var r=[];var spv=0,sv=0,cd=null;c.forEach(function(x){var d=new Date(x.timestamp).toDateString();if(d!==cd){cd=d;spv=0;sv=0;}var tp=(x.high+x.low+x.close)/3;var v=x.volume||1;spv+=tp*v;sv+=v;r.push({time:Math.floor(x.timestamp/1000),value:spv/sv});});return r;},
  ichimoku: function(c){
    var hiLo=function(n){var r=[];for(var i=0;i<c.length;i++){if(i<n-1)continue;var hi=-Infinity,lo=Infinity;for(var j=0;j<n;j++){if(c[i-j].high>hi)hi=c[i-j].high;if(c[i-j].low<lo)lo=c[i-j].low;}r.push({time:Math.floor(c[i].timestamp/1000),value:(hi+lo)/2});}return r;};
    var tenkan=hiLo(9),kijun=hiLo(26);var senkouA=[];var km={};kijun.forEach(function(x){km[x.time]=x.value;});tenkan.forEach(function(x){if(km[x.time]!==undefined)senkouA.push({time:x.time,value:(x.value+km[x.time])/2});});var senkouB=hiLo(52);return{tenkan:tenkan,kijun:kijun,senkouA:senkouA,senkouB:senkouB};},
  rsi: function(c,p){if(c.length<=p)return[];var r=[];var ag=0,al=0;for(var i=1;i<=p;i++){var d=c[i].close-c[i-1].close;if(d>=0)ag+=d;else al-=d;}ag/=p;al/=p;var rs=al===0?100:ag/al;r.push({time:Math.floor(c[p].timestamp/1000),value:100-100/(1+rs)});for(var i=p+1;i<c.length;i++){var d=c[i].close-c[i-1].close;var g=d>0?d:0,lo=d<0?-d:0;ag=(ag*(p-1)+g)/p;al=(al*(p-1)+lo)/p;rs=al===0?100:ag/al;r.push({time:Math.floor(c[i].timestamp/1000),value:100-100/(1+rs)});}return r;},
  stoch: function(c,k,d){var kv=[];for(var i=0;i<c.length;i++){if(i<k-1)continue;var hi=-Infinity,lo=Infinity;for(var j=0;j<k;j++){if(c[i-j].high>hi)hi=c[i-j].high;if(c[i-j].low<lo)lo=c[i-j].low;}var v=hi===lo?50:((c[i].close-lo)/(hi-lo))*100;kv.push({time:Math.floor(c[i].timestamp/1000),value:v});}var dv=[];for(var i=0;i<kv.length;i++){if(i<d-1)continue;var s=0;for(var j=0;j<d;j++)s+=kv[i-j].value;dv.push({time:kv[i].time,value:s/d});}return{k:kv,d:dv};},
  macd: function(c,f,s,sig){var ef=M.ema(c,f),es=M.ema(c,s);var m={};es.forEach(function(x){m[x.time]=x.value;});var macd=[];ef.forEach(function(x){if(m[x.time]!==undefined)macd.push({time:x.time,value:x.value-m[x.time]});});if(!macd.length)return{m:[],s:[],h:[]};var k=2/(sig+1);var sg=0;for(var i=0;i<Math.min(sig,macd.length);i++)sg+=macd[i].value;sg/=sig;var sl=[],hl=[];for(var i=sig-1;i<macd.length;i++){if(i===sig-1)sl.push({time:macd[i].time,value:sg});else{sg=macd[i].value*k+sg*(1-k);sl.push({time:macd[i].time,value:sg});}var h=macd[i].value-sg;hl.push({time:macd[i].time,value:h,color:h>=0?'#16A34A80':'#DC262680'});}return{m:macd,s:sl,h:hl};},
  cci: function(c,p){var r=[];for(var i=0;i<c.length;i++){if(i<p-1)continue;var sum=0;for(var j=0;j<p;j++)sum+=(c[i-j].high+c[i-j].low+c[i-j].close)/3;var tp=sum/p;var md=0;for(var j=0;j<p;j++)md+=Math.abs((c[i-j].high+c[i-j].low+c[i-j].close)/3-tp);md/=p;r.push({time:Math.floor(c[i].timestamp/1000),value:md===0?0:((c[i].high+c[i].low+c[i].close)/3-tp)/(0.015*md)});}return r;},
  willr: function(c,p){var r=[];for(var i=0;i<c.length;i++){if(i<p-1)continue;var hi=-Infinity,lo=Infinity;for(var j=0;j<p;j++){if(c[i-j].high>hi)hi=c[i-j].high;if(c[i-j].low<lo)lo=c[i-j].low;}r.push({time:Math.floor(c[i].timestamp/1000),value:hi===lo?-50:((hi-c[i].close)/(hi-lo))*-100});}return r;},
  mfi: function(c,p){var r=[];for(var i=0;i<c.length;i++){if(i<p)continue;var pos=0,neg=0;for(var j=0;j<p;j++){var tp=(c[i-j].high+c[i-j].low+c[i-j].close)/3;var tpP=(c[i-j-1].high+c[i-j-1].low+c[i-j-1].close)/3;var mf=tp*(c[i-j].volume||1);if(tp>tpP)pos+=mf;else if(tp<tpP)neg+=mf;}var ratio=neg===0?100:pos/neg;r.push({time:Math.floor(c[i].timestamp/1000),value:100-100/(1+ratio)});}return r;},
  roc: function(c,p){var r=[];for(var i=p;i<c.length;i++){var prev=c[i-p].close;var v=prev===0?0:((c[i].close-prev)/prev)*100;r.push({time:Math.floor(c[i].timestamp/1000),value:v});}return r;},
  momentum: function(c,p){var r=[];for(var i=p;i<c.length;i++){r.push({time:Math.floor(c[i].timestamp/1000),value:c[i].close-c[i-p].close});}return r;},
  stdev: function(c,p){var r=[];for(var i=0;i<c.length;i++){if(i<p-1)continue;var s=0;for(var j=0;j<p;j++)s+=c[i-j].close;var m=s/p;var v=0;for(var j=0;j<p;j++)v+=Math.pow(c[i-j].close-m,2);r.push({time:Math.floor(c[i].timestamp/1000),value:Math.sqrt(v/p)});}return r;},
  aroon: function(c,p){var up=[],dn=[];for(var i=p;i<c.length;i++){var hi=-Infinity,lo=Infinity,hiIdx=0,loIdx=0;for(var j=0;j<=p;j++){if(c[i-j].high>hi){hi=c[i-j].high;hiIdx=j;}if(c[i-j].low<lo){lo=c[i-j].low;loIdx=j;}}var t=Math.floor(c[i].timestamp/1000);up.push({time:t,value:((p-hiIdx)/p)*100});dn.push({time:t,value:((p-loIdx)/p)*100});}return{up:up,dn:dn};},
  adx: function(c,p){
    var tr=[],pdm=[],ndm=[];
    for(var i=1;i<c.length;i++){
      var up=c[i].high-c[i-1].high;var dn=c[i-1].low-c[i].low;
      pdm.push(up>dn&&up>0?up:0);ndm.push(dn>up&&dn>0?dn:0);
      tr.push(Math.max(c[i].high-c[i].low,Math.abs(c[i].high-c[i-1].close),Math.abs(c[i].low-c[i-1].close)));
    }
    var atr=0,apdm=0,andm=0;
    for(var i=0;i<p;i++){atr+=tr[i];apdm+=pdm[i];andm+=ndm[i];}
    var pdiArr=[],ndiArr=[],dxArr=[];
    for(var i=p;i<tr.length;i++){
      atr=atr-atr/p+tr[i];apdm=apdm-apdm/p+pdm[i];andm=andm-andm/p+ndm[i];
      var pdi=atr===0?0:(apdm/atr)*100;var ndi=atr===0?0:(andm/atr)*100;
      var dx=pdi+ndi===0?0:Math.abs(pdi-ndi)/(pdi+ndi)*100;
      var t=Math.floor(c[i+1].timestamp/1000);
      pdiArr.push({time:t,value:pdi});ndiArr.push({time:t,value:ndi});dxArr.push({time:t,value:dx});
    }
    var adxV=0;for(var i=0;i<Math.min(p,dxArr.length);i++)adxV+=dxArr[i].value;adxV/=Math.min(p,dxArr.length);
    var adxArr=[];if(dxArr.length)adxArr.push({time:dxArr[0].time,value:adxV});
    for(var i=p;i<dxArr.length;i++){adxV=(adxV*(p-1)+dxArr[i].value)/p;adxArr.push({time:dxArr[i].time,value:adxV});}
    return{adx:adxArr,pdi:pdiArr,ndi:ndiArr};
  },
  obv: function(c){var r=[];var o=0;r.push({time:Math.floor(c[0].timestamp/1000),value:0});for(var i=1;i<c.length;i++){o+=c[i].close>c[i-1].close?(c[i].volume||0):c[i].close<c[i-1].close?-(c[i].volume||0):0;r.push({time:Math.floor(c[i].timestamp/1000),value:o});}return r;}
};

// ==================== INIT ====================
function updateLoadStep(n){document.querySelectorAll('.load-step').forEach(function(s,i){s.classList.toggle('active',i<=n);});}

function init(){
  try{
    updateLoadStep(1);
    var panel=document.getElementById('chart-panel');
    var mainEl=document.getElementById('main-chart');
    overlay=document.getElementById('overlay');
    ctx=overlay.getContext('2d');

    chart=LightweightCharts.createChart(mainEl,{
      width:mainEl.clientWidth,height:mainEl.clientHeight,
      layout:{background:{type:'solid',color:C.bg},textColor:C.text,fontSize:11,fontFamily:'-apple-system,sans-serif'},
      grid:{vertLines:{color:C.border,style:1},horzLines:{color:C.border,style:1}},
      rightPriceScale:{borderColor:C.border,scaleMargins:{top:0.06,bottom:0.1},entireTextOnly:true},
      timeScale:{borderColor:C.border,timeVisible:true,secondsVisible:false,rightOffset:6,barSpacing:6,minBarSpacing:0.3},
      crosshair:{mode:0,vertLine:{color:C.accent+'AA',width:1,style:3,labelBackgroundColor:C.accent},horzLine:{color:C.accent+'AA',width:1,style:3,labelBackgroundColor:C.accent}},
      handleScroll:{mouseWheel:true,pressedMouseMove:true,horzTouchDrag:true,vertTouchDrag:false},
      handleScale:{axisPressedMouseMove:true,mouseWheel:true,pinch:true},
      kineticScroll:{touch:true,mouse:false}
    });

    createSeries();
    setupPanes();
    setupToolbar();
    setupControls();
    setupEvents();
    setupModals();

    chart.subscribeCrosshairMove(function(p){updateOHLC(p);});
    chart.timeScale().subscribeVisibleLogicalRangeChange(syncPanes);

    new ResizeObserver(resizeAll).observe(panel);
    resizeAll();
    updateLoadStep(2);
    document.getElementById('load').style.display='none';
    notifyRN({type:'ready'});
    setTimeout(function(){notifyRN({type:'chart-loaded'});},50);
  }catch(e){
    document.getElementById('load').innerHTML='<div style="color:#DC2626;padding:20px">'+e.message+'</div>';
  }
}

function createSeries(){
  if(candleSeries)try{chart.removeSeries(candleSeries);}catch(e){}
  var lo={priceLineVisible:false,lastValueVisible:true};
  if(chartType==='candles')candleSeries=chart.addCandlestickSeries({upColor:C.up,downColor:C.down,borderUpColor:C.up,borderDownColor:C.down,wickUpColor:C.up,wickDownColor:C.down,...lo});
  else if(chartType==='bars')candleSeries=chart.addBarSeries({upColor:C.up,downColor:C.down,...lo});
  else if(chartType==='line')candleSeries=chart.addLineSeries({color:C.accent,lineWidth:2,...lo});
  else if(chartType==='area')candleSeries=chart.addAreaSeries({topColor:C.accent+'50',bottomColor:C.accent+'05',lineColor:C.accent,lineWidth:2,...lo});
}

function setupPanes(){
  ['volume','momentum','volatility'].forEach(function(name){
    var el=document.getElementById('pane-'+name);
    var c=LightweightCharts.createChart(el,{
      width:el.clientWidth,height:72,
      layout:{background:{type:'solid',color:C.bg},textColor:C.muted,fontSize:9},
      grid:{vertLines:{color:C.border,style:1},horzLines:{color:C.border,style:1}},
      rightPriceScale:{borderColor:C.border,entireTextOnly:true},
      timeScale:{visible:false,borderColor:C.border},
      crosshair:{mode:0,vertLine:{color:C.accent+'80',width:1,style:3},horzLine:{color:C.accent+'80',width:1,style:3}},
      handleScroll:false,handleScale:false
    });
    panes[name]={chart:c,series:{},el:el};
  });
}

function setupToolbar(){
  var bar=document.getElementById('leftbar');
  bar.innerHTML='';
  TOOL_GROUPS.forEach(function(g){
    var w=document.createElement('div');w.className='tg';
    var l=document.createElement('div');l.className='gl';l.textContent=g.label;
    w.appendChild(l);
    g.tools.forEach(function(t){
      var b=document.createElement('button');
      b.className='tool'+(t.id==='cursor'?' on':'');
      b.dataset.tool=t.id;b.title=t.title||t.id;b.textContent=t.icon;
      b.onclick=function(){selectTool(t.id);};
      w.appendChild(b);
    });
    bar.appendChild(w);
  });
}

var TOOL_HINTS={
  trend:'خط روند: بکش',ray:'شعاع: بکش',ext:'خط گسترده: بکش',hline:'افقی: نقطه بزن',
  vline:'عمودی: نقطه بزن',hray:'شعاع افقی: نقطه بزن',crossline:'کراس‌لاین: نقطه بزن',angle:'زاویه: بکش',
  channel:'کانال: بکش',dchannel:'کانال مجزا: بکش',flattop:'فلت‌تاپ: بکش',regression:'رگرسیون: بکش',
  fib:'فیبوناچی: بکش',fibext:'فیبوناچی Ext: ۳ نقطه',fibtime:'فیبوناچی تایم: بکش',fibfan:'فیبوناچی فن: بکش',fibarc:'فیبوناچی آرک: بکش',
  gannfan:'گان فن: بکش',gannbox:'گان باکس: بکش',
  pitchfork:'پیچ‌فورک: ۳ نقطه',schiff:'شیف: ۳ نقطه',mschiff:'شیف اصلاح‌شده: ۳ نقطه',
  rect:'مستطیل: بکش',circle:'دایره: بکش',ellipse:'بیضی: بکش',triangle:'مثلث: بکش',
  xabcd:'XABCD: ۵ نقطه',hs:'سر و شانه: ۵ نقطه',elliott:'الیوت: ۶ نقطه',
  brush:'قلم: بکش',marker:'هایلایتر: بکش',eraser:'پاک‌کن: روی ترسیم',
  text:'متن: نقطه بزن',note:'یادداشت: نقطه بزن',label:'برچسب: نقطه بزن',arrow:'فلش: بکش',
  long:'لانگ: بکش',short:'شورت: بکش',projection:'پروجکشن: بکش',
  ruler:'خط‌کش: بکش',daterange:'بازه تاریخ: بکش',priceRange:'محدوده قیمت: بکش'
};

function selectTool(id){
  activeTool=id;
  document.querySelectorAll('#leftbar .tool').forEach(function(el){el.classList.toggle('on',el.dataset.tool===id);});
  var isCursor=id==='cursor'||id==='cross';
  chart.applyOptions({
    handleScroll:{mouseWheel:isCursor,pressedMouseMove:isCursor,horzTouchDrag:isCursor,vertTouchDrag:false},
    handleScale:{axisPressedMouseMove:isCursor,mouseWheel:isCursor,pinch:isCursor}
  });
  if(!isCursor&&TOOL_HINTS[id])showHint(TOOL_HINTS[id]);else hideHint();
}

function setupControls(){
  var c=document.getElementById('controls');
  c.innerHTML='';
  // Chart types
  [['🕯','candles','کندل'],['▮','bars','میله'],['∿','line','خط'],['▨','area','ناحیه']].forEach(function(a,i){
    var b=document.createElement('button');b.className='ctrl'+(i===0?' on':'');b.title=a[2];
    b.textContent=a[0];b.dataset.ct=a[1];
    b.onclick=function(){
      chartType=a[1];
      document.querySelectorAll('[data-ct]').forEach(function(el){el.classList.toggle('on',el.dataset.ct===a[1]);});
      createSeries();
      if(candles.length)applyCandles();
    };c.appendChild(b);
  });
  c.appendChild(sep());
  // Timeframes
  [['1m','1m'],['5m','5m'],['15m','15m'],['1h','1H'],['4h','4H'],['1d','1D'],['1w','1W']].forEach(function(a,i){
    var b=document.createElement('button');b.className='ctrl'+(i===3?' on':'');b.textContent=a[1];b.dataset.tf=a[0];
    b.onclick=function(){
      document.querySelectorAll('[data-tf]').forEach(function(el){el.classList.toggle('on',el.dataset.tf===a[0]);});
      notifyRN({type:'change-timeframe',timeframe:a[0]});
    };c.appendChild(b);
  });
  c.appendChild(sep());
  // Actions
  [['⟲','fit','ریست'],['⏭','last','آخرین'],['↶','undo','واگرد'],['↷','redo','جلو'],['👁','hide','مخفی'],['🗑','clear','پاک']].forEach(function(a){
    var b=document.createElement('button');b.className='ctrl';b.title=a[2];b.textContent=a[0];
    b.onclick=function(){
      if(a[1]==='fit')chart.timeScale().fitContent();
      else if(a[1]==='last')chart.timeScale().scrollToRealTime();
      else if(a[1]==='undo')undo();
      else if(a[1]==='redo')redo();
      else if(a[1]==='hide'){hideDrawings=!hideDrawings;redraw();showToast(hideDrawings?'ترسیمات مخفی':'ترسیمات نمایش');}
      else if(a[1]==='clear')clearAll();
    };c.appendChild(b);
  });
}

function sep(){var s=document.createElement('div');s.className='sep';return s;}

function setupModals(){
  document.getElementById('btn-ind').onclick=function(){openIndPicker();};
  document.getElementById('btn-alert').onclick=function(){openAlerts();};
  document.getElementById('btn-bt').onclick=function(){document.getElementById('modal-bt').classList.add('on');};
  document.getElementById('ind-search').oninput=function(e){
    var q=e.target.value.toLowerCase();
    document.querySelectorAll('.ind-cat').forEach(function(cat){
      var has=false;
      cat.querySelectorAll('.ind-item').forEach(function(it){
        var show=!q||it.textContent.toLowerCase().indexOf(q)!==-1;
        it.style.display=show?'flex':'none';
        if(show)has=true;
      });
      cat.style.display=has?'block':'none';
    });
  };
}

function openIndPicker(){
  var body=document.getElementById('ind-body');
  var cats={};
  INDICATORS.forEach(function(i){if(!cats[i.cat])cats[i.cat]=[];cats[i.cat].push(i);});
  var html='';
  Object.keys(cats).forEach(function(cat){
    html+='<div class="ind-cat"><div class="ind-cat-hd"><span>'+cat+'<span class="cnt">'+cats[cat].length+'</span></span><span class="arrow">▸</span></div><div class="ind-items">';
    cats[cat].forEach(function(ind){
      var on=Object.keys(indicators).some(function(k){return indicators[k].def.id===ind.id;});
      html+='<div class="ind-item'+(on?' on':'')+'" data-ind="'+ind.id+'">'+ind.name+'</div>';
    });
    html+='</div></div>';
  });
  body.innerHTML=html;
  body.querySelectorAll('.ind-cat-hd').forEach(function(el){
    el.onclick=function(){el.parentNode.classList.toggle('open');};
  });
  body.querySelectorAll('.ind-item').forEach(function(el){
    el.onclick=function(){addIndicator(el.dataset.ind);};
  });
  document.getElementById('modal-ind').classList.add('on');
}

function closeModal(id){document.getElementById(id).classList.remove('on');}

function addIndicator(id){
  var def=INDICATORS.find(function(i){return i.id===id;});
  if(!def)return;
  var existing=null;
  Object.keys(indicators).forEach(function(k){if(indicators[k].def.id===id)existing=k;});
  if(existing){
    indicators[existing].series.forEach(function(s){try{chart.removeSeries(s);}catch(e){}});
    if(panes[def.pane]){
      Object.keys(panes[def.pane].series).forEach(function(k){
        if(k===id||k.indexOf(id+'_')===0){try{panes[def.pane].chart.removeSeries(panes[def.pane].series[k]);}catch(e){}}
      });
    }
    delete indicators[existing];
  }else{
    var params={};
    def.params.forEach(function(p){params[p.k]=p.def;});
    if(def.pane){
      if(activePanes.indexOf(def.pane)===-1)activePanes.push(def.pane);
      updatePaneLayout();
      renderPaneIndicator(def.pane,def,params);
    }else{
      renderMainIndicator(def,params,id+':default');
    }
  }
  renderIndChips();
  var body=document.getElementById('ind-body');
  body.querySelectorAll('.ind-item').forEach(function(el){el.classList.toggle('on',Object.keys(indicators).some(function(k){return indicators[k].def.id===el.dataset.ind;}));});
}

function renderIndChips(){
  var el=document.getElementById('ind-chips');
  var seen={};var html='';
  Object.keys(indicators).forEach(function(k){
    var e=indicators[k];
    if(seen[e.def.id])return;seen[e.def.id]=1;
    html+='<div class="ichip" data-ind="'+e.def.id+'">'+e.def.name+'<span class="x">✕</span></div>';
  });
  el.innerHTML=html;
  el.querySelectorAll('.ichip').forEach(function(chip){
    chip.onclick=function(){
      var indId=chip.dataset.ind;
      Object.keys(indicators).forEach(function(k){
        if(indicators[k].def.id===indId){
          indicators[k].series.forEach(function(s){try{chart.removeSeries(s);}catch(e){}});
          var def=indicators[k].def;
          if(panes[def.pane]){
            Object.keys(panes[def.pane].series).forEach(function(sk){
              if(sk===indId||sk.indexOf(indId+'_')===0){try{panes[def.pane].chart.removeSeries(panes[def.pane].series[sk]);}catch(e){}delete panes[def.pane].series[sk];}
            });
          }
          delete indicators[k];
        }
      });
      renderIndChips();
      var body=document.getElementById('ind-body');
      if(body.querySelectorAll('.ind-item').length){
        body.querySelectorAll('.ind-item').forEach(function(el){el.classList.toggle('on',Object.keys(indicators).some(function(k){return indicators[k].def.id===el.dataset.ind;}));});
      }
    };
  });
}

function renderMainIndicator(def,params,key){
  if(!candleSeries||!candles.length)return;
  var c=candles.slice(0,visibleCount);
  var lo={priceLineVisible:false,lastValueVisible:false,crosshairMarkerVisible:false};
  var series=[];
  try{
    if(def.id==='sma'){var s=chart.addLineSeries({color:def.color,lineWidth:2,...lo});s.setData(M.sma(c,params.period));series.push(s);}
    else if(def.id==='ema'){var s=chart.addLineSeries({color:def.color,lineWidth:2,...lo});s.setData(M.ema(c,params.period));series.push(s);}
    else if(def.id==='wma'){var s=chart.addLineSeries({color:def.color,lineWidth:2,...lo});s.setData(M.wma(c,params.period));series.push(s);}
    else if(def.id==='hma'){var s=chart.addLineSeries({color:def.color,lineWidth:2,...lo});s.setData(M.hma(c,params.period));series.push(s);}
    else if(def.id==='vwma'){var s=chart.addLineSeries({color:def.color,lineWidth:2,...lo});s.setData(M.vwma(c,params.period));series.push(s);}
    else if(def.id==='dema'){var s=chart.addLineSeries({color:def.color,lineWidth:2,...lo});s.setData(M.dema(c,params.period));series.push(s);}
    else if(def.id==='tema'){var s=chart.addLineSeries({color:def.color,lineWidth:2,...lo});s.setData(M.tema(c,params.period));series.push(s);}
    else if(def.id==='bb'){var bb=M.bb(c,params.period,params.mult);var u=chart.addLineSeries({color:'#0891B2',lineWidth:1,lineStyle:2,...lo});u.setData(bb.u);var m=chart.addLineSeries({color:'#0891B280',lineWidth:1,...lo});m.setData(bb.m);var l=chart.addLineSeries({color:'#0891B2',lineWidth:1,lineStyle:2,...lo});l.setData(bb.l);series.push(u,m,l);}
    else if(def.id==='keltner'){var kc=M.keltner(c,params.period,params.mult);var u=chart.addLineSeries({color:'#F59E0B',lineWidth:1,lineStyle:2,...lo});u.setData(kc.u);var m=chart.addLineSeries({color:'#F59E0B80',lineWidth:1,...lo});m.setData(kc.m);var l=chart.addLineSeries({color:'#F59E0B',lineWidth:1,lineStyle:2,...lo});l.setData(kc.l);series.push(u,m,l);}
    else if(def.id==='donchian'){var dc=M.donchian(c,params.period);var u=chart.addLineSeries({color:'#DC2626',lineWidth:1,lineStyle:2,...lo});u.setData(dc.u);var l=chart.addLineSeries({color:'#16A34A',lineWidth:1,lineStyle:2,...lo});l.setData(dc.l);series.push(u,l);}
    else if(def.id==='envelope'){var en=M.envelope(c,params.period,params.pct);var u=chart.addLineSeries({color:'#A855F7',lineWidth:1,lineStyle:2,...lo});u.setData(en.u);var m=chart.addLineSeries({color:'#A855F780',lineWidth:1,...lo});m.setData(en.m);var l=chart.addLineSeries({color:'#A855F7',lineWidth:1,lineStyle:2,...lo});l.setData(en.l);series.push(u,m,l);}
    else if(def.id==='psar'){var s=chart.addLineSeries({color:'#0891B2',lineWidth:0,pointMarkersVisible:true,...lo});s.setData(M.psar(c,params.step,params.max));series.push(s);}
    else if(def.id==='supertrend'){var s=chart.addLineSeries({color:'#16A34A',lineWidth:2,...lo});s.setData(M.supertrend(c,params.period,params.mult));series.push(s);}
    else if(def.id==='vwap'){var s=chart.addLineSeries({color:'#F59E0B',lineWidth:2,lineStyle:2,...lo});s.setData(M.vwap(c));series.push(s);}
    else if(def.id==='ichimoku'){
      var ic=M.ichimoku(c);
      var t=chart.addLineSeries({color:'#2563EB',lineWidth:1,...lo});t.setData(ic.tenkan);
      var k=chart.addLineSeries({color:'#DC2626',lineWidth:1,...lo});k.setData(ic.kijun);
      var sa=chart.addLineSeries({color:'#16A34A80',lineWidth:1,...lo});sa.setData(ic.senkouA);
      var sb=chart.addLineSeries({color:'#F59E0B80',lineWidth:1,...lo});sb.setData(ic.senkouB);
      series.push(t,k,sa,sb);
    }
  }catch(e){console.log('err',e);}
  indicators[key]={def:def,params:params,series:series};
}

function renderPaneIndicator(paneName,def,params){
  var p=panes[paneName];
  if(!p||!candles.length)return;
  var c=candles.slice(0,visibleCount);
  var lo={priceLineVisible:false,lastValueVisible:false};
  if(def.id==='volume'){
    p.series[def.id]=p.chart.addHistogramSeries({color:'#2563EB40',priceFormat:{type:'volume'},lastValueVisible:false});
    p.series[def.id].setData(c.map(function(x){return{time:Math.floor(x.timestamp/1000),value:x.volume||0,color:x.close>=x.open?C.up+'60':C.down+'60'};}));
  }else if(def.id==='rsi'){
    p.series[def.id]=p.chart.addLineSeries({color:'#7C3AED',lineWidth:2,...lo});
    p.series[def.id].setData(M.rsi(c,params.period));
  }else if(def.id==='stoch'){
    var st=M.stoch(c,params.k,params.d);
    p.series[def.id]=p.chart.addLineSeries({color:'#2563EB',lineWidth:2,...lo});p.series[def.id].setData(st.k);
    p.series[def.id+'_d']=p.chart.addLineSeries({color:'#F59E0B',lineWidth:2,...lo});p.series[def.id+'_d'].setData(st.d);
  }else if(def.id==='stochrsi'){
    var r=M.rsi(c,params.period);var mx=-Infinity,mn=Infinity;r.forEach(function(x){if(x.value>mx)mx=x.value;if(x.value<mn)mn=x.value;});
    var sr=r.map(function(x){return{time:x.time,value:mx===mn?50:((x.value-mn)/(mx-mn))*100};});
    p.series[def.id]=p.chart.addLineSeries({color:'#DB2777',lineWidth:2,...lo});p.series[def.id].setData(sr);
  }else if(def.id==='macd'){
    var mc=M.macd(c,params.fast,params.slow,params.signal);
    p.series[def.id+'_h']=p.chart.addHistogramSeries({...lo,lastValueVisible:false});p.series[def.id+'_h'].setData(mc.h);
    p.series[def.id]=p.chart.addLineSeries({color:'#2563EB',lineWidth:2,...lo});p.series[def.id].setData(mc.m);
    p.series[def.id+'_s']=p.chart.addLineSeries({color:'#F59E0B',lineWidth:2,...lo});p.series[def.id+'_s'].setData(mc.s);
  }else if(def.id==='cci'){
    p.series[def.id]=p.chart.addLineSeries({color:'#EC4899',lineWidth:2,...lo});p.series[def.id].setData(M.cci(c,params.period));
  }else if(def.id==='willr'){
    p.series[def.id]=p.chart.addLineSeries({color:'#0891B2',lineWidth:2,...lo});p.series[def.id].setData(M.willr(c,params.period));
  }else if(def.id==='mfi'){
    p.series[def.id]=p.chart.addLineSeries({color:'#A855F7',lineWidth:2,...lo});p.series[def.id].setData(M.mfi(c,params.period));
  }else if(def.id==='roc'){
    p.series[def.id]=p.chart.addLineSeries({color:'#F59E0B',lineWidth:2,...lo});p.series[def.id].setData(M.roc(c,params.period));
  }else if(def.id==='momentum'){
    p.series[def.id]=p.chart.addLineSeries({color:'#10B981',lineWidth:2,...lo});p.series[def.id].setData(M.momentum(c,params.period));
  }else if(def.id==='atr'){
    p.series[def.id]=p.chart.addLineSeries({color:'#16A34A',lineWidth:2,...lo});p.series[def.id].setData(M.atr(c,params.period));
  }else if(def.id==='stdev'){
    p.series[def.id]=p.chart.addLineSeries({color:'#EC4899',lineWidth:2,...lo});p.series[def.id].setData(M.stdev(c,params.period));
  }else if(def.id==='adx'){
    var ad=M.adx(c,params.period);
    p.series[def.id]=p.chart.addLineSeries({color:'#EC4899',lineWidth:2,...lo});p.series[def.id].setData(ad.adx);
    p.series[def.id+'_p']=p.chart.addLineSeries({color:'#16A34A',lineWidth:1,...lo});p.series[def.id+'_p'].setData(ad.pdi);
    p.series[def.id+'_n']=p.chart.addLineSeries({color:'#DC2626',lineWidth:1,...lo});p.series[def.id+'_n'].setData(ad.ndi);
  }else if(def.id==='aroon'){
    var ar=M.aroon(c,params.period);
    p.series[def.id]=p.chart.addLineSeries({color:'#2563EB',lineWidth:2,...lo});p.series[def.id].setData(ar.up);
    p.series[def.id+'_d']=p.chart.addLineSeries({color:'#F59E0B',lineWidth:2,...lo});p.series[def.id+'_d'].setData(ar.dn);
  }else if(def.id==='obv'){
    p.series[def.id]=p.chart.addLineSeries({color:'#06B6D4',lineWidth:2,...lo});p.series[def.id].setData(M.obv(c));
  }
  p.el.style.display='block';
}

function updatePaneLayout(){
  var bottom=0;
  ['volume','momentum','volatility'].forEach(function(name){
    var p=panes[name];
    if(!p)return;
    if(activePanes.indexOf(name)!==-1){
      p.el.classList.add('on');
      p.el.style.bottom=bottom+'px';
      bottom+=72;
      p.chart.applyOptions({width:p.el.clientWidth});
    }else p.el.classList.remove('on');
  });
  var panel=document.getElementById('chart-panel');
  panel.style.bottom=bottom+'px';
  if(chart)chart.applyOptions({width:panel.clientWidth,height:panel.clientHeight});
  resizeAll();
}

function syncPanes(){
  var r=chart.timeScale().getVisibleLogicalRange();
  if(!r)return;
  Object.keys(panes).forEach(function(k){if(panes[k].chart)panes[k].chart.timeScale().setVisibleLogicalRange(r);});
}

function applyCandles(){
  if(!candleSeries||!candles.length)return;
  var vis=candles.slice(0,visibleCount);
  if(chartType==='line'||chartType==='area'){
    candleSeries.setData(vis.map(function(x){return{time:Math.floor(x.timestamp/1000),value:x.close};}));
  }else{
    candleSeries.setData(vis.map(function(x){return{time:Math.floor(x.timestamp/1000),open:x.open,high:x.high,low:x.low,close:x.close};}));
  }
  updateOHLC(null);
  document.getElementById('candles-info').textContent=visibleCount+' / '+candles.length;

  // Re-render pane indicators
  activePanes.forEach(function(pane){
    var p=panes[pane];if(!p)return;
    Object.keys(p.series).forEach(function(id){
      var def=INDICATORS.find(function(i){return i.id===id||id.indexOf(i.id+'_')===0;});
      if(def){
        var params={};def.params.forEach(function(pp){params[pp.k]=pp.def;});
        renderPaneIndicator(pane,def,params);
      }
    });
  });

  // Re-render main indicators
  var snapshot={};
  Object.keys(indicators).forEach(function(k){snapshot[k]=indicators[k];});
  Object.keys(indicators).forEach(function(k){
    indicators[k].series.forEach(function(s){try{chart.removeSeries(s);}catch(e){}});
  });
  indicators={};
  Object.keys(snapshot).forEach(function(k){renderMainIndicator(snapshot[k].def,snapshot[k].params,k);});
}

function updateOHLC(param){
  var o,h,l,c;
  if(!param||!param.time||!param.seriesData||!candleSeries||!param.seriesData.has(candleSeries)){
    var last=candles[visibleCount-1];if(!last)return;
    o=last.open;h=last.high;l=last.low;c=last.close;
  }else{
    var d=param.seriesData.get(candleSeries);if(!d)return;
    o=d.open;h=d.high;l=d.low;c=d.close;
  }
  var dec=c>100?2:c>1?3:5;
  document.getElementById('o').textContent=o.toFixed(dec);
  document.getElementById('h').textContent=h.toFixed(dec);
  document.getElementById('l').textContent=l.toFixed(dec);
  document.getElementById('c').textContent=c.toFixed(dec);
  var diff=c-o,pct=o!==0?(diff/o)*100:0;
  var chg=document.getElementById('chg');
  chg.textContent=(diff>=0?'+':'')+diff.toFixed(dec)+' ('+(diff>=0?'+':'')+pct.toFixed(2)+'%)';
  chg.className=diff>=0?'up':'down';
}

function resizeAll(){
  var panel=document.getElementById('chart-panel');
  overlay.width=panel.clientWidth;overlay.height=panel.clientHeight;
  if(chart)chart.applyOptions({width:panel.clientWidth,height:panel.clientHeight});
  Object.keys(panes).forEach(function(k){if(panes[k])panes[k].chart.applyOptions({width:panes[k].el.clientWidth});});
  redraw();
}

function redraw(){
  if(!ctx)return;
  ctx.clearRect(0,0,overlay.width,overlay.height);
  if(hideDrawings)return;
  var all=drawInProg?drawings.concat([drawInProg]):drawings;
  all.forEach(drawOne);
}

function evtPos(e){
  var r=document.getElementById('chart-panel').getBoundingClientRect();
  var cx,cy;
  if(e.touches&&e.touches.length){cx=e.touches[0].clientX;cy=e.touches[0].clientY;}
  else if(e.changedTouches&&e.changedTouches.length){cx=e.changedTouches[0].clientX;cy=e.changedTouches[0].clientY;}
  else{cx=e.clientX;cy=e.clientY;}
  return{x:cx-r.left,y:cy-r.top};
}
function toChart(pos){
  if(!chart||!candleSeries)return null;
  var t=chart.timeScale().coordinateToTime(pos.x);
  var p=candleSeries.coordinateToPrice(pos.y);
  if(t===null||p===null)return null;
  return{time:t,price:p};
}
function toScreen(pt){
  if(!chart||!candleSeries||!pt)return null;
  var x=chart.timeScale().timeToCoordinate(pt.time);
  var y=candleSeries.priceToCoordinate(pt.price);
  if(x===null||y===null)return null;
  return{x:x,y:y};
}

function setupEvents(){
  var el=document.getElementById('chart-panel');
  el.addEventListener('mousedown',onDown);
  el.addEventListener('mousemove',onMove);
  el.addEventListener('mouseup',onUp);
  el.addEventListener('mouseleave',onUp);
  el.addEventListener('touchstart',onDown,{passive:false});
  el.addEventListener('touchmove',onMove,{passive:false});
  el.addEventListener('touchend',onUp);
  el.addEventListener('touchcancel',onUp);
}

function onDown(e){
  if(activeTool==='cursor'||activeTool==='cross')return;
  e.preventDefault();
  var pt=toChart(evtPos(e));if(!pt)return;

  if(activeTool==='eraser'){
    var pos=evtPos(e);
    var nearest=-1,minDist=20;
    drawings.forEach(function(d,i){
      var S=d.pts.map(toScreen).filter(Boolean);
      if(!S.length)return;
      var dist=Math.min.apply(null,S.map(function(s){return Math.hypot(s.x-pos.x,s.y-pos.y);}));
      if(dist<minDist){minDist=dist;nearest=i;}
    });
    if(nearest>=0){drawings.splice(nearest,1);redraw();showToast('حذف شد');}
    return;
  }

  isDrawing=true;
  if(['hline','vline','text','note','label','callout'].indexOf(activeTool)!==-1){
    if(['text','note','label','callout'].indexOf(activeTool)!==-1){
      var txt=prompt('متن:','');if(!txt){isDrawing=false;return;}
      drawings.push({tool:activeTool,pts:[pt],color:C.accent,text:txt});
    }else drawings.push({tool:activeTool,pts:[pt],color:C.accent});
    isDrawing=false;redraw();return;
  }

  var reqMap={fibext:3,pitchfork:3,schiff:3,mschiff:3,dchannel:3,xabcd:5,hs:5,elliott:6};
  var req=reqMap[activeTool]||2;
  drawInProg={tool:activeTool,pts:[pt],color:C.accent,required:req};
  redraw();
}

function onMove(e){
  if(!isDrawing||!drawInProg)return;
  e.preventDefault();
  var pt=toChart(evtPos(e));if(!pt)return;
  if(drawInProg.pts.length===1)drawInProg.pts.push(pt);
  else drawInProg.pts[drawInProg.pts.length-1]=pt;
  redraw();
}

function onUp(){
  if(!isDrawing||!drawInProg)return;
  isDrawing=false;
  if(drawInProg.pts.length<(drawInProg.required||2)){drawInProg=null;redraw();return;}
  drawings.push(drawInProg);drawInProg=null;redraw();
}

function undo(){if(drawings.length){drawings.pop();redraw();showToast('واگرد');}}
function redo(){showToast('جلو (به‌زودی)');}
function clearAll(){if(!drawings.length)return;if(!confirm('همه ترسیمات پاک شود؟'))return;drawings=[];redraw();showToast('پاک شد');}

// ==================== DRAWING ====================
function drawOne(d){
  var S=d.pts.map(toScreen);
  if(S.some(function(s){return!s;}))return;
  var c=d.color||C.accent;
  ctx.strokeStyle=c;ctx.fillStyle=c;ctx.lineWidth=2;ctx.lineCap='round';ctx.lineJoin='round';
  var tool=d.tool;
  function line(a,b){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
  function dots(pts){pts.forEach(function(p){ctx.beginPath();ctx.arc(p.x,p.y,4,0,Math.PI*2);ctx.fillStyle='#FFF';ctx.fill();ctx.strokeStyle=c;ctx.lineWidth=2;ctx.stroke();ctx.fillStyle=c;});}

  if(tool==='trend'){line(S[0],S[1]);dots(S);}
  else if(tool==='ray'){var dx=S[1].x-S[0].x,dy=S[1].y-S[0].y,l=Math.hypot(dx,dy);if(!l)return;var sc=3000/l;ctx.beginPath();ctx.moveTo(S[0].x,S[0].y);ctx.lineTo(S[0].x+dx*sc,S[0].y+dy*sc);ctx.stroke();dots([S[0]]);}
  else if(tool==='ext'){var dx=S[1].x-S[0].x,dy=S[1].y-S[0].y,l=Math.hypot(dx,dy);if(!l)return;var sc=3000/l;ctx.beginPath();ctx.moveTo(S[0].x-dx*sc,S[0].y-dy*sc);ctx.lineTo(S[1].x+dx*sc,S[1].y+dy*sc);ctx.stroke();dots(S);}
  else if(tool==='angle'){line(S[0],S[1]);dots(S);var ang=Math.atan2(S[1].y-S[0].y,S[1].x-S[0].x)*180/Math.PI;ctx.font='bold 11px sans-serif';ctx.fillStyle=c;ctx.fillText(ang.toFixed(1)+'°',S[1].x+8,S[1].y-6);}
  else if(tool==='hline'){ctx.setLineDash([8,4]);ctx.beginPath();ctx.moveTo(0,S[0].y);ctx.lineTo(overlay.width,S[0].y);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle=c;ctx.fillRect(overlay.width-66,S[0].y-10,63,20);ctx.fillStyle='#FFF';ctx.font='bold 10px sans-serif';ctx.textAlign='center';var p=d.pts[0].price;ctx.fillText(p.toFixed(p>100?2:4),overlay.width-34,S[0].y+4);ctx.textAlign='left';}
  else if(tool==='vline'){ctx.setLineDash([8,4]);ctx.beginPath();ctx.moveTo(S[0].x,0);ctx.lineTo(S[0].x,overlay.height);ctx.stroke();ctx.setLineDash([]);}
  else if(tool==='hray'){ctx.beginPath();ctx.moveTo(S[0].x,S[0].y);ctx.lineTo(overlay.width,S[0].y);ctx.stroke();dots([S[0]]);}
  else if(tool==='crossline'){ctx.setLineDash([8,4]);ctx.beginPath();ctx.moveTo(0,S[0].y);ctx.lineTo(overlay.width,S[0].y);ctx.moveTo(S[0].x,0);ctx.lineTo(S[0].x,overlay.height);ctx.stroke();ctx.setLineDash([]);}
  else if(tool==='channel'||tool==='flattop'){line(S[0],S[1]);var dx=S[1].x-S[0].x,dy=S[1].y-S[0].y;ctx.globalAlpha=.6;ctx.beginPath();ctx.moveTo(S[0].x+dx*.3,S[0].y+dy*.3);ctx.lineTo(S[1].x+dx*.3,S[1].y+dy*.3);ctx.stroke();ctx.globalAlpha=1;dots(S);}
  else if(tool==='dchannel'){if(S.length<3)return;ctx.beginPath();ctx.moveTo(S[0].x,S[0].y);ctx.lineTo(S[1].x,S[1].y);ctx.lineTo(S[2].x,S[2].y);ctx.stroke();dots(S);}
  else if(tool==='fib'){
    var levels=[0,.236,.382,.5,.618,.786,1,1.272,1.618];
    var colors=['#EF4444','#F97316','#F59E0B','#FBBF24','#A3E635','#10B981','#06B6D4','#7C3AED','#EC4899'];
    var x1=Math.min(S[0].x,S[1].x),x2=Math.max(S[0].x,S[1].x);
    levels.forEach(function(lv,i){
      var y=S[0].y+(S[1].y-S[0].y)*lv;
      ctx.strokeStyle=colors[i];ctx.lineWidth=1.5;
      ctx.beginPath();ctx.moveTo(x1,y);ctx.lineTo(x2,y);ctx.stroke();
      var price=d.pts[0].price+(d.pts[1].price-d.pts[0].price)*lv;
      ctx.fillStyle=colors[i];ctx.fillRect(x2+3,y-9,85,18);
      ctx.fillStyle='#FFF';ctx.font='bold 9.5px sans-serif';
      ctx.fillText((lv*100).toFixed(1)+'%  '+price.toFixed(price>100?2:4),x2+7,y+3);
    });
  }
  else if(tool==='fibext'){
    if(S.length<3)return;
    var levels=[0,.618,1,1.272,1.618,2,2.618];
    var colors=['#EF4444','#F59E0B','#10B981','#06B6D4','#7C3AED','#EC4899','#F97316'];
    levels.forEach(function(lv,i){
      var y=S[1].y+(S[2].y-S[1].y)*lv;
      ctx.strokeStyle=colors[i];ctx.lineWidth=1.5;
      ctx.beginPath();ctx.moveTo(S[0].x,y);ctx.lineTo(overlay.width,y);ctx.stroke();
      ctx.fillStyle=colors[i];ctx.fillRect(overlay.width-70,y-9,68,18);
      ctx.fillStyle='#FFF';ctx.font='bold 9.5px sans-serif';
      ctx.fillText(lv.toFixed(3),overlay.width-66,y+3);
    });
  }
  else if(tool==='fibtime'){
    var dist=Math.abs(S[1].x-S[0].x);
    var fibs=[1,1,2,3,5,8,13,21,34];
    var pos=S[1].x;var dir=S[1].x>S[0].x?1:-1;
    fibs.forEach(function(f,i){
      pos+=dist*dir*(i===0?1:f/fibs[i-1])*.3;
      if(pos<0||pos>overlay.width)return;
      ctx.strokeStyle=C.accent;ctx.lineWidth=1;ctx.setLineDash([4,4]);
      ctx.beginPath();ctx.moveTo(pos,0);ctx.lineTo(pos,overlay.height);ctx.stroke();
      ctx.setLineDash([]);ctx.fillStyle=C.accent;ctx.font='bold 9px sans-serif';
      ctx.fillText(f,pos+3,14);
    });
  }
  else if(tool==='fibfan'){
    var levels=[0,.236,.382,.5,.618,.786,1];
    var colors=['#EF4444','#F97316','#F59E0B','#FBBF24','#A3E635','#10B981','#06B6D4'];
    var baseAng=Math.atan2(S[1].y-S[0].y,S[1].x-S[0].x);
    levels.forEach(function(lv,i){
      var ang=baseAng-Math.PI/2+lv*Math.PI/2;var sc=2000;
      ctx.strokeStyle=colors[i];ctx.lineWidth=1.5;
      ctx.beginPath();ctx.moveTo(S[0].x,S[0].y);ctx.lineTo(S[0].x+Math.cos(ang)*sc,S[0].y+Math.sin(ang)*sc);ctx.stroke();
    });
  }
  else if(tool==='fibarc'){
    var radius=Math.abs(S[1].y-S[0].y);
    var levels=[.236,.382,.5,.618,.786,1];
    var colors=['#EF4444','#F97316','#F59E0B','#A3E635','#10B981','#06B6D4'];
    levels.forEach(function(lv,i){
      ctx.strokeStyle=colors[i];ctx.lineWidth=1.5;
      ctx.beginPath();ctx.arc(S[0].x,S[0].y,radius*lv,0,Math.PI,false);ctx.stroke();
    });
  }
  else if(tool==='gannfan'){
    var levels=[0,.125,.25,.333,.5,.667,.75,1,1.5,2,3,4,8];
    var baseAng=Math.atan2(S[1].y-S[0].y,S[1].x-S[0].x);
    levels.forEach(function(lv){
      var ang=baseAng*lv;var sc=2500;
      var alpha=.3+(lv===1?.7:0);
      ctx.strokeStyle='rgba(37,99,235,'+alpha+')';
      ctx.lineWidth=lv===1?2:1;
      ctx.beginPath();ctx.moveTo(S[0].x,S[0].y);ctx.lineTo(S[0].x+Math.cos(ang)*sc,S[0].y+Math.sin(ang)*sc);ctx.stroke();
    });
  }
  else if(tool==='gannbox'){
    var x1=Math.min(S[0].x,S[1].x),x2=Math.max(S[0].x,S[1].x);
    var y1=Math.min(S[0].y,S[1].y),y2=Math.max(S[0].y,S[1].y);
    var w=x2-x1,h=y2-y1;
    ctx.strokeStyle=c;ctx.lineWidth=2;ctx.strokeRect(x1,y1,w,h);
    ctx.lineWidth=1;ctx.globalAlpha=.5;
    [.333,.5,.667].forEach(function(p){
      ctx.beginPath();ctx.moveTo(x1+w*p,y1);ctx.lineTo(x1+w*p,y2);ctx.stroke();
      ctx.beginPath();ctx.moveTo(x1,y1+h*p);ctx.lineTo(x2,y1+h*p);ctx.stroke();
    });
    ctx.globalAlpha=1;
  }
  else if(tool==='pitchfork'||tool==='schiff'||tool==='mschiff'){
    if(S.length<3)return;
    var a=S[0],b=S[1],c2=S[2];
    var mid;
    if(tool==='schiff')mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
    else if(tool==='mschiff')mid={x:(a.x+b.x+c2.x)/3,y:(a.y+b.y+c2.y)/3};
    else mid={x:(b.x+c2.x)/2,y:(b.y+c2.y)/2};
    var dx=mid.x-a.x,dy=mid.y-a.y;var l=Math.hypot(dx,dy)||1;var sc=2000/l;
    ctx.strokeStyle=C.accent;ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(a.x+dx*sc,a.y+dy*sc);ctx.stroke();
    ctx.globalAlpha=.6;ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(b.x+dx*sc,b.y+dy*sc);ctx.stroke();
    ctx.beginPath();ctx.moveTo(c2.x,c2.y);ctx.lineTo(c2.x+dx*sc,c2.y+dy*sc);ctx.stroke();
    ctx.globalAlpha=1;dots([a,b,c2]);
  }
  else if(tool==='rect'){var x=Math.min(S[0].x,S[1].x),y=Math.min(S[0].y,S[1].y);ctx.fillStyle=c+'20';ctx.fillRect(x,y,Math.abs(S[1].x-S[0].x),Math.abs(S[1].y-S[0].y));ctx.strokeRect(x,y,Math.abs(S[1].x-S[0].x),Math.abs(S[1].y-S[0].y));}
  else if(tool==='circle'){var r=Math.hypot(S[1].x-S[0].x,S[1].y-S[0].y);ctx.fillStyle=c+'20';ctx.beginPath();ctx.arc(S[0].x,S[0].y,r,0,Math.PI*2);ctx.fill();ctx.stroke();}
  else if(tool==='ellipse'){var rx=Math.abs(S[1].x-S[0].x)/2,ry=Math.abs(S[1].y-S[0].y)/2;var cx=(S[0].x+S[1].x)/2,cy=(S[0].y+S[1].y)/2;ctx.fillStyle=c+'20';ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);ctx.fill();ctx.stroke();}
  else if(tool==='triangle'){var cx=(S[0].x+S[1].x)/2;ctx.fillStyle=c+'20';ctx.beginPath();ctx.moveTo(cx,Math.min(S[0].y,S[1].y));ctx.lineTo(S[0].x,Math.max(S[0].y,S[1].y));ctx.lineTo(S[1].x,Math.max(S[0].y,S[1].y));ctx.closePath();ctx.fill();ctx.stroke();}
  else if(tool==='text'||tool==='label'){ctx.font='bold 14px -apple-system, sans-serif';ctx.fillStyle=c;ctx.fillText(d.text||'متن',S[0].x,S[0].y);}
  else if(tool==='note'){
    ctx.font='bold 12px -apple-system, sans-serif';
    var w=ctx.measureText(d.text||'').width+22;
    ctx.fillStyle='#FBBF24';ctx.fillRect(S[0].x,S[0].y-30,w,28);
    ctx.fillStyle='#000';ctx.fillText(d.text||'',S[0].x+11,S[0].y-12);
  }
  else if(tool==='arrow'){line(S[0],S[1]);var ang=Math.atan2(S[1].y-S[0].y,S[1].x-S[0].x);var sz=12;ctx.beginPath();ctx.moveTo(S[1].x,S[1].y);ctx.lineTo(S[1].x-sz*Math.cos(ang-Math.PI/6),S[1].y-sz*Math.sin(ang-Math.PI/6));ctx.lineTo(S[1].x-sz*Math.cos(ang+Math.PI/6),S[1].y-sz*Math.sin(ang+Math.PI/6));ctx.closePath();ctx.fill();}
  else if(tool==='long'||tool==='short'){
    var isLong=tool==='long';
    var eY=S[0].y,tY=S[1].y;
    var sY=isLong?eY+(eY-tY)*.6:eY-(tY-eY)*.6;
    var x1=Math.min(S[0].x,S[1].x),x2=Math.max(S[0].x,S[1].x);
    ctx.fillStyle=C.up+'35';ctx.fillRect(x1,Math.min(eY,tY),x2-x1,Math.abs(tY-eY));
    ctx.fillStyle=C.down+'35';ctx.fillRect(x1,Math.min(eY,sY),x2-x1,Math.abs(sY-eY));
    ctx.strokeStyle=C.accent;ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(x1,eY);ctx.lineTo(x2,eY);ctx.stroke();
    var entry=d.pts[0].price,target=d.pts[1].price;
    var stop=2*entry-target;var dec=entry>100?2:4;
    ctx.font='bold 11px sans-serif';
    ctx.fillStyle=C.accent;ctx.fillText('E '+entry.toFixed(dec),x2+5,eY+4);
    ctx.fillStyle=C.up;ctx.fillText('TP '+target.toFixed(dec),x2+5,tY+4);
    ctx.fillStyle=C.down;ctx.fillText('SL '+stop.toFixed(dec),x2+5,sY+4);
    var risk=Math.abs(entry-stop),reward=Math.abs(target-entry);
    if(risk>0){ctx.fillStyle=C.text;ctx.fillText('R:R = 1:'+(reward/risk).toFixed(2),x2+5,(eY+tY)/2+4);}
  }
  else if(tool==='projection'){
    var x1=Math.min(S[0].x,S[1].x),x2=Math.max(S[0].x,S[1].x);
    var pd=d.pts[1].price-d.pts[0].price;
    var p1=d.pts[1].price+pd*.5,p2=d.pts[1].price+pd*1.0;
    var y1=toScreen({time:d.pts[1].time,price:p1}),y2=toScreen({time:d.pts[1].time,price:p2});
    if(y1){ctx.strokeStyle=c+'80';ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(x2,S[1].y);ctx.lineTo(x2+100,y1.y);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle=c;ctx.font='bold 10px sans-serif';ctx.fillText(p1.toFixed(p1>100?2:4),x2+105,y1.y+3);}
    if(y2){ctx.strokeStyle=c+'60';ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(x2+100,y1.y);ctx.lineTo(x2+200,y2.y);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle=c+'AA';ctx.font='bold 10px sans-serif';ctx.fillText(p2.toFixed(p2>100?2:4),x2+205,y2.y+3);}
  }
  else if(tool==='xabcd'||tool==='hs'||tool==='elliott'){
    ctx.lineWidth=2;
    ctx.beginPath();
    S.forEach(function(p,i){if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);});
    ctx.stroke();
    var labels=tool==='xabcd'?['X','A','B','C','D']:tool==='hs'?['LS','H1','H','H2','RS']:['0','1','2','3','4','5'];
    ctx.font='bold 13px sans-serif';
    S.forEach(function(p,i){
      ctx.fillStyle=c;ctx.beginPath();ctx.arc(p.x,p.y,6,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#FFF';ctx.font='bold 10px sans-serif';ctx.textAlign='center';
      ctx.fillText(labels[i]||i,p.x,p.y+3);ctx.textAlign='left';
    });
  }
  else if(tool==='brush'){ctx.beginPath();S.forEach(function(p,i){if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);});ctx.stroke();}
  else if(tool==='marker'){ctx.globalAlpha=.4;ctx.lineWidth=14;ctx.beginPath();S.forEach(function(p,i){if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);});ctx.stroke();ctx.globalAlpha=1;ctx.lineWidth=2;}
  else if(tool==='ruler'){
    var pd=d.pts[1].price-d.pts[0].price;
    var pct=(pd/d.pts[0].price)*100;
    var bars=Math.round(Math.abs(S[1].x-S[0].x)/6);
    var up=pd>=0;
    ctx.strokeStyle=up?C.up:C.down;ctx.fillStyle=(up?C.up:C.down)+'25';
    line(S[0],S[1]);
    var x=Math.min(S[0].x,S[1].x),y=Math.min(S[0].y,S[1].y);
    ctx.fillRect(x,y,Math.abs(S[1].x-S[0].x),Math.abs(S[1].y-S[0].y));
    ctx.fillStyle=up?C.up:C.down;ctx.font='bold 11px sans-serif';
    ctx.fillText((up?'+':'')+pd.toFixed(2)+' ('+(up?'+':'')+pct.toFixed(2)+'%) · '+bars+' بار',x,y-6);
  }
  else if(tool==='daterange'||tool==='priceRange'){
    var x1=Math.min(S[0].x,S[1].x),x2=Math.max(S[0].x,S[1].x);
    var y1=Math.min(S[0].y,S[1].y),y2=Math.max(S[0].y,S[1].y);
    ctx.fillStyle=c+'20';ctx.fillRect(x1,y1,x2-x1,y2-y1);
    ctx.strokeStyle=c;ctx.lineWidth=1;ctx.setLineDash([4,4]);ctx.strokeRect(x1,y1,x2-x1,y2-y1);ctx.setLineDash([]);
    if(tool==='daterange'){ctx.fillStyle=c;ctx.font='bold 11px sans-serif';ctx.fillText(Math.round((x2-x1)/6)+' کندل',x1+8,y1-6);}
    else{var pd2=Math.abs(d.pts[1].price-d.pts[0].price);ctx.fillStyle=c;ctx.font='bold 12px sans-serif';ctx.fillText(pd2.toFixed(pd2>1?2:4),x1+8,y1-6);}
  }
}

// ==================== ALERTS ====================
function openAlerts(){
  var body=document.getElementById('alert-body');
  var html='<div class="alert-add" onclick="addAlert()">+ افزودن آلرت جدید</div>';
  if(alerts.length){
    alerts.forEach(function(a,i){
      html+='<div class="alert-row"><div class="hd"><span>'+a.type+' @ '+a.price.toFixed(4)+'</span><span class="x" onclick="removeAlert('+i+')">✕</span></div><div class="meta">'+(a.triggered?'✅ فعال شد':'⏳ در انتظار')+'</div></div>';
    });
  }else{
    html+='<div style="font-size:11px;color:'+C.muted+';text-align:center;padding:20px">هنوز آلرتی ثبت نشده</div>';
  }
  body.innerHTML=html;
  document.getElementById('modal-alert').classList.add('on');
}

function addAlert(){
  if(!candles.length)return;
  var last=candles[visibleNodes?0:candles.length-1];
  var price=last.close;
  var input=prompt('قیمت آلرت (بالاتر/پایین‌تر از '+price.toFixed(4)+'):',(price*1.01).toFixed(4));
  if(!input)return;
  var p=parseFloat(input);if(isNaN(p))return;
  alerts.push({type:p>price?'بالاتر از':'پایین‌تر از',price:p,triggered:false});
  openAlerts();
  showToast('آلرت ثبت شد');
}

function removeAlert(i){alerts.splice(i,1);openAlerts();}

function checkAlerts(){
  if(!candles.length||!alerts.length)return;
  var last=candles[visibleCount-1];if(!last)return;
  alerts.forEach(function(a){
    if(a.triggered)return;
    if((a.type==='بالاتر از'&&last.close>=a.price)||(a.type==='پایین‌تر از'&&last.close<=a.price)){
      a.triggered=true;
      notifyRN({type:'alert-triggered',text:a.type+' '+a.price});
      showToast('🔔 آلرت: '+a.type+' '+a.price);
    }
  });
}

// ==================== BACKTEST ====================
function runBacktest(){
  var strategy=document.getElementById('bt-strategy').value;
  var size=parseFloat(document.getElementById('bt-size').value)||1000;
  if(!candles.length){document.getElementById('bt-results').innerHTML='<div style="color:#DC2626;font-size:11px;text-align:center;padding:12px">داده‌ای موجود نیست</div>';return;}

  var c=candles.slice(0,visibleCount);
  var signals=[];
  var trades=[];

  // Generate signals
  if(strategy==='sma_cross'){
    var fast=M.sma(c,20),slow=M.sma(c,50);
    var fm={},sm={};fast.forEach(function(x){fm[x.time]=x.value;});slow.forEach(function(x){sm[x.time]=x.value;});
    var prev=null;
    c.forEach(function(x){
      var t=Math.floor(x.timestamp/1000);
      if(fm[t]!==undefined&&sm[t]!==undefined){
        var sig=fm[t]>sm[t]?'buy':'sell';
        if(prev&&sig!==prev)signals.push({time:t,sig:sig,price:x.close});
        prev=sig;
      }
    });
  }else if(strategy==='ema_cross'){
    var fast=M.ema(c,9),slow=M.ema(c,21);
    var fm={},sm={};fast.forEach(function(x){fm[x.time]=x.value;});slow.forEach(function(x){sm[x.time]=x.value;});
    var prev=null;
    c.forEach(function(x){
      var t=Math.floor(x.timestamp/1000);
      if(fm[t]!==undefined&&sm[t]!==undefined){
        var sig=fm[t]>sm[t]?'buy':'sell';
        if(prev&&sig!==prev)signals.push({time:t,sig:sig,price:x.close});
        prev=sig;
      }
    });
  }else if(strategy==='rsi_ob'){
    var r=M.rsi(c,14);
    r.forEach(function(x){
      if(x.value<30)signals.push({time:x.time,sig:'buy',price:c.find(function(cc){return Math.floor(cc.timestamp/1000)===x.time;}).close});
      else if(x.value>70)signals.push({time:x.time,sig:'sell',price:c.find(function(cc){return Math.floor(cc.timestamp/1000)===x.time;}).close});
    });
  }else if(strategy==='macd'){
    var mc=M.macd(c,12,26,9);
    var mm={},ss={};mc.m.forEach(function(x){mm[x.time]=x.value;});mc.s.forEach(function(x){ss[x.time]=x.value;});
    var prev=null;
    c.forEach(function(x){
      var t=Math.floor(x.timestamp/1000);
      if(mm[t]!==undefined&&ss[t]!==undefined){
        var sig=mm[t]>ss[t]?'buy':'sell';
        if(prev&&sig!==prev)signals.push({time:t,sig:sig,price:x.close});
        prev=sig;
      }
    });
  }else if(strategy==='supertrend'){
    var st=M.supertrend(c,10,3);
    var sm={};st.forEach(function(x){sm[x.time]=x.value;});
    var prev=null;
    c.forEach(function(x){
      var t=Math.floor(x.timestamp/1000);
      if(sm[t]!==undefined){
        var sig=x.close>sm[t]?'buy':'sell';
        if(prev&&sig!==prev)signals.push({time:t,sig:sig,price:x.close});
        prev=sig;
      }
    });
  }else if(strategy==='bb'){
    var bb=M.bb(c,20,2);
    var um={},lm={};bb.u.forEach(function(x){um[x.time]=x.value;});bb.l.forEach(function(x){lm[x.time]=x.value;});
    c.forEach(function(x){
      var t=Math.floor(x.timestamp/1000);
      if(um[t]!==undefined&&x.close>um[t])signals.push({time:t,sig:'sell',price:x.close});
      else if(lm[t]!==undefined&&x.close<lm[t])signals.push({time:t,sig:'buy',price:x.close});
    });
  }

  // Simulate trades
  var inPos=null;
  signals.forEach(function(s){
    if(!inPos){inPos={entry:s.price,time:s.time,side:s.sig};}
    else{
      var pnl=inPos.side==='buy'?(s.price-inPos.entry):(inPos.entry-s.price);
      var pnlPct=(pnl/inPos.entry)*100;
      var pnlUSD=(pnl/inPos.entry)*size;
      trades.push({entry:inPos.entry,exit:s.price,side:inPos.side,pnl:pnlUSD,pct:pnlPct});
      inPos=null;
    }
  });
  if(inPos){
    var last=c[c.length-1];
    var pnl=inPos.side==='buy'?(last.close-inPos.entry):(inPos.entry-last.close);
    trades.push({entry:inPos.entry,exit:last.close,side:inPos.side,pnl:(pnl/inPos.entry)*size,pct:(pnl/inPos.entry)*100});
  }

  // Stats
  var wins=trades.filter(function(t){return t.pnl>0;});
  var losses=trades.filter(function(t){return t.pnl<=0;});
  var totalPnl=trades.reduce(function(a,t){return a+t.pnl;},0);
  var winRate=trades.length?(wins.length/trades.length)*100:0;
  var grossWin=wins.reduce(function(a,t){return a+t.pnl;},0);
  var grossLoss=Math.abs(losses.reduce(function(a,t){return a+t.pnl;},0));
  var pf=grossLoss===0?'∞':(grossWin/grossLoss).toFixed(2);
  var avgWin=wins.length?grossWin/wins.length:0;
  var avgLoss=losses.length?grossLoss/losses.length:0;

  var html='<div class="bt-result">';
  html+='<div class="item"><span class="lbl">تعداد معاملات</span><span class="val">'+trades.length+'</span></div>';
  html+='<div class="item"><span class="lbl">نرخ برد</span><span class="val" style="color:'+(winRate>=50?C.up:C.down)+'">'+winRate.toFixed(1)+'%</span></div>';
  html+='<div class="item"><span class="lbl">سود/زیان کل</span><span class="val" style="color:'+(totalPnl>=0?C.up:C.down)+'">$'+totalPnl.toFixed(2)+'</span></div>';
  html+='<div class="item"><span class="lbl">Profit Factor</span><span class="val">'+pf+'</span></div>';
  html+='<div class="item"><span class="lbl">برد</span><span class="val" style="color:'+C.up+'">'+wins.length+'</span></div>';
  html+='<div class="item"><span class="lbl">باخت</span><span class="val" style="color:'+C.down+'">'+losses.length+'</span></div>';
  html+='<div class="item"><span class="lbl">میانگین برد</span><span class="val" style="color:'+C.up+'">$'+avgWin.toFixed(2)+'</span></div>';
  html+='<div class="item"><span class="lbl">میانگین باخت</span><span class="val" style="color:'+C.down+'">$'+avgLoss.toFixed(2)+'</span></div>';
  html+='</div>';
  document.getElementById('bt-results').innerHTML=html;
  showToast('بک‌تست کامل شد');
}

// ==================== HINT / TOAST ====================
function showHint(t){
  var h=document.getElementById('hint');
  h.textContent=t;h.classList.add('on');
  clearTimeout(hintTimer);
  hintTimer=setTimeout(function(){h.classList.remove('on');},2800);
}
function hideHint(){document.getElementById('hint').classList.remove('on');}
function showToast(t){
  var el=document.getElementById('toast');
  el.textContent=t;el.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(function(){el.classList.remove('on');},2200);
}

// ==================== RN BRIDGE ====================
function notifyRN(d){if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify(d));}

window.setCandles=function(data){
  candles=data||[];
  visibleCount=Math.min(400,candles.length);
  applyCandles();
  checkAlerts();
  notifyRN({type:'candles-rendered',count:visibleCount});
  if(candles.length>400){
    setTimeout(function(){
      visibleCount=candles.length;
      applyCandles();
      notifyRN({type:'full-loaded'});
    },50);
  }
};

window.setIndicatorParams=function(id,params){
  Object.keys(indicators).forEach(function(k){
    if(indicators[k].def.id===id){
      Object.assign(indicators[k].params,params);
      var def=indicators[k].def;
      indicators[k].series.forEach(function(s){try{chart.removeSeries(s);}catch(e){}});
      delete indicators[k];
      if(def.pane)renderPaneIndicator(def.pane,def,params);
      else renderMainIndicator(def,params,k);
    }
  });
};

// Polyfill roundRect
if(!CanvasRenderingContext2D.prototype.roundRect){
  CanvasRenderingContext2D.prototype.roundRect=function(x,y,w,h,r){
    if(w<2*r)r=w/2;if(h<2*r)r=h/2;
    this.beginPath();this.moveTo(x+r,y);
    this.arcTo(x+w,y,x+w,y+h,r);this.arcTo(x+w,y+h,x,y+h,r);
    this.arcTo(x,y+h,x,y,r);this.arcTo(x,y,x+w,y,r);this.closePath();
    return this;
  };
}

if(document.readyState==='complete')init();
else window.addEventListener('load',init);
</script>
</body>
</html>`;
};

// =========================================================
// RN COMPONENT
// =========================================================

export default function ChartScreen(){
  const {colors,isDark}=useNavasanTheme();
  const webViewRef=useRef<WebView>(null);

  const [selected,setSelected]=useState(SYMBOLS[0]);
  const [timeframe,setTimeframe]=useState<Timeframe>('1h');
  const [candles,setCandles]=useState<Candle[]>([]);
  const [loading,setLoading]=useState(true);
  const [libraryCode,setLibraryCode]=useState('');
  const [libraryReady,setLibraryReady]=useState(false);
  const [showPicker,setShowPicker]=useState(false);
  const [search,setSearch]=useState('');
  const [chartReady,setChartReady]=useState(false);
  const [status,setStatus]=useState('بارگذاری...');

  useEffect(()=>{
    (async()=>{
      setStatus('بارگذاری کتابخانه...');
      try{
        const code=await getChartLibrary();
        setLibraryCode(code);setLibraryReady(true);
      }catch{setStatus('خطا در بارگذاری');}
    })();
  },[]);

  const html=useMemo(()=>libraryReady?buildHTML(isDark,libraryCode):'',[isDark,libraryCode,libraryReady]);
  const webViewKey=useMemo(()=>`c-${isDark?'d':'l'}-${libraryReady?'r':'n'}`,[isDark,libraryReady]);

  const loadCandles=useCallback(async()=>{
    setLoading(true);setStatus('دریافت داده...');
    try{
      const data=await fetchCandles(selected.id,timeframe,3000);
      setCandles(data);
    }catch{setCandles([]);}
    finally{setLoading(false);}
  },[selected.id,timeframe]);

  useEffect(()=>{if(libraryReady)loadCandles();},[loadCandles,libraryReady]);

  useEffect(()=>{
    if(!webViewRef.current||!chartReady||candles.length===0)return;
    setStatus(`رندر ${candles.length} کندل...`);
    webViewRef.current.injectJavaScript(`window.setCandles(${JSON.stringify(candles)}); true;`);
  },[candles,chartReady]);

  const onMessage=useCallback((event:any)=>{
    try{
      const msg=JSON.parse(event.nativeEvent.data);
      if(msg.type==='ready')setChartReady(true);
      else if(msg.type==='chart-loaded')setStatus('آماده ✓');
      else if(msg.type==='candles-rendered')setStatus(`آماده (${msg.count}) ✓`);
      else if(msg.type==='full-loaded')setStatus('کامل ✓');
      else if(msg.type==='change-timeframe')setTimeframe(msg.timeframe as Timeframe);
    }catch{}
  },[]);

  const filtered=useMemo(()=>{
    const q=search.trim().toLowerCase();
    if(!q)return SYMBOLS;
    return SYMBOLS.filter(s=>s.id.toLowerCase().includes(q)||s.label.toLowerCase().includes(q));
  },[search]);

  const latest=candles.length?candles[candles.length-1]:null;
  const previous=candles.length>1?candles[candles.length-2]:null;
  const change=latest&&previous?latest.close-previous.close:0;
  const changePct=latest&&previous&&previous.close!==0?(change/previous.close)*100:0;
  const isUp=change>=0;
  const dec=latest?(latest.close>100?2:4):2;

  return (
    <View style={[styles.screen,{backgroundColor:colors.background}]}>
      <View style={[styles.header,{borderBottomColor:colors.border}]}>
        <TouchableOpacity onPress={()=>setShowPicker(true)} style={styles.symbolBtn}>
          <Text style={[styles.symbolId,{color:colors.text}]}>{selected.id}</Text>
          <Ionicons name="chevron-down" size={14} color={colors.mutedText}/>
        </TouchableOpacity>
        {latest&&(
          <View style={styles.priceBox}>
            <Text style={[styles.priceText,{color:colors.text}]}>{latest.close.toFixed(dec)}</Text>
            <Text style={[styles.changeText,{color:isUp?GREEN:RED}]}>
              {isUp?'▲':'▼'} {Math.abs(changePct).toFixed(2)}%
            </Text>
          </View>
        )}
      </View>

      <View style={styles.chartWrap}>
        {(!libraryReady||(loading&&candles.length===0))&&(
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={BLUE}/>
            <Text style={[styles.loadingText,{color:colors.mutedText}]}>{status}</Text>
          </View>
        )}
        {libraryReady&&(
          <WebView
            ref={webViewRef}
            key={webViewKey}
            originWhitelist={['*']}
            source={{html}}
            style={styles.webview}
            javaScriptEnabled
            domStorageEnabled
            scrollEnabled={false}
            bounces={false}
            overScrollMode="never"
            onMessage={onMessage}
            mixedContentMode="always"
            cacheEnabled
            androidLayerType="hardware"
          />
        )}
      </View>

      <Modal visible={showPicker} animationType="slide" transparent onRequestClose={()=>setShowPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.pickerModal,{backgroundColor:isDark?'#0F172A':'#FFFFFF'}]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle,{color:colors.text}]}>انتخاب نماد</Text>
              <TouchableOpacity onPress={()=>setShowPicker(false)}>
                <Ionicons name="close" size={24} color={colors.mutedText}/>
              </TouchableOpacity>
            </View>
            <View style={[styles.searchWrap,{backgroundColor:colors.input,borderColor:colors.border}]}>
              <Ionicons name="search" size={18} color={colors.mutedText}/>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="جستجو..."
                placeholderTextColor={colors.mutedText}
                style={[styles.searchInput,{color:colors.text}]}
              />
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {CATEGORIES.map(cat=>{
                const items=filtered.filter(s=>s.cat===cat);
                if(!items.length)return null;
                return (
                  <View key={cat} style={styles.section}>
                    <Text style={[styles.sectionLabel,{color:colors.mutedText}]}>{CATEGORY_LABELS[cat]}</Text>
                    {items.map(s=>{
                      const active=s.id===selected.id;
                      return (
                        <TouchableOpacity
                          key={s.id}
                          onPress={()=>{setSelected(s);setShowPicker(false);setSearch('');}}
                          style={[styles.row,{
                            backgroundColor:active?`${BLUE}15`:colors.card,
                            borderColor:active?BLUE:colors.border,
                          }]}
                        >
                          <Text style={[styles.rowLabel,{color:colors.text}]}>{s.label}</Text>
                          <Text style={[styles.rowId,{color:colors.mutedText}]}>{s.id}</Text>
                          {active&&<Ionicons name="checkmark-circle" size={20} color={BLUE}/>}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                );
              })}
              <View style={{height:40}}/>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles=StyleSheet.create({
  screen:{flex:1},
  header:{
    flexDirection:'row',alignItems:'center',justifyContent:'space-between',
    paddingHorizontal:14,paddingTop:Platform.OS==='ios'?48:40,
    paddingBottom:6,borderBottomWidth:1,minHeight:44,
  },
  symbolBtn:{flexDirection:'row',alignItems:'center',gap:5},
  symbolId:{fontSize:16,fontWeight:'900',letterSpacing:0.3},
  priceBox:{flexDirection:'row',alignItems:'center',gap:8},
  priceText:{fontSize:15,fontWeight:'900'},
  changeText:{fontSize:11,fontWeight:'800'},
  chartWrap:{flex:1,position:'relative',overflow:'hidden'},
  webview:{flex:1,backgroundColor:'transparent'},
  loadingBox:{
    position:'absolute',top:0,left:0,right:0,bottom:0,
    alignItems:'center',justifyContent:'center',gap:14,zIndex:10,
  },
  loadingText:{fontSize:12,fontWeight:'700'},
  modalOverlay:{flex:1,backgroundColor:'rgba(0,0,0,0.6)',justifyContent:'flex-end'},
  pickerModal:{maxHeight:'88%',borderTopLeftRadius:26,borderTopRightRadius:26,paddingHorizontal:18,paddingTop:18},
  pickerHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:14},
  pickerTitle:{fontSize:18,fontWeight:'900'},
  searchWrap:{flexDirection:'row',alignItems:'center',gap:8,height:46,borderRadius:12,borderWidth:1,paddingHorizontal:12,marginBottom:12},
  searchInput:{flex:1,fontSize:13,textAlign:'right'},
  section:{marginBottom:16},
  sectionLabel:{fontSize:11,fontWeight:'800',marginBottom:7,textAlign:'right'},
  row:{flexDirection:'row',alignItems:'center',gap:10,padding:11,borderRadius:12,borderWidth:1,marginBottom:6},
  rowLabel:{flex:1,fontSize:13,fontWeight:'800',textAlign:'right'},
  rowId:{fontSize:10,fontWeight:'700'},
});