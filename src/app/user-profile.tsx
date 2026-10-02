import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { FeatureGuard } from '@/components/FeatureGuard';
import { LoginGuard } from '@/components/LoginGuard';
import { useNavasanTheme } from '@/context/theme-context';
import { supabase } from '@/lib/supabase';

type Profile = {
  id: string;
  username: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  followers_count: number;
  following_count: number;
};

type AnalysisItem = {
  id: string;
  title: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  timeframe: string;
  rr: string;
};

function UserProfileScreenContent() {
  const router = useRouter();
  const { colors } = useNavasanTheme();

  const params = useLocalSearchParams<{
    username?: string;
  }>();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [isFollowing, setIsFollowing] = useState(false);

  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedAnalysis, setSelectedAnalysis] =
    useState<AnalysisItem | null>(null);

  const [analyses] = useState<AnalysisItem[]>([
    {
      id: '1',
      title: 'تحلیل XAUUSD',
      symbol: 'XAUUSD',
      direction: 'BUY',
      timeframe: '5M',
      rr: '1:5',
    },
    {
      id: '2',
      title: 'بررسی ساختار طلا',
      symbol: 'XAUUSD',
      direction: 'SELL',
      timeframe: '15M',
      rr: '1:3',
    },
    {
      id: '3',
      title: 'تحلیل ساختار بازار',
      symbol: 'BTCUSD',
      direction: 'BUY',
      timeframe: '15M',
      rr: '1:4',
    },
  ]);

  const usernameParam = params.username
    ? String(params.username)
    : '';

  const normalizedUsername = usernameParam
    .replace(/^@/, '')
    .trim()
    .toLowerCase();

  const loadProfile = async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const userId = session?.user?.id ?? null;

      setCurrentUserId(userId);

      if (!normalizedUsername) {
        setProfile(null);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select(
          `
          id,
          username,
          full_name,
          bio,
          avatar_url,
          followers_count,
          following_count
          `
        )
        .ilike('username', normalizedUsername)
        .maybeSingle();

      if (error) {
        console.error('Profile load error:', error);

        Alert.alert(
          'خطا',
          'دریافت پروفایل انجام نشد.'
        );

        return;
      }

      if (!data) {
        setProfile(null);
        return;
      }

      const loadedProfile: Profile = {
        id: data.id,
        username: data.username ?? '',
        full_name: data.full_name ?? null,
        bio: data.bio ?? null,
        avatar_url: data.avatar_url ?? null,
        followers_count: Number(
          data.followers_count ?? 0
        ),
        following_count: Number(
          data.following_count ?? 0
        ),
      };

      setProfile(loadedProfile);

      if (userId && userId !== loadedProfile.id) {
        const { data: followData, error: followError } =
          await supabase
            .from('follows')
            .select('id')
            .eq('follower_id', userId)
            .eq('following_id', loadedProfile.id)
            .maybeSingle();

        if (followError) {
          console.error(
            'Follow status error:',
            followError
          );

          setIsFollowing(false);
        } else {
          setIsFollowing(Boolean(followData));
        }
      } else {
        setIsFollowing(false);
      }
    } catch (error) {
      console.error('Profile error:', error);

      Alert.alert(
        'خطا',
        'مشکلی در دریافت پروفایل به وجود آمد.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [normalizedUsername]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile(false);
  };

  const handleFollow = async () => {
    if (!profile) {
      return;
    }

    if (!currentUserId) {
      Alert.alert(
        'ورود لازم است',
        'برای دنبال کردن کاربران ابتدا وارد حساب کاربری خود شوید.'
      );
      return;
    }

    if (currentUserId === profile.id) {
      return;
    }

    try {
      setFollowLoading(true);

      if (isFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', profile.id);

        if (error) {
          console.error(
            'Unfollow error:',
            error
          );

          Alert.alert(
            'خطا',
            'لغو دنبال کردن انجام نشد.'
          );

          return;
        }

        setIsFollowing(false);

        setProfile((previous) => {
          if (!previous) {
            return previous;
          }

          return {
            ...previous,
            followers_count: Math.max(
              previous.followers_count - 1,
              0
            ),
          };
        });
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: currentUserId,
            following_id: profile.id,
          });

        if (error) {
          if (error.code === '23505') {
            setIsFollowing(true);
            return;
          }

          console.error(
            'Follow error:',
            error
          );

          Alert.alert(
            'خطا',
            'دنبال کردن کاربر انجام نشد.'
          );

          return;
        }

        setIsFollowing(true);

        setProfile((previous) => {
          if (!previous) {
            return previous;
          }

          return {
            ...previous,
            followers_count:
              previous.followers_count + 1,
          };
        });
      }
    } catch (error) {
      console.error(
        'Follow action error:',
        error
      );

      Alert.alert(
        'خطا',
        'عملیات انجام نشد.'
      );
    } finally {
      setFollowLoading(false);
    }
  };

  const openMessage = () => {
    Alert.alert(
      'پیام',
      'سیستم پیام‌رسانی در مرحله بعد به پروفایل متصل خواهد شد.'
    );
  };

  const openMore = () => {
    Alert.alert(
      'گزینه‌ها',
      'گزینه‌های بیشتر پروفایل در نسخه بعدی اضافه می‌شوند.'
    );
  };

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          {
            backgroundColor:
              colors.background,
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />

        <Text
          style={[
            styles.loadingText,
            {
              color: colors.secondaryText,
            },
          ]}
        >
          در حال دریافت پروفایل...
        </Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View
        style={[
          styles.loadingContainer,
          {
            backgroundColor:
              colors.background,
          },
        ]}
      >
        <View
          style={[
            styles.emptyIcon,
            {
              backgroundColor:
                colors.primarySoft,
            },
          ]}
        >
          <Ionicons
            name="person-outline"
            size={34}
            color={colors.primary}
          />
        </View>

        <Text
          style={[
            styles.emptyTitle,
            {
              color: colors.text,
            },
          ]}
        >
          پروفایل پیدا نشد
        </Text>

        <Text
          style={[
            styles.emptySubtitle,
            {
              color: colors.secondaryText,
            },
          ]}
        >
          این کاربر وجود ندارد یا نام کاربری اشتباه است.
        </Text>

        <TouchableOpacity
          style={[
            styles.backButtonLarge,
            {
              backgroundColor:
                colors.primary,
            },
          ]}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>
            بازگشت
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isOwnProfile =
    currentUserId === profile.id;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor:
            colors.background,
        },
      ]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={
          styles.scrollContent
        }
      >
        {/* HEADER */}

        <View style={styles.header}>
          <TouchableOpacity
            style={[
              styles.headerButton,
              {
                backgroundColor:
                  colors.card,
                borderColor:
                  colors.border,
              },
            ]}
            onPress={() => router.back()}
          >
            <Ionicons
              name="arrow-forward"
              size={21}
              color={colors.text}
            />
          </TouchableOpacity>

          <Text
            style={[
              styles.headerTitle,
              {
                color: colors.text,
              },
            ]}
          >
            پروفایل
          </Text>

          <TouchableOpacity
            style={[
              styles.headerButton,
              {
                backgroundColor:
                  colors.card,
                borderColor:
                  colors.border,
              },
            ]}
            onPress={openMore}
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={21}
              color={colors.text}
            />
          </TouchableOpacity>
        </View>

        {/* PROFILE */}

        <View
          style={[
            styles.profileCard,
            {
              backgroundColor:
                colors.card,
              borderColor:
                colors.border,
            },
          ]}
        >
          <View style={styles.avatarWrapper}>
            {profile.avatar_url ? (
              <Image
                source={{
                  uri: profile.avatar_url,
                }}
                style={styles.avatar}
              />
            ) : (
              <View
                style={[
                  styles.avatar,
                  {
                    backgroundColor:
                      colors.primarySoft,
                    alignItems:
                      'center',
                    justifyContent:
                      'center',
                  },
                ]}
              >
                <Ionicons
                  name="person"
                  size={48}
                  color={colors.primary}
                />
              </View>
            )}
          </View>

          <Text
            style={[
              styles.name,
              {
                color: colors.text,
              },
            ]}
          >
            {profile.full_name ||
              profile.username}
          </Text>

          <Text
            style={[
              styles.username,
              {
                color: colors.primary,
              },
            ]}
          >
            @{profile.username}
          </Text>

          {!!profile.bio && (
            <Text
              style={[
                styles.bio,
                {
                  color:
                    colors.secondaryText,
                },
              ]}
            >
              {profile.bio}
            </Text>
          )}

          {!isOwnProfile && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[
                  styles.followButton,
                  {
                    backgroundColor:
                      isFollowing
                        ? colors.card
                        : colors.primary,
                    borderColor:
                      colors.primary,
                  },
                ]}
                onPress={handleFollow}
                disabled={followLoading}
              >
                {followLoading ? (
                  <ActivityIndicator
                    size="small"
                    color={
                      isFollowing
                        ? colors.primary
                        : '#FFFFFF'
                    }
                  />
                ) : (
                  <>
                    <Ionicons
                      name={
                        isFollowing
                          ? 'checkmark'
                          : 'person-add-outline'
                      }
                      size={18}
                      color={
                        isFollowing
                          ? colors.primary
                          : '#FFFFFF'
                      }
                    />

                    <Text
                      style={[
                        styles.followButtonText,
                        {
                          color:
                            isFollowing
                              ? colors.primary
                              : '#FFFFFF',
                        },
                      ]}
                    >
                      {isFollowing
                        ? 'دنبال می‌کنید'
                        : 'دنبال کردن'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.messageButton,
                  {
                    backgroundColor:
                      colors.card,
                    borderColor:
                      colors.border,
                  },
                ]}
                onPress={openMessage}
              >
                <Ionicons
                  name="chatbubble-outline"
                  size={18}
                  color={colors.text}
                />

                <Text
                  style={[
                    styles.messageButtonText,
                    {
                      color:
                        colors.text,
                    },
                  ]}
                >
                  پیام
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {isOwnProfile && (
            <View
              style={[
                styles.ownProfileBadge,
                {
                  backgroundColor:
                    colors.primarySoft,
                },
              ]}
            >
              <Ionicons
                name="person-circle-outline"
                size={18}
                color={colors.primary}
              />

              <Text
                style={[
                  styles.ownProfileText,
                  {
                    color:
                      colors.primary,
                  },
                ]}
              >
                پروفایل شما
              </Text>
            </View>
          )}
        </View>

        {/* SOCIAL STATS */}

        <View
          style={[
            styles.statsCard,
            {
              backgroundColor:
                colors.card,
              borderColor:
                colors.border,
            },
          ]}
        >
          <View style={styles.statItem}>
            <Text
              style={[
                styles.statNumber,
                {
                  color:
                    colors.text,
                },
              ]}
            >
              {profile.followers_count}
            </Text>

            <Text
              style={[
                styles.statLabel,
                {
                  color:
                    colors.secondaryText,
                },
              ]}
            >
              دنبال‌کننده
            </Text>
          </View>

          <View
            style={[
              styles.statDivider,
              {
                backgroundColor:
                  colors.border,
              },
            ]}
          />

          <View style={styles.statItem}>
            <Text
              style={[
                styles.statNumber,
                {
                  color:
                    colors.text,
                },
              ]}
            >
              {profile.following_count}
            </Text>

            <Text
              style={[
                styles.statLabel,
                {
                  color:
                    colors.secondaryText,
                },
              ]}
            >
              دنبال‌شونده
            </Text>
          </View>

          <View
            style={[
              styles.statDivider,
              {
                backgroundColor:
                  colors.border,
              },
            ]}
          />

          <View style={styles.statItem}>
            <Text
              style={[
                styles.statNumber,
                {
                  color:
                    colors.text,
                },
              ]}
            >
              {analyses.length}
            </Text>

            <Text
              style={[
                styles.statLabel,
                {
                  color:
                    colors.secondaryText,
                },
              ]}
            >
              تحلیل
            </Text>
          </View>
        </View>

        {/* TRADING STATS */}

        <View style={styles.sectionHeader}>
          <Text
            style={[
              styles.sectionTitle,
              {
                color: colors.text,
              },
            ]}
          >
            آمار معاملاتی
          </Text>
        </View>

        <View style={styles.tradingGrid}>
          <TradingStat
            title="Win Rate"
            value="68%"
            icon="stats-chart"
            colors={colors}
          />

          <TradingStat
            title="Profit Factor"
            value="2.14"
            icon="trending-up"
            colors={colors}
          />

          <TradingStat
            title="Trades"
            value="245"
            icon="swap-horizontal"
            colors={colors}
          />

          <TradingStat
            title="Best RR"
            value="1:8"
            icon="flash"
            colors={colors}
          />
        </View>

        {/* ANALYSES */}

        <View style={styles.sectionHeader}>
          <Text
            style={[
              styles.sectionTitle,
              {
                color: colors.text,
              },
            ]}
          >
            تحلیل‌ها
          </Text>

          <Text
            style={[
              styles.sectionCount,
              {
                color:
                  colors.secondaryText,
              },
            ]}
          >
            {analyses.length} تحلیل
          </Text>
        </View>

        {analyses.map((item) => (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.85}
            onPress={() =>
              setSelectedAnalysis(item)
            }
            style={[
              styles.analysisCard,
              {
                backgroundColor:
                  colors.card,
                borderColor:
                  colors.border,
              },
            ]}
          >
            <View style={styles.analysisTop}>
              <View
                style={[
                  styles.directionBadge,
                  {
                    backgroundColor:
                      item.direction ===
                      'BUY'
                        ? `${colors.success}18`
                        : `${colors.danger}18`,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.directionText,
                    {
                      color:
                        item.direction ===
                        'BUY'
                          ? colors.success
                          : colors.danger,
                    },
                  ]}
                >
                  {item.direction}
                </Text>
              </View>

              <Text
                style={[
                  styles.analysisTimeframe,
                  {
                    color:
                      colors.secondaryText,
                  },
                ]}
              >
                {item.timeframe}
              </Text>
            </View>

            <Text
              style={[
                styles.analysisTitle,
                {
                  color: colors.text,
                },
              ]}
            >
              {item.title}
            </Text>

            <View
              style={styles.analysisBottom}
            >
              <View
                style={styles.analysisInfo}
              >
                <Ionicons
                  name="trending-up-outline"
                  size={16}
                  color={
                    colors.secondaryText
                  }
                />

                <Text
                  style={[
                    styles.analysisInfoText,
                    {
                      color:
                        colors.secondaryText,
                    },
                  ]}
                >
                  {item.symbol}
                </Text>
              </View>

              <View
                style={styles.analysisInfo}
              >
                <Ionicons
                  name="git-compare-outline"
                  size={16}
                  color={
                    colors.secondaryText
                  }
                />

                <Text
                  style={[
                    styles.analysisInfoText,
                    {
                      color:
                        colors.secondaryText,
                    },
                  ]}
                >
                  RR {item.rr}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* ANALYSIS MODAL */}

      <Modal
        visible={!!selectedAnalysis}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setSelectedAnalysis(null)
        }
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() =>
            setSelectedAnalysis(null)
          }
        >
          <Pressable
            style={[
              styles.modalCard,
              {
                backgroundColor:
                  colors.card,
                borderColor:
                  colors.border,
              },
            ]}
            onPress={(event) =>
              event.stopPropagation()
            }
          >
            <View
              style={[
                styles.modalHandle,
                {
                  backgroundColor:
                    colors.mutedText,
                },
              ]}
            />

            {selectedAnalysis && (
              <>
                <View
                  style={styles.modalHeader}
                >
                  <Text
                    style={[
                      styles.modalTitle,
                      {
                        color:
                          colors.text,
                      },
                    ]}
                  >
                    {selectedAnalysis.title}
                  </Text>

                  <TouchableOpacity
                    onPress={() =>
                      setSelectedAnalysis(
                        null
                      )
                    }
                  >
                    <Ionicons
                      name="close-circle"
                      size={28}
                      color={
                        colors.secondaryText
                      }
                    />
                  </TouchableOpacity>
                </View>

                <View
                  style={styles.modalStats}
                >
                  <ModalStat
                    title="Symbol"
                    value={
                      selectedAnalysis.symbol
                    }
                    colors={colors}
                  />

                  <ModalStat
                    title="Direction"
                    value={
                      selectedAnalysis.direction
                    }
                    colors={colors}
                  />

                  <ModalStat
                    title="Timeframe"
                    value={
                      selectedAnalysis.timeframe
                    }
                    colors={colors}
                  />

                  <ModalStat
                    title="RR"
                    value={
                      selectedAnalysis.rr
                    }
                    colors={colors}
                  />
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// =========================================================
// ✅ WRAPPER: LoginGuard + FeatureGuard
// =========================================================

export default function UserProfileScreen() {
  return (
    <FeatureGuard feature="userProfile">
      <LoginGuard message="برای دیدن پروفایل کاربران ابتدا وارد حساب کاربری خود شوید.">
        <UserProfileScreenContent />
      </LoginGuard>
    </FeatureGuard>
  );
}

// =========================================================
// SUB-COMPONENTS
// =========================================================

function TradingStat({
  title,
  value,
  icon,
  colors,
}: {
  title: string;
  value: string;
  icon: any;
  colors: any;
}) {
  return (
    <View
      style={[
        styles.tradingCard,
        {
          backgroundColor:
            colors.card,
          borderColor:
            colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.tradingIcon,
          {
            backgroundColor:
              colors.primarySoft,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={18}
          color={colors.primary}
        />
      </View>

      <Text
        style={[
          styles.tradingValue,
          {
            color: colors.text,
          },
        ]}
      >
        {value}
      </Text>

      <Text
        style={[
          styles.tradingTitle,
          {
            color:
              colors.secondaryText,
          },
        ]}
      >
        {title}
      </Text>
    </View>
  );
}

function ModalStat({
  title,
  value,
  colors,
}: {
  title: string;
  value: string;
  colors: any;
}) {
  return (
    <View
      style={[
        styles.modalStat,
        {
          backgroundColor:
            colors.background,
          borderColor:
            colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.modalStatTitle,
          {
            color:
              colors.secondaryText,
          },
        ]}
      >
        {title}
      </Text>

      <Text
        style={[
          styles.modalStatValue,
          {
            color: colors.text,
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

// =========================================================
// STYLES
// =========================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 54,
    paddingBottom: 40,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
  },

  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 8,
  },

  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },

  backButtonLarge: {
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 14,
  },

  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },

  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
  },

  profileCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
    alignItems: 'center',
  },

  avatarWrapper: {
    marginBottom: 14,
  },

  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
  },

  name: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 5,
  },

  username: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },

  bio: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 330,
  },

  actionRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
    marginTop: 20,
  },

  followButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  followButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },

  messageButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  messageButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },

  ownProfileBadge: {
    marginTop: 18,
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  ownProfileText: {
    fontSize: 13,
    fontWeight: '800',
  },

  statsCard: {
    marginTop: 12,
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },

  statItem: {
    flex: 1,
    alignItems: 'center',
  },

  statNumber: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 4,
  },

  statLabel: {
    fontSize: 12,
    fontWeight: '600',
  },

  statDivider: {
    width: 1,
    height: 34,
  },

  sectionHeader: {
    marginTop: 24,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
  },

  sectionCount: {
    fontSize: 12,
    fontWeight: '700',
  },

  tradingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  tradingCard: {
    width: '48.5%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 15,
  },

  tradingIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  tradingValue: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 4,
  },

  tradingTitle: {
    fontSize: 12,
    fontWeight: '700',
  },

  analysisCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
  },

  analysisTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  directionBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },

  directionText: {
    fontSize: 11,
    fontWeight: '900',
  },

  analysisTimeframe: {
    fontSize: 11,
    fontWeight: '700',
  },

  analysisTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 12,
  },

  analysisBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },

  analysisInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  analysisInfoText: {
    fontSize: 12,
    fontWeight: '700',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },

  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 30,
    minHeight: 280,
  },

  modalHandle: {
    width: 42,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 18,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },

  modalTitle: {
    fontSize: 19,
    fontWeight: '900',
    flex: 1,
  },

  modalStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  modalStat: {
    width: '48%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },

  modalStatTitle: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },

  modalStatValue: {
    fontSize: 16,
    fontWeight: '900',
  },
});