import AsyncStorage from '@react-native-async-storage/async-storage';

// =========================================================
// TYPES
// =========================================================

export type XPReward = {
  type: string;
  amount: number;
  timestamp: string;
  description?: string;
};

export type XPState = {
  totalXP: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  unlockedAchievements: string[];
  history: XPReward[];
  createdAt: string;
};

export type LevelInfo = {
  level: number;
  name: string;
  minXP: number;
  maxXP: number;
  color: string;
  icon: string;
};

// =========================================================
// LEVELS
// =========================================================

export const LEVELS: LevelInfo[] = [
  { level: 1, name: 'تازه‌کار', minXP: 0, maxXP: 100, color: '#94A3B8', icon: 'leaf-outline' },
  { level: 2, name: 'کارآموز', minXP: 100, maxXP: 300, color: '#22C55E', icon: 'school-outline' },
  { level: 3, name: 'تریدر', minXP: 300, maxXP: 700, color: '#2563EB', icon: 'trending-up-outline' },
  { level: 4, name: 'ماهر', minXP: 700, maxXP: 1500, color: '#7C3AED', icon: 'flash-outline' },
  { level: 5, name: 'حرفه‌ای', minXP: 1500, maxXP: 3000, color: '#EC4899', icon: 'diamond-outline' },
  { level: 6, name: 'کارشناس', minXP: 3000, maxXP: 6000, color: '#F59E0B', icon: 'star-outline' },
  { level: 7, name: 'استاد', minXP: 6000, maxXP: 10000, color: '#EF4444', icon: 'flame-outline' },
  { level: 8, name: 'افسانه', minXP: 10000, maxXP: Infinity, color: '#EAB308', icon: 'trophy-outline' },
];

const XP_STORAGE_KEY = 'navasan_xp_v1';

const DEFAULT_STATE: XPState = {
  totalXP: 0,
  level: 1,
  currentStreak: 0,
  longestStreak: 0,
  lastActiveDate: null,
  unlockedAchievements: [],
  history: [],
  createdAt: new Date().toISOString(),
};

// =========================================================
// XP REWARDS
// =========================================================

export const XP_ACTIONS = {
  TRADE_LOGGED: 10,           // هر معامله ثبت شده
  TRADE_WIN: 5,               // معامله برنده
  TRADE_FOLLOWED_PLAN: 15,    // معامله طبق پلن
  NOTE_ADDED: 5,              // یادداشت نوشته شده
  DAILY_LOGIN: 5,             // ورود روزانه
  STREAK_BONUS_3: 15,         // استریک ۳ روزه
  STREAK_BONUS_7: 50,         // استریک ۷ روزه
  STREAK_BONUS_30: 200,       // استریک ۳۰ روزه
  ACHIEVEMENT_UNLOCKED: 50,   // باز کردن دستاورد
  RATING_5_STAR: 20,          // معامله با ۵ ستاره
  DAILY_GOAL_HIT: 100,        // رسیدن به هدف روزانه
} as const;

// =========================================================
// HELPERS
// =========================================================

const getTodayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

const getYesterdayKey = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

export const getLevelForXP = (xp: number): LevelInfo => {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXP) return LEVELS[i];
  }
  return LEVELS[0];
};

export const getNextLevel = (currentLevel: number): LevelInfo | null => {
  const next = LEVELS.find((l) => l.level === currentLevel + 1);
  return next || null;
};

export const getProgressPercent = (xp: number): number => {
  const level = getLevelForXP(xp);
  if (level.maxXP === Infinity) return 100;
  const range = level.maxXP - level.minXP;
  const progress = xp - level.minXP;
  return Math.min(Math.max((progress / range) * 100, 0), 100);
};

// =========================================================
// STORAGE
// =========================================================

