import { supabase } from '@/lib/supabase';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session } from '@supabase/supabase-js';
import { decode } from 'base64-arraybuffer';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useNavasanTheme } from '@/context/theme-context';

// =========================================================
// JOURNAL STORAGE
// =========================================================

const JOURNAL_STORAGE_KEY = 'navasan_trades_v1';

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
};

type TradeStats = {
  trades: number;
  wins: number;
  losses: number;
  breakEven: number;
  winRate: number | null;
  profitFactor: number | null;
  pnl: number;
};

// =========================================================
// DEFAULT STATS
// =========================================================

const EMPTY_TRADE_STATS: TradeStats = {
  trades: 0,
  wins: 0,
  losses: 0,
  breakEven: 0,
  winRate: null,
  profitFactor: null,
  pnl: 0,
};

export default function Account() {
  const { colors } = useNavasanTheme();
  const router = useRouter();

  const styles = useMemo(
    () => createStyles(colors),
    [colors],
  );

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  // Login / Register
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Profile
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const [showEditProfile, setShowEditProfile] = useState(false);

  // Trading stats
  const [tradeStats, setTradeStats] =
    useState<TradeStats>(EMPTY_TRADE_STATS);

  // =========================================================
  // LOAD JOURNAL STATS
  // =========================================================

  const loadTradeStats = useCallback(async () => {
    try {
      const storedTrades =
        await AsyncStorage.getItem(
          JOURNAL_STORAGE_KEY
        );

      if (!storedTrades) {
        setTradeStats(EMPTY_TRADE_STATS);
        return;
      }

      const parsedTrades = JSON.parse(
        storedTrades
      );

      if (!Array.isArray(parsedTrades)) {
        setTradeStats(EMPTY_TRADE_STATS);
        return;
      }

      const trades: Trade[] = parsedTrades;

      let wins = 0;
      let losses = 0;
      let breakEven = 0;

      let grossWin = 0;
      let grossLoss = 0;
      let pnl = 0;

      trades.forEach((trade) => {
        const result = Number(
          String(trade?.result ?? '')
            .replace(/,/g, '')
            .trim()
        );

        if (!Number.isFinite(result)) {
          return;
        }

        pnl += result;

        if (result > 0) {
          wins += 1;
          grossWin += result;
        } else if (result < 0) {
          losses += 1;
          grossLoss += Math.abs(result);
        } else {
          breakEven += 1;
        }
      });

      const totalTrades = trades.length;

      const winRate =
        totalTrades > 0
          ? (wins / totalTrades) * 100
          : null;

      const profitFactor =
        grossLoss > 0
          ? grossWin / grossLoss
          : null;

      setTradeStats({
        trades: totalTrades,
        wins,
        losses,
        breakEven,
        winRate,
        profitFactor,
        pnl,
      });
    } catch (error) {
      console.log(
        'Journal stats load error:',
        error
      );

      setTradeStats(EMPTY_TRADE_STATS);
    }
  }, []);

  // =========================================================
  // LOAD PROFILE
  // =========================================================

  const loadProfile = async (userId: string) => {
    setProfileLoading(true);

    const { data, error } = await supabase
      .from('profiles')
      .select(
        'id, username, full_name, bio, avatar_url, followers_count, following_count'
      )
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.log(
        'Profile load error:',
        error.message
      );

      setProfileLoading(false);
      return;
    }

    if (data) {
      setName(data.full_name || '');
      setUsername(data.username || '');
      setBio(data.bio || '');
      setAvatarUrl(data.avatar_url || null);
      setFollowersCount(
        data.followers_count || 0
      );
      setFollowingCount(
        data.following_count || 0
      );

      setProfileLoading(false);
      return;
    }

    // Create profile if it doesn't exist
    const defaultUsername =
      `user_${userId
        .replace(/-/g, '')
        .slice(0, 8)}`;

    const {
      data: newProfile,
      error: insertError,
    } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        username: defaultUsername,
        full_name: 'Seyed',
        bio: '',
        followers_count: 0,
        following_count: 0,
      })
      .select(
        'id, username, full_name, bio, avatar_url, followers_count, following_count'
      )
      .single();

    if (insertError) {
      console.log(
        'Profile create error:',
        insertError.message
      );

      setName('Seyed');
      setUsername(defaultUsername);
      setBio('');
      setAvatarUrl(null);
      setFollowersCount(0);
      setFollowingCount(0);
    } else if (newProfile) {
      setName(newProfile.full_name || '');
      setUsername(newProfile.username || '');
      setBio(newProfile.bio || '');
      setAvatarUrl(
        newProfile.avatar_url || null
      );
      setFollowersCount(
        newProfile.followers_count || 0
      );
      setFollowingCount(
        newProfile.following_count || 0
      );
    }

    setProfileLoading(false);
  };

  // =========================================================
  // REFRESH JOURNAL STATS WHEN ACCOUNT SCREEN OPENS
  // =========================================================

  useFocusEffect(
    useCallback(() => {
      loadTradeStats();
    }, [loadTradeStats])
  );

  // =========================================================
  // AUTH INITIALIZATION
  // =========================================================

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      const {
        data,
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.log(
          'Session error:',
          error.message
        );
      }

      if (!mounted) {
        return;
      }

      setSession(data.session);
      setLoading(false);

      if (data.session?.user) {
        await loadProfile(
          data.session.user.id
        );
      }
    };

    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!mounted) {
          return;
        }

        setSession(newSession);

        if (newSession?.user) {
          loadProfile(
            newSession.user.id
          );
        } else {
          setName('');
          setUsername('');
          setBio('');
          setAvatarUrl(null);
          setFollowersCount(0);
          setFollowingCount(0);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // =========================================================
  // SIGN UP
  // =========================================================

  const handleSignUp = async () => {
    if (!email.trim() || !password) {
      Alert.alert(
        'خطا',
        'لطفاً ایمیل و رمز عبور را وارد کن'
      );
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        'خطا',
        'رمز عبور باید حداقل ۶ کاراکتر باشد'
      );
      return;
    }

    setBusy(true);

    const {
      data,
      error,
    } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    setBusy(false);

    if (error) {
      Alert.alert(
        'خطا',
        error.message
      );
      return;
    }

    if (data.session?.user) {
      await loadProfile(
        data.session.user.id
      );

      Alert.alert(
        'ثبت‌نام موفق',
        'حساب کاربری شما با موفقیت ساخته شد.'
      );

      return;
    }

    Alert.alert(
      'ثبت‌نام موفق',
      'حساب ساخته شد. اگر تأیید ایمیل فعال باشد، ایمیل تأیید برای شما ارسال شده است.'
    );
  };

  // =========================================================
  // LOGIN
  // =========================================================

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert(
        'خطا',
        'لطفاً ایمیل و رمز عبور را وارد کن'
      );
      return;
    }

    setBusy(true);

    const {
      data,
      error,
    } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setBusy(false);

    if (error) {
      Alert.alert(
        'خطا',
        error.message
      );
      return;
    }

    if (data.session?.user) {
      await loadProfile(
        data.session.user.id
      );
    }
  };

  // =========================================================
  // LOGOUT
  // =========================================================

  const handleLogout = async () => {
    setBusy(true);

    const { error } =
      await supabase.auth.signOut();

    setBusy(false);

    if (error) {
      Alert.alert(
        'خطا',
        error.message
      );
    }
  };

  // =========================================================
  // PICK AVATAR
  // =========================================================

  const pickAvatar = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'دسترسی لازم است',
          'برای انتخاب عکس پروفایل باید اجازه دسترسی به گالری را فعال کنی.'
        );
        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 1,
        });

      if (
        result.canceled ||
        !result.assets?.length
      ) {
        return;
      }

      const asset = result.assets[0];

      if (!asset?.uri) {
        Alert.alert(
          'خطا',
          'آدرس تصویر پیدا نشد.'
        );
        return;
      }

      const {
        data: {
          session: currentSession,
        },
      } = await supabase.auth.getSession();

      if (!currentSession?.user) {
        Alert.alert(
          'ورود لازم است',
          'ابتدا وارد حساب کاربری شو.'
        );
        return;
      }

      setBusy(true);

      const manipulated =
        await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 800 } }],
          {
            compress: 0.82,
            format:
              ImageManipulator.SaveFormat
                .JPEG,
            base64: true,
          }
        );

      if (!manipulated.base64) {
        setBusy(false);

        Alert.alert(
          'خطا',
          'تبدیل تصویر انجام نشد.'
        );

        return;
      }

      const filePath =
        `${currentSession.user.id}/avatar_${Date.now()}.jpg`;

      const fileData =
        decode(manipulated.base64);

      const {
        error: uploadError,
      } = await supabase.storage
        .from('avatars')
        .upload(
          filePath,
          fileData,
          {
            contentType:
              'image/jpeg',
            cacheControl:
              '3600',
            upsert: false,
          }
        );

      if (uploadError) {
        setBusy(false);

        console.log(
          'Avatar upload error:',
          uploadError
        );

        Alert.alert(
          'خطا در آپلود',
          uploadError.message
        );

        return;
      }

      const {
        data: publicUrlData,
      } = supabase.storage
        .from('avatars')
        .getPublicUrl(
          filePath
        );

      const publicUrl =
        `${publicUrlData.publicUrl}?t=${Date.now()}`;

      const {
        error: updateError,
      } = await supabase
        .from('profiles')
        .update({
          avatar_url:
            publicUrl,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          'id',
          currentSession.user.id
        );

      if (updateError) {
        setBusy(false);

        console.log(
          'Avatar profile update error:',
          updateError
        );

        Alert.alert(
          'خطا در ذخیره پروفایل',
          updateError.message
        );

        return;
      }

      setAvatarUrl(publicUrl);
      setBusy(false);

      Alert.alert(
        'موفق',
        'عکس پروفایل با موفقیت آپلود و ذخیره شد.'
      );
    } catch (error) {
      setBusy(false);

      console.log(
        'Avatar error:',
        error
      );

      Alert.alert(
        'خطا',
        'در هنگام آماده‌سازی یا آپلود عکس مشکلی پیش آمد.'
      );
    }
  };

  // =========================================================
  // SAVE PROFILE
  // =========================================================

  const saveProfile = async () => {
    if (!session?.user) {
      return;
    }

    const cleanName =
      name.trim();

    const cleanUsername =
      username
        .trim()
        .replace(/\s/g, '')
        .replace(/^@+/, '')
        .toLowerCase();

    const cleanBio =
      bio.trim();

    if (!cleanName) {
      Alert.alert(
        'خطا',
        'لطفاً نام خود را وارد کن'
      );
      return;
    }

    if (!cleanUsername) {
      Alert.alert(
        'خطا',
        'لطفاً Username را وارد کن'
      );
      return;
    }

    if (cleanUsername.length < 3) {
      Alert.alert(
        'خطا',
        'Username باید حداقل ۳ کاراکتر داشته باشد'
      );
      return;
    }

    setBusy(true);

    const { error } =
      await supabase
        .from('profiles')
        .update({
          username:
            cleanUsername,
          full_name:
            cleanName,
          bio: cleanBio,
          avatar_url:
            avatarUrl,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          'id',
          session.user.id
        );

    setBusy(false);

    if (error) {
      console.log(
        'Profile update error:',
        error
      );

      if (
        error.code === '23505' ||
        error.message
          .toLowerCase()
          .includes('duplicate')
      ) {
        Alert.alert(
          'Username تکراری',
          'این Username قبلاً توسط کاربر دیگری استفاده شده است.'
        );
      } else {
        Alert.alert(
          'خطا',
          error.message
        );
      }

      return;
    }

    setName(cleanName);
    setUsername(cleanUsername);
    setBio(cleanBio);

    setShowEditProfile(false);

    Alert.alert(
      'موفق',
      'پروفایل با موفقیت ذخیره شد.'
    );
  };

  // =========================================================
  // FORMAT P/L
  // =========================================================

  const formatPnL = (value: number) => {
    if (!Number.isFinite(value)) {
      return '—';
    }

    if (value === 0) {
      return '0';
    }

    const rounded =
      Math.round(
        value * 100
      ) / 100;

    const formatted =
      Math.abs(rounded).toLocaleString(
        'en-US',
        {
          maximumFractionDigits: 2,
        }
      );

    return rounded > 0
      ? `+${formatted}`
      : `-${formatted}`;
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <View
        style={[
          styles.screen,
          styles.center,
        ]}
      >
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />
      </View>
    );
  }

  // =========================================================
  // LOGGED IN
  // =========================================================

  if (session) {
    return (
      <View style={styles.screen}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            styles.container
          }
        >
          {/* HEADER */}

          <View style={styles.header}>
            <View>
              <Text
                style={
                  styles.headerTitle
                }
              >
                پروفایل
              </Text>

              <Text
                style={
                  styles.headerSubtitle
                }
              >
                حساب و فعالیت‌های معاملاتی
              </Text>
            </View>

            <TouchableOpacity
              style={
                styles.headerButton
              }
              onPress={() =>
                setShowEditProfile(
                  true
                )
              }
            >
              <Ionicons
                name="create-outline"
                size={21}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>

          {/* PROFILE CARD */}

          <View
            style={styles.profileCard}
          >
            {/* AVATAR */}

            <TouchableOpacity
              style={
                styles.avatarWrapper
              }
              onPress={pickAvatar}
              disabled={busy}
            >
              {avatarUrl ? (
                <Image
                  source={{
                    uri: avatarUrl,
                  }}
                  style={
                    styles.avatarImage
                  }
                />
              ) : (
                <View
                  style={styles.avatar}
                >
                  <Text
                    style={
                      styles.avatarText
                    }
                  >
                    {name
                      ? name
                          .charAt(0)
                          .toUpperCase()
                      : 'N'}
                  </Text>
                </View>
              )}

              <View
                style={
                  styles.cameraButton
                }
              >
                <Ionicons
                  name="camera"
                  size={14}
                  color="#FFFFFF"
                />
              </View>
            </TouchableOpacity>

            {profileLoading ? (
              <ActivityIndicator
                size="small"
                color={colors.primary}
                style={{
                  marginTop: 10,
                }}
              />
            ) : (
              <>
                <Text
                  style={
                    styles.profileName
                  }
                >
                  {name ||
                    'کاربر NAVASAN'}
                </Text>

                <Text
                  style={
                    styles.username
                  }
                >
                  @{username || 'user'}
                </Text>

                <Text
                  style={styles.bio}
                >
                  {bio ||
                    'هنوز Bio ثبت نشده است.'}
                </Text>
              </>
            )}

            <TouchableOpacity
              style={styles.editButton}
              onPress={() =>
                setShowEditProfile(
                  true
                )
              }
            >
              <Ionicons
                name="create-outline"
                size={17}
                color="#FFFFFF"
              />

              <Text
                style={
                  styles.editButtonText
                }
              >
                ویرایش پروفایل
              </Text>
            </TouchableOpacity>

            <Text
              style={styles.avatarHint}
            >
              برای تغییر عکس روی تصویر بزن
            </Text>

            {/* SOCIAL STATS */}

            <View
              style={
                styles.socialStats
              }
            >
              <View
                style={
                  styles.socialItem
                }
              >
                <Text
                  style={
                    styles.socialNumber
                  }
                >
                  {followersCount}
                </Text>

                <Text
                  style={
                    styles.socialLabel
                  }
                >
                  دنبال‌کننده
                </Text>
              </View>

              <View
                style={styles.divider}
              />

              <View
                style={
                  styles.socialItem
                }
              >
                <Text
                  style={
                    styles.socialNumber
                  }
                >
                  {followingCount}
                </Text>

                <Text
                  style={
                    styles.socialLabel
                  }
                >
                  دنبال‌شونده
                </Text>
              </View>

              <View
                style={styles.divider}
              />

              <View
                style={
                  styles.socialItem
                }
              >
                <Text
                  style={
                    styles.socialNumber
                  }
                >
                  0
                </Text>

                <Text
                  style={
                    styles.socialLabel
                  }
                >
                  تحلیل
                </Text>
              </View>
            </View>
          </View>

          {/* TRADING STATS */}

          <Text
            style={styles.sectionTitle}
          >
            آمار معاملاتی
          </Text>

          <View
            style={styles.statsGrid}
          >
            {/* WIN RATE */}

            <View
              style={styles.statCard}
            >
              <View
                style={styles.statIcon}
              >
                <Ionicons
                  name="trending-up-outline"
                  size={20}
                  color={colors.success}
                />
              </View>

              <Text
                style={styles.statValue}
              >
                {tradeStats.winRate !==
                null
                  ? `${tradeStats.winRate.toFixed(
                      1
                    )}%`
                  : '—'}
              </Text>

              <Text
                style={styles.statLabel}
              >
                Win Rate
              </Text>
            </View>

            {/* TRADES */}

            <View
              style={styles.statCard}
            >
              <View
                style={styles.statIcon}
              >
                <Ionicons
                  name="swap-horizontal-outline"
                  size={20}
                  color={colors.primary}
                />
              </View>

              <Text
                style={styles.statValue}
              >
                {tradeStats.trades}
              </Text>

              <Text
                style={styles.statLabel}
              >
                معاملات
              </Text>
            </View>

            {/* PROFIT FACTOR */}

            <View
              style={styles.statCard}
            >
              <View
                style={styles.statIcon}
              >
                <Ionicons
                  name="analytics-outline"
                  size={20}
                  color="#7C3AED"
                />
              </View>

              <Text
                style={styles.statValue}
              >
                {tradeStats.profitFactor !==
                null
                  ? tradeStats.profitFactor.toFixed(
                      2
                    )
                  : '—'}
              </Text>

              <Text
                style={styles.statLabel}
              >
                Profit Factor
              </Text>
            </View>

            {/* P/L */}

            <View
              style={styles.statCard}
            >
              <View
                style={styles.statIcon}
              >
                <Ionicons
                  name="cash-outline"
                  size={20}
                  color="#F59E0B"
                />
              </View>

              <Text
                style={[
                  styles.statValue,
                  tradeStats.pnl > 0 &&
                    styles.profitValue,
                  tradeStats.pnl < 0 &&
                    styles.lossValue,
                ]}
              >
                {tradeStats.trades > 0
                  ? formatPnL(
                      tradeStats.pnl
                    )
                  : '—'}
              </Text>

              <Text
                style={styles.statLabel}
              >
                P/L
              </Text>
            </View>
          </View>

          {/* ACTIVITY */}

          <Text
            style={styles.sectionTitle}
          >
            فعالیت‌های من
          </Text>

          <View
            style={styles.menuCard}
          >
            <TouchableOpacity
              style={styles.menuItem}
            >
              <View
                style={styles.menuIcon}
              >
                <Ionicons
                  name="bar-chart-outline"
                  size={21}
                  color={colors.primary}
                />
              </View>

              <View
                style={
                  styles.menuTextContainer
                }
              >
                <Text
                  style={
                    styles.menuTitle
                  }
                >
                  تحلیل‌های من
                </Text>

                <Text
                  style={
                    styles.menuSubtitle
                  }
                >
                  تحلیل‌هایی که منتشر کرده‌اید
                </Text>
              </View>

              <Ionicons
                name="chevron-back"
                size={19}
                color={colors.mutedText}
              />
            </TouchableOpacity>

            <View
              style={
                styles.menuDivider
              }
            />

            <TouchableOpacity
              style={styles.menuItem}
            >
              <View
                style={styles.menuIcon}
              >
                <Ionicons
                  name="bookmark-outline"
                  size={21}
                  color="#7C3AED"
                />
              </View>

              <View
                style={
                  styles.menuTextContainer
                }
              >
                <Text
                  style={
                    styles.menuTitle
                  }
                >
                  ذخیره‌شده‌ها
                </Text>

                <Text
                  style={
                    styles.menuSubtitle
                  }
                >
                  تحلیل‌های ذخیره‌شده شما
                </Text>
              </View>

              <Ionicons
                name="chevron-back"
                size={19}
                color={colors.mutedText}
              />
            </TouchableOpacity>

            <View
              style={
                styles.menuDivider
              }
            />

            <TouchableOpacity
              style={styles.menuItem}
            >
              <View
                style={styles.menuIcon}
              >
                <Ionicons
                  name="stats-chart-outline"
                  size={21}
                  color={colors.success}
                />
              </View>

              <View
                style={
                  styles.menuTextContainer
                }
              >
                <Text
                  style={
                    styles.menuTitle
                  }
                >
                  آمار کامل
                </Text>

                <Text
                  style={
                    styles.menuSubtitle
                  }
                >
                  عملکرد و تاریخچه معاملاتی
                </Text>
              </View>

              <Ionicons
                name="chevron-back"
                size={19}
                color={colors.mutedText}
              />
            </TouchableOpacity>
          </View>

          {/* ACCOUNT */}

          <Text
            style={styles.sectionTitle}
          >
            حساب کاربری
          </Text>

          <View
            style={styles.accountCard}
          >
            <View
              style={styles.emailRow}
            >
              <View
                style={styles.smallIcon}
              >
                <Ionicons
                  name="mail-outline"
                  size={19}
                  color={colors.primary}
                />
              </View>

              <View
                style={{ flex: 1 }}
              >
                <Text
                  style={
                    styles.emailLabel
                  }
                >
                  ایمیل حساب
                </Text>

                <Text
                  style={
                    styles.emailText
                  }
                >
                  {session.user.email ||
                    '—'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={
                styles.logoutButton
              }
              onPress={handleLogout}
              disabled={busy}
            >
              <Ionicons
                name="log-out-outline"
                size={19}
                color={colors.danger}
              />

              <Text
                style={
                  styles.logoutButtonText
                }
              >
                {busy
                  ? 'در حال خروج...'
                  : 'خروج از حساب'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text
            style={styles.version}
          >
            NAVASAN • Account
          </Text>
        </ScrollView>

        {/* EDIT PROFILE MODAL */}

        <Modal
          visible={showEditProfile}
          animationType="slide"
          transparent
          onRequestClose={() =>
            setShowEditProfile(
              false
            )
          }
        >
          <View
            style={
              styles.modalOverlay
            }
          >
            <View
              style={styles.modalCard}
            >
              <View
                style={
                  styles.modalHeader
                }
              >
                <Text
                  style={
                    styles.modalTitle
                  }
                >
                  ویرایش پروفایل
                </Text>

                <TouchableOpacity
                  onPress={() =>
                    setShowEditProfile(
                      false
                    )
                  }
                >
                  <Ionicons
                    name="close"
                    size={25}
                    color={colors.secondaryText}
                  />
                </TouchableOpacity>
              </View>

              {/* AVATAR IN MODAL */}

              <TouchableOpacity
                style={
                  styles.modalAvatarWrapper
                }
                onPress={pickAvatar}
                disabled={busy}
              >
                {avatarUrl ? (
                  <Image
                    source={{
                      uri: avatarUrl,
                    }}
                    style={
                      styles.modalAvatarImage
                    }
                  />
                ) : (
                  <View
                    style={
                      styles.modalAvatar
                    }
                  >
                    <Text
                      style={
                        styles.modalAvatarText
                      }
                    >
                      {name
                        ? name
                            .charAt(0)
                            .toUpperCase()
                        : 'N'}
                    </Text>
                  </View>
                )}

                <View
                  style={
                    styles.modalCameraButton
                  }
                >
                  <Ionicons
                    name="camera"
                    size={15}
                    color="#FFFFFF"
                  />
                </View>
              </TouchableOpacity>

              <Text
                style={
                  styles.changePhotoText
                }
              >
                تغییر عکس پروفایل
              </Text>

              {/* NAME */}

              <Text
                style={styles.inputLabel}
              >
                نام
              </Text>

              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="نام شما"
                placeholderTextColor={colors.mutedText}
                maxLength={40}
              />

              {/* USERNAME */}

              <Text
                style={styles.inputLabel}
              >
                Username
              </Text>

              <TextInput
                style={styles.input}
                value={username}
                onChangeText={(text) =>
                  setUsername(
                    text
                      .replace(/\s/g, '')
                      .replace(
                        /^@+/,
                        ''
                      )
                  )
                }
                placeholder="seyed_trader"
                placeholderTextColor={colors.mutedText}
                autoCapitalize="none"
                maxLength={30}
              />

              <Text
                style={
                  styles.inputHint
                }
              >
                مثال: seyed_trader
              </Text>

              {/* BIO */}

              <Text
                style={styles.inputLabel}
              >
                Bio
              </Text>

              <TextInput
                style={[
                  styles.input,
                  styles.bioInput,
                ]}
                value={bio}
                onChangeText={setBio}
                placeholder="درباره خودتان..."
                placeholderTextColor={colors.mutedText}
                multiline
                maxLength={160}
              />

              {/* SAVE */}

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  busy && {
                    opacity: 0.6,
                  },
                ]}
                onPress={saveProfile}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator
                    color="#FFFFFF"
                  />
                ) : (
                  <Text
                    style={
                      styles.saveButtonText
                    }
                  >
                    ذخیره تغییرات
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // =========================================================
  // LOGIN / REGISTER
  // =========================================================

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.authContainer
        }
      >
        <View style={styles.authLogo}>
          <Text
            style={styles.authLogoText}
          >
            N
          </Text>
        </View>

        <Text style={styles.authTitle}>
          حساب کاربری
        </Text>

        <Text
          style={styles.authSubtitle}
        >
          برای استفاده از امکانات اجتماعی
          NAVASAN وارد شوید
        </Text>

        <View style={styles.authCard}>
          <Text
            style={styles.inputLabel}
          >
            ایمیل
          </Text>

          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.mutedText}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
          />

          <Text
            style={styles.inputLabel}
          >
            رمز عبور
          </Text>

          <TextInput
            style={styles.input}
            value={password}
            onChangeText={
              setPassword
            }
            placeholder="حداقل ۶ کاراکتر"
            placeholderTextColor={colors.mutedText}
            secureTextEntry
          />

          <TouchableOpacity
            style={[
              styles.loginButton,
              busy && {
                opacity: 0.6,
              },
            ]}
            onPress={handleLogin}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator
                color="#FFFFFF"
              />
            ) : (
              <Text
                style={
                  styles.loginButtonText
                }
              >
                ورود
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.registerButton,
              busy && {
                opacity: 0.6,
              },
            ]}
            onPress={handleSignUp}
            disabled={busy}
          >
            <Text
              style={
                styles.registerButtonText
              }
            >
              ساخت حساب جدید
            </Text>
          </TouchableOpacity>

          {/* ✅ FORGOT PASSWORD LINK */}

          <TouchableOpacity
            style={styles.forgotButton}
            onPress={() =>
              router.push(
                '/forgot-password' as any
              )
            }
            disabled={busy}
          >
            <Text
              style={
                styles.forgotButtonText
              }
            >
              رمز عبور را فراموش کرده‌اید؟
            </Text>
          </TouchableOpacity>
        </View>

        <Text
          style={styles.authNote}
        >
          ژورنال معاملاتی بدون ساخت حساب نیز
          قابل استفاده است.
        </Text>
      </ScrollView>
    </View>
  );
}

