import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { useNavasanTheme } from '@/context/theme-context';
import { useXP } from '@/context/xp-context';
import {
    ACHIEVEMENTS,
    getUnlockedAchievements,
} from '@/lib/achievements';
import { LEVELS } from '@/lib/xp-system';

const BLUE = '#2563EB';
const GREEN = '#16A34A';
const AMBER = '#D97706';

export default function ProfileXPScreen() {
  const { colors } = useNavasanTheme();
  const router = useRouter();
  const { state, levelInfo, nextLevel, progressPercent, loading } = useXP();

  const unlocked = useMemo(
    () => getUnlockedAchievements(state.unlockedAchievements),
    [state.unlockedAchievements]
  );

  const locked = useMemo(
    () =>
      ACHIEVEMENTS.filter(
        (a) => !state.unlockedAchievements.includes(a.id) && !a.hidden
      ),
    [state.unlockedAchievements]
  );

  const recentHistory = state.history.slice(0, 10);

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.mutedText, textAlign: 'center', marginTop: 100 }}>
          در حال بارگذاری...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.pageTitle, { color: colors.text }]}>
            سطح و دستاوردها
          </Text>
          <View style={{ width: 42 }} />
        </View>

        {/* LEVEL CARD */}
        <View style={[styles.levelCard, { backgroundColor: levelInfo.color }]}>
          <View style={styles.levelTop}>
            <View style={styles.levelBadgeWrap}>
              <Ionicons name={levelInfo.icon as any} size={36} color="#FFFFFF" />
            </View>
            <View style={styles.levelInfoWrap}>
              <Text style={styles.levelLabel}>سطح {levelInfo.level}</Text>
              <Text style={styles.levelName}>{levelInfo.name}</Text>
            </View>
            <View style={styles.xpBadge}>
              <Text style={styles.xpBadgeValue}>{state.totalXP}</Text>
              <Text style={styles.xpBadgeLabel}>XP</Text>
            </View>
          </View>

          {/* Progress */}
          {nextLevel && (
            <View style={styles.progressWrap}>
              <View style={styles.progressLabels}>
                <Text style={styles.progressSmall}>
                  {state.totalXP} / {nextLevel.minXP} XP
                </Text>
                <Text style={styles.progressSmall}>
                  {Math.round(progressPercent)}%
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progressPercent}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressHint}>
                {nextLevel.minXP - state.totalXP} XP تا سطح {nextLevel.level} ({nextLevel.name})
              </Text>
            </View>
          )}
        </View>

        {/* STATS ROW */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="flame" size={22} color={AMBER} />
            <Text style={[styles.statBoxValue, { color: colors.text }]}>
              {state.currentStreak}
            </Text>
            <Text style={[styles.statBoxLabel, { color: colors.mutedText }]}>
              استریک فعلی
            </Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="ribbon" size={22} color={BLUE} />
            <Text style={[styles.statBoxValue, { color: colors.text }]}>
              {state.longestStreak}
            </Text>
            <Text style={[styles.statBoxLabel, { color: colors.mutedText }]}>
              رکورد استریک
            </Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="trophy" size={22} color={GREEN} />
            <Text style={[styles.statBoxValue, { color: colors.text }]}>
              {unlocked.length}/{ACHIEVEMENTS.filter((a) => !a.hidden).length}
            </Text>
            <Text style={[styles.statBoxLabel, { color: colors.mutedText }]}>
              دستاوردها
            </Text>
          </View>
        </View>

        {/* LEVELS LADDER */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          مسیر سطح‌ها
        </Text>
        <View style={[styles.levelsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {LEVELS.map((lvl, i) => {
            const unlocked = state.totalXP >= lvl.minXP;
            const current = state.level === lvl.level;
            return (
              <View key={lvl.level} style={styles.levelRow}>
                <View
                  style={[
                    styles.levelDot,
                    {
                      backgroundColor: unlocked ? lvl.color : colors.border,
                      borderColor: current ? lvl.color : 'transparent',
                      borderWidth: current ? 2 : 0,
                    },
                  ]}
                >
                  <Ionicons
                    name={lvl.icon as any}
                    size={14}
                    color={unlocked ? '#FFFFFF' : colors.mutedText}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text
                    style={[
                      styles.levelRowName,
                      { color: unlocked ? colors.text : colors.mutedText },
                    ]}
                  >
                    {lvl.name}
                  </Text>
                  <Text style={[styles.levelRowXP, { color: colors.mutedText }]}>
                    {lvl.minXP}
                    {lvl.maxXP === Infinity ? '+' : ` - ${lvl.maxXP}`} XP
                  </Text>
                </View>
                {current && (
                  <View style={[styles.currentBadge, { backgroundColor: `${lvl.color}22` }]}>
                    <Text style={[styles.currentBadgeText, { color: lvl.color }]}>
                      فعلی
                    </Text>
                  </View>
                )}
                {unlocked && !current && (
                  <Ionicons name="checkmark-circle" size={20} color={GREEN} />
                )}
              </View>
            );
          })}
        </View>

        {/* UNLOCKED ACHIEVEMENTS */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          دستاوردهای باز شده ({unlocked.length})
        </Text>
        {unlocked.length === 0 ? (
          <View
            style={[
              styles.emptyBox,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Ionicons name="trophy-outline" size={36} color={colors.mutedText} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              هنوز دستاوردی باز نکردی
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedText }]}>
              با ثبت معامله، ورود روزانه، و پایبندی به پلن، دستاورد باز کن
            </Text>
          </View>
        ) : (
          <View style={styles.achievementsGrid}>
            {unlocked.map((a) => (
              <View
                key={a.id}
                style={[
                  styles.achCard,
                  { backgroundColor: colors.card, borderColor: a.color },
                ]}
              >
                <View
                  style={[
                    styles.achIconWrap,
                    { backgroundColor: `${a.color}22` },
                  ]}
                >
                  <Ionicons name={a.icon as any} size={26} color={a.color} />
                </View>
                <Text style={[styles.achTitle, { color: colors.text }]}>
                  {a.title}
                </Text>
                <Text
                  style={[styles.achDesc, { color: colors.mutedText }]}
                  numberOfLines={2}
                >
                  {a.description}
                </Text>
                <View style={[styles.xpPill, { backgroundColor: `${a.color}22` }]}>
                  <Text style={[styles.xpPillText, { color: a.color }]}>
                    +{a.xpReward} XP
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* LOCKED ACHIEVEMENTS */}
        {locked.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              دستاوردهای قفل ({locked.length})
            </Text>
            <View style={styles.achievementsGrid}>
              {locked.map((a) => (
                <View
                  key={a.id}
                  style={[
                    styles.achCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      opacity: 0.55,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.achIconWrap,
                      { backgroundColor: colors.input },
                    ]}
                  >
                    <Ionicons
                      name="lock-closed"
                      size={22}
                      color={colors.mutedText}
                    />
                  </View>
                  <Text style={[styles.achTitle, { color: colors.text }]}>
                    {a.title}
                  </Text>
                  <Text
                    style={[styles.achDesc, { color: colors.mutedText }]}
                    numberOfLines={2}
                  >
                    {a.description}
                  </Text>
                  <View style={[styles.xpPill, { backgroundColor: colors.input }]}>
                    <Text style={[styles.xpPillText, { color: colors.mutedText }]}>
                      +{a.xpReward} XP
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* RECENT XP HISTORY */}
        {recentHistory.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              آخرین XPها
            </Text>
            <View
              style={[
                styles.historyCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              {recentHistory.map((item, i) => (
                <View
                  key={i}
                  style={[
                    styles.historyRow,
                    {
                      borderBottomColor: colors.divider,
                      borderBottomWidth: i === recentHistory.length - 1 ? 0 : 1,
                    },
                  ]}
                >
                  <View style={[styles.historyIcon, { backgroundColor: `${BLUE}18` }]}>
                    <Ionicons name="star" size={14} color={BLUE} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.historyDesc, { color: colors.text }]}>
                      {item.description || item.type}
                    </Text>
                    <Text style={[styles.historyTime, { color: colors.mutedText }]}>
                      {new Date(item.timestamp).toLocaleString('fa-IR')}
                    </Text>
                  </View>
                  <Text style={[styles.historyXP, { color: GREEN }]}>
                    +{item.amount}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 18, paddingTop: 56, paddingBottom: 20 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  pageTitle: { fontSize: 17, fontWeight: '900' },

  levelCard: {
    borderRadius: 26,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  levelTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  levelBadgeWrap: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelInfoWrap: { flex: 1, marginLeft: 14 },
  levelLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '700',
  },
  levelName: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 2,
  },
  xpBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  xpBadgeValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  xpBadgeLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 9,
    fontWeight: '800',
    marginTop: 1,
  },
  progressWrap: { marginTop: 4 },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressSmall: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  progressTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  progressHint: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 6,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 22,
  },
  statBox: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
  },
  statBoxValue: {
    fontSize: 20,
    fontWeight: '900',
    marginTop: 6,
  },
  statBoxLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 3,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 10,
    marginTop: 4,
  },

  levelsCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 22,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
  },
  levelDot: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelRowName: { fontSize: 13, fontWeight: '900' },
  levelRowXP: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  currentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  currentBadgeText: { fontSize: 10, fontWeight: '900' },

  emptyBox: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    marginBottom: 22,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '900',
    marginTop: 10,
  },
  emptyText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },

  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  achCard: {
    width: '48.3%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  achIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  achTitle: {
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  achDesc: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 5,
    lineHeight: 15,
    minHeight: 30,
  },
  xpPill: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  xpPillText: { fontSize: 10, fontWeight: '900' },

  historyCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  historyIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyDesc: { fontSize: 12, fontWeight: '800' },
  historyTime: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  historyXP: { fontSize: 13, fontWeight: '900' },
});