export const loadXPState = async (): Promise<XPState> => {
  try {
    const raw = await AsyncStorage.getItem(XP_STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return DEFAULT_STATE;
  }
};

const saveXPState = async (state: XPState): Promise<void> => {
  try {
    await AsyncStorage.setItem(XP_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.log('XP save error:', e);
  }
};

// =========================================================
// STREAK LOGIC
// =========================================================

const updateStreak = (state: XPState): { state: XPState; bonusXP: number; newStreak: boolean } => {
  const today = getTodayKey();
  const yesterday = getYesterdayKey();

  if (state.lastActiveDate === today) {
    // Already logged in today
    return { state, bonusXP: 0, newStreak: false };
  }

  let newStreak = 1;
  let bonusXP = XP_ACTIONS.DAILY_LOGIN;

  if (state.lastActiveDate === yesterday) {
    newStreak = state.currentStreak + 1;

    if (newStreak === 3) bonusXP += XP_ACTIONS.STREAK_BONUS_3;
    else if (newStreak === 7) bonusXP += XP_ACTIONS.STREAK_BONUS_7;
    else if (newStreak === 30) bonusXP += XP_ACTIONS.STREAK_BONUS_30;
  } else {
    newStreak = 1;
  }

  return {
    state: {
      ...state,
      currentStreak: newStreak,
      longestStreak: Math.max(state.longestStreak, newStreak),
      lastActiveDate: today,
    },
    bonusXP,
    newStreak: newStreak > 1,
  };
};

// =========================================================
// AWARD XP
// =========================================================

export const awardXP = async (
  actionType: keyof typeof XP_ACTIONS | string,
  amount?: number,
  description?: string
): Promise<{ state: XPState; gained: number; levelUp: boolean }> => {
  const current = await loadXPState();
  const xpAmount = amount ?? (XP_ACTIONS as any)[actionType] ?? 0;
  if (xpAmount <= 0) return { state: current, gained: 0, levelUp: false };

  const oldLevel = getLevelForXP(current.totalXP).level;

  const reward: XPReward = {
    type: actionType,
    amount: xpAmount,
    timestamp: new Date().toISOString(),
    description,
  };

  const newTotalXP = current.totalXP + xpAmount;
  const newLevel = getLevelForXP(newTotalXP).level;
  const levelUp = newLevel > oldLevel;

  const newState: XPState = {
    ...current,
    totalXP: newTotalXP,
    level: newLevel,
    history: [reward, ...current.history].slice(0, 100),
  };

  await saveXPState(newState);

  return { state: newState, gained: xpAmount, levelUp };
};

export const awardDailyLogin = async (): Promise<{
  state: XPState;
  gained: number;
  streak: number;
}> => {
  const current = await loadXPState();
  const { state: streaked, bonusXP } = updateStreak(current);

  if (bonusXP <= 0) {
    return { state: current, gained: 0, streak: current.currentStreak };
  }

  const oldLevel = getLevelForXP(current.totalXP).level;
  const newTotalXP = streaked.totalXP + bonusXP;
  const newLevel = getLevelForXP(newTotalXP).level;

  const reward: XPReward = {
    type: 'DAILY_LOGIN',
    amount: bonusXP,
    timestamp: new Date().toISOString(),
    description: streaked.currentStreak > 1
      ? `استریک ${streaked.currentStreak} روزه!`
      : 'ورود روزانه',
  };

  const newState: XPState = {
    ...streaked,
    totalXP: newTotalXP,
    level: newLevel,
    history: [reward, ...streaked.history].slice(0, 100),
  };

  await saveXPState(newState);

  return {
    state: newState,
    gained: bonusXP,
    streak: streaked.currentStreak,
  };
};

// =========================================================
// ACHIEVEMENTS INTEGRATION
// =========================================================

export const markAchievementUnlocked = async (
  achievementId: string
): Promise<XPState> => {
  const current = await loadXPState();
  if (current.unlockedAchievements.includes(achievementId)) return current;

  const newState: XPState = {
    ...current,
    unlockedAchievements: [...current.unlockedAchievements, achievementId],
  };

  await saveXPState(newState);
  return newState;
};

// =========================================================
// RESET (for dev)
// =========================================================

export const resetXP = async (): Promise<void> => {
  await AsyncStorage.removeItem(XP_STORAGE_KEY);
};