import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { useNavasanTheme } from '@/context/theme-context';
import {
    fetchUserNotifications,
    markAllNotificationsRead,
    markNotificationRead,
    type NotificationRecord,
} from '@/lib/notifications';
import { supabase } from '@/lib/supabase';

const BLUE = '#2563EB';
const GREEN = '#16A34A';
const RED = '#DC2626';
const AMBER = '#D97706';
const GOLD = '#EAB308';

const TYPE_ICONS: Record<string, { icon: string; color: string }> = {
  tilt_warning: { icon: 'warning', color: RED },
  overtrading_warning: { icon: 'flame', color: AMBER },
  daily_reminder: { icon: 'time-outline', color: BLUE },
  weekly_report: { icon: 'stats-chart', color: GREEN },
  new_analysis: { icon: 'analytics', color: BLUE },
  trade_logged: { icon: 'checkmark-circle', color: GREEN },
  achievement: { icon: 'trophy', color: GOLD },
  level_up: { icon: 'ribbon', color: GOLD },
  system: { icon: 'information-circle', color: BLUE },
};

export default function NotificationsScreen() {
  const { colors } = useNavasanTheme();
  const router = useRouter();

  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // =========================================================
  // LOAD
  // =========================================================

  const loadNotifications = useCallback(async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const uid = session?.session?.user?.id;
      if (!uid) {
        setLoading(false);
        setRefreshing(false);
        return;
      }
      setUserId(uid);

      const list = await fetchUserNotifications(uid, 50);
      setNotifications(list);
    } catch (e) {
      console.log('loadNotifications error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // =========================================================
  // HANDLERS
  // =========================================================

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleMarkAllRead = async () => {
    if (!userId) return;
    await markAllNotificationsRead(userId);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handlePress = async (item: NotificationRecord) => {
    if (!item.read) {
      await markNotificationRead(item.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
      );
    }

    // Navigate based on type
    if (item.type === 'new_analysis') router.push('/analysis' as any);
    else if (item.type === 'trade_logged' || item.type === 'tilt_warning')
      router.push('/' as any);
    else if (item.type === 'weekly_report') router.push('/dashboard' as any);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return 'همین الان';
    if (mins < 60) return `${mins} دقیقه پیش`;
    if (hours < 24) return `${hours} ساعت پیش`;
    if (days < 7) return `${days} روز پیش`;
    return d.toLocaleDateString('fa-IR');
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* HEADER */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[styles.title, { color: colors.text }]}>
            اعلان‌ها
          </Text>
          {unreadCount > 0 && (
            <Text style={[styles.subtitle, { color: colors.mutedText }]}>
              {unreadCount} خوانده‌نشده
            </Text>
          )}
        </View>

        {unreadCount > 0 ? (
          <TouchableOpacity
            onPress={handleMarkAllRead}
            style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Ionicons name="checkmark-done" size={20} color={BLUE} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 42 }} />
        )}
      </View>

      {/* CONTENT */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={BLUE} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={BLUE} />
          }
        >
          {notifications.length === 0 ? (
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: `${BLUE}15` }]}>
                <Ionicons name="notifications-off-outline" size={42} color={BLUE} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                هیچ اعلانی نداری
              </Text>
              <Text style={[styles.emptyText, { color: colors.mutedText }]}>
                اعلان‌های مربوط به معاملات، تحلیل‌ها و دستاوردها اینجا نمایش داده می‌شن.
              </Text>
            </View>
          ) : (
            notifications.map((item) => {
              const meta = TYPE_ICONS[item.type] || TYPE_ICONS.system;
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => handlePress(item)}
                  activeOpacity={0.85}
                  style={[
                    styles.row,
                    {
                      backgroundColor: item.read
                        ? colors.card
                        : `${BLUE}10`,
                      borderColor: item.read ? colors.border : BLUE,
                    },
                  ]}
                >
                  <View style={[styles.iconWrap, { backgroundColor: `${meta.color}22` }]}>
                    <Ionicons name={meta.icon as any} size={20} color={meta.color} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.rowTop}>
                      <Text
                        style={[styles.rowTitle, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      {!item.read && <View style={styles.unreadDot} />}
                    </View>
                    <Text
                      style={[styles.rowBody, { color: colors.mutedText }]}
                      numberOfLines={2}
                    >
                      {item.body}
                    </Text>
                    <Text style={[styles.rowTime, { color: colors.mutedText }]}>
                      {formatTime(item.created_at)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'ios' ? 56 : 50,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 10,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '900' },
  subtitle: { fontSize: 10, fontWeight: '700', marginTop: 2 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 18, paddingBottom: 30 },

  empty: { alignItems: 'center', paddingVertical: 80, gap: 12 },
  emptyIcon: {
    width: 90,
    height: 90,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 16, fontWeight: '900' },
  emptyText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  rowTitle: { fontSize: 13, fontWeight: '900', flex: 1 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BLUE,
    marginLeft: 8,
  },
  rowBody: { fontSize: 11, fontWeight: '600', lineHeight: 17 },
  rowTime: { fontSize: 10, fontWeight: '600', marginTop: 6 },
});