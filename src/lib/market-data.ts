// =========================================================
// MARKET DATA SERVICE
// Yahoo Finance - رایگان، بدون API Key
// =========================================================

export type Candle = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w';

const INTERVAL_MAP: Record<Timeframe, string> = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '1h': '60m',
  '4h': '1h',
  '1d': '1d',
  '1w': '1wk',
};

const SYMBOL_MAP: Record<string, string> = {
  XAUUSD: 'GC=F',
  XAGUSD: 'SI=F',
  BTCUSD: 'BTC-USD',
  ETHUSD: 'ETH-USD',
  EURUSD: 'EURUSD=X',
  GBPUSD: 'GBPUSD=X',
  USDJPY: 'JPY=X',
  USDCHF: 'CHF=X',
  AUDUSD: 'AUDUSD=X',
  USDCAD: 'CAD=X',
  NZDUSD: 'NZDUSD=X',
  SPX: '^GSPC',
  NAS100: '^NDX',
  DJI: '^DJI',
  DAX: '^GDAXI',
  FTSE: '^FTSE',
};

export async function fetchCandles(
  symbol: string,
  timeframe: Timeframe,
  limit: number = 200
): Promise<Candle[]> {
  const yahooSymbol = SYMBOL_MAP[symbol.toUpperCase()] || symbol;
  const interval = INTERVAL_MAP[timeframe];

  const now = Math.floor(Date.now() / 1000);
  const secondsPerCandle: Record<string, number> = {
    '1m': 60,
    '5m': 300,
    '15m': 900,
    '60m': 3600,
    '1d': 86400,
    '1wk': 604800,
  };
  const candleSeconds = secondsPerCandle[interval] || 3600;
  const period1 = now - candleSeconds * limit * 2;

  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/` +
    `${encodeURIComponent(yahooSymbol)}` +
    `?interval=${interval}&period1=${period1}&period2=${now}`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!res.ok) {
      console.log(`Yahoo HTTP ${res.status} for ${symbol}`);
      return [];
    }

    const json = await res.json();
    const result = json?.chart?.result?.[0];

    if (!result?.timestamp || !result?.indicators?.quote?.[0]) {
      return [];
    }

    const timestamps: number[] = result.timestamp;
    const quote = result.indicators.quote[0];
    const opens: (number | null)[] = quote.open || [];
    const highs: (number | null)[] = quote.high || [];
    const lows: (number | null)[] = quote.low || [];
    const closes: (number | null)[] = quote.close || [];

    const candles: Candle[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const o = opens[i];
      const h = highs[i];
      const l = lows[i];
      const c = closes[i];
      if (o == null || h == null || l == null || c == null) continue;

      candles.push({
        timestamp: timestamps[i] * 1000,
        open: o,
        high: h,
        low: l,
        close: c,
      });
    }

    return candles.slice(-limit);
  } catch (error) {
    console.log('fetchCandles error:', error);
    return [];
  }
}

export async function getLatestPrice(
  symbol: string
): Promise<{ price: number; change: number; changePct: number } | null> {
  const candles = await fetchCandles(symbol, '1d', 2);
  if (candles.length < 2) return null;

  const prev = candles[candles.length - 2];
  const current = candles[candles.length - 1];
  const change = current.close - prev.close;
  const changePct = prev.close !== 0 ? (change / prev.close) * 100 : 0;

  return {
    price: current.close,
    change,
    changePct,
  };
}