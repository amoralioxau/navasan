import { useMemo, useState } from 'react';
import {
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { WebView } from 'react-native-webview';

import { useNavasanTheme } from '@/context/theme-context';

// =========================================================
// DATA
// =========================================================

const SYMBOLS = [
  { id: 'xauusd', label: 'طلا', tv: 'OANDA:XAUUSD' },
  { id: 'xagusd', label: 'نقره', tv: 'OANDA:XAGUSD' },
  { id: 'btcusd', label: 'بیت‌کوین', tv: 'BINANCE:BTCUSDT' },
  { id: 'ethusd', label: 'اتریوم', tv: 'BINANCE:ETHUSDT' },
  { id: 'eurusd', label: 'یورو/دلار', tv: 'OANDA:EURUSD' },
  { id: 'gbpusd', label: 'پوند/دلار', tv: 'OANDA:GBPUSD' },
  { id: 'usdjpy', label: 'دلار/ین', tv: 'OANDA:USDJPY' },
  { id: 'spx', label: 'S&P 500', tv: 'SP:SPX' },
  { id: 'nas100', label: 'نزدک', tv: 'NASDAQ:NDX' },
  { id: 'dji', label: 'داو جونز', tv: 'DJ:DJI' },
];

const TIMEFRAMES = [
  { id: '1', label: '۱د' },
  { id: '5', label: '۵د' },
  { id: '15', label: '۱۵د' },
  { id: '60', label: '۱س' },
  { id: '240', label: '۴س' },
  { id: 'D', label: 'روز' },
  { id: 'W', label: 'هفته' },
];

// =========================================================
// HTML BUILDER
// =========================================================

const buildChartHTML = (
  tvSymbol: string,
  interval: string,
  isDark: boolean
): string => {
  const theme = isDark ? 'dark' : 'light';
  const bg = isDark ? '#050505' : '#F8FAFC';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: ${bg}; overflow: hidden; }
    #tv_chart_container { width: 100%; height: 100%; }
    .loading {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      height: 100%; color: ${isDark ? '#A1A1AA' : '#64748B'};
      font-family: -apple-system, sans-serif; font-size: 14px; gap: 14px;
    }
    .spinner {
      width: 32px; height: 32px;
      border: 3px solid ${isDark ? '#27272A' : '#E2E8F0'};
      border-top-color: #2563EB; border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div id="tv_chart_container">
    <div class="loading">
      <div class="spinner"></div>
      <div>در حال بارگذاری چارت...</div>
    </div>
  </div>

  <script type="text/javascript" src="https://s3.tradingview.com/tv.js"></script>
  <script type="text/javascript">
    function initChart() {
      try {
        document.getElementById('tv_chart_container').innerHTML = '';
        new TradingView.widget({
          container_id: 'tv_chart_container',
          autosize: true,
          symbol: '${tvSymbol}',
          interval: '${interval}',
          timezone: 'Asia/Tehran',
          theme: '${theme}',
          style: '1',
          locale: 'en',
          toolbar_bg: '${bg}',
          enable_publishing: false,
          allow_symbol_change: true,
          hide_side_toolbar: false,
          hide_top_toolbar: false,
          save_image: false,
          withdateranges: true,
          details: false,
          disabled_features: [
            'header_symbol_search',
            'symbol_search_hot_key',
            'use_localstorage_for_settings',
          ],
        });
      } catch (e) {
        document.getElementById('tv_chart_container').innerHTML =
          '<div class="loading">خطا در بارگذاری چارت</div>';
      }
    }
    if (document.readyState === 'complete') initChart();
    else window.addEventListener('load', initChart);
  </script>
</body>
</html>
  `;
};

// =========================================================
// MAIN
// =========================================================

export default function ChartScreen() {
  const { colors, isDark } = useNavasanTheme();

  const [selectedSymbol, setSelectedSymbol] = useState(SYMBOLS[0]);
  const [selectedTimeframe, setSelectedTimeframe] = useState(TIMEFRAMES[3]);

  const html = useMemo(
    () => buildChartHTML(selectedSymbol.tv, selectedTimeframe.id, isDark),
    [selectedSymbol, selectedTimeframe, isDark]
  );

  const webViewKey = `${selectedSymbol.id}-${selectedTimeframe.id}-${isDark ? 'd' : 'l'}`;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* HEADER */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <View style={styles.brandRow}>
            <Text style={[styles.brand, { color: colors.text }]}>NAVASAN</Text>
            <View style={[styles.liveBadge, { backgroundColor: '#16A34A20' }]}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
          <Text style={[styles.subtitle, { color: colors.mutedText }]}>
            چارت زنده TradingView
          </Text>
        </View>
      </View>

      {/* SYMBOL BAR */}
      <View
        style={[
          styles.symbolBar,
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.symbolChips}
        >
          {SYMBOLS.map((s) => {
            const active = s.id === selectedSymbol.id;
            return (
              <TouchableOpacity
                key={s.id}
                onPress={() => setSelectedSymbol(s)}
                style={[
                  styles.symbolChip,
                  {
                    backgroundColor: active ? colors.primary : colors.input,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.symbolChipText,
                    { color: active ? '#FFFFFF' : colors.text },
                  ]}
                >
                  {s.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.timeframeRow}
        >
          {TIMEFRAMES.map((tf) => {
            const active = tf.id === selectedTimeframe.id;
            return (
              <TouchableOpacity
                key={tf.id}
                onPress={() => setSelectedTimeframe(tf)}
                style={[
                  styles.tfBtn,
                  {
                    backgroundColor: active ? colors.primary : colors.input,
                    borderColor: active ? colors.primary : colors.border,
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
        </ScrollView>
      </View>

      {/* CHART */}
      <View style={styles.chartWrap}>
        <WebView
          key={webViewKey}
          originWhitelist={['*']}
          source={{ html }}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          setSupportMultipleWindows={false}
          renderLoading={() => (
            <View
              style={[
                styles.webviewLoading,
                { backgroundColor: colors.background },
              ]}
            >
              <Text style={{ color: colors.mutedText }}>در حال بارگذاری...</Text>
            </View>
          )}
        />
      </View>
    </View>
  );
}

// =========================================================
// STYLES
// =========================================================

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'ios' ? 56 : 50,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerLeft: { flex: 1 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brand: { fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16A34A' },
  liveText: {
    color: '#16A34A',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  subtitle: { fontSize: 11, fontWeight: '600', marginTop: 3 },

  symbolBar: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  symbolChips: { paddingHorizontal: 14, gap: 7 },
  symbolChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  symbolChipText: { fontSize: 11, fontWeight: '800' },

  timeframeRow: { paddingHorizontal: 14, gap: 5 },
  tfBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
    borderWidth: 1,
  },
  tfText: { fontSize: 11, fontWeight: '900' },

  chartWrap: { flex: 1 },
  webview: { flex: 1, backgroundColor: 'transparent' },
  webviewLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});