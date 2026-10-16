import AsyncStorage from '@react-native-async-storage/async-storage';

const LIBRARY_KEY = 'navasan_lw_charts_v4_2_3';
const CDNS = [
  'https://cdn.jsdelivr.net/npm/lightweight-charts@4.2.3/dist/lightweight-charts.standalone.production.js',
  'https://cdnjs.cloudflare.com/ajax/libs/lightweight-charts/4.2.3/lightweight-charts.standalone.production.js',
  'https://unpkg.com/lightweight-charts@4.2.3/dist/lightweight-charts.standalone.production.js',
  'https://cdn.staticfile.org/lightweight-charts/4.2.3/lightweight-charts.standalone.production.js',
];

let memoryCache: string | null = null;

export async function getChartLibrary(): Promise<string> {
  // 1. Memory cache
  if (memoryCache) return memoryCache;

  // 2. AsyncStorage cache
  try {
    const cached = await AsyncStorage.getItem(LIBRARY_KEY);
    if (cached && cached.length > 100000) {
      memoryCache = cached;
      return cached;
    }
  } catch {}

  // 3. Try CDNs one by one
  for (const url of CDNS) {
    try {
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) continue;
      const text = await res.text();
      if (text && text.length > 100000) {
        memoryCache = text;
        AsyncStorage.setItem(LIBRARY_KEY, text).catch(() => {});
        return text;
      }
    } catch {
      continue;
    }
  }

  return '';
}