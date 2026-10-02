import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { BarChart, LineChart } from 'react-native-chart-kit';

import { useNavasanTheme } from '@/context/theme-context';

// =========================================================
// TYPES
// =========================================================

type Trade = {
  id: string;
  date: string;
  pair: string;
  direction: 'buy' | 'sell';
  entryPrice: string;
  exitPrice: string;
  volume: string;
  result: string;
  riskAmount: string;
  stress: number;
  emotion: string;
  sleepHours: string;
  followedPlan: boolean;
  notes: string;
  setup?: string;
  session?: 'asian' | 'london' | 'ny' | 'other';
  rating?: number;
  tags?: string[];
  mae?: string;
  mfe?: string;
};

type TabKey = 'overview' | 'analytics' | 'calendar' | 'insights' | 'trades';

const STORAGE_KEY = 'navasan_trades_v1';
const BALANCE_STORAGE_KEY = 'navasan_account_v1';
const SCREEN_WIDTH = Dimensions.get('window').width;

const BLUE = '#2563EB';
const GREEN = '#16A34A';
const RED = '#DC2626';
const AMBER = '#D97706';
const PURPLE = '#7C3AED';
const CYAN = '#0891B2';
const PINK = '#DB2777';

const EMOTIONS = ['اعتماد', 'ترس', 'طمع', 'خستگی', 'آرامش', 'هیجان', 'کنجکاوی', 'بی‌تفاوتی'];
const POSITIVE = ['اعتماد', 'آرامش', 'کنجکاوی'];
const NEGATIVE = ['ترس', 'طمع', 'خستگی', 'هیجان', 'بی‌تفاوتی'];

const SETUPS = ['Breakout', 'Reversal', 'Trend Follow', 'Range', 'News', 'Pullback', 'SMC', 'Supply/Demand'];
const SESSIONS: Array<{ key: 'asian' | 'london' | 'ny' | 'other'; label: string }> = [
  { key: 'asian', label: 'آسیا' },
  { key: 'london', label: 'لندن' },
  { key: 'ny', label: 'نیویورک' },
  { key: 'other', label: 'سایر' },
];
const DAYS_FA = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];

// =========================================================
// HELPERS
// =========================================================

const num = (v: string | number | undefined): number => {
  if (v === undefined || v === null) return 0;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
};

function outcome(t: Trade): 'win' | 'loss' | 'be' {
  const r = num(t.result);
  return r > 0 ? 'win' : r < 0 ? 'loss' : 'be';
}

function rMultiple(t: Trade): number | null {
  const risk = num(t.riskAmount);
  return risk > 0 ? num(t.result) / risk : null;
}

function psychologyScore(t: Trade) {
  const stress = ((5 - Math.min(Math.max(t.stress, 1), 5)) / 4) * 30;
  const emotion = POSITIVE.includes(t.emotion) ? 25 : NEGATIVE.includes(t.emotion) ? 0 : 12;
  const plan = t.followedPlan ? 25 : 0;
  const sleep = num(t.sleepHours);
  const sleepScore = sleep >= 7 ? 20 : sleep >= 6 ? 15 : sleep >= 5 ? 10 : sleep > 0 ? 5 : 0;
  return Math.round(Math.min(Math.max(stress + emotion + plan + sleepScore, 0), 100));
}

