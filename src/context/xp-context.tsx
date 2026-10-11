import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import { Alert } from 'react-native';

import {
    checkNewAchievements,
    type AchievementStats
} from '@/lib/achievements';
import {
    awardDailyLogin,
    awardXP,
    getLevelForXP,
    getNextLevel,
    getProgressPercent,
    loadXPState,
    markAchievementUnlocked,
    type XPState,
} from '@/lib/xp-system';

// =========================================================
// TYPES
// =========================================================

type XPContextValue = {
  state: XPState;
  levelInfo: ReturnType<typeof getLevelForXP>;
  nextLevel: ReturnType<typeof getNextLevel>;
  progressPercent: number;
  loading: boolean;
  refresh: () => Promise<void>;
  award: (
    actionType: string,
    amount?: number,
    description?: string
  ) => Promise<void>;
  checkAchievements: (stats: AchievementStats) => Promise<void>;
  resetAll: () => Promise<void>;
};

const XPContext = createContext<XPContextValue | null>(null);

// =========================================================
// PROVIDER
// =========================================================

export function XPProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<XPState>({
    totalXP: 0,
    level: 1,
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: null,
    unlockedAchievements: [],
    history: [],
    createdAt: new Date().toISOString(),
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const loaded = await loadXPState();
    setState(loaded);
  }, []);

  // Load on mount + award daily login
  useEffect(() => {
    (async () => {
      try {
        const loaded = await loadXPState();
        setState(loaded);

        // Award daily login if first time today
        const result = await awardDailyLogin();
        setState(result.state);

        if (result.gained > 0) {
          // Show welcome message
          setTimeout(() => {
            if (result.streak > 1) {
              Alert.alert(
                '🔥 استریک!',
                `امروز ${result.streak}امین روز پیوسته‌اته!\n+${result.gained} XP`,
                [{ text: 'ادامه بده', style: 'default' }]
              );
            }
          }, 800);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const award = useCallback(
    async (actionType: string, amount?: number, description?: string) => {
      const result = await awardXP(actionType, amount, description);
      setState(result.state);

      if (result.levelUp) {
        const newLevel = getLevelForXP(result.state.totalXP);
        setTimeout(() => {
          Alert.alert(
            `🎉 سطح ${newLevel.level}!`,
            `تبریک! به سطح «${newLevel.name}» رسیدی.\n+${result.gained} XP`,
            [{ text: 'عالیه!', style: 'default' }]
          );
        }, 300);
      }
    },
    []
  );

  const checkAchievements = useCallback(
    async (stats: AchievementStats) => {
      const current = await loadXPState();
      const newOnes = checkNewAchievements(stats, current.unlockedAchievements);

      if (newOnes.length === 0) return;

      let updatedState = current;

      for (const achievement of newOnes) {
        updatedState = await markAchievementUnlocked(achievement.id);
        const result = await awardXP(
          'ACHIEVEMENT_UNLOCKED',
          achievement.xpReward,
          `دستاورد: ${achievement.title}`
        );
        updatedState = result.state;

        // Show achievement alert
        setTimeout(() => {
          Alert.alert(
            `🏆 ${achievement.title}`,
            `${achievement.description}\n\n+${achievement.xpReward} XP`,
            [{ text: 'دریافت شد', style: 'default' }]
          );
        }, 500);
      }

      setState(updatedState);
    },
    []
  );

  const resetAll = useCallback(async () => {
    const { resetXP } = await import('@/lib/xp-system');
    await resetXP();
    await refresh();
  }, [refresh]);

  const value = useMemo<XPContextValue>(() => {
    const levelInfo = getLevelForXP(state.totalXP);
    const nextLevel = getNextLevel(levelInfo.level);
    const progressPercent = getProgressPercent(state.totalXP);

    return {
      state,
      levelInfo,
      nextLevel,
      progressPercent,
      loading,
      refresh,
      award,
      checkAchievements,
      resetAll,
    };
  }, [state, loading, refresh, award, checkAchievements, resetAll]);

  return <XPContext.Provider value={value}>{children}</XPContext.Provider>;
}

// =========================================================
// HOOK
// =========================================================

export function useXP() {
  const ctx = useContext(XPContext);
  if (!ctx) {
    throw new Error('useXP must be used inside XPProvider');
  }
  return ctx;
}