// =========================================================
// STYLES
// =========================================================

const createStyles = (colors: {
  background: string;
  card: string;
  cardSecondary: string;
  border: string;
  text: string;
  secondaryText: string;
  mutedText: string;
  primary: string;
  primarySoft: string;
  input: string;
  tabBackground: string;
  divider: string;
  danger: string;
  success: string;
}) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },

    center: {
      justifyContent: 'center',
      alignItems: 'center',
    },

    container: {
      paddingHorizontal: 18,
      paddingTop: 52,
      paddingBottom: 120,
    },

    // HEADER

    header: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
    },

    headerTitle: {
      fontSize: 25,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'right',
    },

    headerSubtitle: {
      marginTop: 4,
      fontSize: 13,
      color: colors.secondaryText,
      textAlign: 'right',
    },

    headerButton: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // PROFILE

    profileCard: {
      backgroundColor: colors.card,
      borderRadius: 22,
      padding: 22,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 2,
    },

    avatarWrapper: {
      position: 'relative',
      marginBottom: 12,
    },

    avatar: {
      width: 82,
      height: 82,
      borderRadius: 41,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },

    avatarImage: {
      width: 82,
      height: 82,
      borderRadius: 41,
    },

    avatarText: {
      color: '#FFFFFF',
      fontSize: 32,
      fontWeight: '800',
    },

    cameraButton: {
      position: 'absolute',
      right: -2,
      bottom: -2,
      width: 29,
      height: 29,
      borderRadius: 15,
      backgroundColor: colors.primary,
      borderWidth: 3,
      borderColor: colors.card,
      justifyContent: 'center',
      alignItems: 'center',
    },

    avatarHint: {
      fontSize: 10,
      color: colors.mutedText,
      marginTop: 8,
    },

    profileName: {
      fontSize: 21,
      fontWeight: '800',
      color: colors.text,
    },

    username: {
      fontSize: 13,
      color: colors.primary,
      fontWeight: '600',
      marginTop: 4,
    },

    bio: {
      fontSize: 13,
      color: colors.secondaryText,
      textAlign: 'center',
      marginTop: 9,
      lineHeight: 20,
    },

    editButton: {
      marginTop: 16,
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingHorizontal: 18,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },

    editButtonText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
    },

    socialStats: {
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      marginTop: 22,
      paddingTop: 18,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
    },

    socialItem: {
      flex: 1,
      alignItems: 'center',
    },

    socialNumber: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
    },

    socialLabel: {
      fontSize: 11,
      color: colors.secondaryText,
      marginTop: 4,
    },

    divider: {
      width: 1,
      height: 30,
      backgroundColor: colors.border,
    },

    // STATS

    sectionTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'right',
      marginTop: 25,
      marginBottom: 11,
    },

    statsGrid: {
      flexDirection: 'row-reverse',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },

    statCard: {
      width: '48.5%',
      backgroundColor: colors.card,
      borderRadius: 17,
      padding: 15,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },

    statIcon: {
      width: 38,
      height: 38,
      borderRadius: 11,
      backgroundColor: colors.cardSecondary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 10,
    },

    statValue: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
    },

    profitValue: {
      color: colors.success,
    },

    lossValue: {
      color: colors.danger,
    },

    statLabel: {
      fontSize: 11,
      color: colors.secondaryText,
      marginTop: 3,
    },

    // MENU

    menuCard: {
      backgroundColor: colors.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },

    menuItem: {
      minHeight: 70,
      paddingHorizontal: 14,
      flexDirection: 'row-reverse',
      alignItems: 'center',
    },

    menuIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.cardSecondary,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 12,
    },

    menuTextContainer: {
      flex: 1,
    },

    menuTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'right',
    },

    menuSubtitle: {
      fontSize: 11,
      color: colors.mutedText,
      marginTop: 3,
      textAlign: 'right',
    },

    menuDivider: {
      height: 1,
      backgroundColor: colors.divider,
      marginHorizontal: 14,
    },

    // ACCOUNT

    accountCard: {
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 15,
      borderWidth: 1,
      borderColor: colors.border,
    },

    emailRow: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
    },

    smallIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.primarySoft,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 12,
    },

    emailLabel: {
      fontSize: 11,
      color: colors.mutedText,
      textAlign: 'right',
    },

    emailText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
      marginTop: 3,
      textAlign: 'right',
    },

    logoutButton: {
      height: 48,
      borderRadius: 12,
      backgroundColor: `${colors.danger}15`,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
      gap: 7,
      marginTop: 16,
    },

    logoutButtonText: {
      color: colors.danger,
      fontSize: 13,
      fontWeight: '700',
    },

    version: {
      textAlign: 'center',
      color: colors.mutedText,
      fontSize: 10,
      marginTop: 25,
    },

    // AUTH

    authContainer: {
      flexGrow: 1,
      padding: 20,
      paddingTop: 80,
      paddingBottom: 60,
      justifyContent: 'center',
    },

    authLogo: {
      width: 72,
      height: 72,
      borderRadius: 22,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'center',
      marginBottom: 18,
    },

    authLogoText: {
      color: '#FFFFFF',
      fontSize: 34,
      fontWeight: '900',
    },

    authTitle: {
      textAlign: 'center',
      fontSize: 25,
      fontWeight: '800',
      color: colors.text,
    },

    authSubtitle: {
      textAlign: 'center',
      color: colors.secondaryText,
      fontSize: 13,
      lineHeight: 21,
      marginTop: 7,
      marginBottom: 25,
    },

    authCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.border,
    },

    inputLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.secondaryText,
      marginBottom: 7,
      marginTop: 13,
      textAlign: 'right',
    },

    input: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.input,
      borderRadius: 12,
      minHeight: 48,
      paddingHorizontal: 13,
      fontSize: 14,
      color: colors.text,
      textAlign: 'right',
    },

    inputHint: {
      fontSize: 10,
      color: colors.mutedText,
      textAlign: 'right',
      marginTop: 5,
    },

    bioInput: {
      minHeight: 90,
      paddingTop: 13,
      textAlignVertical: 'top',
    },

    loginButton: {
      height: 50,
      borderRadius: 12,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 22,
    },

    loginButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '800',
    },

    registerButton: {
      height: 50,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 10,
    },

    registerButtonText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '700',
    },

    // ✅ FORGOT PASSWORD

    forgotButton: {
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 14,
    },

    forgotButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.secondaryText,
      textDecorationLine: 'underline',
    },

    authNote: {
      textAlign: 'center',
      color: colors.mutedText,
      fontSize: 11,
      lineHeight: 18,
      marginTop: 18,
    },

    // MODAL

    modalOverlay: {
      flex: 1,
      backgroundColor:
        'rgba(15,23,42,0.45)',
      justifyContent: 'flex-end',
    },

    modalCard: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      padding: 20,
      paddingBottom: 35,
    },

    modalHeader: {
      flexDirection: 'row-reverse',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },

    modalTitle: {
      fontSize: 19,
      fontWeight: '800',
      color: colors.text,
    },

    modalAvatarWrapper: {
      alignSelf: 'center',
      position: 'relative',
      marginTop: 5,
      marginBottom: 5,
    },

    modalAvatar: {
      width: 78,
      height: 78,
      borderRadius: 39,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },

    modalAvatarImage: {
      width: 78,
      height: 78,
      borderRadius: 39,
    },

    modalAvatarText: {
      color: '#FFFFFF',
      fontSize: 30,
      fontWeight: '800',
    },

    modalCameraButton: {
      position: 'absolute',
      right: -2,
      bottom: -2,
      width: 27,
      height: 27,
      borderRadius: 14,
      backgroundColor: colors.primary,
      borderWidth: 3,
      borderColor: colors.card,
      justifyContent: 'center',
      alignItems: 'center',
    },

    changePhotoText: {
      textAlign: 'center',
      color: colors.primary,
      fontSize: 11,
      fontWeight: '700',
      marginBottom: 4,
    },

    saveButton: {
      height: 50,
      borderRadius: 12,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 22,
    },

    saveButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '800',
    },
  });