function money(v: number) {
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(2)}`;
}

function getDayKey(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

// =========================================================
// ADVANCED STATS
// =========================================================

type AdvancedStats = {
  trades: number;
  wins: number;
  losses: number;
  be: number;
  total: number;
  winRate: number;
  avgR: number;
  grossWin: number;
  grossLoss: number;
  profitFactor: number;
  expectancy: number;
  avgWin: number;
  avgLoss: number;
  payoffRatio: number;
  sharpe: number;
  sortino: number;
  maxDrawdown: number;
  maxDrawdownValue: number;
  currentDrawdown: number;
  recoveryFactor: number;
  kellyPercent: number;
  largestWin: number;
  largestLoss: number;
  maxWinStreak: number;
  maxLossStreak: number;
  currentStreak: number;
  currentStreakType: 'win' | 'loss' | 'be' | null;
  consistency: number;
  avgPsychology: number;
  planAdherence: number;
  rDistribution: { bucket: string; count: number }[];
};

function computeAdvancedStats(trades: Trade[], initialBalance: number | null): AdvancedStats {
  const empty: AdvancedStats = {
    trades: 0, wins: 0, losses: 0, be: 0, total: 0, winRate: 0, avgR: 0,
    grossWin: 0, grossLoss: 0, profitFactor: 0, expectancy: 0,
    avgWin: 0, avgLoss: 0, payoffRatio: 0, sharpe: 0, sortino: 0,
    maxDrawdown: 0, maxDrawdownValue: 0, currentDrawdown: 0, recoveryFactor: 0,
    kellyPercent: 0, largestWin: 0, largestLoss: 0,
    maxWinStreak: 0, maxLossStreak: 0, currentStreak: 0, currentStreakType: null,
    consistency: 0, avgPsychology: 0, planAdherence: 0, rDistribution: [],
  };

  if (trades.length === 0) return empty;

  const chronological = [...trades].reverse();
  const wins = trades.filter((t) => outcome(t) === 'win');
  const losses = trades.filter((t) => outcome(t) === 'loss');
  const be = trades.filter((t) => outcome(t) === 'be');

  const total = trades.reduce((s, t) => s + num(t.result), 0);
  const grossWin = wins.reduce((s, t) => s + num(t.result), 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + num(t.result), 0));

  const winRate = (wins.length / trades.length) * 100;
  const avgWin = wins.length > 0 ? grossWin / wins.length : 0;
  const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;
  const payoffRatio = avgLoss > 0 ? avgWin / avgLoss : 0;
  const expectancy = (winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss;
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 999 : 0;

  const kellyPercent = payoffRatio > 0
    ? Math.max(0, ((winRate / 100) * payoffRatio - (1 - winRate / 100)) / payoffRatio) * 100
    : 0;

  const returns = trades.map((t) => num(t.result));
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  const sharpe = stdDev > 0 ? avgReturn / stdDev : 0;

  const negReturns = returns.filter((r) => r < 0);
  const downsideVariance = negReturns.length > 0
    ? negReturns.reduce((s, r) => s + Math.pow(r, 2), 0) / negReturns.length
    : 0;
  const downsideStd = Math.sqrt(downsideVariance);
  const sortino = downsideStd > 0 ? avgReturn / downsideStd : 0;

  const startBalance = initialBalance || 10000;
  let balance = startBalance;
  let peak = startBalance;
  let maxDrawdown = 0;
  let maxDrawdownValue = 0;

  chronological.forEach((t) => {
    balance += num(t.result);
    if (balance > peak) peak = balance;
    const dd = peak > 0 ? ((peak - balance) / peak) * 100 : 0;
    if (dd > maxDrawdown) {
      maxDrawdown = dd;
      maxDrawdownValue = peak - balance;
    }
  });

  const currentDrawdown = peak > 0 ? ((peak - balance) / peak) * 100 : 0;
  const recoveryFactor = maxDrawdownValue > 0 ? total / maxDrawdownValue : 0;

  let maxWinStreak = 0, maxLossStreak = 0, currWin = 0, currLoss = 0;
  let currentStreak = 0;
  let currentStreakType: 'win' | 'loss' | 'be' | null = null;

  chronological.forEach((t) => {
    const o = outcome(t);
    if (o === 'win') {
      currWin++; currLoss = 0;
      if (currWin > maxWinStreak) maxWinStreak = currWin;
      currentStreak = currWin;
      currentStreakType = 'win';
    } else if (o === 'loss') {
      currLoss++; currWin = 0;
      if (currLoss > maxLossStreak) maxLossStreak = currLoss;
      currentStreak = currLoss;
      currentStreakType = 'loss';
    } else {
      currWin = 0; currLoss = 0;
      currentStreak = 0;
      currentStreakType = 'be';
    }
  });

  const allResults = trades.map((t) => num(t.result));
  const largestWin = allResults.length > 0 ? Math.max(...allResults, 0) : 0;
  const largestLoss = allResults.length > 0 ? Math.min(...allResults, 0) : 0;

  const dailyPnl: Record<string, number> = {};
  trades.forEach((t) => {
    const key = getDayKey(t.date);
    dailyPnl[key] = (dailyPnl[key] || 0) + num(t.result);
  });
  const dailyValues = Object.values(dailyPnl);
  let consistency = 0;
  if (dailyValues.length > 1) {
    const avgDaily = dailyValues.reduce((a, b) => a + b, 0) / dailyValues.length;
    const dailyVar = dailyValues.reduce((s, v) => s + Math.pow(v - avgDaily, 2), 0) / dailyValues.length;
    const dailyStd = Math.sqrt(dailyVar);
    const maxAbs = Math.max(...dailyValues.map(Math.abs), 1);
    consistency = Math.max(0, 100 - (dailyStd / maxAbs) * 100);
  } else if (dailyValues.length === 1) {
    consistency = 100;
  }

  const avgPsychology = trades.reduce((s, t) => s + psychologyScore(t), 0) / trades.length;
  const planAdherence = (trades.filter((t) => t.followedPlan).length / trades.length) * 100;

  const rValues = trades.map(rMultiple).filter((v): v is number => v !== null);
  const buckets = [
    { bucket: '<-2R', min: -999, max: -2 },
    { bucket: '-2R', min: -2, max: -1 },
    { bucket: '-1R', min: -1, max: -0.5 },
    { bucket: '0R', min: -0.5, max: 0.5 },
    { bucket: '+1R', min: 0.5, max: 1 },
    { bucket: '+2R', min: 1, max: 2 },
    { bucket: '+3R', min: 2, max: 3 },
    { bucket: '>3R', min: 3, max: 999 },
  ];
  const rDistribution = buckets.map((b) => ({
    bucket: b.bucket,
    count: rValues.filter((v) => v >= b.min && v < b.max).length,
  }));

  return {
    trades: trades.length,
    wins: wins.length,
    losses: losses.length,
    be: be.length,
    total,
    winRate,
    avgR: rValues.length > 0 ? rValues.reduce((a, b) => a + b, 0) / rValues.length : 0,
    grossWin,
    grossLoss,
    profitFactor,
    expectancy,
    avgWin,
    avgLoss,
    payoffRatio,
    sharpe,
    sortino,
    maxDrawdown,
    maxDrawdownValue,
    currentDrawdown,
    recoveryFactor,
    kellyPercent,
    largestWin,
    largestLoss,
    maxWinStreak,
    maxLossStreak,
    currentStreak,
    currentStreakType,
    consistency,
    avgPsychology,
    planAdherence,
    rDistribution,
  };
}

// =========================================================
// AI INSIGHTS
// =========================================================

function generateInsights(trades: Trade[], stats: AdvancedStats): string[] {
  if (trades.length < 3) return ['برای شروع بینش‌ها، حداقل ۳ معامله ثبت کن.'];
  const insights: string[] = [];

  const byDay: Record<number, { wins: number; total: number; pnl: number }> = {};
  trades.forEach((t) => {
    const d = new Date(t.date).getDay();
    if (!byDay[d]) byDay[d] = { wins: 0, total: 0, pnl: 0 };
    byDay[d].total++;
    byDay[d].pnl += num(t.result);
    if (outcome(t) === 'win') byDay[d].wins++;
  });
  const dayStats = Object.entries(byDay).filter(([, v]) => v.total >= 2).map(([d, v]) => ({
    day: Number(d), winRate: (v.wins / v.total) * 100, pnl: v.pnl, total: v.total,
  }));
  if (dayStats.length >= 2) {
    const best = dayStats.reduce((a, b) => (a.winRate > b.winRate ? a : b));
    const worst = dayStats.reduce((a, b) => (a.winRate < b.winRate ? a : b));
    if (best.winRate >= 60) insights.push(`📈 بهترین روز: ${DAYS_FA[best.day]} با ${best.winRate.toFixed(0)}٪ برد`);
    if (worst.winRate <= 40 && worst.day !== best.day) insights.push(`⚠️ مراقب ${DAYS_FA[worst.day]} باش — فقط ${worst.winRate.toFixed(0)}٪ برد`);
  }

  const byPair: Record<string, { wins: number; total: number; pnl: number }> = {};
  trades.forEach((t) => {
    if (!byPair[t.pair]) byPair[t.pair] = { wins: 0, total: 0, pnl: 0 };
    byPair[t.pair].total++;
    byPair[t.pair].pnl += num(t.result);
    if (outcome(t) === 'win') byPair[t.pair].wins++;
  });
  const pairStats = Object.entries(byPair).filter(([, v]) => v.total >= 3).map(([p, v]) => ({
    pair: p, winRate: (v.wins / v.total) * 100, pnl: v.pnl, total: v.total,
  }));
  if (pairStats.length >= 1) {
    const best = pairStats.reduce((a, b) => (a.pnl > b.pnl ? a : b));
    if (best.pnl > 0) insights.push(`💎 بهترین نماد: ${best.pair} با سود ${money(best.pnl)}`);
  }
  if (pairStats.length >= 2) {
    const best = pairStats.reduce((a, b) => (a.pnl > b.pnl ? a : b));
    const worst = pairStats.reduce((a, b) => (a.pnl < b.pnl ? a : b));
    if (worst.pnl < 0) insights.push(`🚫 ${worst.pair} عملکرد ضعیفی داره (${money(worst.pnl)})`);
  }

  const byEmotion: Record<string, { wins: number; total: number }> = {};
  trades.forEach((t) => {
    if (!t.emotion) return;
    if (!byEmotion[t.emotion]) byEmotion[t.emotion] = { wins: 0, total: 0 };
    byEmotion[t.emotion].total++;
    if (outcome(t) === 'win') byEmotion[t.emotion].wins++;
  });
  const emoStats = Object.entries(byEmotion).filter(([, v]) => v.total >= 2).map(([e, v]) => ({
    emo: e, winRate: (v.wins / v.total) * 100,
  }));
  if (emoStats.length >= 2) {
    const best = emoStats.reduce((a, b) => (a.winRate > b.winRate ? a : b));
    const worst = emoStats.reduce((a, b) => (a.winRate < b.winRate ? a : b));
    if (best.winRate >= 65) insights.push(`🧠 با احساس «${best.emo}» بهتر معامله می‌کنی (${best.winRate.toFixed(0)}٪)`);
    if (worst.winRate <= 35) insights.push(`⚠️ با احساس «${worst.emo}» عملکردت پایین میاد (${worst.winRate.toFixed(0)}٪)`);
  }

  const bySetup: Record<string, { wins: number; total: number; pnl: number }> = {};
  trades.forEach((t) => {
    if (!t.setup) return;
    if (!bySetup[t.setup]) bySetup[t.setup] = { wins: 0, total: 0, pnl: 0 };
    bySetup[t.setup].total++;
    bySetup[t.setup].pnl += num(t.result);
    if (outcome(t) === 'win') bySetup[t.setup].wins++;
  });
  const setupStats = Object.entries(bySetup).filter(([, v]) => v.total >= 3).map(([s, v]) => ({
    setup: s, winRate: (v.wins / v.total) * 100, pnl: v.pnl,
  }));
  if (setupStats.length >= 2) {
    const best = setupStats.reduce((a, b) => (a.pnl > b.pnl ? a : b));
    const worst = setupStats.reduce((a, b) => (a.pnl < b.pnl ? a : b));
    if (best.pnl > 0) insights.push(`🎯 بهترین Setup: ${best.setup} با سود ${money(best.pnl)}`);
    if (worst.pnl < 0 && worst.setup !== best.setup) insights.push(`❌ Setup «${worst.setup}» ضررده — بازبینی کن`);
  }

  const bySession: Record<string, { wins: number; total: number; pnl: number }> = {};
  trades.forEach((t) => {
    if (!t.session) return;
    if (!bySession[t.session]) bySession[t.session] = { wins: 0, total: 0, pnl: 0 };
    bySession[t.session].total++;
    bySession[t.session].pnl += num(t.result);
    if (outcome(t) === 'win') bySession[t.session].wins++;
  });
  const sessionStats = Object.entries(bySession).filter(([, v]) => v.total >= 3).map(([s, v]) => ({
    session: s, winRate: (v.wins / v.total) * 100, pnl: v.pnl, total: v.total,
  }));
  if (sessionStats.length >= 2) {
    const best = sessionStats.reduce((a, b) => (a.winRate > b.winRate ? a : b));
    const sName = SESSIONS.find((x) => x.key === best.session)?.label || best.session;
    if (best.winRate >= 60) insights.push(`🌍 بهترین سشن: ${sName} (${best.winRate.toFixed(0)}٪ برد)`);
  }

  const goodSleep = trades.filter((t) => num(t.sleepHours) >= 7);
  const badSleep = trades.filter((t) => num(t.sleepHours) > 0 && num(t.sleepHours) < 6);
  if (goodSleep.length >= 3 && badSleep.length >= 3) {
    const goodWR = (goodSleep.filter((t) => outcome(t) === 'win').length / goodSleep.length) * 100;
    const badWR = (badSleep.filter((t) => outcome(t) === 'win').length / badSleep.length) * 100;
    if (goodWR - badWR > 15) insights.push(`😴 با ۷+ ساعت خواب، وین‌ریت ${(goodWR - badWR).toFixed(0)}٪ بهتره`);
  }

  const tradesPerDay: Record<string, number> = {};
  trades.forEach((t) => { const k = getDayKey(t.date); tradesPerDay[k] = (tradesPerDay[k] || 0) + 1; });
  const manyDays = Object.values(tradesPerDay).filter((c) => c >= 5).length;
  if (manyDays >= 2) insights.push(`⚠️ ${manyDays} روز بیش از ۵ معامله — احتمال overtrading`);

  let revenge = 0;
  const sorted = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  for (let i = 1; i < sorted.length; i++) {
    if (outcome(sorted[i - 1]) === 'loss') {
      const diff = new Date(sorted[i].date).getTime() - new Date(sorted[i - 1].date).getTime();
      if (diff < 30 * 60 * 1000) revenge++;
    }
  }
  if (revenge >= 3) insights.push(`🔥 ${revenge} معامله بلافاصله بعد از ضرر — احتمال revenge trading`);

  if (stats.planAdherence >= 80) insights.push(`🎯 پایبندی به پلن: ${stats.planAdherence.toFixed(0)}٪ — عالی!`);
  else if (stats.planAdherence < 50 && trades.length >= 10) insights.push(`⚠️ پایبندی به پلن فقط ${stats.planAdherence.toFixed(0)}٪ — روی نظم کار کن`);

  if (stats.kellyPercent > 0 && stats.trades >= 10) {
    insights.push(`📊 Kelly Criterion: بهینه ${stats.kellyPercent.toFixed(1)}٪ از سرمایه در هر معامله`);
  }

  if (stats.expectancy > 0 && stats.trades >= 10) {
    insights.push(`✅ امید ریاضی مثبت (${stats.expectancy.toFixed(2)}$ به ازای هر معامله)`);
  } else if (stats.expectancy < 0 && stats.trades >= 10) {
    insights.push(`⚠️ امید ریاضی منفی — استراتژی نیاز به بازبینی داره`);
  }

  return insights.slice(0, 8);
}

// =========================================================
// UI COMPONENTS
// =========================================================

function Section({ title, icon, children, theme, open = true, onPress, badge }: any) {
  return (
    <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <View style={[styles.sectionIcon, { backgroundColor: theme.softBlue }]}>
            <Ionicons name={icon} size={18} color={BLUE} />
          </View>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
          {badge ? (
            <View style={[styles.badge, { backgroundColor: BLUE }]}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ) : null}
        </View>
        {onPress && <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={19} color={theme.muted} />}
      </TouchableOpacity>
      {open && children}
    </View>
  );
}

function MetricCard({ title, value, sub, icon, color, theme }: any) {
  return (
    <View style={[styles.metricCard, { backgroundColor: theme.input, borderColor: theme.border }]}>
      <View style={[styles.metricIconRow, { backgroundColor: `${color}22` }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={[styles.metricLabel, { color: theme.muted }]}>{title}</Text>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      {sub ? <Text style={[styles.metricSub, { color: theme.muted }]}>{sub}</Text> : null}
    </View>
  );
}

// =========================================================
// MAIN
// =========================================================

export default function JournalScreen() {
  const { colors, isDark } = useNavasanTheme();

  const theme = useMemo(() => ({
    bg: colors.background,
    card: colors.card,
    border: colors.border,
    text: colors.text,
    muted: colors.mutedText,
    input: colors.input,
    softBlue: colors.primarySoft,
    softGreen: `${colors.success}15`,
    softRed: `${colors.danger}15`,
    softAmber: '#F59E0B15',
  }), [colors]);

  const dark = isDark;

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [step, setStep] = useState(1);
  const [filter, setFilter] = useState<'all' | 'win' | 'loss' | 'be'>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Trade | null>(null);
  const [initialBalance, setInitialBalance] = useState<number | null>(null);
  const [balanceInput, setBalanceInput] = useState('');
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const params = useLocalSearchParams<{ openTrade?: string; openBalance?: string }>();

  const [pair, setPair] = useState('');
  const [direction, setDirection] = useState<'buy' | 'sell'>('buy');
  const [entryPrice, setEntryPrice] = useState('');
  const [exitPrice, setExitPrice] = useState('');
  const [volume, setVolume] = useState('');
  const [riskAmount, setRiskAmount] = useState('');
  const [result, setResult] = useState('');
  const [stress, setStress] = useState(3);
  const [emotion, setEmotion] = useState('');
  const [sleepHours, setSleepHours] = useState('');
  const [followedPlan, setFollowedPlan] = useState<boolean | null>(null);
  const [notes, setNotes] = useState('');
  const [setup, setSetup] = useState('');
  const [session, setSession] = useState<Trade['session']>();
  const [rating, setRating] = useState<number>(0);
  const [mae, setMae] = useState('');
  const [mfe, setMfe] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) setTrades(JSON.parse(saved));
        const accountSaved = await AsyncStorage.getItem(BALANCE_STORAGE_KEY);
        if (accountSaved) {
          const account = JSON.parse(accountSaved);
          if (typeof account?.initialBalance === 'number' && Number.isFinite(account.initialBalance)) {
            setInitialBalance(account.initialBalance);
          }
        }
      } catch (e) {
        console.log('خطا در بارگذاری ژورنال', e);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (params.openTrade === '1') { setShowForm(true); setStep(1); }
  }, [params.openTrade]);

  useEffect(() => {
    if (loaded && params.openBalance === '1') {
      setBalanceInput(initialBalance?.toString() || '');
      setShowBalanceModal(true);
    }
  }, [loaded, params.openBalance]);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trades)).catch((e) => console.log('خطا', e));
  }, [trades, loaded]);

  const refreshJournal = async () => {
    setRefreshing(true);
    try {
      const [saved, accountSaved] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(BALANCE_STORAGE_KEY),
      ]);
      if (saved) { const p = JSON.parse(saved); setTrades(Array.isArray(p) ? p : []); }
      if (accountSaved) {
        const a = JSON.parse(accountSaved);
        setInitialBalance(typeof a?.initialBalance === 'number' ? a.initialBalance : null);
      }
    } catch {} finally { setRefreshing(false); }
  };

  const resetForm = () => {
    setPair(''); setDirection('buy'); setEntryPrice(''); setExitPrice(''); setVolume(''); setRiskAmount('');
    setResult(''); setStress(3); setEmotion(''); setSleepHours(''); setFollowedPlan(null); setNotes('');
    setSetup(''); setSession(undefined); setRating(0); setMae(''); setMfe(''); setStep(1);
  };

  const saveTrade = () => {
    if (!pair.trim() || !entryPrice || !exitPrice || !volume || result === '' || !emotion || followedPlan === null) {
      Alert.alert('اطلاعات ناقص', 'فیلدهای اصلی را کامل کن.');
      return;
    }
    const trade: Trade = {
      id: editingId || Date.now().toString(),
      date: editingId ? (trades.find((t) => t.id === editingId)?.date || new Date().toISOString()) : new Date().toISOString(),
      pair: pair.trim().toUpperCase(), direction,
      entryPrice: entryPrice.trim(), exitPrice: exitPrice.trim(), volume: volume.trim(), riskAmount: riskAmount.trim(),
      result: result.trim(), stress, emotion, sleepHours: sleepHours.trim() || '0', followedPlan, notes: notes.trim(),
      setup: setup || undefined,
      session,
      rating: rating > 0 ? rating : undefined,
      mae: mae.trim() || undefined,
      mfe: mfe.trim() || undefined,
    };
    setTrades((prev) => editingId ? prev.map((t) => t.id === editingId ? trade : t) : [trade, ...prev]);
    setEditingId(null); setShowForm(false); resetForm();
  };

  const startEdit = (trade: Trade) => {
    setEditingId(trade.id);
    setPair(trade.pair); setDirection(trade.direction); setEntryPrice(trade.entryPrice); setExitPrice(trade.exitPrice);
    setVolume(trade.volume); setRiskAmount(trade.riskAmount); setResult(trade.result); setStress(trade.stress);
    setEmotion(trade.emotion); setSleepHours(trade.sleepHours); setFollowedPlan(trade.followedPlan); setNotes(trade.notes);
    setSetup(trade.setup || ''); setSession(trade.session); setRating(trade.rating || 0);
    setMae(trade.mae || ''); setMfe(trade.mfe || '');
    setSelected(null); setStep(1); setShowForm(true);
  };

  const saveInitialBalance = async () => {
    const value = num(balanceInput);
    if (value <= 0) { Alert.alert('خطا', 'باید بیشتر از صفر باشد.'); return; }
    try {
      await AsyncStorage.setItem(BALANCE_STORAGE_KEY, JSON.stringify({ initialBalance: value }));
      setInitialBalance(value); setBalanceInput(''); setShowBalanceModal(false);
    } catch { Alert.alert('خطا', 'ذخیره انجام نشد.'); }
  };

  const stats = useMemo(() => computeAdvancedStats(trades, initialBalance), [trades, initialBalance]);
  const insights = useMemo(() => generateInsights(trades, stats), [trades, stats]);

  const accountBalance = useMemo(() => (initialBalance ?? 0) + stats.total, [initialBalance, stats.total]);

  const accountChangePercent = useMemo(() => {
    if (!initialBalance || initialBalance <= 0) return null;
    return ((accountBalance - initialBalance) / initialBalance) * 100;
  }, [accountBalance, initialBalance]);

  const tiltWarning = useMemo(() => {
    if (trades.length < 5) return false;
    const sorted = [...trades].slice(0, 5);
    const losses = sorted.filter((t) => outcome(t) === 'loss').length;
    return losses >= 3;
  }, [trades]);

  const equity = useMemo(() => {
    let running = 0;
    return [...trades].reverse().map((t) => { running += num(t.result); return Number(running.toFixed(2)); }).slice(-20);
  }, [trades]);

  const monthly = useMemo(() => {
    const map: Record<string, number> = {};
    [...trades].reverse().forEach((t) => {
      const d = new Date(t.date);
      const key = `${d.getMonth() + 1}/${String(d.getFullYear()).slice(2)}`;
      map[key] = (map[key] || 0) + num(t.result);
    });
    return Object.entries(map).slice(-6);
  }, [trades]);

  const pairPerformance = useMemo(() => {
    const map: Record<string, { wins: number; losses: number; total: number; pnl: number }> = {};
    trades.forEach((t) => {
      if (!map[t.pair]) map[t.pair] = { wins: 0, losses: 0, total: 0, pnl: 0 };
      map[t.pair].total++; map[t.pair].pnl += num(t.result);
      const o = outcome(t);
      if (o === 'win') map[t.pair].wins++; else if (o === 'loss') map[t.pair].losses++;
    });
    return Object.entries(map).map(([pair, v]) => ({ pair, ...v, winRate: v.total > 0 ? (v.wins / v.total) * 100 : 0 })).sort((a, b) => b.pnl - a.pnl);
  }, [trades]);

  const setupPerformance = useMemo(() => {
    const map: Record<string, { wins: number; total: number; pnl: number }> = {};
    trades.forEach((t) => {
      if (!t.setup) return;
      if (!map[t.setup]) map[t.setup] = { wins: 0, total: 0, pnl: 0 };
      map[t.setup].total++; map[t.setup].pnl += num(t.result);
      if (outcome(t) === 'win') map[t.setup].wins++;
    });
    return Object.entries(map).map(([setup, v]) => ({ setup, ...v, winRate: v.total > 0 ? (v.wins / v.total) * 100 : 0 })).sort((a, b) => b.pnl - a.pnl);
  }, [trades]);

  const sessionPerformance = useMemo(() => {
    const map: Record<string, { wins: number; total: number; pnl: number }> = {};
    trades.forEach((t) => {
      if (!t.session) return;
      if (!map[t.session]) map[t.session] = { wins: 0, total: 0, pnl: 0 };
      map[t.session].total++; map[t.session].pnl += num(t.result);
      if (outcome(t) === 'win') map[t.session].wins++;
    });
    return SESSIONS.map((s) => {
      const v = map[s.key] || { wins: 0, total: 0, pnl: 0 };
      return { session: s.key, label: s.label, ...v, winRate: v.total > 0 ? (v.wins / v.total) * 100 : 0 };
    }).filter((s) => s.total > 0);
  }, [trades]);

  const dayPerformance = useMemo(() => {
    const map: Record<number, { wins: number; total: number; pnl: number }> = {};
    trades.forEach((t) => {
      const d = new Date(t.date).getDay();
      if (!map[d]) map[d] = { wins: 0, total: 0, pnl: 0 };
      map[d].total++; map[d].pnl += num(t.result);
      if (outcome(t) === 'win') map[d].wins++;
    });
    return DAYS_FA.map((name, idx) => {
      const v = map[idx] || { wins: 0, total: 0, pnl: 0 };
      return { name, idx, ...v, winRate: v.total > 0 ? (v.wins / v.total) * 100 : 0 };
    });
  }, [trades]);

  const emotionPerformance = useMemo(() => {
    const map: Record<string, { wins: number; total: number; pnl: number }> = {};
    trades.forEach((t) => {
      if (!t.emotion) return;
      if (!map[t.emotion]) map[t.emotion] = { wins: 0, total: 0, pnl: 0 };
      map[t.emotion].total++; map[t.emotion].pnl += num(t.result);
      if (outcome(t) === 'win') map[t.emotion].wins++;
    });
    return Object.entries(map).map(([emo, v]) => ({ emo, ...v, winRate: v.total > 0 ? (v.wins / v.total) * 100 : 0 })).sort((a, b) => b.winRate - a.winRate);
  }, [trades]);

  const ratingPerformance = useMemo(() => {
    const map: Record<number, { count: number; pnl: number; wins: number }> = {};
    trades.forEach((t) => {
      if (!t.rating) return;
      if (!map[t.rating]) map[t.rating] = { count: 0, pnl: 0, wins: 0 };
      map[t.rating].count++; map[t.rating].pnl += num(t.result);
      if (outcome(t) === 'win') map[t.rating].wins++;
    });
    return [1, 2, 3, 4, 5].map((r) => {
      const v = map[r] || { count: 0, pnl: 0, wins: 0 };
      return { rating: r, ...v, winRate: v.count > 0 ? (v.wins / v.count) * 100 : 0 };
    });
  }, [trades]);

  const filteredTrades = useMemo(() => {
    const q = query.trim().toLowerCase();
    return trades.filter((t) => {
      const matchesFilter = filter === 'all' || outcome(t) === filter;
      const matchesQuery = !q || t.pair.toLowerCase().includes(q) || t.emotion.toLowerCase().includes(q) || t.notes.toLowerCase().includes(q) || (t.setup || '').toLowerCase().includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [trades, filter, query]);

  const calendarData = useMemo(() => {
    const map: Record<string, { pnl: number; count: number }> = {};
    trades.forEach((t) => {
      const key = getDayKey(t.date);
      if (!map[key]) map[key] = { pnl: 0, count: 0 };
      map[key].pnl += num(t.result); map[key].count++;
    });
    return map;
  }, [trades]);

  const bestTrade = useMemo(() => {
    if (trades.length === 0) return null;
    return trades.reduce((a, b) => num(a.result) > num(b.result) ? a : b);
  }, [trades]);

  const worstTrade = useMemo(() => {
    if (trades.length === 0) return null;
    return trades.reduce((a, b) => num(a.result) < num(b.result) ? a : b);
  }, [trades]);

  const renderCalendar = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthName = calendarMonth.toLocaleDateString('fa-IR', { month: 'long', year: 'numeric' });
    const cells: (number | null)[] = [];
    const startOffset = (firstDay + 1) % 7;
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    const dayHeaders = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

    return (
      <View>
        <View style={styles.calendarNav}>
          <TouchableOpacity onPress={() => setCalendarMonth(new Date(year, month - 1, 1))} style={[styles.calNavBtn, { backgroundColor: theme.input }]}>
            <Ionicons name="chevron-back" size={18} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.calendarMonthText, { color: theme.text }]}>{monthName}</Text>
          <TouchableOpacity onPress={() => setCalendarMonth(new Date(year, month + 1, 1))} style={[styles.calNavBtn, { backgroundColor: theme.input }]}>
            <Ionicons name="chevron-forward" size={18} color={theme.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.calendarGrid}>
          {dayHeaders.map((d, i) => (
            <View key={`h-${i}`} style={styles.calendarHeaderCell}>
              <Text style={[styles.calendarHeaderText, { color: theme.muted }]}>{d}</Text>
            </View>
          ))}
          {cells.map((day, i) => {
            if (day === null) return <View key={`e-${i}`} style={styles.calendarCell} />;
            const key = `${year}-${month}-${day}`;
            const data = calendarData[key];
            const today = new Date();
            const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
            let bg = theme.input; let textColor = theme.text;
            if (data) {
              if (data.pnl > 0) { const inten = Math.min(data.pnl / 200, 1); bg = `rgba(22, 163, 74, ${0.2 + inten * 0.6})`; textColor = '#FFFFFF'; }
              else if (data.pnl < 0) { const inten = Math.min(Math.abs(data.pnl) / 200, 1); bg = `rgba(220, 38, 38, ${0.2 + inten * 0.6})`; textColor = '#FFFFFF'; }
              else { bg = theme.muted + '40'; }
            }
            return (
              <View key={`d-${day}`} style={[styles.calendarCell, { backgroundColor: bg, borderColor: isToday ? BLUE : 'transparent', borderWidth: isToday ? 2 : 0 }]}>
                <Text style={[styles.calendarDayText, { color: textColor }]}>{day}</Text>
                {data && (<Text style={[styles.calendarPnlText, { color: textColor }]}>{data.pnl >= 0 ? '+' : ''}{data.pnl.toFixed(0)}</Text>)}
              </View>
            );
          })}
        </View>

        <View style={styles.calendarLegend}>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: 'rgba(22, 163, 74, 0.8)' }]} /><Text style={[styles.legendText, { color: theme.muted }]}>سود</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: 'rgba(220, 38, 38, 0.8)' }]} /><Text style={[styles.legendText, { color: theme.muted }]}>ضرر</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: theme.input }]} /><Text style={[styles.legendText, { color: theme.muted }]}>بدون معامله</Text></View>
        </View>
      </View>
    );
  };

  const renderTab = (key: TabKey, label: string, icon: keyof typeof Ionicons.glyphMap) => {
    const active = activeTab === key;
    return (
      <TouchableOpacity
        key={key}
        onPress={() => setActiveTab(key)}
        style={[styles.tab, { backgroundColor: active ? BLUE : theme.card, borderColor: active ? BLUE : theme.border }]}
      >
        <Ionicons name={icon} size={15} color={active ? '#FFFFFF' : theme.muted} />
        <Text style={[styles.tabText, { color: active ? '#FFFFFF' : theme.muted }]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  if (!loaded) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.bg }]}>
        <Text style={{ color: theme.muted }}>در حال بارگذاری ژورنال...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshJournal} tintColor={BLUE} />}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.brand, { color: theme.text }]}>NAVASAN</Text>
            <Text style={[styles.subtitle, { color: theme.muted }]}>ژورنال حرفه‌ای معامله‌گر</Text>
          </View>

          <TouchableOpacity
            onPress={() => { setEditingId(null); resetForm(); setStep(1); setShowForm(true); }}
            style={[styles.headerAddBtn, { backgroundColor: BLUE }]}
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* TILT WARNING */}
        {tiltWarning && (
          <View style={[styles.tiltWarning, { backgroundColor: `${RED}15`, borderColor: RED }]}>
            <Ionicons name="warning" size={20} color={RED} />
            <Text style={[styles.tiltText, { color: RED }]}>
              ⚠️ هشدار Tilt: ۳ باخت از ۵ معامله اخیر. قبل از معامله بعدی استراحت کن.
            </Text>
          </View>
        )}

        {/* HERO */}
        <View style={[styles.hero, { backgroundColor: BLUE }]}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroLabel}>سود / زیان کل</Text>
              <Text style={styles.heroValue}>{money(stats.total)}</Text>
            </View>
            <View style={styles.heroIcon}><Ionicons name="trending-up" size={24} color="#fff" /></View>
          </View>
          <View style={styles.heroStats}>
            <View>
              <Text style={styles.heroMiniLabel}>موجودی</Text>
              <Text style={styles.heroMini}>{initialBalance !== null ? `$${accountBalance.toFixed(0)}` : '—'}</Text>
            </View>
            <View>
              <Text style={styles.heroMiniLabel}>Win Rate</Text>
              <Text style={styles.heroMini}>{stats.winRate.toFixed(0)}%</Text>
            </View>
            <View>
              <Text style={styles.heroMiniLabel}>PF</Text>
              <Text style={styles.heroMini}>{stats.profitFactor ? stats.profitFactor.toFixed(2) : '—'}</Text>
            </View>
            <View>
              <Text style={styles.heroMiniLabel}>Expectancy</Text>
              <Text style={styles.heroMini}>{stats.expectancy ? `$${stats.expectancy.toFixed(1)}` : '—'}</Text>
            </View>
          </View>
        </View>

        {/* BALANCE */}
        <TouchableOpacity
          onPress={() => { setBalanceInput(initialBalance?.toString() || ''); setShowBalanceModal(true); }}
          activeOpacity={0.85}
          style={[styles.balanceSetup, { backgroundColor: theme.card, borderColor: theme.border }]}
        >
          <View style={[styles.balanceIcon, { backgroundColor: theme.softBlue }]}><Ionicons name="wallet-outline" size={21} color={BLUE} /></View>
          <View style={styles.balanceSetupText}>
            <Text style={[styles.balanceSetupTitle, { color: theme.text }]}>سرمایه اولیه حساب</Text>
            <Text style={[styles.balanceSetupSub, { color: theme.muted }]}>
              {initialBalance !== null ? `شروع: ${initialBalance.toFixed(0)}$ • فعلی: ${accountBalance.toFixed(0)}$ • رشد: ${accountChangePercent === null ? '—' : `${accountChangePercent >= 0 ? '+' : ''}${accountChangePercent.toFixed(2)}%`}` : 'برای محاسبه رشد، سرمایه اولیه را ثبت کن.'}
            </Text>
          </View>
          <Ionicons name="create-outline" size={20} color={BLUE} />
        </TouchableOpacity>

        {/* TABS */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsWrap}>
          {renderTab('overview', 'نمای کلی', 'grid-outline')}
          {renderTab('analytics', 'تحلیل', 'analytics-outline')}
          {renderTab('calendar', 'تقویم', 'calendar-outline')}
          {renderTab('insights', 'بینش', 'sparkles-outline')}
          {renderTab('trades', 'معاملات', 'list-outline')}
        </ScrollView>

        {/* TAB: OVERVIEW */}
        {activeTab === 'overview' && (
          <>
            <View style={styles.statGrid}>
              <MetricCard title="برد" value={stats.wins} icon="checkmark-circle" color={GREEN} theme={theme} />
              <MetricCard title="باخت" value={stats.losses} icon="close-circle" color={RED} theme={theme} />
              <MetricCard title="میانگین R" value={stats.avgR ? `${stats.avgR.toFixed(2)}R` : '—'} icon="speedometer" color={BLUE} theme={theme} />
              <MetricCard title="Consistency" value={`${stats.consistency.toFixed(0)}%`} icon="pulse" color={PURPLE} theme={theme} />
            </View>

            {(bestTrade || worstTrade) && (
              <View style={styles.bwRow}>
                {bestTrade && (
                  <View style={[styles.bwCard, { backgroundColor: theme.softGreen, borderColor: GREEN }]}>
                    <Ionicons name="trophy" size={18} color={GREEN} />
                    <Text style={[styles.bwLabel, { color: theme.muted }]}>بهترین معامله</Text>
                    <Text style={[styles.bwPair, { color: theme.text }]}>{bestTrade.pair}</Text>
                    <Text style={[styles.bwValue, { color: GREEN }]}>{money(num(bestTrade.result))}</Text>
                  </View>
                )}
                {worstTrade && (
                  <View style={[styles.bwCard, { backgroundColor: theme.softRed, borderColor: RED }]}>
                    <Ionicons name="sad-outline" size={18} color={RED} />
                    <Text style={[styles.bwLabel, { color: theme.muted }]}>بدترین معامله</Text>
                    <Text style={[styles.bwPair, { color: theme.text }]}>{worstTrade.pair}</Text>
                    <Text style={[styles.bwValue, { color: RED }]}>{money(num(worstTrade.result))}</Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.metricGrid}>
              <MetricCard title="Profit Factor" value={stats.profitFactor ? stats.profitFactor.toFixed(2) : '—'} icon="analytics" color={PURPLE} theme={theme} />
              <MetricCard title="Sharpe" value={stats.sharpe.toFixed(2)} icon="stats-chart" color={CYAN} theme={theme} />
              <MetricCard title="Sortino" value={stats.sortino.toFixed(2)} icon="shield-checkmark" color={BLUE} theme={theme} />
              <MetricCard title="Recovery Factor" value={stats.recoveryFactor ? stats.recoveryFactor.toFixed(2) : '—'} icon="refresh-circle" color={GREEN} theme={theme} />
              <MetricCard title="Payoff Ratio" value={stats.payoffRatio.toFixed(2)} icon="git-compare" color={AMBER} theme={theme} />
              <MetricCard title="Kelly %" value={stats.kellyPercent > 0 ? `${stats.kellyPercent.toFixed(1)}%` : '—'} icon="cash" color={PINK} theme={theme} />
            </View>

            <View style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.summaryTitle, { color: theme.text }]}>خلاصه عملکرد</Text>
              <View style={styles.summaryRow}>
                <View style={styles.summaryCol}>
                  <Text style={[styles.summaryLabel, { color: theme.muted }]}>میانگین برد</Text>
                  <Text style={[styles.summaryValue, { color: GREEN }]}>+${stats.avgWin.toFixed(2)}</Text>
                </View>
                <View style={styles.summaryCol}>
                  <Text style={[styles.summaryLabel, { color: theme.muted }]}>میانگین باخت</Text>
                  <Text style={[styles.summaryValue, { color: RED }]}>-${stats.avgLoss.toFixed(2)}</Text>
                </View>
              </View>
              <View style={styles.summaryRow}>
                <View style={styles.summaryCol}>
                  <Text style={[styles.summaryLabel, { color: theme.muted }]}>بزرگ‌ترین برد</Text>
                  <Text style={[styles.summaryValue, { color: GREEN }]}>+${stats.largestWin.toFixed(2)}</Text>
                </View>
                <View style={styles.summaryCol}>
                  <Text style={[styles.summaryLabel, { color: theme.muted }]}>بزرگ‌ترین باخت</Text>
                  <Text style={[styles.summaryValue, { color: RED }]}>${stats.largestLoss.toFixed(2)}</Text>
                </View>
              </View>
              <View style={styles.summaryRow}>
                <View style={styles.summaryCol}>
                  <Text style={[styles.summaryLabel, { color: theme.muted }]}>بهترین زنجیره برد</Text>
                  <Text style={[styles.summaryValue, { color: GREEN }]}>{stats.maxWinStreak}</Text>
                </View>
                <View style={styles.summaryCol}>
                  <Text style={[styles.summaryLabel, { color: theme.muted }]}>بدترین زنجیره باخت</Text>
                  <Text style={[styles.summaryValue, { color: RED }]}>{stats.maxLossStreak}</Text>
                </View>
              </View>
              <View style={styles.summaryRow}>
                <View style={styles.summaryCol}>
                  <Text style={[styles.summaryLabel, { color: theme.muted }]}>حداکثر افت سرمایه</Text>
                  <Text style={[styles.summaryValue, { color: RED }]}>{stats.maxDrawdown.toFixed(1)}%</Text>
                </View>
                <View style={styles.summaryCol}>
                  <Text style={[styles.summaryLabel, { color: theme.muted }]}>افت فعلی</Text>
                  <Text style={[styles.summaryValue, { color: stats.currentDrawdown > 0 ? RED : GREEN }]}>{stats.currentDrawdown.toFixed(1)}%</Text>
                </View>
              </View>
            </View>

            {trades.length >= 2 && (
              <>
                <Text style={[styles.chartTitle, { color: theme.text }]}>منحنی رشد سرمایه</Text>
                <LineChart
                  data={{ labels: equity.map((_, i) => `${i + 1}`), datasets: [{ data: equity.length ? equity : [0] }] }}
                  width={SCREEN_WIDTH - 56}
                  height={210}
                  chartConfig={{
                    backgroundGradientFrom: theme.card,
                    backgroundGradientTo: theme.card,
                    color: (o = 1) => `rgba(37,99,235,${o})`,
                    labelColor: (o = 1) => (dark ? `rgba(148,163,184,${o})` : `rgba(100,116,139,${o})`),
                    decimalPlaces: 0,
                    propsForDots: { r: '3', strokeWidth: '2', stroke: BLUE },
                  }}
                  bezier
                  style={styles.chart}
                />
              </>
            )}
          </>
        )}

        {/* TAB: ANALYTICS */}
        {activeTab === 'analytics' && (
          <>
            {trades.length >= 3 && (
              <Section title="توزیع R-Multiple" icon="bar-chart-outline" theme={theme}>
                <View style={styles.rDistWrap}>
                  {stats.rDistribution.map((b) => {
                    const maxCount = Math.max(...stats.rDistribution.map((x) => x.count), 1);
                    const heightPercent = (b.count / maxCount) * 100;
                    const isNegative = b.bucket.startsWith('-') || b.bucket === '<-2R';
                    return (
                      <View key={b.bucket} style={styles.rBarWrap}>
                        <Text style={[styles.rCount, { color: theme.muted }]}>{b.count}</Text>
                        <View style={[styles.rBarTrack, { backgroundColor: theme.input }]}>
                          <View
                            style={[
                              styles.rBar,
                              { height: `${heightPercent}%`, backgroundColor: isNegative ? RED : GREEN },
                            ]}
                          />
                        </View>
                        <Text style={[styles.rLabel, { color: theme.muted }]}>{b.bucket}</Text>
                      </View>
                    );
                  })}
                </View>
              </Section>
            )}

            {setupPerformance.length > 0 && (
              <Section title="عملکرد Setup" icon="hammer-outline" theme={theme}>
                {setupPerformance.map((s, i) => (
                  <View key={s.setup} style={[styles.perfRow, { borderBottomColor: i === setupPerformance.length - 1 ? 'transparent' : theme.border }]}>
                    <View style={styles.perfLeft}>
                      <View style={[styles.perfRank, { backgroundColor: theme.softBlue }]}>
                        <Text style={[styles.perfRankText, { color: BLUE }]}>{i + 1}</Text>
                      </View>
                      <View>
                        <Text style={[styles.perfTitle, { color: theme.text }]}>{s.setup}</Text>
                        <Text style={[styles.perfMeta, { color: theme.muted }]}>{s.total} معامله • {s.wins}W</Text>
                      </View>
                    </View>
                    <View style={styles.perfRight}>
                      <Text style={[styles.perfPnl, { color: s.pnl >= 0 ? GREEN : RED }]}>
                        {s.pnl >= 0 ? '+' : ''}${s.pnl.toFixed(2)}
                      </Text>
                      <View style={[styles.perfWinRate, { backgroundColor: s.winRate >= 50 ? theme.softGreen : theme.softRed }]}>
                        <Text style={[styles.perfWinRateText, { color: s.winRate >= 50 ? GREEN : RED }]}>{s.winRate.toFixed(0)}%</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </Section>
            )}

            {sessionPerformance.length > 0 && (
              <Section title="عملکرد سشن" icon="globe-outline" theme={theme}>
                {sessionPerformance.map((s) => (
                  <View key={s.session} style={styles.dayRow}>
                    <Text style={[styles.dayName, { color: theme.text }]}>{s.label}</Text>
                    <View style={[styles.dayBarWrap, { backgroundColor: theme.input }]}>
                      <View style={[styles.dayBar, { width: `${Math.min(s.winRate, 100)}%`, backgroundColor: s.winRate >= 50 ? GREEN : RED }]} />
                    </View>
                    <Text style={[styles.dayWinRate, { color: theme.muted }]}>{s.winRate.toFixed(0)}%</Text>
                    <Text style={[styles.dayTotal, { color: theme.muted }]}>({s.total})</Text>
                  </View>
                ))}
              </Section>
            )}

            {pairPerformance.length > 0 && (
              <Section title="عملکرد نماد" icon="podium-outline" theme={theme}>
                {pairPerformance.map((p, i) => (
                  <View key={p.pair} style={[styles.perfRow, { borderBottomColor: i === pairPerformance.length - 1 ? 'transparent' : theme.border }]}>
                    <View style={styles.perfLeft}>
                      <View style={[styles.perfRank, { backgroundColor: theme.softBlue }]}>
                        <Text style={[styles.perfRankText, { color: BLUE }]}>{i + 1}</Text>
                      </View>
                      <View>
                        <Text style={[styles.perfTitle, { color: theme.text }]}>{p.pair}</Text>
                        <Text style={[styles.perfMeta, { color: theme.muted }]}>{p.total} معامله • {p.wins}W / {p.losses}L</Text>
                      </View>
                    </View>
                    <View style={styles.perfRight}>
                      <Text style={[styles.perfPnl, { color: p.pnl >= 0 ? GREEN : RED }]}>
                        {p.pnl >= 0 ? '+' : ''}${p.pnl.toFixed(2)}
                      </Text>
                      <View style={[styles.perfWinRate, { backgroundColor: p.winRate >= 50 ? theme.softGreen : theme.softRed }]}>
                        <Text style={[styles.perfWinRateText, { color: p.winRate >= 50 ? GREEN : RED }]}>{p.winRate.toFixed(0)}%</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </Section>
            )}

            {trades.length >= 3 && (
              <Section title="عملکرد روز هفته" icon="calendar-number-outline" theme={theme}>
                {dayPerformance.filter((d) => d.total > 0).map((d) => (
                  <View key={d.idx} style={styles.dayRow}>
                    <Text style={[styles.dayName, { color: theme.text }]}>{d.name}</Text>
                    <View style={[styles.dayBarWrap, { backgroundColor: theme.input }]}>
                      <View style={[styles.dayBar, { width: `${Math.min(d.winRate, 100)}%`, backgroundColor: d.winRate >= 50 ? GREEN : RED }]} />
                    </View>
                    <Text style={[styles.dayWinRate, { color: theme.muted }]}>{d.winRate.toFixed(0)}%</Text>
                    <Text style={[styles.dayTotal, { color: theme.muted }]}>({d.total})</Text>
                  </View>
                ))}
              </Section>
            )}

            {emotionPerformance.length > 0 && (
              <Section title="عملکرد احساس" icon="happy-outline" theme={theme}>
                {emotionPerformance.map((e, i) => (
                  <View key={e.emo} style={[styles.perfRow, { borderBottomColor: i === emotionPerformance.length - 1 ? 'transparent' : theme.border }]}>
                    <View style={styles.perfLeft}>
                      <View style={[styles.perfRank, { backgroundColor: POSITIVE.includes(e.emo) ? theme.softGreen : NEGATIVE.includes(e.emo) ? theme.softRed : theme.input }]}>
                        <Text style={{ fontSize: 14 }}>{POSITIVE.includes(e.emo) ? '😊' : NEGATIVE.includes(e.emo) ? '😟' : '😐'}</Text>
                      </View>
                      <View>
                        <Text style={[styles.perfTitle, { color: theme.text }]}>{e.emo}</Text>
                        <Text style={[styles.perfMeta, { color: theme.muted }]}>{e.total} معامله</Text>
                      </View>
                    </View>
                    <View style={styles.perfRight}>
                      <Text style={[styles.perfPnl, { color: e.pnl >= 0 ? GREEN : RED }]}>
                        {e.pnl >= 0 ? '+' : ''}${e.pnl.toFixed(2)}
                      </Text>
                      <View style={[styles.perfWinRate, { backgroundColor: e.winRate >= 50 ? theme.softGreen : theme.softRed }]}>
                        <Text style={[styles.perfWinRateText, { color: e.winRate >= 50 ? GREEN : RED }]}>{e.winRate.toFixed(0)}%</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </Section>
            )}

            {trades.some((t) => t.rating) && (
              <Section title="عملکرد بر اساس امتیاز" icon="star-outline" theme={theme}>
                {ratingPerformance.filter((r) => r.count > 0).map((r) => (
                  <View key={r.rating} style={styles.ratingRow}>
                    <View style={styles.ratingStars}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Ionicons key={s} name={s <= r.rating ? 'star' : 'star-outline'} size={14} color={AMBER} />
                      ))}
                    </View>
                    <Text style={[styles.ratingCount, { color: theme.muted }]}>({r.count})</Text>
                    <View style={{ flex: 1 }} />
                    <Text style={[styles.perfPnl, { color: r.pnl >= 0 ? GREEN : RED }]}>
                      {r.pnl >= 0 ? '+' : ''}${r.pnl.toFixed(2)}
                    </Text>
                    <View style={[styles.perfWinRate, { backgroundColor: r.winRate >= 50 ? theme.softGreen : theme.softRed }]}>
                      <Text style={[styles.perfWinRateText, { color: r.winRate >= 50 ? GREEN : RED }]}>{r.winRate.toFixed(0)}%</Text>
                    </View>
                  </View>
                ))}
              </Section>
            )}

            {monthly.length > 0 && (
              <Section title="سود ماهانه" icon="calendar-outline" theme={theme}>
                <BarChart
                  data={{ labels: monthly.map(([k]) => k), datasets: [{ data: monthly.map(([, v]) => Number(v.toFixed(2))) }] }}
                  width={SCREEN_WIDTH - 56}
                  height={210}
                  fromZero
                  yAxisLabel=""
                  yAxisSuffix=""
                  chartConfig={{
                    backgroundGradientFrom: theme.card,
                    backgroundGradientTo: theme.card,
                    color: (o = 1) => `rgba(37,99,235,${o})`,
                    labelColor: (o = 1) => (dark ? `rgba(148,163,184,${o})` : `rgba(100,116,139,${o})`),
                    decimalPlaces: 0,
                  }}
                  style={styles.chart}
                />
              </Section>
            )}
          </>
        )}

        {/* TAB: CALENDAR */}
        {activeTab === 'calendar' && (
          <Section title="تقویم عملکرد" icon="calendar-outline" theme={theme}>
            {renderCalendar()}
          </Section>
        )}

        {/* TAB: INSIGHTS */}
        {activeTab === 'insights' && (
          <>
            <Section title="بینش هوشمند AI" icon="sparkles-outline" theme={theme} badge={`${insights.length}`}>
              {insights.map((insight, idx) => (
                <View key={idx} style={[styles.insightRow, { backgroundColor: theme.input, borderColor: theme.border }]}>
                  <View style={[styles.insightDot, { backgroundColor: BLUE }]} />
                  <Text style={[styles.insightText, { color: theme.text }]}>{insight}</Text>
                </View>
              ))}
            </Section>

            <Section title="امتیاز روانشناسی" icon="pulse-outline" theme={theme}>
              <View style={[styles.psychCard, { backgroundColor: theme.input, borderColor: theme.border }]}>
                <View style={styles.psychBarWrap}>
                  <View
                    style={[
                      styles.psychBar,
                      {
                        width: `${stats.avgPsychology}%`,
                        backgroundColor: stats.avgPsychology >= 70 ? GREEN : stats.avgPsychology >= 50 ? AMBER : RED,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.psychValue, { color: theme.text }]}>{stats.avgPsychology.toFixed(0)}/100</Text>
                <Text style={[styles.psychLabel, { color: theme.muted }]}>
                  میانگین امتیاز روانشناسی معاملات
                </Text>
              </View>
            </Section>

            <Section title="پایبندی به پلن" icon="shield-checkmark-outline" theme={theme}>
              <View style={[styles.psychCard, { backgroundColor: theme.input, borderColor: theme.border }]}>
                <View style={styles.psychBarWrap}>
                  <View
                    style={[
                      styles.psychBar,
                      {
                        width: `${stats.planAdherence}%`,
                        backgroundColor: stats.planAdherence >= 80 ? GREEN : stats.planAdherence >= 50 ? AMBER : RED,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.psychValue, { color: theme.text }]}>{stats.planAdherence.toFixed(0)}%</Text>
                <Text style={[styles.psychLabel, { color: theme.muted }]}>
                  درصد معاملاتی که پلن را دنبال کردی
                </Text>
              </View>
            </Section>
          </>
        )}

        {/* TAB: TRADES */}
        {activeTab === 'trades' && (
          <Section title="همه معاملات" icon="list-outline" theme={theme} badge={`${filteredTrades.length}`}>
            <View style={[styles.searchWrap, { borderColor: theme.border }]}>
              <Ionicons name="search-outline" size={19} color={theme.muted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="جستجو نماد، احساس، Setup یا یادداشت"
                placeholderTextColor={theme.muted}
                style={[styles.search, { color: theme.text }]}
              />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
              {([['all', 'همه'], ['win', 'برد'], ['loss', 'باخت'], ['be', 'BE']] as const).map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => setFilter(key)}
                  style={[styles.filterChip, { backgroundColor: filter === key ? BLUE : theme.input, borderColor: filter === key ? BLUE : theme.border }]}
                >
                  <Text style={{ color: filter === key ? '#fff' : theme.muted, fontWeight: '800' }}>{label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {filteredTrades.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="document-text-outline" size={38} color={theme.muted} />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>معامله‌ای پیدا نشد</Text>
                <Text style={[styles.emptyText, { color: theme.muted }]}>اولین معامله‌ات را از دکمه + بالای صفحه ثبت کن.</Text>
              </View>
            ) : (
              filteredTrades.map((t) => {
                const o = outcome(t);
                const r = rMultiple(t);
                return (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() => setSelected(t)}
                    activeOpacity={0.8}
                    style={[styles.tradeRow, { borderBottomColor: theme.border }]}
                  >
                    <View style={[styles.tradeDirection, { backgroundColor: t.direction === 'buy' ? theme.softGreen : theme.softRed }]}>
                      <Ionicons name={t.direction === 'buy' ? 'arrow-up' : 'arrow-down'} size={18} color={t.direction === 'buy' ? GREEN : RED} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.tradeHeader}>
                        <Text style={[styles.tradePair, { color: theme.text }]}>{t.pair}</Text>
                        {t.rating ? (
                          <View style={styles.tradeStars}>
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Ionicons key={s} name={s <= t.rating! ? 'star' : 'star-outline'} size={9} color={AMBER} />
                            ))}
                          </View>
                        ) : null}
                      </View>
                      <Text style={[styles.tradeMeta, { color: theme.muted }]}>
                        {t.direction === 'buy' ? 'Buy' : 'Sell'}
                        {t.setup ? ` • ${t.setup}` : ''}
                        {' • '}
                        {new Date(t.date).toLocaleDateString('fa-IR')}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.tradeResult, { color: o === 'win' ? GREEN : o === 'loss' ? RED : theme.muted }]}>
                        {money(num(t.result))}
                      </Text>
                      <Text style={[styles.tradeR, { color: theme.muted }]}>
                        {r === null ? 'R —' : `${r >= 0 ? '+' : ''}${r.toFixed(2)}R`}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </Section>
        )}
      </ScrollView>

      {/* FORM MODAL */}
      <Modal visible={showForm} animationType="slide" transparent onRequestClose={() => { setShowForm(false); resetForm(); }}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.formSheet, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>{editingId ? 'ویرایش معامله' : 'ثبت معامله'}</Text>
              <TouchableOpacity onPress={() => { setShowForm(false); resetForm(); }}>
                <Ionicons name="close" size={25} color={theme.muted} />
              </TouchableOpacity>
            </View>
            <View style={styles.progressRow}>
              {[1, 2, 3, 4].map((n) => (
                <View key={n} style={[styles.progress, { backgroundColor: n <= step ? BLUE : theme.border }]} />
              ))}
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
              {step === 1 && (
                <>
                  <Text style={[styles.stepTitle, { color: theme.text }]}>اطلاعات پایه</Text>
                  <Text style={[styles.stepHint, { color: theme.muted }]}>مشخصات اصلی معامله را وارد کن.</Text>

                  <Text style={[styles.label, { color: theme.text }]}>نماد</Text>
                  <TextInput value={pair} onChangeText={setPair} placeholder="XAUUSD" placeholderTextColor={theme.muted} style={[styles.input, { backgroundColor: theme.input, borderColor: theme.border, color: theme.text }]} />

                  <Text style={[styles.label, { color: theme.text }]}>جهت</Text>
                  <View style={styles.twoCol}>
                    <TouchableOpacity onPress={() => setDirection('buy')} style={[styles.choice, { backgroundColor: direction === 'buy' ? theme.softGreen : theme.input, borderColor: direction === 'buy' ? GREEN : theme.border }]}>
                      <Text style={{ color: direction === 'buy' ? GREEN : theme.muted, fontWeight: '900' }}>BUY</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setDirection('sell')} style={[styles.choice, { backgroundColor: direction === 'sell' ? theme.softRed : theme.input, borderColor: direction === 'sell' ? RED : theme.border }]}>
                      <Text style={{ color: direction === 'sell' ? RED : theme.muted, fontWeight: '900' }}>SELL</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.label, { color: theme.text }]}>Setup</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {SETUPS.map((s) => (
                      <TouchableOpacity key={s} onPress={() => setSetup(setup === s ? '' : s)} style={[styles.chip, { backgroundColor: setup === s ? BLUE : theme.input, borderColor: setup === s ? BLUE : theme.border }]}>
                        <Text style={{ color: setup === s ? '#FFF' : theme.muted, fontWeight: '700', fontSize: 11 }}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <Text style={[styles.label, { color: theme.text }]}>سشن</Text>
                  <View style={styles.sessionRow}>
                    {SESSIONS.map((s) => (
                      <TouchableOpacity key={s.key} onPress={() => setSession(session === s.key ? undefined : s.key)} style={[styles.sessionBtn, { backgroundColor: session === s.key ? BLUE : theme.input, borderColor: session === s.key ? BLUE : theme.border }]}>
                        <Text style={{ color: session === s.key ? '#FFF' : theme.muted, fontWeight: '800', fontSize: 11 }}>{s.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TouchableOpacity onPress={() => setStep(2)} style={styles.nextButton}>
                    <Text style={styles.nextText}>ادامه</Text>
                    <Ionicons name="arrow-forward" size={19} color="#fff" />
                  </TouchableOpacity>
                </>
              )}

              {step === 2 && (
                <>
                  <Text style={[styles.stepTitle, { color: theme.text }]}>قیمت‌ها</Text>
                  <Text style={[styles.stepHint, { color: theme.muted }]}>قیمت‌های ورود و خروج.</Text>

                  <Text style={[styles.label, { color: theme.text }]}>قیمت ورود</Text>
                  <TextInput value={entryPrice} onChangeText={setEntryPrice} keyboardType="decimal-pad" placeholder="Entry" placeholderTextColor={theme.muted} style={[styles.input, { backgroundColor: theme.input, borderColor: theme.border, color: theme.text }]} />

                  <Text style={[styles.label, { color: theme.text }]}>قیمت خروج</Text>
                  <TextInput value={exitPrice} onChangeText={setExitPrice} keyboardType="decimal-pad" placeholder="Exit" placeholderTextColor={theme.muted} style={[styles.input, { backgroundColor: theme.input, borderColor: theme.border, color: theme.text }]} />

                  <Text style={[styles.label, { color: theme.text }]}>حجم</Text>
                  <TextInput value={volume} onChangeText={setVolume} keyboardType="decimal-pad" placeholder="Volume" placeholderTextColor={theme.muted} style={[styles.input, { backgroundColor: theme.input, borderColor: theme.border, color: theme.text }]} />

                  <Text style={[styles.label, { color: theme.text }]}>مقدار ریسک</Text>
                  <TextInput value={riskAmount} onChangeText={setRiskAmount} keyboardType="decimal-pad" placeholder="100" placeholderTextColor={theme.muted} style={[styles.input, { backgroundColor: theme.input, borderColor: theme.border, color: theme.text }]} />

                  <Text style={[styles.label, { color: theme.text }]}>نتیجه نهایی</Text>
                  <TextInput value={result} onChangeText={setResult} keyboardType="numbers-and-punctuation" placeholder="+ = سود | - = ضرر | 0 = BE" placeholderTextColor={theme.muted} style={[styles.input, { backgroundColor: theme.input, borderColor: theme.border, color: theme.text }]} />

                  <View style={styles.twoCol}>
                    <TouchableOpacity onPress={() => setStep(1)} style={[styles.backButton, { borderColor: theme.border }]}>
                      <Text style={{ color: theme.text, fontWeight: '800' }}>قبلی</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setStep(3)} style={styles.nextButton}>
                      <Text style={styles.nextText}>ادامه</Text>
                      <Ionicons name="arrow-forward" size={19} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {step === 3 && (
                <>
                  <Text style={[styles.stepTitle, { color: theme.text }]}>روانشناسی</Text>
                  <Text style={[styles.stepHint, { color: theme.muted }]}>وضعیت ذهنی و رفتاری.</Text>

                  <Text style={[styles.label, { color: theme.text }]}>سطح استرس: {stress}/5</Text>
                  <View style={styles.stressRow}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <TouchableOpacity key={n} onPress={() => setStress(n)} style={[styles.stressDot, { backgroundColor: n <= stress ? BLUE : theme.input, borderColor: n <= stress ? BLUE : theme.border }]}>
                        <Text style={{ color: n <= stress ? '#fff' : theme.muted, fontWeight: '900' }}>{n}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={[styles.label, { color: theme.text }]}>احساس</Text>
                  <View style={styles.emotionWrap}>
                    {EMOTIONS.map((e) => (
                      <TouchableOpacity key={e} onPress={() => setEmotion(e)} style={[styles.emotion, { backgroundColor: emotion === e ? theme.softBlue : theme.input, borderColor: emotion === e ? BLUE : theme.border }]}>
                        <Text style={{ color: emotion === e ? BLUE : theme.muted, fontWeight: '700' }}>{e}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={[styles.label, { color: theme.text }]}>ساعت خواب</Text>
                  <TextInput value={sleepHours} onChangeText={setSleepHours} keyboardType="decimal-pad" placeholder="7" placeholderTextColor={theme.muted} style={[styles.input, { backgroundColor: theme.input, borderColor: theme.border, color: theme.text }]} />

                  <Text style={[styles.label, { color: theme.text }]}>پایبند به پلن؟</Text>
                  <View style={styles.twoCol}>
                    <TouchableOpacity onPress={() => setFollowedPlan(true)} style={[styles.choice, { backgroundColor: followedPlan === true ? theme.softGreen : theme.input, borderColor: followedPlan === true ? GREEN : theme.border }]}>
                      <Text style={{ color: followedPlan === true ? GREEN : theme.muted, fontWeight: '900' }}>بله</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setFollowedPlan(false)} style={[styles.choice, { backgroundColor: followedPlan === false ? theme.softRed : theme.input, borderColor: followedPlan === false ? RED : theme.border }]}>
                      <Text style={{ color: followedPlan === false ? RED : theme.muted, fontWeight: '900' }}>خیر</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.twoCol}>
                    <TouchableOpacity onPress={() => setStep(2)} style={[styles.backButton, { borderColor: theme.border }]}>
                      <Text style={{ color: theme.text, fontWeight: '800' }}>قبلی</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setStep(4)} style={styles.nextButton}>
                      <Text style={styles.nextText}>ادامه</Text>
                      <Ionicons name="arrow-forward" size={19} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {step === 4 && (
                <>
                  <Text style={[styles.stepTitle, { color: theme.text }]}>جزئیات نهایی</Text>
                  <Text style={[styles.stepHint, { color: theme.muted }]}>امتیاز، MAE/MFE و یادداشت.</Text>

                  <Text style={[styles.label, { color: theme.text }]}>امتیاز معامله</Text>
                  <View style={styles.ratingWrap}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <TouchableOpacity key={s} onPress={() => setRating(rating === s ? 0 : s)}>
                        <Ionicons name={s <= rating ? 'star' : 'star-outline'} size={32} color={AMBER} />
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.twoCol}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.label, { color: theme.text }]}>MAE</Text>
                      <TextInput value={mae} onChangeText={setMae} keyboardType="decimal-pad" placeholder="حداکثر ضرر شناور" placeholderTextColor={theme.muted} style={[styles.input, { backgroundColor: theme.input, borderColor: theme.border, color: theme.text }]} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.label, { color: theme.text }]}>MFE</Text>
                      <TextInput value={mfe} onChangeText={setMfe} keyboardType="decimal-pad" placeholder="حداکثر سود شناور" placeholderTextColor={theme.muted} style={[styles.input, { backgroundColor: theme.input, borderColor: theme.border, color: theme.text }]} />
                    </View>
                  </View>

                  <Text style={[styles.label, { color: theme.text }]}>یادداشت</Text>
                  <TextInput value={notes} onChangeText={setNotes} multiline placeholder="چه چیزی یاد گرفتم؟" placeholderTextColor={theme.muted} style={[styles.input, { height: 100, textAlignVertical: 'top', backgroundColor: theme.input, borderColor: theme.border, color: theme.text }]} />

                  <View style={styles.twoCol}>
                    <TouchableOpacity onPress={() => setStep(3)} style={[styles.backButton, { borderColor: theme.border }]}>
                      <Text style={{ color: theme.text, fontWeight: '800' }}>قبلی</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={saveTrade} style={styles.nextButton}>
                      <Text style={styles.nextText}>ثبت</Text>
                      <Ionicons name="checkmark" size={19} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* BALANCE MODAL */}
      <Modal visible={showBalanceModal} animationType="slide" transparent onRequestClose={() => setShowBalanceModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.balanceSheet, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>سرمایه اولیه</Text>
              <TouchableOpacity onPress={() => setShowBalanceModal(false)}><Ionicons name="close" size={25} color={theme.muted} /></TouchableOpacity>
            </View>
            <Text style={[styles.stepHint, { color: theme.muted }]}>موجودی در شروع دوره معاملاتی.</Text>
            <TextInput value={balanceInput} onChangeText={setBalanceInput} keyboardType="decimal-pad" placeholder="10000" placeholderTextColor={theme.muted} style={[styles.input, { backgroundColor: theme.input, borderColor: theme.border, color: theme.text }]} />
            <TouchableOpacity onPress={saveInitialBalance} style={styles.nextButton}>
              <Text style={styles.nextText}>ذخیره</Text>
              <Ionicons name="checkmark" size={19} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* DETAIL MODAL */}
      <Modal visible={!!selected} animationType="slide" transparent onRequestClose={() => setSelected(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.detailSheet, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>جزئیات معامله</Text>
              <TouchableOpacity onPress={() => setSelected(null)}><Ionicons name="close" size={25} color={theme.muted} /></TouchableOpacity>
            </View>
            {selected && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailHero}>
                  <View>
                    <Text style={styles.detailPair}>{selected.pair}</Text>
                    <Text style={styles.detailDirection}>
                      {selected.direction === 'buy' ? 'BUY' : 'SELL'}
                      {selected.setup ? ` • ${selected.setup}` : ''}
                      {' • '}
                      {new Date(selected.date).toLocaleString('fa-IR')}
                    </Text>
                    {selected.rating ? (
                      <View style={{ flexDirection: 'row', marginTop: 6 }}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Ionicons key={s} name={s <= selected.rating! ? 'star' : 'star-outline'} size={14} color="#FFD700" />
                        ))}
                      </View>
                    ) : null}
                  </View>
                  <Text style={[styles.detailResult, { color: outcome(selected) === 'win' ? '#4ADE80' : outcome(selected) === 'loss' ? '#FCA5A5' : '#E5E7EB' }]}>
                    {money(num(selected.result))}
                  </Text>
                </View>
                <View style={styles.detailGrid}>
                  {[
                    ['ورود', selected.entryPrice],
                    ['خروج', selected.exitPrice],
                    ['حجم', selected.volume],
                    ['ریسک', selected.riskAmount || '—'],
                    ['R', rMultiple(selected) === null ? '—' : `${rMultiple(selected)!.toFixed(2)}R`],
                    ['روانشناسی', `${psychologyScore(selected)}/100`],
                    ['MAE', selected.mae || '—'],
                    ['MFE', selected.mfe || '—'],
                    ['سشن', selected.session ? SESSIONS.find((s) => s.key === selected.session)?.label || '—' : '—'],
                    ['احساس', selected.emotion],
                  ].map(([a, b]) => (
                    <View key={a} style={[styles.detailItem, { backgroundColor: theme.input }]}>
                      <Text style={[styles.analyticsLabel, { color: theme.muted }]}>{a}</Text>
                      <Text style={[styles.analyticsValue, { color: theme.text }]}>{b}</Text>
                    </View>
                  ))}
                </View>
                <View style={[styles.noteBox, { backgroundColor: theme.input, borderColor: theme.border }]}>
                  <Text style={[styles.analyticsLabel, { color: theme.muted }]}>یادداشت</Text>
                  <Text style={[styles.noteText, { color: theme.text }]}>{selected.notes || 'یادداشتی ثبت نشده.'}</Text>
                </View>
                <TouchableOpacity onPress={() => startEdit(selected)} style={[styles.editButton, { borderColor: theme.softBlue, backgroundColor: theme.softBlue }]}>
                  <Ionicons name="create-outline" size={19} color={BLUE} />
                  <Text style={{ color: BLUE, fontWeight: '900' }}>ویرایش</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    Alert.alert('حذف', 'این معامله حذف شود؟', [
                      { text: 'انصراف', style: 'cancel' },
                      { text: 'حذف', style: 'destructive', onPress: () => { setTrades((prev) => prev.filter((x) => x.id !== selected.id)); setSelected(null); } },
                    ]);
                  }}
                  style={[styles.deleteButton, { borderColor: theme.softRed, backgroundColor: theme.softRed }]}
                >
                  <Ionicons name="trash-outline" size={19} color={RED} />
                  <Text style={{ color: RED, fontWeight: '900' }}>حذف</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// =========================================================
// STYLES
// =========================================================

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { padding: 18, paddingTop: 20, paddingBottom: 110 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  brand: { fontSize: 25, fontWeight: '900', letterSpacing: 1 },
  subtitle: { fontSize: 12, fontWeight: '600', marginTop: 3 },
  headerAddBtn: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  tiltWarning: { flexDirection: 'row-reverse', alignItems: 'center', borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 12, gap: 8 },
  tiltText: { flex: 1, fontSize: 11, fontWeight: '800', lineHeight: 18, textAlign: 'right' },

  hero: { borderRadius: 24, padding: 20, marginBottom: 14 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroLabel: { color: '#DBEAFE', fontSize: 12, fontWeight: '700' },
  heroValue: { color: '#fff', fontSize: 30, fontWeight: '900', marginTop: 4 },
  heroIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: 'rgba(255,255,255,.15)', alignItems: 'center', justifyContent: 'center' },
  heroStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 22, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,.18)' },
  heroMiniLabel: { color: '#BFDBFE', fontSize: 10, fontWeight: '700' },
  heroMini: { color: '#fff', fontSize: 14, fontWeight: '900', marginTop: 3 },

  balanceSetup: { borderRadius: 18, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  balanceIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  balanceSetupText: { flex: 1, marginHorizontal: 10 },
  balanceSetupTitle: { fontSize: 13, fontWeight: '900' },
  balanceSetupSub: { fontSize: 10, fontWeight: '600', marginTop: 4, lineHeight: 17 },
  balanceSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 18 },

  tabsWrap: { gap: 8, paddingBottom: 14 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, borderWidth: 1 },
  tabText: { fontSize: 11, fontWeight: '900' },

  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  metricCard: { width: '48.5%', borderRadius: 16, borderWidth: 1, padding: 12, alignItems: 'flex-end' },
  metricIconRow: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  metricLabel: { fontSize: 10, fontWeight: '700', textAlign: 'right' },
  metricValue: { fontSize: 18, fontWeight: '900', marginTop: 3, textAlign: 'right' },
  metricSub: { fontSize: 9, fontWeight: '700', marginTop: 2, textAlign: 'right' },

  bwRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  bwCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 12, alignItems: 'flex-end' },
  bwLabel: { fontSize: 9, fontWeight: '700', marginTop: 4 },
  bwPair: { fontSize: 13, fontWeight: '900', marginTop: 3 },
  bwValue: { fontSize: 15, fontWeight: '900', marginTop: 2 },

  summaryCard: { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 14 },
  summaryTitle: { fontSize: 15, fontWeight: '900', marginBottom: 14, textAlign: 'right' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  summaryCol: { flex: 1, alignItems: 'flex-end' },
  summaryLabel: { fontSize: 10, fontWeight: '700' },
  summaryValue: { fontSize: 14, fontWeight: '900', marginTop: 3 },

  section: { borderRadius: 20, borderWidth: 1, padding: 15, marginBottom: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center' },
  sectionIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  sectionTitle: { fontSize: 16, fontWeight: '900' },
  badge: { marginLeft: 8, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },

  insightRow: { flexDirection: 'row', alignItems: 'flex-start', borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8 },
  insightDot: { width: 6, height: 6, borderRadius: 3, marginTop: 7, marginRight: 9 },
  insightText: { flex: 1, fontSize: 12, fontWeight: '700', lineHeight: 20, textAlign: 'right' },

  calendarNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  calNavBtn: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  calendarMonthText: { fontSize: 14, fontWeight: '900' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarHeaderCell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 6 },
  calendarHeaderText: { fontSize: 11, fontWeight: '800' },
  calendarCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8, marginVertical: 2 },
  calendarDayText: { fontSize: 12, fontWeight: '900' },
  calendarPnlText: { fontSize: 8, fontWeight: '800', marginTop: 1 },
  calendarLegend: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#00000010' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendText: { fontSize: 10, fontWeight: '700' },

  perfRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1 },
  perfLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  perfRank: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  perfRankText: { fontSize: 13, fontWeight: '900' },
  perfTitle: { fontSize: 13, fontWeight: '900' },
  perfMeta: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  perfRight: { alignItems: 'flex-end' },
  perfPnl: { fontSize: 14, fontWeight: '900' },
  perfWinRate: { marginTop: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  perfWinRateText: { fontSize: 11, fontWeight: '900' },

  dayRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  dayName: { width: 60, fontSize: 12, fontWeight: '800', textAlign: 'right' },
  dayBarWrap: { flex: 1, height: 10, borderRadius: 5, marginHorizontal: 8, overflow: 'hidden' },
  dayBar: { height: '100%', borderRadius: 5 },
  dayWinRate: { width: 35, fontSize: 11, fontWeight: '800', textAlign: 'left' },
  dayTotal: { width: 30, fontSize: 10, fontWeight: '700', textAlign: 'left' },

  ratingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 6 },
  ratingStars: { flexDirection: 'row', gap: 2 },
  ratingCount: { fontSize: 11, fontWeight: '700' },

  rDistWrap: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 140, paddingTop: 10 },
  rBarWrap: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  rCount: { fontSize: 9, fontWeight: '800', marginBottom: 2 },
  rBarTrack: { width: '70%', height: 90, borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
  rBar: { width: '100%', borderRadius: 6 },
  rLabel: { fontSize: 8, fontWeight: '700', marginTop: 5 },

  psychCard: { borderRadius: 16, borderWidth: 1, padding: 16, alignItems: 'center' },
  psychBarWrap: { width: '100%', height: 12, borderRadius: 6, backgroundColor: '#00000010', overflow: 'hidden', marginBottom: 12 },
  psychBar: { height: '100%', borderRadius: 6 },
  psychValue: { fontSize: 26, fontWeight: '900' },
  psychLabel: { fontSize: 11, fontWeight: '700', marginTop: 4, textAlign: 'center' },

  searchWrap: { height: 46, borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  search: { flex: 1, fontSize: 12, fontWeight: '600', textAlign: 'right' },
  filters: { gap: 8, paddingVertical: 12 },
  filterChip: { paddingHorizontal: 15, paddingVertical: 9, borderRadius: 12, borderWidth: 1 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },

  empty: { alignItems: 'center', paddingVertical: 28 },
  emptyTitle: { fontSize: 15, fontWeight: '900', marginTop: 8 },
  emptyText: { fontSize: 11, fontWeight: '600', marginTop: 5, textAlign: 'center' },

  tradeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  tradeDirection: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  tradeHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tradeStars: { flexDirection: 'row', gap: 1 },
  tradePair: { fontSize: 14, fontWeight: '900' },
  tradeMeta: { fontSize: 10, fontWeight: '600', marginTop: 3 },
  tradeResult: { fontSize: 14, fontWeight: '900' },
  tradeR: { fontSize: 10, fontWeight: '700', marginTop: 2 },

  chartTitle: { fontSize: 13, fontWeight: '900', marginTop: 5, marginBottom: 8, textAlign: 'right' },
  chart: { borderRadius: 16, marginBottom: 15 },

  analyticsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  analyticsItem: { width: '48%', borderRadius: 14, padding: 12 },
  analyticsLabel: { fontSize: 10, fontWeight: '700' },
  analyticsValue: { fontSize: 16, fontWeight: '900', marginTop: 4 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(2,6,23,.62)', justifyContent: 'flex-end' },
  formSheet: { maxHeight: '94%', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 18 },
  detailSheet: { maxHeight: '90%', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 18 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 20, fontWeight: '900' },
  progressRow: { flexDirection: 'row', gap: 5, marginBottom: 18 },
  progress: { height: 4, flex: 1, borderRadius: 4 },
  stepTitle: { fontSize: 20, fontWeight: '900' },
  stepHint: { fontSize: 11, fontWeight: '600', marginTop: 4, marginBottom: 15 },
  label: { fontSize: 12, fontWeight: '800', marginTop: 13, marginBottom: 7, textAlign: 'right' },
  input: { borderRadius: 13, borderWidth: 1, minHeight: 48, paddingHorizontal: 13, fontSize: 13, fontWeight: '600', textAlign: 'right' },
  twoCol: { flexDirection: 'row', gap: 10 },
  choice: { flex: 1, minHeight: 48, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  nextButton: { flex: 1, minHeight: 50, borderRadius: 14, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 18 },
  nextText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  backButton: { flex: 1, minHeight: 50, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  stressRow: { flexDirection: 'row', gap: 8 },
  stressDot: { width: 42, height: 42, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  emotionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emotion: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, borderWidth: 1 },
  sessionRow: { flexDirection: 'row', gap: 8 },
  sessionBtn: { flex: 1, height: 42, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  ratingWrap: { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingVertical: 10 },

  detailHero: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 18, backgroundColor: BLUE, marginBottom: 12 },
  detailPair: { color: '#fff', fontSize: 21, fontWeight: '900' },
  detailDirection: { color: '#DBEAFE', fontSize: 10, fontWeight: '700', marginTop: 3 },
  detailResult: { fontSize: 19, fontWeight: '900' },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  detailItem: { width: '48%', borderRadius: 14, padding: 12 },
  noteBox: { borderWidth: 1, borderRadius: 16, padding: 14, marginTop: 10 },
  noteText: { fontSize: 12, fontWeight: '600', lineHeight: 21, marginTop: 6, textAlign: 'right' },
  editButton: { height: 50, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 14 },
  deleteButton: { height: 50, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 14, marginBottom: 20 },
});