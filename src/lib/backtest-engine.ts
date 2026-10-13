import type { Candle } from '@/lib/market-data';

// =========================================================
// TYPES
// =========================================================

export type BacktestTrade = {
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
  openedAt: number;
};

export type BacktestSession = {
  trades: BacktestTrade[];
  currentCandleIndex: number;
  isPlaying: boolean;
  isFinished: boolean;
};

// =========================================================
// ATR (Average True Range)
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
  atrMultiple: number,
  candles: Candle[],
  riskReward: number = 2
): BacktestTrade {
  const atr = calcATR(candles.slice(0, index + 1), 14);
  const entryPrice = candle.close;
  const risk = atr * atrMultiple || entryPrice * 0.005;

  const stopLoss =
    direction === 'buy' ? entryPrice - risk : entryPrice + risk;
  const takeProfit =
    direction === 'buy'
      ? entryPrice + risk * riskReward
      : entryPrice - risk * riskReward;

  return {
    id: `bt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    direction,
    entryIndex: index,
    entryPrice,
    stopLoss,
    takeProfit,
    outcome: 'open',
    openedAt: candle.timestamp,
  };
}

// =========================================================
// CHECK EXIT
// =========================================================

export function checkTradeExit(
  trade: BacktestTrade,
  candle: Candle,
  index: number
): BacktestTrade {
  if (trade.outcome !== 'open') return trade;

  const { direction, stopLoss, takeProfit, entryPrice } = trade;

  let exitPrice: number | undefined;
  let outcome: 'win' | 'loss' | undefined;

  if (direction === 'buy') {
    if (candle.low <= stopLoss) {
      exitPrice = stopLoss;
      outcome = 'loss';
    } else if (candle.high >= takeProfit) {
      exitPrice = takeProfit;
      outcome = 'win';
    }
  } else {
    if (candle.high >= stopLoss) {
      exitPrice = stopLoss;
      outcome = 'loss';
    } else if (candle.low <= takeProfit) {
      exitPrice = takeProfit;
      outcome = 'win';
    }
  }

  if (!exitPrice || !outcome) return trade;

  const result =
    direction === 'buy'
      ? exitPrice - entryPrice
      : entryPrice - exitPrice;

  return {
    ...trade,
    exitIndex: index,
    exitPrice,
    result,
    outcome,
  };
}

// =========================================================
// STATS
// =========================================================

export function calcSessionStats(trades: BacktestTrade[]) {
  const closed = trades.filter((t) => t.outcome !== 'open');
  const wins = closed.filter((t) => t.outcome === 'win').length;
  const losses = closed.filter((t) => t.outcome === 'loss').length;
  const totalR = closed.reduce((sum, t) => {
    const risk = Math.abs(t.entryPrice - t.stopLoss);
    if (risk === 0 || t.result === undefined) return sum;
    return sum + t.result / risk;
  }, 0);

  const winRate = closed.length > 0 ? (wins / closed.length) * 100 : 0;
  const totalPnl = closed.reduce((s, t) => s + (t.result || 0), 0);

  return {
    total: closed.length,
    wins,
    losses,
    winRate,
    totalR,
    totalPnl,
    avgR: closed.length > 0 ? totalR / closed.length : 0,
  };
}

// =========================================================
// FORMAT
// =========================================================

export function formatBacktestPrice(v: number): string {
  return v.toFixed(v > 100 ? 2 : v > 1 ? 3 : 5);
}