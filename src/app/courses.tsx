import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomTabInset, Radius, Spacing } from '@/constants/theme';
import { useNavasanTheme } from '@/context/theme-context';

// =========================================================
// TYPES
// =========================================================

type Tool = 'position' | 'pnl' | 'rr' | 'pip' | 'margin';
type Direction = 'BUY' | 'SELL';
type RiskMode = 'percent' | 'fixed';
type SymbolCategory = 'forex' | 'jpy' | 'metal' | 'crypto' | 'index';

type SymbolPreset = {
  label: string;
  pipSize: number;
  contractSize: number;
  category: SymbolCategory;
  quoteCurrency: string;
  displayDecimals: number;
};

// =========================================================
// SYMBOL PRESETS
// =========================================================

const SYMBOLS: Record<string, SymbolPreset> = {
  // MAJORS
  EURUSD: { label: 'EUR/USD', pipSize: 0.0001, contractSize: 100000, category: 'forex', quoteCurrency: 'USD', displayDecimals: 5 },
  GBPUSD: { label: 'GBP/USD', pipSize: 0.0001, contractSize: 100000, category: 'forex', quoteCurrency: 'USD', displayDecimals: 5 },
  AUDUSD: { label: 'AUD/USD', pipSize: 0.0001, contractSize: 100000, category: 'forex', quoteCurrency: 'USD', displayDecimals: 5 },
  NZDUSD: { label: 'NZD/USD', pipSize: 0.0001, contractSize: 100000, category: 'forex', quoteCurrency: 'USD', displayDecimals: 5 },
  USDCAD: { label: 'USD/CAD', pipSize: 0.0001, contractSize: 100000, category: 'forex', quoteCurrency: 'CAD', displayDecimals: 5 },
  USDCHF: { label: 'USD/CHF', pipSize: 0.0001, contractSize: 100000, category: 'forex', quoteCurrency: 'CHF', displayDecimals: 5 },

  // JPY PAIRS
  USDJPY: { label: 'USD/JPY', pipSize: 0.01, contractSize: 100000, category: 'jpy', quoteCurrency: 'JPY', displayDecimals: 3 },
  EURJPY: { label: 'EUR/JPY', pipSize: 0.01, contractSize: 100000, category: 'jpy', quoteCurrency: 'JPY', displayDecimals: 3 },
  GBPJPY: { label: 'GBP/JPY', pipSize: 0.01, contractSize: 100000, category: 'jpy', quoteCurrency: 'JPY', displayDecimals: 3 },
  AUDJPY: { label: 'AUD/JPY', pipSize: 0.01, contractSize: 100000, category: 'jpy', quoteCurrency: 'JPY', displayDecimals: 3 },
  CADJPY: { label: 'CAD/JPY', pipSize: 0.01, contractSize: 100000, category: 'jpy', quoteCurrency: 'JPY', displayDecimals: 3 },
  CHFJPY: { label: 'CHF/JPY', pipSize: 0.01, contractSize: 100000, category: 'jpy', quoteCurrency: 'JPY', displayDecimals: 3 },
  NZDJPY: { label: 'NZD/JPY', pipSize: 0.01, contractSize: 100000, category: 'jpy', quoteCurrency: 'JPY', displayDecimals: 3 },

  // CROSSES
  EURGBP: { label: 'EUR/GBP', pipSize: 0.0001, contractSize: 100000, category: 'forex', quoteCurrency: 'GBP', displayDecimals: 5 },
  EURAUD: { label: 'EUR/AUD', pipSize: 0.0001, contractSize: 100000, category: 'forex', quoteCurrency: 'AUD', displayDecimals: 5 },
  EURCHF: { label: 'EUR/CHF', pipSize: 0.0001, contractSize: 100000, category: 'forex', quoteCurrency: 'CHF', displayDecimals: 5 },
  EURCAD: { label: 'EUR/CAD', pipSize: 0.0001, contractSize: 100000, category: 'forex', quoteCurrency: 'CAD', displayDecimals: 5 },
  EURNZD: { label: 'EUR/NZD', pipSize: 0.0001, contractSize: 100000, category: 'forex', quoteCurrency: 'NZD', displayDecimals: 5 },
  GBPAUD: { label: 'GBP/AUD', pipSize: 0.0001, contractSize: 100000, category: 'forex', quoteCurrency: 'AUD', displayDecimals: 5 },
  GBPCAD: { label: 'GBP/CAD', pipSize: 0.0001, contractSize: 100000, category: 'forex', quoteCurrency: 'CAD', displayDecimals: 5 },
  GBPCHF: { label: 'GBP/CHF', pipSize: 0.0001, contractSize: 100000, category: 'forex', quoteCurrency: 'CHF', displayDecimals: 5 },
  GBPNZD: { label: 'GBP/NZD', pipSize: 0.0001, contractSize: 100000, category: 'forex', quoteCurrency: 'NZD', displayDecimals: 5 },
  AUDCAD: { label: 'AUD/CAD', pipSize: 0.0001, contractSize: 100000, category: 'forex', quoteCurrency: 'CAD', displayDecimals: 5 },
  AUDCHF: { label: 'AUD/CHF', pipSize: 0.0001, contractSize: 100000, category: 'forex', quoteCurrency: 'CHF', displayDecimals: 5 },
  AUDNZD: { label: 'AUD/NZD', pipSize: 0.0001, contractSize: 100000, category: 'forex', quoteCurrency: 'NZD', displayDecimals: 5 },
  NZDCAD: { label: 'NZD/CAD', pipSize: 0.0001, contractSize: 100000, category: 'forex', quoteCurrency: 'CAD', displayDecimals: 5 },
  CADCHF: { label: 'CAD/CHF', pipSize: 0.0001, contractSize: 100000, category: 'forex', quoteCurrency: 'CHF', displayDecimals: 5 },

  // METALS — ✅ pip استاندارد (نه پیپت)
  XAUUSD: { label: 'XAU/USD (طلا)', pipSize: 0.10, contractSize: 100, category: 'metal', quoteCurrency: 'USD', displayDecimals: 2 },
  XAGUSD: { label: 'XAG/USD (نقره)', pipSize: 0.01, contractSize: 5000, category: 'metal', quoteCurrency: 'USD', displayDecimals: 3 },

  // CRYPTO
  BTCUSD: { label: 'BTC/USD', pipSize: 1, contractSize: 1, category: 'crypto', quoteCurrency: 'USD', displayDecimals: 2 },
  ETHUSD: { label: 'ETH/USD', pipSize: 0.1, contractSize: 1, category: 'crypto', quoteCurrency: 'USD', displayDecimals: 2 },

  // INDICES
  US30: { label: 'US30 (Dow)', pipSize: 1, contractSize: 1, category: 'index', quoteCurrency: 'USD', displayDecimals: 1 },
  NAS100: { label: 'NAS100', pipSize: 1, contractSize: 1, category: 'index', quoteCurrency: 'USD', displayDecimals: 1 },
  SPX500: { label: 'SPX500', pipSize: 0.1, contractSize: 1, category: 'index', quoteCurrency: 'USD', displayDecimals: 2 },
};

