import type { Candle } from '@/lib/market-data';

// =========================================================
// TYPES
// =========================================================

export type TradeStage = {
  level: number;       // قیمت هدف
  percent: number;     // درصد بستن (0-100)
  hit: boolean;
};

export type BacktestTrade = {
  id: string;
  direction: 'buy' | 'sell';
  entryIndex: number;
  entryPrice: number;
  stopLoss: number;
  originalStopLoss: number;
  stages: TradeStage[];
  breakEvenTriggered: boolean;
  trailingEnabled: boolean;
  trailingDistance: number; // ATR × ضریب
  positionSize: number;      // حجم پوزیشن
  riskAmount: number;        // مقدار ریسک $$$
  exitIndex?: number;
  exitPrice?: number;
  result?: number;
  resultR?: number;
  outcome?: 'win' | 'loss' | 'be' | 'open';
  closedPercent: number;     // چند درصد پوزیشن بسته شده
  currentStopLoss: number;   // SL فعلی (ممکنه تغییر کرده باشه)
};

export type BacktestSettings = {
  atrMultiple: number;        // ضریب ATR برای SL اولیه
  initialRR: number;          // R:R برای TP نهایی
  riskPerTrade: number;       // درصد ریسک از سرمایه
  enableTrailing: boolean;
  trailingATR: number;        // ضریب ATR برای trailing
  enableBreakeven: boolean;
  breakevenAtR: number;       // در چند R برو breakeven
  enableMultiTP: boolean;
  capital: number;
};

export const DEFAULT_SETTINGS: BacktestSettings = {
  atrMultiple: 1.5,
  initialRR: 3,
  riskPerTrade: 1,
  enableTrailing: false,
  trailingATR: 1,
  enableBreakeven: true,
  breakevenAtR: 1,
  enableMultiTP: false,
  capital: 10000,
};

// =========================================================
// ATR
// =========================================================

export function calcATR(candles: Candle[], period: number = 14): number {
  if (candles.length < period + 1) return 0;

  const trs: number[] = [];
  for (let i = candles.length - period; i < candles.length; i++) {
    const c = candles[i];
    const prev = candles[i - 1];
    if (!prev) continue;
    const tr = Math.max(
      c.high - c.low,
      Math.abs(c.high - prev.close),
      Math.abs(c.low - prev.close)
    );
    trs.push(tr);
  }
  if (trs.length === 0) return 0;
  return trs.reduce((a, b) => a + b, 0) / trs.length;
}

// =========================================================
// CREATE TRADE
// =========================================================

