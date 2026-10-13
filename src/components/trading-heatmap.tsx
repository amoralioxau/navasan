import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { useNavasanTheme } from '@/context/theme-context';

// =========================================================
// TYPES
// =========================================================

type Trade = {
  id: string;
  date: string;
  pair: string;
  result: string;
  direction: 'buy' | 'sell';
};

type DayData = {
  key: string;
  date: Date;
  pnl: number;
  count: number;
  wins: number;
  losses: number;
  trades: Trade[];
};

type Props = {
  trades: Trade[];
};

const GREEN = '#16A34A';
const RED = '#DC2626';
const BLUE = '#2563EB';
const AMBER = '#D97706';

const DAYS_FA = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];
const MONTHS_FA = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

// =========================================================
// HELPERS
// =========================================================

const num = (v: string | number | undefined): number => {
  if (v === undefined || v === null) return 0;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
};

const getDayKey = (d: Date): string => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// =========================================================
// MAIN COMPONENT
// =========================================================

export default function TradingHeatmap({ trades }: Props) {
  const { colors } = useNavasanTheme();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);

  // =========================================================
  // BUILD DATA
  // =========================================================

  const dayMap = useMemo(() => {
    const map: Record<string, DayData> = {};

    trades.forEach((t) => {
      const d = new Date(t.date);
      if (Number.isNaN(d.getTime())) return;
      const key = getDayKey(d);

      if (!map[key]) {
        map[key] = {
          key,
          date: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
          pnl: 0,
          count: 0,
          wins: 0,
          losses: 0,
          trades: [],
        };
      }

      const r = num(t.result);
      map[key].pnl += r;
      map[key].count += 1;
      map[key].trades.push(t);
      if (r > 0) map[key].wins += 1;
      else if (r < 0) map[key].losses += 1;
    });

    return map;
  }, [trades]);

  // =========================================================
  // YEAR STATS
  // =========================================================

  const yearStats = useMemo(() => {
    const days = Object.values(dayMap).filter(
      (d) => d.date.getFullYear() === selectedYear
    );

    const greenDays = days.filter((d) => d.pnl > 0).length;
    const redDays = days.filter((d) => d.pnl < 0).length;
    const totalPnl = days.reduce((s, d) => s + d.pnl, 0);
    const totalTrades = days.reduce((s, d) => s + d.count, 0);

    const bestDay = days.length > 0
      ? days.reduce((a, b) => (a.pnl > b.pnl ? a : b))
      : null;
    const worstDay = days.length > 0
      ? days.reduce((a, b) => (a.pnl < b.pnl ? a : b))
      : null;

    // Max green streak
    const sortedDays = [...days].sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );

    let currentStreak = 0;
    let maxGreenStreak = 0;
    let maxRedStreak = 0;
    let currentRedStreak = 0;

    sortedDays.forEach((d) => {
      if (d.pnl > 0) {
        currentStreak++;
        currentRedStreak = 0;
        maxGreenStreak = Math.max(maxGreenStreak, currentStreak);
      } else if (d.pnl < 0) {
        currentRedStreak++;
        currentStreak = 0;
        maxRedStreak = Math.max(maxRedStreak, currentRedStreak);
      } else {
        currentStreak = 0;
        currentRedStreak = 0;
      }
    });

    // Best month
    const monthPnl: Record<number, number> = {};
    days.forEach((d) => {
      const m = d.date.getMonth();
      monthPnl[m] = (monthPnl[m] || 0) + d.pnl;
    });

    let bestMonth = -1;
    let bestMonthPnl = -Infinity;
    Object.entries(monthPnl).forEach(([m, pnl]) => {
      if (pnl > bestMonthPnl) {
        bestMonthPnl = pnl;
        bestMonth = Number(m);
      }
    });

    return {
      greenDays,
      redDays,
      totalPnl,
      totalTrades,
      bestDay,
      worstDay,
      maxGreenStreak,
      maxRedStreak,
      bestMonth,
      bestMonthPnl,
    };
  }, [dayMap, selectedYear]);

  // =========================================================
  // BUILD WEEKS GRID
  // =========================================================

  const weeks = useMemo(() => {
    const start = new Date(selectedYear, 0, 1);
    const end = new Date(selectedYear, 11, 31);

    // Persian week: Saturday = 0, Sunday = 1, ..., Friday = 6
    // JS: Sunday = 0, Monday = 1, ..., Saturday = 6
    // We want Saturday as first day of week
    const jsToPersianDay = (jsDay: number): number => {
      return (jsDay + 1) % 7;
    };

    // Find first Saturday before or on start
    const gridStart = new Date(start);
    while (jsToPersianDay(gridStart.getDay()) !== 0) {
      gridStart.setDate(gridStart.getDate() - 1);
    }

    const grid: (DayData | null)[][] = [];
    let current = new Date(gridStart);

    while (current <= end) {
      const week: (DayData | null)[] = [];
      for (let i = 0; i < 7; i++) {
        if (current > end) {
          week.push(null);
        } else if (current < start) {
          week.push(null);
        } else {
          const key = getDayKey(current);
          const dayData = dayMap[key] || {
            key,
            date: new Date(current),
            pnl: 0,
            count: 0,
            wins: 0,
            losses: 0,
            trades: [],
          };
          week.push(dayData);
        }
        current.setDate(current.getDate() + 1);
      }
      grid.push(week);
    }

    return grid;
  }, [selectedYear, dayMap]);

  // =========================================================
  // COLOR LOGIC
  // =========================================================

  const getColor = (day: DayData | null): string => {
    if (!day || day.count === 0) {
      return colors.input;
    }
    if (day.pnl > 0) {
      const intensity = Math.min(day.pnl / 300, 1);
      return `rgba(22, 163, 74, ${0.3 + intensity * 0.7})`;
    }
    if (day.pnl < 0) {
      const intensity = Math.min(Math.abs(day.pnl) / 300, 1);
      return `rgba(220, 38, 38, ${0.3 + intensity * 0.7})`;
    }
    return colors.mutedText + '60';
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <View>
      {/* YEAR NAVIGATOR */}
      <View style={styles.yearNav}>
        <TouchableOpacity
          onPress={() => setSelectedYear(selectedYear - 1)}
          style={[styles.navBtn, { backgroundColor: colors.input }]}
        >
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.yearText, { color: colors.text }]}>
          {selectedYear}
        </Text>

        <TouchableOpacity
          onPress={() => setSelectedYear(selectedYear + 1)}
          disabled={selectedYear >= new Date().getFullYear()}
          style={[
            styles.navBtn,
            {
              backgroundColor: colors.input,
              opacity: selectedYear >= new Date().getFullYear() ? 0.4 : 1,
            },
          ]}
        >
          <Ionicons name="chevron-forward" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* YEAR STATS */}
      <View style={styles.statsGrid}>
        <View style={[styles.statBox, { backgroundColor: colors.input }]}>
          <View style={[styles.statDot, { backgroundColor: GREEN }]} />
          <Text style={[styles.statValue, { color: colors.text }]}>
            {yearStats.greenDays}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedText }]}>
            روز سبز
          </Text>
        </View>

        <View style={[styles.statBox, { backgroundColor: colors.input }]}>
          <View style={[styles.statDot, { backgroundColor: RED }]} />
          <Text style={[styles.statValue, { color: colors.text }]}>
            {yearStats.redDays}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedText }]}>
            روز قرمز
          </Text>
        </View>

        <View style={[styles.statBox, { backgroundColor: colors.input }]}>
          <Ionicons name="flame" size={13} color={GREEN} />
          <Text style={[styles.statValue, { color: colors.text }]}>
            {yearStats.maxGreenStreak}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedText }]}>
            برد پیوسته
          </Text>
        </View>

        <View style={[styles.statBox, { backgroundColor: colors.input }]}>
          <Ionicons name="snow" size={13} color={RED} />
          <Text style={[styles.statValue, { color: colors.text }]}>
            {yearStats.maxRedStreak}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedText }]}>
            باخت پیوسته
          </Text>
        </View>
      </View>

      {/* HEATMAP GRID */}
      <View
        style={[
          styles.heatmapCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.gridWrap}>
          {/* Day labels */}
          <View style={styles.dayLabels}>
            {DAYS_FA.map((d, i) => (
              <Text
                key={i}
                style={[styles.dayLabel, { color: colors.mutedText }]}
              >
                {d}
              </Text>
            ))}
          </View>

          {/* Weeks */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.weeksRow}
          >
            {weeks.map((week, wi) => (
              <View key={wi} style={styles.weekCol}>
                {week.map((day, di) => {
                  if (!day) {
                    return <View key={di} style={styles.emptyCell} />;
                  }
                  return (
                    <TouchableOpacity
                      key={di}
                      onPress={() => setSelectedDay(day)}
                      activeOpacity={0.7}
                      style={[
                        styles.cell,
                        { backgroundColor: getColor(day) },
                      ]}
                    />
                  );
                })}
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <Text style={[styles.legendText, { color: colors.mutedText }]}>
            ضرر بیشتر
          </Text>
          <View style={[styles.legendDot, { backgroundColor: 'rgba(220, 38, 38, 0.9)' }]} />
          <View style={[styles.legendDot, { backgroundColor: 'rgba(220, 38, 38, 0.5)' }]} />
          <View style={[styles.legendDot, { backgroundColor: colors.input }]} />
          <View style={[styles.legendDot, { backgroundColor: 'rgba(22, 163, 74, 0.5)' }]} />
          <View style={[styles.legendDot, { backgroundColor: 'rgba(22, 163, 74, 0.9)' }]} />
          <Text style={[styles.legendText, { color: colors.mutedText }]}>
            سود بیشتر
          </Text>
        </View>
      </View>

      {/* BEST/WORST */}
      {(yearStats.bestDay || yearStats.worstDay) && (
        <View style={styles.bwRow}>
          {yearStats.bestDay && (
            <View
              style={[
                styles.bwCard,
                { backgroundColor: `${GREEN}15`, borderColor: GREEN },
              ]}
            >
              <Ionicons name="trophy" size={18} color={GREEN} />
              <Text style={[styles.bwLabel, { color: colors.mutedText }]}>
                بهترین روز
              </Text>
              <Text style={[styles.bwDate, { color: colors.text }]}>
                {yearStats.bestDay.date.toLocaleDateString('fa-IR', {
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
              <Text style={[styles.bwValue, { color: GREEN }]}>
                +${yearStats.bestDay.pnl.toFixed(0)}
              </Text>
            </View>
          )}

          {yearStats.worstDay && (
            <View
              style={[
                styles.bwCard,
                { backgroundColor: `${RED}15`, borderColor: RED },
              ]}
            >
              <Ionicons name="sad-outline" size={18} color={RED} />
              <Text style={[styles.bwLabel, { color: colors.mutedText }]}>
                بدترین روز
              </Text>
              <Text style={[styles.bwDate, { color: colors.text }]}>
                {yearStats.worstDay.date.toLocaleDateString('fa-IR', {
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
              <Text style={[styles.bwValue, { color: RED }]}>
                ${yearStats.worstDay.pnl.toFixed(0)}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* DAY DETAILS MODAL */}
      <Modal
        visible={!!selectedDay}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedDay(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setSelectedDay(null)}
        >
          <View
            style={[
              styles.dayModal,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {selectedDay && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalDate, { color: colors.text }]}>
                    {selectedDay.date.toLocaleDateString('fa-IR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedDay(null)}>
                    <Ionicons name="close" size={22} color={colors.mutedText} />
                  </TouchableOpacity>
                </View>

                {selectedDay.count === 0 ? (
                  <View style={styles.emptyDay}>
                    <Ionicons
                      name="moon-outline"
                      size={36}
                      color={colors.mutedText}
                    />
                    <Text style={[styles.emptyText, { color: colors.mutedText }]}>
                      این روز معامله‌ای ثبت نشده
                    </Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.modalStats}>
                      <View style={styles.modalStat}>
                        <Text
                          style={[
                            styles.modalStatValue,
                            {
                              color:
                                selectedDay.pnl >= 0 ? GREEN : RED,
                            },
                          ]}
                        >
                          {selectedDay.pnl >= 0 ? '+' : ''}$
                          {selectedDay.pnl.toFixed(2)}
                        </Text>
                        <Text
                          style={[
                            styles.modalStatLabel,
                            { color: colors.mutedText },
                          ]}
                        >
                          سود / زیان
                        </Text>
                      </View>
                      <View style={styles.modalStat}>
                        <Text
                          style={[styles.modalStatValue, { color: colors.text }]}
                        >
                          {selectedDay.count}
                        </Text>
                        <Text
                          style={[
                            styles.modalStatLabel,
                            { color: colors.mutedText },
                          ]}
                        >
                          معامله
                        </Text>
                      </View>
                      <View style={styles.modalStat}>
                        <Text
                          style={[styles.modalStatValue, { color: GREEN }]}
                        >
                          {selectedDay.wins}
                        </Text>
                        <Text
                          style={[
                            styles.modalStatLabel,
                            { color: colors.mutedText },
                          ]}
                        >
                          برد
                        </Text>
                      </View>
                      <View style={styles.modalStat}>
                        <Text style={[styles.modalStatValue, { color: RED }]}>
                          {selectedDay.losses}
                        </Text>
                        <Text
                          style={[
                            styles.modalStatLabel,
                            { color: colors.mutedText },
                          ]}
                        >
                          باخت
                        </Text>
                      </View>
                    </View>

                    <ScrollView style={{ maxHeight: 240 }}>
                      {selectedDay.trades.map((t) => {
                        const r = num(t.result);
                        const isWin = r > 0;
                        return (
                          <View
                            key={t.id}
                            style={[
                              styles.tradeRow,
                              { borderBottomColor: colors.divider },
                            ]}
                          >
                            <View
                              style={[
                                styles.tradeDot,
                                {
                                  backgroundColor: isWin
                                    ? `${GREEN}22`
                                    : `${RED}22`,
                                },
                              ]}
                            >
                              <Ionicons
                                name={
                                  t.direction === 'buy'
                                    ? 'arrow-up'
                                    : 'arrow-down'
                                }
                                size={14}
                                color={isWin ? GREEN : RED}
                              />
                            </View>
                            <Text
                              style={[styles.tradePair, { color: colors.text }]}
                            >
                              {t.pair}
                            </Text>
                            <Text
                              style={[
                                styles.tradeResult,
                                { color: isWin ? GREEN : RED },
                              ]}
                            >
                              {r >= 0 ? '+' : ''}${r.toFixed(2)}
                            </Text>
                          </View>
                        );
                      })}
                    </ScrollView>
                  </>
                )}
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// =========================================================
// STYLES
// =========================================================

const styles = StyleSheet.create({
  yearNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginBottom: 14,
  },
  navBtn: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearText: { fontSize: 18, fontWeight: '900' },

  statsGrid: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  statBox: {
    flex: 1,
    borderRadius: 12,
    padding: 9,
    alignItems: 'center',
  },
  statDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: '900', marginTop: 2 },
  statLabel: { fontSize: 9, fontWeight: '700', marginTop: 2 },

  heatmapCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
  },
  gridWrap: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  dayLabels: {
    justifyContent: 'space-around',
    paddingRight: 6,
    paddingTop: 0,
    height: 7 * 14, // 7 days * 14px cell height
  },
  dayLabel: {
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 14,
    textAlign: 'center',
  },
  weeksRow: { gap: 3 },
  weekCol: { gap: 3 },
  cell: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  emptyCell: {
    width: 12,
    height: 12,
    backgroundColor: 'transparent',
  },

  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 6,
  },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendText: { fontSize: 9, fontWeight: '700' },

  bwRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  bwCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    alignItems: 'flex-end',
  },
  bwLabel: { fontSize: 10, fontWeight: '700', marginTop: 5 },
  bwDate: { fontSize: 13, fontWeight: '900', marginTop: 3 },
  bwValue: { fontSize: 15, fontWeight: '900', marginTop: 2 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  dayModal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalDate: { fontSize: 14, fontWeight: '900', flex: 1 },
  emptyDay: { alignItems: 'center', paddingVertical: 24, gap: 10 },
  emptyText: { fontSize: 12, fontWeight: '600' },

  modalStats: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  modalStat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  modalStatValue: { fontSize: 16, fontWeight: '900' },
  modalStatLabel: { fontSize: 9, fontWeight: '700', marginTop: 3 },

  tradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  tradeDot: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tradePair: { flex: 1, fontSize: 13, fontWeight: '800' },
  tradeResult: { fontSize: 13, fontWeight: '900' },
});