const TOOL_ITEMS: Array<{
  id: Tool;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { id: 'position', title: 'حجم پوزیشن', icon: 'resize-outline' },
  { id: 'pnl', title: 'سود و زیان', icon: 'cash-outline' },
  { id: 'rr', title: 'R:R', icon: 'git-compare-outline' },
  { id: 'pip', title: 'Pip Value', icon: 'calculator-outline' },
  { id: 'margin', title: 'مارجین', icon: 'shield-half-outline' },
];

// =========================================================
// HELPERS
// =========================================================

function parseInput(value: string): number {
  const normalized = value.replace(/,/g, '.').replace(/[^0-9.-]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return '—';
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatPrice(value: number, symbol: string): string {
  if (!Number.isFinite(value)) return '—';
  const decimals = SYMBOLS[symbol]?.displayDecimals ?? 5;
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// ✅ محاسبه ارزش پیپ با احتساب نرخ تبدیل
function getPipValuePerLot(
  symbol: string,
  price: number,
  quoteToUsdRate: number,
): number {
  const preset = SYMBOLS[symbol];
  if (!preset || price <= 0) return 0;

  const pipValueInQuote = preset.contractSize * preset.pipSize;

  // اگر ارز مظنه USD باشه، ارزش مستقیم به دلار
  if (preset.quoteCurrency === 'USD') {
    return pipValueInQuote;
  }

  // اگر ارز پایه USD باشه، تقسیم بر قیمت
  if (symbol.startsWith('USD')) {
    return pipValueInQuote / price;
  }

  // در غیر این صورت نیاز به نرخ تبدیل
  if (quoteToUsdRate > 0) {
    return pipValueInQuote * quoteToUsdRate;
  }

  return 0;
}

// =========================================================
// MAIN COMPONENT
// =========================================================

export default function Courses() {
  const { colors } = useNavasanTheme();
  const insets = useSafeAreaInsets();

  const [tool, setTool] = useState<Tool>('position');
  const [symbol, setSymbol] = useState('EURUSD');
  const [showSymbols, setShowSymbols] = useState(false);
  const [direction, setDirection] = useState<Direction>('BUY');
  const [riskMode, setRiskMode] = useState<RiskMode>('percent');

  // Inputs
  const [balance, setBalance] = useState('');
  const [riskPercent, setRiskPercent] = useState('1');
  const [fixedRisk, setFixedRisk] = useState('');
  const [entry, setEntry] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [lots, setLots] = useState('');
  const [quoteToUsdRate, setQuoteToUsdRate] = useState('');
  const [commissionPerLot, setCommissionPerLot] = useState('');
  const [leverage, setLeverage] = useState('100');

  // Results
  const [positionResult, setPositionResult] = useState<{
    riskAmount: number;
    slPips: number;
    tpPips: number;
    rr: number;
    lots: number;
    units: number;
    pipValue: number;
    potentialLoss: number;
    potentialProfit: number;
    commission: number;
    netLoss: number;
    netProfit: number;
    marginRequired: number;
  } | null>(null);

  const [pnlResult, setPnlResult] = useState<{
    pips: number;
    pipValue: number;
    grossPnl: number;
    commission: number;
    netPnl: number;
    direction: Direction;
  } | null>(null);

  const [rrResult, setRrResult] = useState<{
    riskDistance: number;
    rewardDistance: number;
    riskPips: number;
    rewardPips: number;
    rr: number;
  } | null>(null);

  const [pipResult, setPipResult] = useState<{
    pipValue: number;
    pipValueMini: number;
    pipValueMicro: number;
    pipValueNano: number;
  } | null>(null);

  const [marginResult, setMarginResult] = useState<{
    notionalValue: number;
    marginRequired: number;
    marginPercent: number;
  } | null>(null);

  const [error, setError] = useState('');

  const preset = SYMBOLS[symbol];

  const requiresConversion =
    !!preset &&
    preset.quoteCurrency !== 'USD' &&
    !symbol.startsWith('USD');

  const canCalculatePosition = useMemo(() => {
    const hasBalance = parseInput(balance) > 0;
    const hasRisk =
      riskMode === 'percent'
        ? parseInput(riskPercent) > 0
        : parseInput(fixedRisk) > 0;
    return (
      hasBalance &&
      hasRisk &&
      parseInput(entry) > 0 &&
      parseInput(stopLoss) > 0
    );
  }, [balance, riskPercent, fixedRisk, riskMode, entry, stopLoss]);

  // =========================================================
  // CALCULATE POSITION
  // =========================================================

  const calculatePosition = () => {
    setError('');
    setPositionResult(null);

    const accountBalance = parseInput(balance);
    const riskPercentValue = parseInput(riskPercent);
    const fixedRiskValue = parseInput(fixedRisk);
    const entryPrice = parseInput(entry);
    const stopPrice = parseInput(stopLoss);
    const targetPrice = parseInput(takeProfit);
    const commission = parseInput(commissionPerLot);

    if (accountBalance <= 0) {
      setError('موجودی حساب را درست وارد کنید.');
      return;
    }

    let riskAmount = 0;
    if (riskMode === 'percent') {
      if (riskPercentValue <= 0 || riskPercentValue > 100) {
        setError('درصد ریسک باید بین ۰ و ۱۰۰ باشد.');
        return;
      }
      riskAmount = accountBalance * (riskPercentValue / 100);
    } else {
      if (fixedRiskValue <= 0 || fixedRiskValue > accountBalance) {
        setError('مبلغ ریسک باید مثبت و کمتر از موجودی باشد.');
        return;
      }
      riskAmount = fixedRiskValue;
    }

    if (entryPrice <= 0 || stopPrice <= 0) {
      setError('قیمت ورود و حد ضرر را وارد کنید.');
      return;
    }

    // ✅ اعتبارسنجی جهت معامله
    if (direction === 'BUY') {
      if (stopPrice >= entryPrice) {
        setError('در BUY باید حد ضرر پایین‌تر از قیمت ورود باشد.');
        return;
      }
      if (targetPrice > 0 && targetPrice <= entryPrice) {
        setError('در BUY باید حد سود بالاتر از قیمت ورود باشد.');
        return;
      }
    } else {
      if (stopPrice <= entryPrice) {
        setError('در SELL باید حد ضرر بالاتر از قیمت ورود باشد.');
        return;
      }
      if (targetPrice > 0 && targetPrice >= entryPrice) {
        setError('در SELL باید حد سود پایین‌تر از قیمت ورود باشد.');
        return;
      }
    }

    if (requiresConversion && parseInput(quoteToUsdRate) <= 0) {
      setError('نرخ تبدیل ارز مظنه به USD را وارد کنید.');
      return;
    }

    const stopDistance = Math.abs(entryPrice - stopPrice);
    const targetDistance = targetPrice > 0 ? Math.abs(targetPrice - entryPrice) : 0;

    const slPips = stopDistance / preset.pipSize;
    const tpPips = targetDistance / preset.pipSize;

    const pipValue = getPipValuePerLot(
      symbol,
      entryPrice,
      requiresConversion ? parseInput(quoteToUsdRate) : 1,
    );

    if (pipValue <= 0 || slPips <= 0) {
      setError('مشخصات نماد یا فاصله حد ضرر معتبر نیست.');
      return;
    }

    // ✅ فرمول دقیق حجم
    const totalCommissionPerLot = commission * 2; // رفت و برگشت
    const riskPerLot = slPips * pipValue + totalCommissionPerLot;
    const calculatedLots = riskAmount / riskPerLot;
    const units = calculatedLots * preset.contractSize;
    const rr = tpPips > 0 ? tpPips / slPips : 0;

    const grossLoss = calculatedLots * slPips * pipValue;
    const grossProfit = calculatedLots * tpPips * pipValue;
    const commissionTotal = calculatedLots * commission * 2;

    const netLoss = grossLoss + commissionTotal;
    const netProfit = grossProfit - commissionTotal;

    // ✅ مارجین موردنیاز
    const leverageValue = parseInput(leverage) || 100;
    const notional = units * entryPrice;
    const marginRequired = notional / leverageValue;

    setPositionResult({
      riskAmount,
      slPips,
      tpPips,
      rr,
      lots: calculatedLots,
      units,
      pipValue,
      potentialLoss: grossLoss,
      potentialProfit: grossProfit,
      commission: commissionTotal,
      netLoss,
      netProfit,
      marginRequired,
    });
  };

  // =========================================================
  // CALCULATE P&L — با جهت معامله
  // =========================================================

  const calculatePnl = () => {
    setError('');
    setPnlResult(null);

    const entryPrice = parseInput(entry);
    const exitPrice = parseInput(takeProfit);
    const volume = parseInput(lots);
    const commission = parseInput(commissionPerLot);

    if (entryPrice <= 0 || exitPrice <= 0 || volume <= 0) {
      setError('ورود، خروج و حجم معامله را وارد کنید.');
      return;
    }

    if (entryPrice === exitPrice) {
      setError('قیمت ورود و خروج نباید برابر باشند.');
      return;
    }

    // ✅ اعتبارسنجی جهت
    if (direction === 'BUY' && exitPrice < entryPrice) {
      // این یه معامله ضررده — اشکالی نداره، ولی کاربر باید بدونه
    }

    if (requiresConversion && parseInput(quoteToUsdRate) <= 0) {
      setError('نرخ تبدیل ارز مظنه به USD را وارد کنید.');
      return;
    }

    const pipValue = getPipValuePerLot(
      symbol,
      entryPrice,
      requiresConversion ? parseInput(quoteToUsdRate) : 1,
    );

    if (pipValue <= 0) {
      setError('ارزش pip قابل محاسبه نیست.');
      return;
    }

    const pips = Math.abs(exitPrice - entryPrice) / preset.pipSize;

    // ✅ محاسبه جهت‌دار P&L
    let grossPnl = 0;
    if (direction === 'BUY') {
      // BUY: سود = (خروج - ورود) × حجم
      grossPnl = (exitPrice - entryPrice) / preset.pipSize * pipValue * volume;
    } else {
      // SELL: سود = (ورود - خروج) × حجم
      grossPnl = (entryPrice - exitPrice) / preset.pipSize * pipValue * volume;
    }

    const commissionTotal = volume * commission * 2;
    const netPnl = grossPnl - commissionTotal;

    setPnlResult({
      pips,
      pipValue,
      grossPnl,
      commission: commissionTotal,
      netPnl,
      direction,
    });
  };

  // =========================================================
  // CALCULATE RR
  // =========================================================

  const calculateRR = () => {
    setError('');
    setRrResult(null);

    const entryPrice = parseInput(entry);
    const stopPrice = parseInput(stopLoss);
    const targetPrice = parseInput(takeProfit);

    if (entryPrice <= 0 || stopPrice <= 0 || targetPrice <= 0) {
      setError('ورود، حد ضرر و حد سود را کامل وارد کنید.');
      return;
    }

    if (entryPrice === stopPrice || entryPrice === targetPrice) {
      setError('فاصله‌ها باید بیشتر از صفر باشند.');
      return;
    }

    // ✅ اعتبارسنجی جهت
    if (direction === 'BUY') {
      if (stopPrice >= entryPrice) {
        setError('در BUY باید SL پایین‌تر و TP بالاتر از ورود باشد.');
        return;
      }
      if (targetPrice <= entryPrice) {
        setError('در BUY باید SL پایین‌تر و TP بالاتر از ورود باشد.');
        return;
      }
    } else {
      if (stopPrice <= entryPrice) {
        setError('در SELL باید SL بالاتر و TP پایین‌تر از ورود باشد.');
        return;
      }
      if (targetPrice >= entryPrice) {
        setError('در SELL باید SL بالاتر و TP پایین‌تر از ورود باشد.');
        return;
      }
    }

    const riskDistance = Math.abs(entryPrice - stopPrice);
    const rewardDistance = Math.abs(targetPrice - entryPrice);
    const riskPips = riskDistance / preset.pipSize;
    const rewardPips = rewardDistance / preset.pipSize;

    setRrResult({
      riskDistance,
      rewardDistance,
      riskPips,
      rewardPips,
      rr: rewardPips / riskPips,
    });
  };

  // =========================================================
  // CALCULATE PIP
  // =========================================================

  const calculatePip = () => {
    setError('');
    setPipResult(null);

    const price = parseInput(entry);

    if (price <= 0) {
      setError('قیمت فعلی نماد را وارد کنید.');
      return;
    }

    if (requiresConversion && parseInput(quoteToUsdRate) <= 0) {
      setError('نرخ تبدیل ارز مظنه به USD را وارد کنید.');
      return;
    }

    const pipValue = getPipValuePerLot(
      symbol,
      price,
      requiresConversion ? parseInput(quoteToUsdRate) : 1,
    );

    if (pipValue <= 0) {
      setError('ارزش pip قابل محاسبه نیست.');
      return;
    }

    setPipResult({
      pipValue,
      pipValueMini: pipValue * 0.1,
      pipValueMicro: pipValue * 0.01,
      pipValueNano: pipValue * 0.001,
    });
  };

  // =========================================================
  // CALCULATE MARGIN
  // =========================================================

  const calculateMargin = () => {
    setError('');
    setMarginResult(null);

    const entryPrice = parseInput(entry);
    const volume = parseInput(lots);
    const leverageValue = parseInput(leverage);

    if (entryPrice <= 0) {
      setError('قیمت ورود را وارد کنید.');
      return;
    }

    if (volume <= 0) {
      setError('حجم معامله را وارد کنید.');
      return;
    }

    if (leverageValue <= 0) {
      setError('لوریج را وارد کنید.');
      return;
    }

    const units = volume * preset.contractSize;
    const notional = units * entryPrice;
    const marginRequired = notional / leverageValue;
    const marginPercent = (1 / leverageValue) * 100;

    setMarginResult({
      notionalValue: notional,
      marginRequired,
      marginPercent,
    });
  };

  const calculate = () => {
    if (tool === 'position') calculatePosition();
    else if (tool === 'pnl') calculatePnl();
    else if (tool === 'rr') calculateRR();
    else if (tool === 'pip') calculatePip();
    else calculateMargin();
  };

  const reset = () => {
    setBalance('');
    setRiskPercent('1');
    setFixedRisk('');
    setEntry('');
    setStopLoss('');
    setTakeProfit('');
    setLots('');
    setQuoteToUsdRate('');
    setCommissionPerLot('');
    setLeverage('100');
    setDirection('BUY');
    setPositionResult(null);
    setPnlResult(null);
    setRrResult(null);
    setPipResult(null);
    setMarginResult(null);
    setError('');
  };

  // =========================================================
  // SUB-COMPONENTS
  // =========================================================

  const InputField = ({
    label,
    value,
    onChangeText,
    placeholder,
    icon,
    suffix,
    keyboardType = 'decimal-pad',
  }: {
    label: string;
    value: string;
    onChangeText: (value: string) => void;
    placeholder: string;
    icon: keyof typeof Ionicons.glyphMap;
    suffix?: string;
    keyboardType?: 'default' | 'decimal-pad' | 'numeric';
  }) => (
    <View style={styles.inputBlock}>
      <Text style={[styles.inputLabel, { color: colors.secondaryText }]}>
        {label}
      </Text>
      <View
        style={[
          styles.inputWrapper,
          { backgroundColor: colors.input, borderColor: colors.border },
        ]}
      >
        <View style={[styles.inputIcon, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name={icon} size={18} color={colors.primary} />
        </View>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedText}
          keyboardType={keyboardType}
          style={[styles.input, { color: colors.text }]}
        />
        {suffix ? (
          <Text style={[styles.suffix, { color: colors.mutedText }]}>
            {suffix}
          </Text>
        ) : null}
      </View>
    </View>
  );

  const ResultBox = ({
    label,
    value,
    color,
  }: {
    label: string;
    value: string;
    color?: string;
  }) => (
    <View
      style={[
        styles.resultBox,
        { backgroundColor: colors.cardSecondary, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.resultLabel, { color: colors.mutedText }]}>
        {label}
      </Text>
      <Text style={[styles.resultValue, { color: color ?? colors.text }]}>
        {value}
      </Text>
    </View>
  );

  // ✅ انتخابگر جهت معامله
  const DirectionPicker = () => (
    <View style={styles.inputBlock}>
      <Text style={[styles.inputLabel, { color: colors.secondaryText }]}>
        جهت معامله
      </Text>
      <View style={styles.directionRow}>
        <TouchableOpacity
          onPress={() => setDirection('BUY')}
          style={[
            styles.directionBtn,
            {
              backgroundColor:
                direction === 'BUY' ? colors.success : colors.input,
              borderColor:
                direction === 'BUY' ? colors.success : colors.border,
            },
          ]}
        >
          <Ionicons
            name="arrow-up"
            size={17}
            color={direction === 'BUY' ? '#FFFFFF' : colors.success}
          />
          <Text
            style={[
              styles.directionBtnText,
              {
                color: direction === 'BUY' ? '#FFFFFF' : colors.success,
              },
            ]}
          >
            BUY
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setDirection('SELL')}
          style={[
            styles.directionBtn,
            {
              backgroundColor:
                direction === 'SELL' ? colors.danger : colors.input,
              borderColor:
                direction === 'SELL' ? colors.danger : colors.border,
            },
          ]}
        >
          <Ionicons
            name="arrow-down"
            size={17}
            color={direction === 'SELL' ? '#FFFFFF' : colors.danger}
          />
          <Text
            style={[
              styles.directionBtnText,
              {
                color: direction === 'SELL' ? '#FFFFFF' : colors.danger,
              },
            ]}
          >
            SELL
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ✅ انتخابگر حالت ریسک
  const RiskModePicker = () => (
    <View style={styles.inputBlock}>
      <Text style={[styles.inputLabel, { color: colors.secondaryText }]}>
        حالت ریسک
      </Text>
      <View style={styles.directionRow}>
        <TouchableOpacity
          onPress={() => setRiskMode('percent')}
          style={[
            styles.directionBtn,
            {
              backgroundColor:
                riskMode === 'percent' ? colors.primary : colors.input,
              borderColor:
                riskMode === 'percent' ? colors.primary : colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.directionBtnText,
              {
                color: riskMode === 'percent' ? '#FFFFFF' : colors.primary,
              },
            ]}
          >
            درصد (%)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setRiskMode('fixed')}
          style={[
            styles.directionBtn,
            {
              backgroundColor:
                riskMode === 'fixed' ? colors.primary : colors.input,
              borderColor:
                riskMode === 'fixed' ? colors.primary : colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.directionBtnText,
              {
                color: riskMode === 'fixed' ? '#FFFFFF' : colors.primary,
              },
            ]}
          >
            مبلغ ثابت ($)
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        pointerEvents="none"
        style={[styles.glowTop, { backgroundColor: colors.primarySoft }]}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + Spacing.five,
            paddingBottom: BottomTabInset + Spacing.six,
          },
        ]}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View
            style={[
              styles.headerIcon,
              { backgroundColor: colors.primarySoft, borderColor: colors.border },
            ]}
          >
            <Ionicons name="calculator-outline" size={25} color={colors.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.text }]}>
              ماشین‌حساب حرفه‌ای
            </Text>
            <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
              محاسبه دقیق پیپ، حجم، مارجین و سود/زیان
            </Text>
          </View>
        </View>

        {/* SYMBOL PICKER */}
        <View
          style={[
            styles.symbolCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.symbolHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                نماد معامله
              </Text>
              <Text
                style={[styles.sectionSubtitle, { color: colors.mutedText }]}
              >
                {Object.keys(SYMBOLS).length} نماد پشتیبانی می‌شود
              </Text>
            </View>
            <View
              style={[styles.symbolIcon, { backgroundColor: colors.primarySoft }]}
            >
              <Ionicons
                name="swap-horizontal-outline"
                size={20}
                color={colors.primary}
              />
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setShowSymbols((v) => !v)}
            style={[
              styles.symbolSelector,
              { backgroundColor: colors.input, borderColor: colors.border },
            ]}
          >
            <Ionicons
              name={showSymbols ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.secondaryText}
            />
            <Text style={[styles.symbolSelectorText, { color: colors.text }]}>
              {preset.label}
            </Text>
            <View style={[styles.symbolBadge, { backgroundColor: colors.primarySoft }]}>
              <Text style={[styles.symbolBadgeText, { color: colors.primary }]}>
                {preset.category.toUpperCase()}
              </Text>
            </View>
          </TouchableOpacity>

          {showSymbols ? (
            <ScrollView
              style={[
                styles.symbolList,
                { backgroundColor: colors.cardSecondary, borderColor: colors.border },
              ]}
              nestedScrollEnabled
            >
              {Object.entries(SYMBOLS).map(([key, item]) => (
                <TouchableOpacity
                  key={key}
                  activeOpacity={0.8}
                  onPress={() => {
                    setSymbol(key);
                    setShowSymbols(false);
                    setPositionResult(null);
                    setPnlResult(null);
                    setPipResult(null);
                    setMarginResult(null);
                    setError('');
                  }}
                  style={[
                    styles.symbolOption,
                    { borderBottomColor: colors.border },
                  ]}
                >
                  <Text
                    style={[
                      styles.symbolOptionText,
                      { color: symbol === key ? colors.primary : colors.text },
                    ]}
                  >
                    {item.label}
                  </Text>
                  <Text
                    style={[styles.symbolOptionMeta, { color: colors.mutedText }]}
                  >
                    pip: {item.pipSize}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : null}
        </View>

        {/* TOOL TABS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.toolTabs}
        >
          {TOOL_ITEMS.map((item) => {
            const active = tool === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.85}
                onPress={() => {
                  setTool(item.id);
                  setError('');
                  setPositionResult(null);
                  setPnlResult(null);
                  setRrResult(null);
                  setPipResult(null);
                  setMarginResult(null);
                }}
                style={[
                  styles.toolTab,
                  {
                    backgroundColor: active ? colors.primary : colors.card,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Ionicons
                  name={item.icon}
                  size={17}
                  color={active ? '#FFFFFF' : colors.secondaryText}
                />
                <Text
                  style={[
                    styles.toolTabText,
                    { color: active ? '#FFFFFF' : colors.secondaryText },
                  ]}
                >
                  {item.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* INPUT CARD */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {tool === 'position' && 'محاسبه حجم پوزیشن'}
                {tool === 'pnl' && 'محاسبه سود و زیان'}
                {tool === 'rr' && 'محاسبه R:R'}
                {tool === 'pip' && 'محاسبه ارزش Pip'}
                {tool === 'margin' && 'محاسبه مارجین موردنیاز'}
              </Text>
              <Text
                style={[styles.cardSubtitle, { color: colors.mutedText }]}
              >
                {tool === 'position' && 'حجم دقیق بر اساس ریسک و جهت معامله'}
                {tool === 'pnl' && 'با در نظر گرفتن جهت BUY/SELL و کمیسیون'}
                {tool === 'rr' && 'نسبت ریسک به بازده با اعتبارسنجی'}
                {tool === 'pip' && 'ارزش هر پیپ در همه سایزها'}
                {tool === 'margin' && 'مارجین لازم برای باز کردن پوزیشن'}
              </Text>
            </View>
            <View style={[styles.cardIcon, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="analytics-outline" size={21} color={colors.primary} />
            </View>
          </View>

          {/* POSITION */}
          {tool === 'position' ? (
            <>
              <InputField
                label="موجودی حساب"
                value={balance}
                onChangeText={setBalance}
                placeholder="مثلاً 10000"
                icon="wallet-outline"
                suffix="USD"
              />

              <RiskModePicker />

              {riskMode === 'percent' ? (
                <InputField
                  label="درصد ریسک"
                  value={riskPercent}
                  onChangeText={setRiskPercent}
                  placeholder="مثلاً 1"
                  icon="pie-chart-outline"
                  suffix="%"
                />
              ) : (
                <InputField
                  label="مبلغ ریسک (ثابت)"
                  value={fixedRisk}
                  onChangeText={setFixedRisk}
                  placeholder="مثلاً 100"
                  icon="cash-outline"
                  suffix="USD"
                />
              )}

              <DirectionPicker />

              <View style={styles.row}>
                <View style={styles.half}>
                  <InputField
                    label="قیمت ورود"
                    value={entry}
                    onChangeText={setEntry}
                    placeholder="قیمت ورود"
                    icon="log-in-outline"
                  />
                </View>
                <View style={styles.half}>
                  <InputField
                    label="حد ضرر"
                    value={stopLoss}
                    onChangeText={setStopLoss}
                    placeholder="Stop Loss"
                    icon="shield-outline"
                  />
                </View>
              </View>

              <InputField
                label="حد سود (اختیاری)"
                value={takeProfit}
                onChangeText={setTakeProfit}
                placeholder="Take Profit"
                icon="flag-outline"
              />

              <InputField
                label="لوریج (برای مارجین)"
                value={leverage}
                onChangeText={setLeverage}
                placeholder="1:100 → 100"
                icon="shield-half-outline"
                suffix="x"
              />

              <InputField
                label="کمیسیون هر لات (رفت)"
                value={commissionPerLot}
                onChangeText={setCommissionPerLot}
                placeholder="مثلاً 3.5"
                icon="cash-outline"
                suffix="USD"
              />

              {requiresConversion ? (
                <InputField
                  label="نرخ تبدیل ارز مظنه به USD"
                  value={quoteToUsdRate}
                  onChangeText={setQuoteToUsdRate}
                  placeholder="مثلاً 1.34"
                  icon="swap-horizontal-outline"
                />
              ) : null}
            </>
          ) : null}

          {/* PNL */}
          {tool === 'pnl' ? (
            <>
              <DirectionPicker />

              <InputField
                label="قیمت ورود"
                value={entry}
                onChangeText={setEntry}
                placeholder="Entry"
                icon="log-in-outline"
              />

              <InputField
                label="قیمت خروج"
                value={takeProfit}
                onChangeText={setTakeProfit}
                placeholder="Exit"
                icon="exit-outline"
              />

              <InputField
                label="حجم معامله"
                value={lots}
                onChangeText={setLots}
                placeholder="مثلاً 0.50"
                icon="resize-outline"
                suffix="Lot"
              />

              <InputField
                label="کمیسیون هر لات (رفت)"
                value={commissionPerLot}
                onChangeText={setCommissionPerLot}
                placeholder="مثلاً 3.5"
                icon="cash-outline"
                suffix="USD"
              />

              {requiresConversion ? (
                <InputField
                  label="نرخ تبدیل ارز مظنه به USD"
                  value={quoteToUsdRate}
                  onChangeText={setQuoteToUsdRate}
                  placeholder="مثلاً 1.34"
                  icon="swap-horizontal-outline"
                />
              ) : null}
            </>
          ) : null}

          {/* RR */}
          {tool === 'rr' ? (
            <>
              <DirectionPicker />

              <InputField
                label="قیمت ورود"
                value={entry}
                onChangeText={setEntry}
                placeholder="Entry"
                icon="log-in-outline"
              />

              <InputField
                label="حد ضرر"
                value={stopLoss}
                onChangeText={setStopLoss}
                placeholder="Stop Loss"
                icon="shield-outline"
              />

              <InputField
                label="حد سود"
                value={takeProfit}
                onChangeText={setTakeProfit}
                placeholder="Take Profit"
                icon="flag-outline"
              />
            </>
          ) : null}

          {/* PIP */}
          {tool === 'pip' ? (
            <>
              <InputField
                label="قیمت فعلی نماد"
                value={entry}
                onChangeText={setEntry}
                placeholder="Current price"
                icon="trending-up-outline"
              />

              {requiresConversion ? (
                <InputField
                  label="نرخ تبدیل ارز مظنه به USD"
                  value={quoteToUsdRate}
                  onChangeText={setQuoteToUsdRate}
                  placeholder="مثلاً 1.34"
                  icon="swap-horizontal-outline"
                />
              ) : null}

              <View
                style={[
                  styles.contractInfo,
                  {
                    backgroundColor: colors.cardSecondary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[styles.contractInfoTitle, { color: colors.text }]}
                >
                  مشخصات {preset.label}
                </Text>
                <View style={styles.contractRows}>
                  <Text
                    style={[
                      styles.contractText,
                      { color: colors.secondaryText },
                    ]}
                  >
                    اندازه قرارداد: {formatNumber(preset.contractSize, 0)}
                  </Text>
                  <Text
                    style={[
                      styles.contractText,
                      { color: colors.secondaryText },
                    ]}
                  >
                    اندازه ۱ پیپ: {preset.pipSize}
                  </Text>
                </View>
              </View>
            </>
          ) : null}

          {/* MARGIN */}
          {tool === 'margin' ? (
            <>
              <InputField
                label="قیمت ورود"
                value={entry}
                onChangeText={setEntry}
                placeholder="Entry"
                icon="log-in-outline"
              />

              <InputField
                label="حجم معامله"
                value={lots}
                onChangeText={setLots}
                placeholder="مثلاً 1.00"
                icon="resize-outline"
                suffix="Lot"
              />

              <InputField
                label="لوریج"
                value={leverage}
                onChangeText={setLeverage}
                placeholder="1:100 → 100"
                icon="shield-half-outline"
                suffix="x"
              />
            </>
          ) : null}

          {/* ERROR */}
          {error ? (
            <View
              style={[
                styles.errorCard,
                { backgroundColor: colors.cardSecondary, borderColor: colors.danger },
              ]}
            >
              <Ionicons
                name="alert-circle-outline"
                size={19}
                color={colors.danger}
              />
              <Text
                style={[styles.errorText, { color: colors.danger }]}
              >
                {error}
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={calculate}
            style={[styles.calculateButton, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="calculator-outline" size={20} color="#FFFFFF" />
            <Text style={styles.calculateButtonText}>محاسبه</Text>
          </TouchableOpacity>
        </View>

        {/* ========== RESULTS ========== */}

        {/* POSITION RESULT */}
        {tool === 'position' && positionResult ? (
          <View
            style={[
              styles.resultCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.resultHeader}>
              <View>
                <Text style={[styles.resultTitle, { color: colors.text }]}>
                  حجم پیشنهادی
                </Text>
                <Text
                  style={[styles.resultSubtitle, { color: colors.mutedText }]}
                >
                  {direction === 'BUY' ? 'معامله خرید' : 'معامله فروش'} — {preset.label}
                </Text>
              </View>
              <View
                style={[styles.resultIcon, { backgroundColor: colors.primarySoft }]}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={24}
                  color={colors.primary}
                />
              </View>
            </View>

            <View
              style={[
                styles.mainResult,
                { backgroundColor: colors.primarySoft, borderColor: colors.border },
              ]}
            >
              <Text
                style={[styles.mainResultLabel, { color: colors.secondaryText }]}
              >
                حجم دقیق
              </Text>
              <Text
                style={[styles.mainResultValue, { color: colors.primary }]}
              >
                {formatNumber(positionResult.lots, 2)} Lot
              </Text>
              <Text
                style={[styles.mainResultSub, { color: colors.mutedText }]}
              >
                {formatNumber(positionResult.units, 0)} Units
              </Text>
            </View>

            <View style={styles.resultGrid}>
              <ResultBox
                label="مبلغ ریسک"
                value={`$${formatNumber(positionResult.riskAmount)}`}
                color={colors.danger}
              />
              <ResultBox
                label="R:R"
                value={
                  positionResult.rr > 0
                    ? `1 : ${formatNumber(positionResult.rr, 2)}`
                    : '—'
                }
                color={colors.primary}
              />
              <ResultBox
                label="فاصله SL"
                value={`${formatNumber(positionResult.slPips, 1)} pips`}
              />
              <ResultBox
                label="فاصله TP"
                value={
                  positionResult.tpPips > 0
                    ? `${formatNumber(positionResult.tpPips, 1)} pips`
                    : '—'
                }
                color={colors.success}
              />
              <ResultBox
                label="ارزش ۱ پیپ / لات"
                value={`$${formatNumber(positionResult.pipValue, 2)}`}
              />
              <ResultBox
                label="مارجین موردنیاز"
                value={`$${formatNumber(positionResult.marginRequired)}`}
                color={colors.primary}
              />
              <ResultBox
                label="زیان خالص (با کمیسیون)"
                value={`-$${formatNumber(positionResult.netLoss)}`}
                color={colors.danger}
              />
              <ResultBox
                label="سود خالص (با کمیسیون)"
                value={
                  positionResult.netProfit !== 0
                    ? `+$${formatNumber(positionResult.netProfit)}`
                    : '—'
                }
                color={colors.success}
              />
            </View>
          </View>
        ) : null}

        {/* PNL RESULT */}
        {tool === 'pnl' && pnlResult ? (
          <View
            style={[
              styles.resultCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.resultHeader}>
              <View>
                <Text style={[styles.resultTitle, { color: colors.text }]}>
                  سود / زیان خالص
                </Text>
                <Text
                  style={[styles.resultSubtitle, { color: colors.mutedText }]}
                >
                  {pnlResult.direction === 'BUY' ? 'BUY' : 'SELL'} — با کمیسیون
                </Text>
              </View>
              <View
                style={[
                  styles.resultIcon,
                  {
                    backgroundColor:
                      pnlResult.netPnl >= 0
                        ? `${colors.success}22`
                        : `${colors.danger}22`,
                  },
                ]}
              >
                <Ionicons
                  name={pnlResult.netPnl >= 0 ? 'trending-up' : 'trending-down'}
                  size={24}
                  color={pnlResult.netPnl >= 0 ? colors.success : colors.danger}
                />
              </View>
            </View>

            <View
              style={[
                styles.mainResult,
                {
                  backgroundColor:
                    pnlResult.netPnl >= 0
                      ? `${colors.success}15`
                      : `${colors.danger}15`,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[styles.mainResultLabel, { color: colors.secondaryText }]}
              >
                P&L خالص
              </Text>
              <Text
                style={[
                  styles.mainResultValue,
                  {
                    color:
                      pnlResult.netPnl >= 0 ? colors.success : colors.danger,
                  },
                ]}
              >
                {pnlResult.netPnl >= 0 ? '+' : '-'}$
                {formatNumber(Math.abs(pnlResult.netPnl))}
              </Text>
            </View>

            <View style={styles.resultGrid}>
              <ResultBox
                label="حرکت قیمت"
                value={`${formatNumber(pnlResult.pips, 1)} pips`}
              />
              <ResultBox
                label="ارزش ۱ پیپ / لات"
                value={`$${formatNumber(pnlResult.pipValue, 2)}`}
              />
              <ResultBox
                label="P&L خام"
                value={`${pnlResult.grossPnl >= 0 ? '+' : '-'}$${formatNumber(Math.abs(pnlResult.grossPnl))}`}
                color={pnlResult.grossPnl >= 0 ? colors.success : colors.danger}
              />
              <ResultBox
                label="کمیسیون کل"
                value={`-$${formatNumber(pnlResult.commission)}`}
                color={colors.danger}
              />
            </View>
          </View>
        ) : null}

        {/* RR RESULT */}
        {tool === 'rr' && rrResult ? (
          <View
            style={[
              styles.resultCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.resultHeader}>
              <View>
                <Text style={[styles.resultTitle, { color: colors.text }]}>
                  نسبت R:R
                </Text>
                <Text
                  style={[styles.resultSubtitle, { color: colors.mutedText }]}
                >
                  {direction === 'BUY' ? 'BUY' : 'SELL'}
                </Text>
              </View>
              <View
                style={[styles.resultIcon, { backgroundColor: colors.primarySoft }]}
              >
                <Ionicons
                  name="git-compare-outline"
                  size={24}
                  color={colors.primary}
                />
              </View>
            </View>

            <View
              style={[
                styles.mainResult,
                { backgroundColor: colors.primarySoft, borderColor: colors.border },
              ]}
            >
              <Text
                style={[styles.mainResultLabel, { color: colors.secondaryText }]}
              >
                R:R
              </Text>
              <Text style={[styles.mainResultValue, { color: colors.primary }]}>
                1 : {formatNumber(rrResult.rr, 2)}
              </Text>
            </View>

            <View style={styles.resultGrid}>
              <ResultBox
                label="فاصله ریسک"
                value={`${formatNumber(rrResult.riskPips, 1)} pips`}
                color={colors.danger}
              />
              <ResultBox
                label="فاصله ریوارد"
                value={`${formatNumber(rrResult.rewardPips, 1)} pips`}
                color={colors.success}
              />
              <ResultBox
                label="ریسک (قیمتی)"
                value={formatPrice(rrResult.riskDistance, symbol)}
              />
              <ResultBox
                label="ریوارد (قیمتی)"
                value={formatPrice(rrResult.rewardDistance, symbol)}
                color={colors.success}
              />
            </View>
          </View>
        ) : null}

        {/* PIP RESULT */}
        {tool === 'pip' && pipResult ? (
          <View
            style={[
              styles.resultCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.resultHeader}>
              <View>
                <Text style={[styles.resultTitle, { color: colors.text }]}>
                  ارزش Pip — {preset.label}
                </Text>
                <Text
                  style={[styles.resultSubtitle, { color: colors.mutedText }]}
                >
                  ارزش هر پیپ در ارز حساب (USD)
                </Text>
              </View>
              <View
                style={[styles.resultIcon, { backgroundColor: colors.primarySoft }]}
              >
                <Ionicons
                  name="trending-up-outline"
                  size={24}
                  color={colors.primary}
                />
              </View>
            </View>

            <View
              style={[
                styles.mainResult,
                { backgroundColor: colors.primarySoft, borderColor: colors.border },
              ]}
            >
              <Text
                style={[styles.mainResultLabel, { color: colors.secondaryText }]}
              >
                ۱ استاندارد لات
              </Text>
              <Text style={[styles.mainResultValue, { color: colors.primary }]}>
                ${formatNumber(pipResult.pipValue, 2)}
              </Text>
            </View>

            <View style={styles.resultGrid}>
              <ResultBox
                label="Mini Lot (0.10)"
                value={`$${formatNumber(pipResult.pipValueMini, 2)}`}
              />
              <ResultBox
                label="Micro Lot (0.01)"
                value={`$${formatNumber(pipResult.pipValueMicro, 2)}`}
              />
              <ResultBox
                label="Nano Lot (0.001)"
                value={`$${formatNumber(pipResult.pipValueNano, 3)}`}
              />
              <ResultBox
                label="اندازه ۱ پیپ"
                value={String(preset.pipSize)}
              />
            </View>
          </View>
        ) : null}

        {/* MARGIN RESULT */}
        {tool === 'margin' && marginResult ? (
          <View
            style={[
              styles.resultCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.resultHeader}>
              <View>
                <Text style={[styles.resultTitle, { color: colors.text }]}>
                  مارجین موردنیاز
                </Text>
                <Text
                  style={[styles.resultSubtitle, { color: colors.mutedText }]}
                >
                  برای باز کردن پوزیشن با لوریج {leverage}:1
                </Text>
              </View>
              <View
                style={[styles.resultIcon, { backgroundColor: colors.primarySoft }]}
              >
                <Ionicons
                  name="shield-half-outline"
                  size={24}
                  color={colors.primary}
                />
              </View>
            </View>

            <View
              style={[
                styles.mainResult,
                { backgroundColor: colors.primarySoft, borderColor: colors.border },
              ]}
            >
              <Text
                style={[styles.mainResultLabel, { color: colors.secondaryText }]}
              >
                مارجین
              </Text>
              <Text style={[styles.mainResultValue, { color: colors.primary }]}>
                ${formatNumber(marginResult.marginRequired)}
              </Text>
              <Text
                style={[styles.mainResultSub, { color: colors.mutedText }]}
              >
                {formatNumber(marginResult.marginPercent, 2)}% از حجم قرارداد
              </Text>
            </View>

            <View style={styles.resultGrid}>
              <ResultBox
                label="ارزش قرارداد (Notional)"
                value={`$${formatNumber(marginResult.notionalValue)}`}
              />
            </View>
          </View>
        ) : null}

        {/* FORMULA INFO */}
        <View
          style={[
            styles.accuracyCard,
            { backgroundColor: colors.cardSecondary, borderColor: colors.border },
          ]}
        >
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={colors.primary}
          />
          <View style={styles.accuracyText}>
            <Text style={[styles.accuracyTitle, { color: colors.text }]}>
              فرمول‌های استفاده‌شده
            </Text>
            <Text
              style={[styles.accuracyBody, { color: colors.secondaryText }]}
            >
              • پیپ: ۰.۰۰۰۱ (فارکس)، ۰.۰۱ (JPY)، ۰.۱۰ (طلا) — نه پیپت{'\n'}
              • حجم = ریسک ÷ (فاصله SL پیپ × ارزش پیپ + کمیسیون){'\n'}
              • P&L: BUY = (خروج - ورود)، SELL = (ورود - خروج){'\n'}
              • مارجین = (حجم × اندازه قرارداد × قیمت) ÷ لوریج
            </Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={reset}
          style={[
            styles.resetButton,
            { borderColor: colors.border, backgroundColor: colors.card },
          ]}
        >
          <Ionicons
            name="refresh-outline"
            size={18}
            color={colors.secondaryText}
          />
          <Text
            style={[styles.resetButtonText, { color: colors.secondaryText }]}
          >
            پاک کردن اطلاعات
          </Text>
        </TouchableOpacity>

        <Text
          style={[styles.footerDisclaimer, { color: colors.mutedText }]}
        >
          NAVASAN Calculator — این نتایج تقریبی هستند و ممکن است با محاسبات
          دقیق بروکر شما کمی متفاوت باشند. همیشه مشخصات قرارداد بروکر خود را
          بررسی کنید.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// =========================================================
// STYLES
// =========================================================

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  content: { flexGrow: 1, paddingHorizontal: Spacing.five },
  glowTop: {
    position: 'absolute',
    top: -150,
    right: -120,
    width: 320,
    height: 320,
    borderRadius: 160,
    opacity: 0.28,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  headerText: { flex: 1, alignItems: 'flex-end' },
  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.three,
  },
  title: { fontSize: 27, fontWeight: '900', textAlign: 'right' },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'right',
  },
  symbolCard: {
    borderWidth: 1,
    borderRadius: Radius.xLarge,
    padding: Spacing.four,
    marginBottom: Spacing.three,
  },
  symbolHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  symbolIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { fontSize: 16, fontWeight: '900', textAlign: 'right' },
  sectionSubtitle: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 3,
    textAlign: 'right',
  },
  symbolSelector: {
    minHeight: 54,
    borderWidth: 1,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
  },
  symbolSelectorText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'right',
    marginHorizontal: Spacing.two,
  },
  symbolBadge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 },
  symbolBadgeText: { fontSize: 9, fontWeight: '900' },
  symbolList: {
    maxHeight: 300,
    borderWidth: 1,
    borderRadius: 16,
    marginTop: Spacing.two,
    overflow: 'hidden',
  },
  symbolOption: {
    minHeight: 48,
    borderBottomWidth: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
  },
  symbolOptionText: { fontSize: 13, fontWeight: '900' },
  symbolOptionMeta: { fontSize: 10, fontWeight: '600' },
  toolTabs: { paddingBottom: Spacing.three, gap: 8 },
  toolTab: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 15,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 13,
  },
  toolTabText: { fontSize: 11, fontWeight: '900', marginRight: 6 },
  card: {
    borderWidth: 1,
    borderRadius: 22,
    padding: Spacing.four,
    marginBottom: Spacing.four,
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.four,
  },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 17, fontWeight: '900', textAlign: 'right' },
  cardSubtitle: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 3,
    textAlign: 'right',
    maxWidth: 260,
  },
  inputBlock: { marginBottom: Spacing.three },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: Spacing.two,
    textAlign: 'right',
  },
  inputWrapper: {
    minHeight: 54,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: Spacing.two,
  },
  inputIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.two,
  },
  input: {
    flex: 1,
    minHeight: 52,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'right',
    paddingHorizontal: Spacing.two,
  },
  suffix: { fontSize: 10, fontWeight: '800', marginLeft: 5 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  half: { width: '48.5%' },
  directionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  directionBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  directionBtnText: { fontSize: 13, fontWeight: '900' },
  contractInfo: {
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
  contractInfoTitle: {
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'right',
    marginBottom: 7,
  },
  contractRows: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
  },
  contractText: { fontSize: 10, fontWeight: '600' },
  errorCard: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 15,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.three,
  },
  errorText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 18,
    fontWeight: '700',
    textAlign: 'right',
    marginRight: 7,
  },
  calculateButton: {
    minHeight: 56,
    borderRadius: 17,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    marginTop: Spacing.two,
  },
  calculateButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    marginRight: Spacing.two,
  },
  resultCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: Spacing.four,
    marginBottom: Spacing.four,
  },
  resultHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.four,
  },
  resultTitle: { fontSize: 17, fontWeight: '900', textAlign: 'right' },
  resultSubtitle: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 3,
    textAlign: 'right',
  },
  resultIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainResult: {
    borderWidth: 1,
    borderRadius: 18,
    minHeight: 122,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  mainResultLabel: { fontSize: 11, fontWeight: '700' },
  mainResultValue: { fontSize: 29, fontWeight: '900', marginTop: 5 },
  mainResultSub: { fontSize: 11, fontWeight: '700', marginTop: 3 },
  resultGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  resultBox: {
    width: '48.5%',
    minHeight: 82,
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.three,
    marginBottom: Spacing.two,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  resultLabel: { fontSize: 10, fontWeight: '700', textAlign: 'right' },
  resultValue: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 6,
    textAlign: 'right',
  },
  accuracyCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: Spacing.three,
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    marginBottom: Spacing.four,
  },
  accuracyText: { flex: 1, marginRight: 8 },
  accuracyTitle: { fontSize: 12, fontWeight: '900', textAlign: 'right' },
  accuracyBody: {
    fontSize: 10,
    lineHeight: 19,
    fontWeight: '600',
    textAlign: 'right',
    marginTop: 5,
  },
  resetButton: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 16,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.three,
  },
  resetButtonText: { fontSize: 12, fontWeight: '800', marginRight: Spacing.two },
  footerDisclaimer: {
    fontSize: 9,
    lineHeight: 17,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.three,
  },
});