export function createTrade(
  candle: Candle,
  index: number,
  direction: 'buy' | 'sell',
  candles: Candle[],
  settings: BacktestSettings
): BacktestTrade | null {
  const atr = calcATR(candles.slice(0, index + 1), 14);
  if (atr <= 0) return null;

  const entryPrice = candle.close;
  const risk = atr * settings.atrMultiple;

  const stopLoss =
    direction === 'buy' ? entryPrice - risk : entryPrice + risk;

  // Position sizing
  const riskAmount = (settings.capital * settings.riskPerTrade) / 100;
  const positionSize = riskAmount / risk;

  // Stages
  let stages: TradeStage[] = [];

  if (settings.enableMultiTP) {
    stages = [
      {
        level:
          direction === 'buy'
            ? entryPrice + risk * 1
            : entryPrice - risk * 1,
        percent: 40,
        hit: false,
      },
      {
        level:
          direction === 'buy'
            ? entryPrice + risk * 2
            : entryPrice - risk * 2,
        percent: 30,
        hit: false,
      },
      {
        level:
          direction === 'buy'
            ? entryPrice + risk * settings.initialRR
            : entryPrice - risk * settings.initialRR,
        percent: 30,
        hit: false,
      },
    ];
  } else {
    stages = [
      {
        level:
          direction === 'buy'
            ? entryPrice + risk * settings.initialRR
            : entryPrice - risk * settings.initialRR,
        percent: 100,
        hit: false,
      },
    ];
  }

  return {
    id: `bt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    direction,
    entryIndex: index,
    entryPrice,
    stopLoss,
    originalStopLoss: stopLoss,
    currentStopLoss: stopLoss,
    stages,
    breakEvenTriggered: false,
    trailingEnabled: settings.enableTrailing,
    trailingDistance: atr * settings.trailingATR,
    positionSize,
    riskAmount,
    closedPercent: 0,
    outcome: 'open',
  };
}

// =========================================================
// PROCESS CANDLE (UPDATE TRADE)
// =========================================================

export function processTrade(
  trade: BacktestTrade,
  candle: Candle,
  index: number,
  settings: BacktestSettings
): BacktestTrade {
  if (trade.outcome !== 'open') return trade;

  let updated = { ...trade };
  const { direction, entryPrice } = updated;
  const risk = Math.abs(entryPrice - updated.originalStopLoss);

  // =========================================
  // 1. Check current stop loss
  // =========================================
  const slHit =
    direction === 'buy'
      ? candle.low <= updated.currentStopLoss
      : candle.high >= updated.currentStopLoss;

  if (slHit) {
    // باقی پوزیشن بسته می‌شه
    const remainingPercent = 100 - updated.closedPercent;
    const exitPrice = updated.currentStopLoss;

    const realizedPnl = calcPnl(
      updated,
      updated.stages.filter((s) => s.hit)
    );

    const remainingPnl =
      direction === 'buy'
        ? (exitPrice - entryPrice) * (remainingPercent / 100)
        : (entryPrice - exitPrice) * (remainingPercent / 100);

    const totalPerUnit = realizedPnl.perUnit + remainingPnl;
    const totalResult = totalPerUnit * updated.positionSize;

    return {
      ...updated,
      exitIndex: index,
      exitPrice,
      closedPercent: 100,
      result: totalResult,
      resultR: risk > 0 ? totalPerUnit / risk : 0,
      outcome: totalResult > 0 ? 'win' : totalResult < 0 ? 'loss' : 'be',
    };
  }

  // =========================================
  // 2. Check stages (Multi-TP)
  // =========================================
  if (settings.enableMultiTP) {
    updated.stages = updated.stages.map((stage) => {
      if (stage.hit) return stage;
      const hit =
        direction === 'buy'
          ? candle.high >= stage.level
          : candle.low <= stage.level;
      if (hit) {
        updated.closedPercent += stage.percent;
      }
      return { ...stage, hit };
    });
  } else {
    // Single TP
    const tp = updated.stages[0];
    if (!tp.hit) {
      const hit =
        direction === 'buy'
          ? candle.high >= tp.level
          : candle.low <= tp.level;
      if (hit) {
        updated.stages[0] = { ...tp, hit: true };
        updated.closedPercent = 100;

        const perUnit =
          direction === 'buy'
            ? tp.level - entryPrice
            : entryPrice - tp.level;
        const totalResult = perUnit * updated.positionSize;

        return {
          ...updated,
          exitIndex: index,
          exitPrice: tp.level,
          result: totalResult,
          resultR: risk > 0 ? perUnit / risk : 0,
          outcome: 'win',
        };
      }
    }
  }

  // =========================================
  // 3. Breakeven
  // =========================================
  if (settings.enableBreakeven && !updated.breakEvenTriggered && risk > 0) {
    const profitDistance =
      direction === 'buy'
        ? candle.high - entryPrice
        : entryPrice - candle.low;

    const rMultiple = profitDistance / risk;

    if (rMultiple >= settings.breakevenAtR) {
      updated.currentStopLoss = entryPrice;
      updated.breakEvenTriggered = true;
    }
  }

  // =========================================
  // 4. Trailing Stop
  // =========================================
  if (settings.enableTrailing && updated.trailingEnabled) {
    const newSL =
      direction === 'buy'
        ? candle.close - updated.trailingDistance
        : candle.close + updated.trailingDistance;

    // فقط به نفع معامله حرکت کن
    if (direction === 'buy' && newSL > updated.currentStopLoss) {
      updated.currentStopLoss = newSL;
    } else if (direction === 'sell' && newSL < updated.currentStopLoss) {
      updated.currentStopLoss = newSL;
    }
  }

  // =========================================
  // 5. All stages hit? Close everything
  // =========================================
  if (
    updated.closedPercent >= 100 ||
    (settings.enableMultiTP && updated.stages.every((s) => s.hit))
  ) {
    const realized = calcPnl(
      updated,
      updated.stages.filter((s) => s.hit)
    );
    const risk = Math.abs(entryPrice - updated.originalStopLoss);
    const totalResult = realized.perUnit * updated.positionSize;

    return {
      ...updated,
      exitIndex: index,
      exitPrice: candle.close,
      closedPercent: 100,
      result: totalResult,
      resultR: risk > 0 ? realized.perUnit / risk : 0,
      outcome: totalResult > 0 ? 'win' : totalResult < 0 ? 'loss' : 'be',
    };
  }

  return updated;
}

// =========================================================
// CALC PNL FROM STAGES
// =========================================================

function calcPnl(
  trade: BacktestTrade,
  stages: TradeStage[]
): { perUnit: number } {
  const { direction, entryPrice } = trade;
  let totalPerUnit = 0;

  stages.forEach((stage) => {
    if (!stage.hit) return;
    const diff =
      direction === 'buy'
        ? stage.level - entryPrice
        : entryPrice - stage.level;
    totalPerUnit += diff * (stage.percent / 100);
  });

  return { perUnit: totalPerUnit };
}

// =========================================================
// STATS
// =========================================================

export type BacktestStats = {
  total: number;
  wins: number;
  losses: number;
  be: number;
  winRate: number;
  totalPnL: number;
  totalR: number;
  avgR: number;
  profitFactor: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  sharpe: number;
  sortino: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
  maxWinStreak: number;
  maxLossStreak: number;
  currentStreak: number;
  currentStreakType: 'win' | 'loss' | 'be' | null;
  equityCurve: { time: number; value: number }[];
};

export function calcStats(
  trades: BacktestTrade[],
  candles: Candle[],
  initialCapital: number
): BacktestStats {
  const closed = trades.filter((t) => t.outcome && t.outcome !== 'open');

  const empty: BacktestStats = {
    total: 0, wins: 0, losses: 0, be: 0, winRate: 0,
    totalPnL: 0, totalR: 0, avgR: 0, profitFactor: 0,
    maxDrawdown: 0, maxDrawdownPercent: 0, sharpe: 0, sortino: 0,
    avgWin: 0, avgLoss: 0, largestWin: 0, largestLoss: 0,
    maxWinStreak: 0, maxLossStreak: 0, currentStreak: 0,
    currentStreakType: null, equityCurve: [],
  };

  if (closed.length === 0) return empty;

  // Sort by exit index
  const sorted = [...closed].sort(
    (a, b) => (a.exitIndex ?? 0) - (b.exitIndex ?? 0)
  );

  const wins = sorted.filter((t) => t.outcome === 'win');
  const losses = sorted.filter((t) => t.outcome === 'loss');
  const be = sorted.filter((t) => t.outcome === 'be');

  const totalPnL = sorted.reduce((s, t) => s + (t.result || 0), 0);
  const grossWin = wins.reduce((s, t) => s + (t.result || 0), 0);
  const grossLoss = Math.abs(
    losses.reduce((s, t) => s + (t.result || 0), 0)
  );

  const winRate = (wins.length / sorted.length) * 100;
  const avgWin = wins.length > 0 ? grossWin / wins.length : 0;
  const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;

  const profitFactor =
    grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 99 : 0;

  const totalR = sorted.reduce((s, t) => s + (t.resultR || 0), 0);
  const avgR = totalR / sorted.length;

  // Equity curve + drawdown
  let equity = initialCapital;
  let peak = initialCapital;
  let maxDD = 0;
  let maxDDPercent = 0;
  const equityCurve: { time: number; value: number }[] = [];

  sorted.forEach((t) => {
    equity += t.result || 0;
    if (equity > peak) peak = equity;
    const dd = peak - equity;
    const ddPercent = peak > 0 ? (dd / peak) * 100 : 0;
    if (dd > maxDD) maxDD = dd;
    if (ddPercent > maxDDPercent) maxDDPercent = ddPercent;

    const exitIdx = t.exitIndex ?? 0;
    const candle = candles[exitIdx];
    if (candle) {
      equityCurve.push({
        time: Math.floor(candle.timestamp / 1000),
        value: equity,
      });
    }
  });

  // Sharpe / Sortino
  const returns = sorted.map((t) => t.result || 0);
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((s, r) => s + Math.pow(r - avgReturn, 2), 0) /
    returns.length;
  const stdDev = Math.sqrt(variance);
  const sharpe = stdDev > 0 ? avgReturn / stdDev : 0;

  const negReturns = returns.filter((r) => r < 0);
  const downsideVar =
    negReturns.length > 0
      ? negReturns.reduce((s, r) => s + Math.pow(r, 2), 0) / negReturns.length
      : 0;
  const downsideStd = Math.sqrt(downsideVar);
  const sortino = downsideStd > 0 ? avgReturn / downsideStd : 0;

  const results = sorted.map((t) => t.result || 0);
  const largestWin = Math.max(...results, 0);
  const largestLoss = Math.min(...results, 0);

  // Streaks
  let maxWinStreak = 0, maxLossStreak = 0, curWin = 0, curLoss = 0;
  let currentStreak = 0;
  let currentStreakType: 'win' | 'loss' | 'be' | null = null;

  sorted.forEach((t) => {
    if (t.outcome === 'win') {
      curWin++; curLoss = 0;
      if (curWin > maxWinStreak) maxWinStreak = curWin;
      currentStreak = curWin;
      currentStreakType = 'win';
    } else if (t.outcome === 'loss') {
      curLoss++; curWin = 0;
      if (curLoss > maxLossStreak) maxLossStreak = curLoss;
      currentStreak = curLoss;
      currentStreakType = 'loss';
    } else {
      curWin = 0; curLoss = 0;
      currentStreak = 0;
      currentStreakType = 'be';
    }
  });

  return {
    total: sorted.length,
    wins: wins.length,
    losses: losses.length,
    be: be.length,
    winRate,
    totalPnL,
    totalR,
    avgR,
    profitFactor,
    maxDrawdown: maxDD,
    maxDrawdownPercent: maxDDPercent,
    sharpe,
    sortino,
    avgWin,
    avgLoss,
    largestWin,
    largestLoss,
    maxWinStreak,
    maxLossStreak,
    currentStreak,
    currentStreakType,
    equityCurve,
  };
}

// =========================================================
// HTML BUILDERS
// =========================================================

export function buildBacktestChartHTML(isDark: boolean): string {
  const bg = isDark ? '#050505' : '#FFFFFF';
  const textColor = isDark ? '#E5E7EB' : '#0F172A';
  const gridColor = isDark ? '#1E293B' : '#E2E8F0';
  const borderColor = isDark ? '#1E293B' : '#E2E8F0';

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
    .loading {
      position: absolute; inset: 0;
      display: flex; align-items: center; justify-content: center;
      color: ${textColor};
    }
  </style>
</head>
<body>
  <div id="chart"></div>
  <script src="https://unpkg.com/lightweight-charts@5.0.0/dist/lightweight-charts.standalone.production.js"></script>
  <script>
    let chart = null;
    let candleSeries = null;
    let slLine = null;

    function initChart() {
      const el = document.getElementById('chart');
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
        rightPriceScale: { borderColor: '${borderColor}', scaleMargins: { top: 0.1, bottom: 0.1 } },
        timeScale: { borderColor: '${borderColor}', timeVisible: true, rightOffset: 5 },
        crosshair: { mode: 0 },
        handleScroll: { mouseWheel: false, pressedMouseMove: false, horzTouchDrag: true },
        handleScale: { axisPressedMouseMove: false, mouseWheel: false, pinch: true },
      });

      candleSeries = chart.addCandlestickSeries({
        upColor: '#16A34A',
        downColor: '#DC2626',
        borderUpColor: '#16A34A',
        borderDownColor: '#DC2626',
        wickUpColor: '#16A34A',
        wickDownColor: '#DC2626',
      });

      new ResizeObserver(() => {
        chart.applyOptions({ width: el.clientWidth, height: el.clientHeight });
      }).observe(el);
    }

    window.setCandles = function(candles) {
      if (!candleSeries || !candles) return;
      const formatted = candles.map(c => ({
        time: Math.floor(c.timestamp / 1000),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));
      candleSeries.setData(formatted);
      chart.timeScale().fitContent();
    };

    window.setMarkers = function(markers) {
      if (candleSeries) candleSeries.setMarkers(markers || []);
    };

    window.setStopLine = function(price) {
      if (candleSeries && price) {
        if (slLine) candleSeries.removePriceLine(slLine);
        slLine = candleSeries.createPriceLine({
          price: price,
          color: '#DC2626',
          lineWidth: 2,
          lineStyle: 2,
          axisLabelVisible: true,
          title: 'SL',
        });
      }
    };

    window.clearStopLine = function() {
      if (slLine && candleSeries) {
        candleSeries.removePriceLine(slLine);
        slLine = null;
      }
    };

    window.fitContent = function() {
      if (chart) chart.timeScale().fitContent();
    };

    if (document.readyState === 'complete') initChart();
    else window.addEventListener('load', initChart);
  </script>
</body>
</html>
  `;
}

export function buildEquityCurveHTML(isDark: boolean): string {
  const bg = isDark ? '#050505' : '#FFFFFF';
  const textColor = isDark ? '#E5E7EB' : '#0F172A';
  const gridColor = isDark ? '#1E293B' : '#E2E8F0';
  const borderColor = isDark ? '#1E293B' : '#E2E8F0';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: ${bg}; overflow: hidden; font-family: -apple-system, sans-serif; }
    #eq { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="eq"></div>
  <script src="https://unpkg.com/lightweight-charts@5.0.0/dist/lightweight-charts.standalone.production.js"></script>
  <script>
    let chart = null;
    let areaSeries = null;

    function initChart() {
      const el = document.getElementById('eq');
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
        rightPriceScale: { borderColor: '${borderColor}' },
        timeScale: { borderColor: '${borderColor}', timeVisible: true },
        crosshair: { mode: 0 },
      });

      areaSeries = chart.addAreaSeries({
        topColor: '#16A34A50',
        bottomColor: '#16A34A05',
        lineColor: '#16A34A',
        lineWidth: 2,
      });

      new ResizeObserver(() => {
        chart.applyOptions({ width: el.clientWidth, height: el.clientHeight });
      }).observe(el);
    }

    window.setEquity = function(data) {
      if (areaSeries && data && data.length) {
        areaSeries.setData(data);
        chart.timeScale().fitContent();
      }
    };

    if (document.readyState === 'complete') initChart();
    else window.addEventListener('load', initChart);
  </script>
</body>
</html>
  `;
}