// =========================================================
// MARKET DATA ENGINE v2
// Binance (crypto) + Yahoo (forex/metals/index)
// =========================================================

export type Candle = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w';

// =========================================================
// CACHE
// =========================================================

type CacheEntry = {
  candles: Candle[];
  fetchedAt: number;
  symbol: string;
  timeframe: Timeframe;
};

const CACHE_TTL_MS = 60 * 1000; // ۶۰ ثانیه
const cache = new Map<string, CacheEntry>();

const getCacheKey = (symbol: string, timeframe: Timeframe) =>
  `${symbol.toUpperCase()}:${timeframe}`;

const getCached = (
  symbol: string,
  timeframe: Timeframe
): Candle[] | null => {
  const key = getCacheKey(symbol, timeframe);
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.candles;
};

const setCache = (
  symbol: string,
  timeframe: Timeframe,
  candles: Candle[]
) => {
  cache.set(getCacheKey(symbol, timeframe), {
    candles,
    fetchedAt: Date.now(),
    symbol,
    timeframe,
  });
};

export const clearMarketCache = () => cache.clear();

// =========================================================
// SYMBOL CLASSIFICATION
// =========================================================

// نمادهای Binance (کریپتو)
const BINANCE_SYMBOLS: Record<string, string> = {
  BTCUSD: 'BTCUSDT',
  ETHUSD: 'ETHUSDT',
  BNBUSD: 'BNBUSDT',
  SOLUSD: 'SOLUSDT',
  XRPUSD: 'XRPUSDT',
  ADAUSD: 'ADAUSDT',
  DOGEUSD: 'DOGEUSDT',
  MATICUSD: 'MATICUSDT',
  AVAXUSD: 'AVAXUSDT',
  DOTUSD: 'DOTUSDT',
  LINKUSD: 'LINKUSDT',
  LTCUSD: 'LTCUSDT',
  ATOMUSD: 'ATOMUSDT',
  NEARUSD: 'NEARUSDT',
  SANDUSD: 'SANDUSDT',
  MANAUSD: 'MANAUSDT',
};

// نمادهای Yahoo (فارکس، فلزات، شاخص)
const YAHOO_SYMBOLS: Record<string, string> = {
  XAUUSD: 'GC=F',
  XAGUSD: 'SI=F',
  XPTUSD: 'PL=F',
  EURUSD: 'EURUSD=X',
  GBPUSD: 'GBPUSD=X',
  USDJPY: 'JPY=X',
  USDCHF: 'CHF=X',
  AUDUSD: 'AUDUSD=X',
  USDCAD: 'CAD=X',
  NZDUSD: 'NZDUSD=X',
  EURJPY: 'EURJPY=X',
  GBPJPY: 'GBPJPY=X',
  EURGBP: 'EURGBP=X',
  SPX: '^GSPC',
  NAS100: '^NDX',
  DJI: '^DJI',
  DAX: '^GDAXI',
  FTSE: '^FTSE',
  NIKKEI: '^N225',
  HK50: '^HSI',
};

export const isCryptoSymbol = (symbol: string): boolean =>
  symbol.toUpperCase() in BINANCE_SYMBOLS;

export const getAllSymbols = (): string[] => [
  ...Object.keys(BINANCE_SYMBOLS),
  ...Object.keys(YAHOO_SYMBOLS),
];

// =========================================================
// BINANCE API (Crypto)
// =========================================================

const BINANCE_INTERVAL_MAP: Record<Timeframe, string> = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '1h': '1h',
  '4h': '4h',
  '1d': '1d',
  '1w': '1w',
};

async function fetchBinanceCandles(
  symbol: string,
  timeframe: Timeframe,
  limit: number
): Promise<Candle[]> {
  const binanceSymbol = BINANCE_SYMBOLS[symbol.toUpperCase()];
  if (!binanceSymbol) return [];

  const interval = BINANCE_INTERVAL_MAP[timeframe];
  const maxLimit = Math.min(limit, 1000);

  const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${maxLimit}`;

  try {
    const res = await fetch(url);

    if (!res.ok) {
      console.log(`[Binance] HTTP ${res.status} for ${symbol}`);
      return [];
    }

    const raw = await res.json();
    if (!Array.isArray(raw)) return [];

    const candles: Candle[] = raw.map((row: any[]) => ({
      timestamp: Number(row[0]),
      open: parseFloat(row[1]),
      high: parseFloat(row[2]),
      low: parseFloat(row[3]),
      close: parseFloat(row[4]),
      volume: parseFloat(row[5]),
    }));

    return candles;
  } catch (error) {
    console.log('[Binance] fetch error:', error);
    return [];
  }
}

// =========================================================
// YAHOO FINANCE API (Forex / Metals / Index)
// =========================================================

const YAHOO_INTERVAL_MAP: Record<Timeframe, string> = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '1h': '60m',
  '4h': '1h', // Yahoo از 4h پشتیبانی نمی‌کنه
  '1d': '1d',
  '1w': '1wk',
};

async function fetchYahooCandles(
  symbol: string,
  timeframe: Timeframe,
  limit: number
): Promise<Candle[]> {
  const yahooSymbol = YAHOO_SYMBOLS[symbol.toUpperCase()] || symbol;
  const interval = YAHOO_INTERVAL_MAP[timeframe];

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
      console.log(`[Yahoo] HTTP ${res.status} for ${symbol}`);
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
    const volumes: (number | null)[] = quote.volume || [];

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
        volume: volumes[i] ?? undefined,
      });
    }

    return candles.slice(-limit);
  } catch (error) {
    console.log('[Yahoo] fetch error:', error);
    return [];
  }
}

// =========================================================
// MAIN: FETCH CANDLES (with caching + auto-routing)
// =========================================================

export async function fetchCandles(
  symbol: string,
  timeframe: Timeframe,
  limit: number = 500,
  useCache: boolean = true
): Promise<Candle[]> {
  if (useCache) {
    const cached = getCached(symbol, timeframe);
    if (cached && cached.length >= limit * 0.9) {
      return cached.slice(-limit);
    }
  }

  const cleanSymbol = symbol.toUpperCase();

  let candles: Candle[] = [];

  // انتخاب موتور مناسب
  if (isCryptoSymbol(cleanSymbol)) {
    candles = await fetchBinanceCandles(cleanSymbol, timeframe, limit);
  } else {
    candles = await fetchYahooCandles(cleanSymbol, timeframe, limit);
  }

  if (candles.length > 0) {
    setCache(cleanSymbol, timeframe, candles);
  }

  return candles.slice(-limit);
}

// =========================================================
// LATEST PRICE
// =========================================================

export async function getLatestPrice(
  symbol: string
): Promise<{ price: number; change: number; changePct: number } | null> {
  const candles = await fetchCandles(symbol, '1d', 2, false);
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

// =========================================================
// MULTIPLE PRICES (for ticker / watchlist)
// =========================================================

export async function getMultiplePrices(
  symbols: string[]
): Promise<
  Record<string, { price: number; changePct: number }>
> {
  const results: Record<string, { price: number; changePct: number }> = {};

  await Promise.all(
    symbols.map(async (sym) => {
      const data = await getLatestPrice(sym);
      if (data) {
        results[sym] = {
          price: data.price,
          changePct: data.changePct,
        };
      }
    })
  );

  return results;
}