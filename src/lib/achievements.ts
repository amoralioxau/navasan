// =========================================================
// ACHIEVEMENTS
// =========================================================

export type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  xpReward: number;
  category: 'trading' | 'discipline' | 'skill' | 'milestone' | 'secret';
  hidden?: boolean;
  check: (stats: AchievementStats) => boolean;
};

export type AchievementStats = {
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  totalXP: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  planAdherence: number;
  uniquePairs: number;
  uniqueSetups: number;
  hasInitialBalance: boolean;
  hasNotes: boolean;
  bestWinStreak: number;
  totalProfit: number;
  averageRating: number;
};

export const ACHIEVEMENTS: Achievement[] = [
  // ================= MILESTONE =================
  {
    id: 'first_trade',
    title: 'شروع سفر',
    description: 'اولین معامله‌ات رو ثبت کردی',
    icon: 'flag',
    color: '#2563EB',
    xpReward: 20,
    category: 'milestone',
    check: (s) => s.totalTrades >= 1,
  },
  {
    id: 'ten_trades',
    title: 'ده معامله',
    description: '۱۰ معامله ثبت کردی',
    icon: 'ribbon',
    color: '#0891B2',
    xpReward: 50,
    category: 'milestone',
    check: (s) => s.totalTrades >= 10,
  },
  {
    id: 'fifty_trades',
    title: 'پنجاه معامله',
    description: '۵۰ معامله ثبت کردی',
    icon: 'medal',
    color: '#7C3AED',
    xpReward: 150,
    category: 'milestone',
    check: (s) => s.totalTrades >= 50,
  },
  {
    id: 'hundred_trades',
    title: 'صد معامله',
    description: '۱۰۰ معامله ثبت کردی',
    icon: 'trophy',
    color: '#EAB308',
    xpReward: 300,
    category: 'milestone',
    check: (s) => s.totalTrades >= 100,
  },
  {
    id: 'level_5',
    title: 'حرفه‌ای شدی',
    description: 'به سطح ۵ رسیدی',
    icon: 'diamond',
    color: '#EC4899',
    xpReward: 200,
    category: 'milestone',
    check: (s) => s.level >= 5,
  },

  // ================= TRADING =================
  {
    id: 'winrate_60',
    title: 'دقت بالا',
    description: 'وین‌ریت ۶۰٪+ با حداقل ۲۰ معامله',
    icon: 'target',
    color: '#16A34A',
    xpReward: 100,
    category: 'trading',
    check: (s) => s.winRate >= 60 && s.totalTrades >= 20,
  },
  {
    id: 'winrate_70',
    title: 'تک‌تیرانداز',
    description: 'وین‌ریت ۷۰٪+ با حداقل ۳۰ معامله',
    icon: 'locate',
    color: '#16A34A',
    xpReward: 250,
    category: 'trading',
    check: (s) => s.winRate >= 70 && s.totalTrades >= 30,
  },
  {
    id: 'pf_2',
    title: 'Profit Factor 2+',
    description: 'به ازای هر دلار ضرر، ۲ دلار سود',
    icon: 'trending-up',
    color: '#16A34A',
    xpReward: 100,
    category: 'trading',
    check: (s) => s.profitFactor >= 2 && s.totalTrades >= 20,
  },
  {
    id: 'pf_3',
    title: 'ماشین پول‌سازی',
    description: 'Profit Factor 3+ با حداقل ۳۰ معامله',
    icon: 'cash',
    color: '#16A34A',
    xpReward: 300,
    category: 'trading',
    check: (s) => s.profitFactor >= 3 && s.totalTrades >= 30,
  },
  {
    id: 'profit_1000',
    title: 'هزار دلاری',
    description: 'سود کل به ۱۰۰۰ دلار رسید',
    icon: 'wallet',
    color: '#16A34A',
    xpReward: 200,
    category: 'trading',
    check: (s) => s.totalProfit >= 1000,
  },
  {
    id: 'profit_5000',
    title: 'پنج‌هزار دلاری',
    description: 'سود کل به ۵۰۰۰ دلار رسید',
    icon: 'diamond',
    color: '#EAB308',
    xpReward: 500,
    category: 'trading',
    check: (s) => s.totalProfit >= 5000,
  },
  {
    id: 'win_streak_5',
    title: 'زنجیره طلایی',
    description: '۵ برد پشت سر هم',
    icon: 'flame',
    color: '#F59E0B',
    xpReward: 100,
    category: 'trading',
    check: (s) => s.bestWinStreak >= 5,
  },
  {
    id: 'win_streak_10',
    title: 'زنجیره افسانه‌ای',
    description: '۱۰ برد پشت سر هم',
    icon: 'bonfire',
    color: '#EF4444',
    xpReward: 400,
    category: 'trading',
    check: (s) => s.bestWinStreak >= 10,
  },
  {
    id: 'five_stars',
    title: 'معامله کامل',
    description: 'میانگین امتیاز معاملات ۴.۵+',
    icon: 'star',
    color: '#F59E0B',
    xpReward: 150,
    category: 'trading',
    check: (s) => s.averageRating >= 4.5 && s.totalTrades >= 20,
  },

  // ================= DISCIPLINE =================
  {
    id: 'plan_master',
    title: 'استاد پلن',
    description: 'پایبندی به پلن بالای ۸۰٪',
    icon: 'shield-checkmark',
    color: '#2563EB',
    xpReward: 150,
    category: 'discipline',
    check: (s) => s.planAdherence >= 80 && s.totalTrades >= 20,
  },
  {
    id: 'plan_perfect',
    title: 'نظم بی‌نقص',
    description: 'پایبندی به پلن ۱۰۰٪ با ۲۰+ معامله',
    icon: 'shield',
    color: '#7C3AED',
    xpReward: 300,
    category: 'discipline',
    check: (s) => s.planAdherence >= 100 && s.totalTrades >= 20,
  },
  {
    id: 'streak_7',
    title: 'استریک هفتگی',
    description: '۷ روز پشت سر هم وارد اپ شدی',
    icon: 'calendar',
    color: '#0891B2',
    xpReward: 80,
    category: 'discipline',
    check: (s) => s.currentStreak >= 7 || s.longestStreak >= 7,
  },
  {
    id: 'streak_30',
    title: 'یک ماه متوالی',
    description: '۳۰ روز پشت سر هم وارد اپ شدی',
    icon: 'calendar-number',
    color: '#EAB308',
    xpReward: 500,
    category: 'discipline',
    check: (s) => s.longestStreak >= 30,
  },
  {
    id: 'balance_set',
    title: 'شروع جدی',
    description: 'سرمایه اولیه‌ات رو ثبت کردی',
    icon: 'wallet-outline',
    color: '#2563EB',
    xpReward: 30,
    category: 'discipline',
    check: (s) => s.hasInitialBalance,
  },
  {
    id: 'note_taker',
    title: 'یادداشت‌بردار',
    description: 'برای معاملات یادداشت نوشتی',
    icon: 'document-text',
    color: '#0891B2',
    xpReward: 40,
    category: 'discipline',
    check: (s) => s.hasNotes,
  },

  // ================= SKILL =================
  {
    id: 'diversified',
    title: 'تنوع‌گرا',
    description: 'روی ۵ نماد مختلف معامله کردی',
    icon: 'apps',
    color: '#0891B2',
    xpReward: 60,
    category: 'skill',
    check: (s) => s.uniquePairs >= 5,
  },
  {
    id: 'setup_master',
    title: 'چند‌مهارتی',
    description: 'با ۵ Setup مختلف معامله کردی',
    icon: 'hammer',
    color: '#7C3AED',
    xpReward: 100,
    category: 'skill',
    check: (s) => s.uniqueSetups >= 5,
  },

  // ================= SECRET =================
  {
    id: 'comeback',
    title: 'بازگشت افسانه‌ای',
    description: 'بعد از ۵ باخت، ۳ برد پشت سر هم',
    icon: 'refresh',
    color: '#EF4444',
    xpReward: 250,
    category: 'secret',
    hidden: true,
    check: () => false, // Special case — handled separately
  },
  {
    id: 'phoenix',
    title: 'ققنوس',
    description: 'راز...',
    icon: 'flame-outline',
    color: '#EF4444',
    xpReward: 500,
    category: 'secret',
    hidden: true,
    check: () => false,
  },
];

export const getAchievementById = (id: string): Achievement | undefined =>
  ACHIEVEMENTS.find((a) => a.id === id);

export const getUnlockedAchievements = (unlockedIds: string[]): Achievement[] =>
  ACHIEVEMENTS.filter((a) => unlockedIds.includes(a.id));

export const getLockedAchievements = (unlockedIds: string[]): Achievement[] =>
  ACHIEVEMENTS.filter((a) => !unlockedIds.includes(a.id));

export const checkNewAchievements = (
  stats: AchievementStats,
  alreadyUnlocked: string[]
): Achievement[] => {
  return ACHIEVEMENTS.filter((a) => {
    if (alreadyUnlocked.includes(a.id)) return false;
    if (a.hidden) return false;
    try {
      return a.check(stats);
    } catch {
      return false;
    }
  });
};

export const getTotalAchievementXP = (unlockedIds: string[]): number => {
  return unlockedIds.reduce((sum, id) => {
    const a = getAchievementById(id);
    return sum + (a?.xpReward || 0);
  }, 0);
};