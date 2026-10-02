import { supabase } from '@/lib/supabase';
import Ionicons from '@expo/vector-icons/Ionicons';
import { decode } from 'base64-arraybuffer';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { LoginGuard } from '@/components/LoginGuard';
import { useNavasanTheme } from '@/context/theme-context';

type Direction = 'BUY' | 'SELL';
type FilterType = 'ALL' | 'BUY' | 'SELL';

type Comment = {
  id: string;
  username: string;
  name: string;
  avatarUrl?: string | null;
  text: string;
  likes: number;
  liked: boolean;
  replies: Comment[];
};

type AnalysisPost = {
  id: string;
  username: string;
  name: string;
  avatarUrl?: string | null;
  userId?: string | null;
  symbol: string;
  direction: Direction;
  timeframe: string;
  entry: string;
  sl: string;
  tp: string;
  rr: string;
  text: string;
  imageUri?: string;
  likes: number;
  liked: boolean;
  comments: Comment[];
  saved: boolean;
  following: boolean;
  createdAt: string;
};

type UserProfile = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
};

type AnalysisPostRow = {
  id: string;
  user_id: string;
  symbol: string;
  direction: Direction;
  timeframe: string;
  entry: string;
  sl: string;
  tp: string;
  rr: string;
  text: string;
  image_url: string | null;
  created_at: string;
};

const INITIAL_POSTS: AnalysisPost[] = [
  {
    id: '1',
    username: '@navasan_trader',
    name: 'NAVASAN Trader',
    avatarUrl: null,
    userId: null,
    symbol: 'XAUUSD',
    direction: 'BUY',
    timeframe: '5M',
    entry: '3650.20',
    sl: '3646.20',
    tp: '3662.20',
    rr: '1:3',
    text:
      'قیمت بعد از گرفتن نقدینگی پایین، MSS صعودی داده و روی ناحیه حمایتی واکنش نشان داده است.',
    likes: 24,
    liked: false,
    saved: false,
    following: false,
    comments: [
      {
        id: 'c1',
        username: '@ali_trader',
        name: 'Ali Trader',
        avatarUrl: null,
        text: 'تحلیل خوبیه، مخصوصاً تأیید MSS.',
        likes: 5,
        liked: false,
        replies: [],
      },
      {
        id: 'c2',
        username: '@mmd_fx',
        name: 'MMD FX',
        avatarUrl: null,
        text: 'برای ورود صبر می‌کنی روی OB برگرده؟',
        likes: 2,
        liked: false,
        replies: [],
      },
    ],
    createdAt: '10 دقیقه پیش',
  },
  {
    id: '2',
    username: '@smartmoney',
    name: 'Smart Money',
    avatarUrl: null,
    userId: null,
    symbol: 'EURUSD',
    direction: 'SELL',
    timeframe: '15M',
    entry: '1.17320',
    sl: '1.17520',
    tp: '1.16720',
    rr: '1:3',
    text:
      'قیمت در محدوده مقاومت 15 دقیقه‌ای قرار گرفته و منتظر تأیید نزولی برای ورود هستم.',
    likes: 17,
    liked: false,
    saved: false,
    following: false,
    comments: [],
    createdAt: '25 دقیقه پیش',
  },
  {
    id: '3',
    username: '@priceaction',
    name: 'Price Action',
    avatarUrl: null,
    userId: null,
    symbol: 'XAUUSD',
    direction: 'SELL',
    timeframe: '1M',
    entry: '3658.00',
    sl: '3661.00',
    tp: '3646.00',
    rr: '1:4',
    text:
      'بعد از Sweep نقدینگی بالا و شکست ساختار، سناریوی فروش برای من فعال شده است.',
    likes: 31,
    liked: false,
    saved: false,
    following: false,
    comments: [],
    createdAt: '1 ساعت پیش',
  },
];

const normalizeUsername = (value: string) =>
  value.trim().replace(/^@+/, '').toLowerCase();

const displayUsername = (value: string) =>
  value.startsWith('@') ? value : `@${value}`;

const formatCreatedAt = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'همین حالا';
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) {
    return 'همین الان';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} دقیقه پیش`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours} ساعت پیش`;
  }

  const diffDays = Math.floor(diffHours / 24);

  if (diffDays < 7) {
    return `${diffDays} روز پیش`;
  }

  return date.toLocaleDateString('fa-IR');
};

function AnalysisContent() {
  const router = useRouter();
  const { colors, isDark } = useNavasanTheme();

  const [posts, setPosts] =
    useState<AnalysisPost[]>(INITIAL_POSTS);

  const [search, setSearch] = useState('');
  const [filter, setFilter] =
    useState<FilterType>('ALL');

  const [showCreate, setShowCreate] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  const [selectedPost, setSelectedPost] =
    useState<AnalysisPost | null>(null);

  const [refreshing, setRefreshing] =
    useState(false);

  const [loadingPosts, setLoadingPosts] =
    useState(true);

  const [sessionUserId, setSessionUserId] =
    useState<string | null>(null);

  const [currentProfile, setCurrentProfile] =
    useState<UserProfile | null>(null);

  const [loadingUser, setLoadingUser] =
    useState(true);

  const [busyFollowId, setBusyFollowId] =
    useState<string | null>(null);

  const [publishing, setPublishing] =
    useState(false);

  const [symbol, setSymbol] =
    useState('XAUUSD');

  const [direction, setDirection] =
    useState<Direction>('BUY');

  const [timeframe, setTimeframe] =
    useState('5M');

  const [entry, setEntry] = useState('');
  const [sl, setSl] = useState('');
  const [tp, setTp] = useState('');

  const [analysisText, setAnalysisText] =
    useState('');

  const [imageUri, setImageUri] =
    useState<string | undefined>();

  const [commentText, setCommentText] =
    useState('');

  const [replyingTo, setReplyingTo] =
    useState<string | null>(null);

  const [editingPost, setEditingPost] =
    useState<AnalysisPost | null>(null);

  const [loadingMore, setLoadingMore] =
    useState(false);

  const [hasMore, setHasMore] =
    useState(true);

  const [loadError, setLoadError] =
    useState<string | null>(null);

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    initializeAnalysis();
  }, []);

  const initializeAnalysis = async () => {
    await loadCurrentUser();
    await loadAnalysisPosts(true);
  };

  // =========================================================
  // LOAD CURRENT USER
  // =========================================================

  const loadCurrentUser = async () => {
    try {
      setLoadingUser(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setSessionUserId(null);
        setCurrentProfile(null);
        return;
      }

      setSessionUserId(session.user.id);

      const { data, error } = await supabase
        .from('profiles')
        .select(
          'id, username, full_name, avatar_url'
        )
        .eq('id', session.user.id)
        .maybeSingle();

      if (error) {
        console.log(
          'Analysis profile load error:',
          error.message
        );
        return;
      }

      if (data) {
        setCurrentProfile({
          id: data.id,
          username: data.username || '',
          full_name:
            data.full_name || 'کاربر NAVASAN',
          avatar_url:
            data.avatar_url || null,
        });
      }
    } catch (error) {
      console.log(
        'Current user error:',
        error
      );
    } finally {
      setLoadingUser(false);
    }
  };

  // =========================================================
  // CHECK SESSION & PROFILE ON DEMAND
  // =========================================================

  const ensureSessionAndProfile = async (): Promise<{
    userId: string;
    profile: UserProfile;
  } | null> => {
    const {
      data: { session: freshSession },
    } = await supabase.auth.getSession();

    const activeUserId =
      freshSession?.user?.id ?? sessionUserId;

    if (!activeUserId) {
      return null;
    }

    if (currentProfile && currentProfile.id === activeUserId) {
      return { userId: activeUserId, profile: currentProfile };
    }

    const { data: existing } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .eq('id', activeUserId)
      .maybeSingle();

    if (existing) {
      const p: UserProfile = {
        id: existing.id,
        username: existing.username || '',
        full_name: existing.full_name || 'کاربر NAVASAN',
        avatar_url: existing.avatar_url || null,
      };
      setSessionUserId(activeUserId);
      setCurrentProfile(p);
      return { userId: activeUserId, profile: p };
    }

    const defaultUsername = `user_${activeUserId
      .replace(/-/g, '')
      .slice(0, 8)}`;

    const { data: created, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: activeUserId,
        username: defaultUsername,
        full_name: 'کاربر NAVASAN',
        bio: '',
        followers_count: 0,
        following_count: 0,
      })
      .select('id, username, full_name, avatar_url')
      .single();

    if (createError || !created) {
      console.log('Profile auto-create error:', createError?.message);
      return null;
    }

    const p: UserProfile = {
      id: created.id,
      username: created.username || '',
      full_name: created.full_name || 'کاربر NAVASAN',
      avatar_url: created.avatar_url || null,
    };
    setSessionUserId(activeUserId);
    setCurrentProfile(p);
    return { userId: activeUserId, profile: p };
  };

  // =========================================================
  // LOAD ANALYSIS POSTS FROM SUPABASE
  // =========================================================

  const loadAnalysisPosts = async (reset = true) => {
    if (reset) {
      setLoadingPosts(true);
      setLoadError(null);
    } else {
      if (loadingMore || !hasMore) return;
      setLoadingMore(true);
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const activeUserId = session?.user?.id ?? sessionUserId;
      const offset = reset ? 0 : posts.length;
      const limit = 20;

      const {
        data,
        error,
      } = await supabase
        .from('analysis_posts')
        .select(
          'id, user_id, symbol, direction, timeframe, entry, sl, tp, rr, text, image_url, created_at'
        )
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const rows = (data || []) as AnalysisPostRow[];
      setHasMore(rows.length === limit);

      if (rows.length === 0) {
        if (reset) setPosts([]);
        return;
      }

      const uniqueUserIds = [...new Set(rows.map((row) => row.user_id))];
      const profileMap = new Map<string, UserProfile>();

      if (uniqueUserIds.length) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .in('id', uniqueUserIds);

        if (!profilesError) {
          (profiles || []).forEach((profile) => {
            profileMap.set(profile.id, {
              id: profile.id,
              username: profile.username || '',
              full_name: profile.full_name || 'کاربر NAVASAN',
              avatar_url: profile.avatar_url || null,
            });
          });
        }
      }

      const postIds = rows.map((row) => row.id);
      const authorIds = uniqueUserIds.filter((id) => id !== activeUserId);

      const [likesResult, savesResult, commentsResult, followsResult] =
        await Promise.all([
          supabase.from('analysis_likes').select('post_id, user_id').in('post_id', postIds),
          activeUserId
            ? supabase.from('analysis_saves').select('post_id, user_id').eq('user_id', activeUserId).in('post_id', postIds)
            : Promise.resolve({ data: [], error: null }),
          supabase
            .from('analysis_comments')
            .select('id, post_id, user_id, parent_id, text, created_at')
            .in('post_id', postIds)
            .order('created_at', { ascending: true }),
          activeUserId && authorIds.length
            ? supabase.from('follows').select('following_id').eq('follower_id', activeUserId).in('following_id', authorIds)
            : Promise.resolve({ data: [], error: null }),
        ]);

      const likesRows = likesResult.data || [];
      const savesRows = savesResult.data || [];
      const commentRows = commentsResult.data || [];
      const followRows = followsResult.data || [];

      const commentIds = commentRows.map((comment) => comment.id);
      let commentLikesRows: any[] = [];
      if (commentIds.length) {
        const { data } = await supabase
          .from('analysis_comment_likes')
          .select('id, comment_id, user_id')
          .in('comment_id', commentIds);
        commentLikesRows = data || [];
      }

      const commentUserIds = [...new Set(commentRows.map((comment) => comment.user_id))];
      const commentProfileMap = new Map<string, UserProfile>();
      if (commentUserIds.length) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .in('id', commentUserIds);
        (profiles || []).forEach((profile) => {
          commentProfileMap.set(profile.id, {
            id: profile.id,
            username: profile.username || '',
            full_name: profile.full_name || 'کاربر NAVASAN',
            avatar_url: profile.avatar_url || null,
          });
        });
      }

      const likeCount = new Map<string, number>();
      likesRows.forEach((row) => likeCount.set(row.post_id, (likeCount.get(row.post_id) || 0) + 1));
      const likedIds = new Set(
        likesRows.filter((row) => row.user_id === activeUserId).map((row) => row.post_id)
      );
      const savedIds = new Set(savesRows.map((row) => row.post_id));
      const followingIds = new Set(followRows.map((row) => row.following_id));

      const commentLikeCount = new Map<string, number>();
      const commentLikedIds = new Set<string>();
      commentLikesRows.forEach((row) => {
        commentLikeCount.set(row.comment_id, (commentLikeCount.get(row.comment_id) || 0) + 1);
        if (row.user_id === activeUserId) commentLikedIds.add(row.comment_id);
      });

      const commentsByPost = new Map<string, Comment[]>();
      const commentMap = new Map<string, Comment>();
      commentRows.forEach((row) => {
        const profile = commentProfileMap.get(row.user_id);
        commentMap.set(row.id, {
          id: row.id,
          username: displayUsername(profile?.username || 'navasan_user'),
          name: profile?.full_name || 'کاربر NAVASAN',
          avatarUrl: profile?.avatar_url || null,
          text: row.text,
          likes: commentLikeCount.get(row.id) || 0,
          liked: commentLikedIds.has(row.id),
          replies: [],
        });
      });

      commentRows.forEach((row) => {
        const comment = commentMap.get(row.id);
        if (!comment) return;
        if (row.parent_id && commentMap.has(row.parent_id)) {
          commentMap.get(row.parent_id)!.replies.push(comment);
        } else {
          const list = commentsByPost.get(row.post_id) || [];
          list.push(comment);
          commentsByPost.set(row.post_id, list);
        }
      });

      const mappedPosts: AnalysisPost[] = rows.map((row) => {
        const profile = profileMap.get(row.user_id);
        return {
          id: row.id,
          username: displayUsername(profile?.username || 'navasan_user'),
          name: profile?.full_name || 'کاربر NAVASAN',
          avatarUrl: profile?.avatar_url || null,
          userId: row.user_id,
          symbol: row.symbol,
          direction: row.direction,
          timeframe: row.timeframe,
          entry: row.entry,
          sl: row.sl,
          tp: row.tp,
          rr: row.rr,
          text: row.text,
          imageUri: row.image_url || undefined,
          likes: likeCount.get(row.id) || 0,
          liked: likedIds.has(row.id),
          comments: commentsByPost.get(row.id) || [],
          saved: savedIds.has(row.id),
          following: followingIds.has(row.user_id),
          createdAt: formatCreatedAt(row.created_at),
        };
      });

      if (reset) setPosts(mappedPosts);
      else setPosts((prev) => [...prev, ...mappedPosts]);
    } catch (error: any) {
      console.log('Load analysis posts error:', error);
      setLoadError(error?.message || 'دریافت تحلیل‌ها انجام نشد.');
      if (reset) setPosts([]);
    } finally {
      setLoadingPosts(false);
      setLoadingMore(false);
    }
  };

  // =========================================================
  // FILTER
  // =========================================================

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchesFilter =
        filter === 'ALL' ||
        post.direction === filter;

      const q = search
        .trim()
        .toLowerCase();

      const matchesSearch =
        !q ||
        post.symbol
          .toLowerCase()
          .includes(q) ||
        post.username
          .toLowerCase()
          .includes(q) ||
        post.name
          .toLowerCase()
          .includes(q) ||
        post.text
          .toLowerCase()
          .includes(q);

      return (
        matchesFilter &&
        matchesSearch
      );
    });
  }, [posts, search, filter]);

  const savedPosts = posts.filter(
    (post) => post.saved
  );

  // =========================================================
  // IMAGE
  // =========================================================

  const pickImage = async () => {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'دسترسی لازم است',
        'برای انتخاب تصویر باید اجازه دسترسی به گالری را فعال کنید.'
      );
      return;
    }

    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.9,
      });

    if (
      !result.canceled &&
      result.assets?.[0]?.uri
    ) {
      setImageUri(
        result.assets[0].uri
      );
    }
  };

  // =========================================================
  // RR
  // =========================================================

  const calculateRR = () => {
    const e = Number(entry);
    const s = Number(sl);
    const t = Number(tp);

    if (
      !Number.isFinite(e) ||
      !Number.isFinite(s) ||
      !Number.isFinite(t)
    ) {
      return null;
    }

    const risk = Math.abs(e - s);
    const reward = Math.abs(t - e);

    if (
      risk <= 0 ||
      reward <= 0
    ) {
      return null;
    }

    return reward / risk;
  };

  // =========================================================
  // VALIDATE
  // =========================================================

  const validateTrade = () => {
    const e = Number(entry);
    const s = Number(sl);
    const t = Number(tp);

    if (!symbol.trim()) {
      Alert.alert(
        'خطا',
        'نماد را وارد کنید.'
      );
      return false;
    }

    if (
      !Number.isFinite(e) ||
      !Number.isFinite(s) ||
      !Number.isFinite(t)
    ) {
      Alert.alert(
        'خطا',
        'Entry، Stop Loss و Take Profit را به‌درستی وارد کنید.'
      );
      return false;
    }

    if (direction === 'BUY') {
      if (!(s < e && t > e)) {
        Alert.alert(
          'سناریوی BUY نامعتبر است',
          'در BUY باید SL پایین‌تر از Entry و TP بالاتر از Entry باشد.'
        );
        return false;
      }
    }

    if (direction === 'SELL') {
      if (!(s > e && t < e)) {
        Alert.alert(
          'سناریوی SELL نامعتبر است',
          'در SELL باید SL بالاتر از Entry و TP پایین‌تر از Entry باشد.'
        );
        return false;
      }
    }

    return true;
  };

  // =========================================================
  // RESET
  // =========================================================

  const resetCreateForm = () => {
    setSymbol('XAUUSD');
    setDirection('BUY');
    setTimeframe('5M');
    setEntry('');
    setSl('');
    setTp('');
    setAnalysisText('');
    setImageUri(undefined);
    setEditingPost(null);
  };

  // =========================================================
  // CREATE ANALYSIS - SUPABASE
  // =========================================================

  // ✅ تابع اصلاح‌شده: ImageManipulator + base64-arraybuffer
  const uploadAnalysisImage = async (uri: string, userId: string) => {
    // 1. تبدیل تصویر به JPEG + base64
    const manipulated = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1200 } }],
      {
        compress: 0.85,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );

    if (!manipulated.base64) {
      throw new Error('تبدیل تصویر به base64 انجام نشد.');
    }

    // 2. تبدیل base64 به ArrayBuffer
    const fileData = decode(manipulated.base64);

    // 3. مسیر و آپلود
    const path = `${userId}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 9)}.jpg`;

    const { error } = await supabase.storage
      .from('analysis-images')
      .upload(path, fileData, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    const { data } = supabase.storage
      .from('analysis-images')
      .getPublicUrl(path);

    return data.publicUrl;
  };

  const removeAnalysisImage = async (url?: string) => {
    if (!url) return;
    try {
      const marker = '/storage/v1/object/public/analysis-images/';
      const index = url.indexOf(marker);
      if (index === -1) return;
      const path = decodeURIComponent(url.slice(index + marker.length));
      if (path) await supabase.storage.from('analysis-images').remove([path]);
    } catch (error) {
      console.log('Remove analysis image error:', error);
    }
  };

  const startEditAnalysis = (post: AnalysisPost) => {
    if (post.userId !== sessionUserId) return;
    setEditingPost(post);
    setSymbol(post.symbol);
    setDirection(post.direction);
    setTimeframe(post.timeframe);
    setEntry(post.entry);
    setSl(post.sl);
    setTp(post.tp);
    setAnalysisText(post.text);
    setImageUri(post.imageUri);
    setSelectedPost(null);
    setShowCreate(true);
  };

  const createAnalysis = async () => {
    if (!validateTrade()) return;

    const rr = calculateRR();
    if (!rr) {
      Alert.alert('خطا', 'RR قابل محاسبه نیست.');
      return;
    }

    const ensured = await ensureSessionAndProfile();

    if (!ensured) {
      Alert.alert(
        'ورود لازم است',
        'برای انتشار تحلیل ابتدا وارد حساب NAVASAN شوید.'
      );
      return;
    }

    const { userId: activeUserId, profile: activeProfile } = ensured;

    try {
      setPublishing(true);
      const cleanSymbol = symbol.trim().toUpperCase();
      const cleanTimeframe = timeframe.trim().toUpperCase();
      const cleanText = analysisText.trim() || 'تحلیل جدید خود را در اتاق تحلیل NAVASAN منتشر کردم.';

      let finalImageUrl = editingPost?.imageUri || null;
      let uploadedImageUrl: string | null = null;

      if (imageUri && imageUri !== editingPost?.imageUri && imageUri.startsWith('file')) {
        uploadedImageUrl = await uploadAnalysisImage(imageUri, activeUserId);
        finalImageUrl = uploadedImageUrl;
      }

      if (editingPost) {
        const { data, error } = await supabase
          .from('analysis_posts')
          .update({
            symbol: cleanSymbol,
            direction,
            timeframe: cleanTimeframe,
            entry: entry.trim(),
            sl: sl.trim(),
            tp: tp.trim(),
            rr: `1:${rr.toFixed(2)}`,
            text: cleanText,
            image_url: finalImageUrl,
          })
          .eq('id', editingPost.id)
          .eq('user_id', activeUserId)
          .select('id, user_id, symbol, direction, timeframe, entry, sl, tp, rr, text, image_url, created_at')
          .single();

        if (error) {
          if (uploadedImageUrl) await removeAnalysisImage(uploadedImageUrl);
          throw error;
        }

        if (editingPost.imageUri && finalImageUrl !== editingPost.imageUri) {
          await removeAnalysisImage(editingPost.imageUri);
        }

        const updatedPost: AnalysisPost = {
          ...editingPost,
          symbol: data.symbol,
          direction: data.direction as Direction,
          timeframe: data.timeframe,
          entry: data.entry,
          sl: data.sl,
          tp: data.tp,
          rr: data.rr,
          text: data.text,
          imageUri: data.image_url || undefined,
          createdAt: formatCreatedAt(data.created_at),
        };

        setPosts((prev) => prev.map((post) => post.id === updatedPost.id ? updatedPost : post));
        setEditingPost(null);
        setShowCreate(false);
        resetCreateForm();
        Alert.alert('ویرایش شد', 'تحلیل با موفقیت به‌روزرسانی شد.');
        return;
      }

      const { data, error } = await supabase
        .from('analysis_posts')
        .insert({
          user_id: activeUserId,
          symbol: cleanSymbol,
          direction,
          timeframe: cleanTimeframe,
          entry: entry.trim(),
          sl: sl.trim(),
          tp: tp.trim(),
          rr: `1:${rr.toFixed(2)}`,
          text: cleanText,
          image_url: finalImageUrl,
        })
        .select('id, user_id, symbol, direction, timeframe, entry, sl, tp, rr, text, image_url, created_at')
        .single();

      if (error) {
        if (uploadedImageUrl) await removeAnalysisImage(uploadedImageUrl);
        throw error;
      }

      const newPost: AnalysisPost = {
        id: data.id,
        username: displayUsername(activeProfile.username),
        name: activeProfile.full_name || 'کاربر NAVASAN',
        avatarUrl: activeProfile.avatar_url,
        userId: activeProfile.id,
        symbol: data.symbol,
        direction: data.direction as Direction,
        timeframe: data.timeframe,
        entry: data.entry,
        sl: data.sl,
        tp: data.tp,
        rr: data.rr,
        text: data.text,
        imageUri: data.image_url || undefined,
        likes: 0,
        liked: false,
        saved: false,
        following: false,
        comments: [],
        createdAt: formatCreatedAt(data.created_at),
      };

      setPosts((prev) => [newPost, ...prev]);
      setShowCreate(false);
      setEditingPost(null);
      resetCreateForm();
      Alert.alert('منتشر شد', 'تحلیل شما با موفقیت در NAVASAN منتشر شد.');
    } catch (error: any) {
      console.log('Create/update analysis error:', error);
      Alert.alert('خطا', error?.message || 'عملیات تحلیل انجام نشد.');
    } finally {
      setPublishing(false);
    }
  };

  // =========================================================
  // OPEN PROFILE
  // =========================================================

  const openProfile = (
    post: AnalysisPost
  ) => {
    const username =
      normalizeUsername(
        post.username
      );

    if (!username) {
      Alert.alert(
        'خطا',
        'Username این تحلیل‌گر مشخص نیست.'
      );
      return;
    }

    router.push({
      pathname: '/user-profile',
      params: {
        username,
      },
    });
  };

  // =========================================================
  // FOLLOW / UNFOLLOW
  // =========================================================

  const getTargetProfile = async (
    post: AnalysisPost
  ) => {
    if (post.userId) {
      const { data } =
        await supabase
          .from('profiles')
          .select(
            'id, username, full_name, avatar_url'
          )
          .eq(
            'id',
            post.userId
          )
          .maybeSingle();

      return data;
    }

    const cleanUsername =
      normalizeUsername(
        post.username
      );

    if (!cleanUsername) {
      return null;
    }

    const { data } =
      await supabase
        .from('profiles')
        .select(
          'id, username, full_name, avatar_url'
        )
        .ilike(
          'username',
          cleanUsername
        )
        .maybeSingle();

    return data;
  };

  const toggleFollow = async (
    post: AnalysisPost
  ) => {
    if (!sessionUserId) {
      Alert.alert(
        'ورود لازم است',
        'برای دنبال کردن تحلیل‌گر وارد حساب خود شوید.'
      );
      return;
    }

    const target =
      await getTargetProfile(
        post
      );

    if (!target) {
      Alert.alert(
        'پروفایل پیدا نشد',
        'پروفایل این تحلیل‌گر هنوز در سیستم حساب کاربری ثبت نشده است.'
      );
      return;
    }

    if (
      target.id === sessionUserId
    ) {
      return;
    }

    try {
      setBusyFollowId(
        post.id
      );

      const {
        data: existing,
        error: checkError,
      } = await supabase
        .from('follows')
        .select('id')
        .eq(
          'follower_id',
          sessionUserId
        )
        .eq(
          'following_id',
          target.id
        )
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      if (existing) {
        const {
          error,
        } = await supabase
          .from('follows')
          .delete()
          .eq(
            'id',
            existing.id
          );

        if (error) {
          throw error;
        }

        updatePostFollowing(
          post.id,
          false
        );

        Alert.alert(
          'انجام شد',
          `دیگر ${displayUsername(
            target.username
          )} را دنبال نمی‌کنی.`
        );
      } else {
        const {
          error,
        } = await supabase
          .from('follows')
          .insert({
            follower_id:
              sessionUserId,

            following_id:
              target.id,
          });

        if (error) {
          throw error;
        }

        updatePostFollowing(
          post.id,
          true
        );

        Alert.alert(
          'انجام شد',
          `${displayUsername(
            target.username
          )} را دنبال کردی.`
        );
      }
    } catch (error: any) {
      console.log(
        'Follow error:',
        error
      );

      Alert.alert(
        'خطا',
        error?.message ||
          'عملیات دنبال کردن انجام نشد.'
      );
    } finally {
      setBusyFollowId(
        null
      );
    }
  };

  const updatePostFollowing = (
    postId: string,
    following: boolean
  ) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              following,
            }
          : post
      )
    );

    setSelectedPost(
      (current) =>
        current?.id === postId
          ? {
              ...current,
              following,
            }
          : current
    );
  };

  // =========================================================
  // LIKE
  // =========================================================

  const toggleLike = async (postId: string) => {
    if (!sessionUserId) {
      Alert.alert('ورود لازم است', 'برای پسندیدن تحلیل وارد حساب خود شوید.');
      return;
    }

    const post = posts.find((item) => item.id === postId);
    if (!post) return;

    try {
      if (post.liked) {
        const { error } = await supabase
          .from('analysis_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', sessionUserId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('analysis_likes')
          .insert({ post_id: postId, user_id: sessionUserId });
        if (error) throw error;
      }

      const liked = !post.liked;
      const update = (item: AnalysisPost) => item.id === postId
        ? { ...item, liked, likes: Math.max(0, item.likes + (liked ? 1 : -1)) }
        : item;
      setPosts((prev) => prev.map(update));
      setSelectedPost((current) => current ? update(current) : current);
    } catch (error: any) {
      Alert.alert('خطا', error?.message || 'تغییر پسند انجام نشد.');
    }
  };

  const toggleSave = async (postId: string) => {
    if (!sessionUserId) {
      Alert.alert('ورود لازم است', 'برای ذخیره تحلیل وارد حساب خود شوید.');
      return;
    }

    const post = posts.find((item) => item.id === postId);
    if (!post) return;

    try {
      if (post.saved) {
        const { error } = await supabase
          .from('analysis_saves')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', sessionUserId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('analysis_saves')
          .insert({ post_id: postId, user_id: sessionUserId });
        if (error) throw error;
      }

      const saved = !post.saved;
      const update = (item: AnalysisPost) => item.id === postId ? { ...item, saved } : item;
      setPosts((prev) => prev.map(update));
      setSelectedPost((current) => current ? update(current) : current);
    } catch (error: any) {
      Alert.alert('خطا', error?.message || 'تغییر ذخیره‌سازی انجام نشد.');
    }
  };

  const likeComment = async (postId: string, commentId: string) => {
    if (!sessionUserId) {
      Alert.alert('ورود لازم است', 'برای پسندیدن نظر وارد حساب خود شوید.');
      return;
    }

    const post = posts.find((item) => item.id === postId);
    if (!post) return;

    let targetLiked = false;
    const findComment = (comments: Comment[]): Comment | null => {
      for (const comment of comments) {
        if (comment.id === commentId) return comment;
        const found = findComment(comment.replies);
        if (found) return found;
      }
      return null;
    };
    const target = findComment(post.comments);
    if (!target) return;
    targetLiked = !target.liked;

    try {
      if (target.liked) {
        const { error } = await supabase
          .from('analysis_comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', sessionUserId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('analysis_comment_likes')
          .insert({ comment_id: commentId, user_id: sessionUserId });
        if (error) throw error;
      }

      const updateComments = (comments: Comment[]): Comment[] => comments.map((comment) => {
        if (comment.id === commentId) {
          return { ...comment, liked: targetLiked, likes: Math.max(0, comment.likes + (targetLiked ? 1 : -1)) };
        }
        return { ...comment, replies: updateComments(comment.replies) };
      });

      const updatePost = (item: AnalysisPost) => item.id === postId ? { ...item, comments: updateComments(item.comments) } : item;
      setPosts((prev) => prev.map(updatePost));
      setSelectedPost((current) => current ? updatePost(current) : current);
    } catch (error: any) {
      Alert.alert('خطا', error?.message || 'پسندیدن نظر انجام نشد.');
    }
  };

  const addComment = async () => {
    if (!selectedPost || !sessionUserId) {
      Alert.alert('ورود لازم است', 'برای ثبت نظر وارد حساب خود شوید.');
      return;
    }

    const text = commentText.trim();
    if (!text) return;

    try {
      const { data, error } = await supabase
        .from('analysis_comments')
        .insert({
          post_id: selectedPost.id,
          user_id: sessionUserId,
          parent_id: replyingTo,
          text,
        })
        .select('id, post_id, user_id, parent_id, text, created_at')
        .single();

      if (error) throw error;

      const newComment: Comment = {
        id: data.id,
        username: displayUsername(currentProfile?.username || 'navasan_user'),
        name: currentProfile?.full_name || 'کاربر NAVASAN',
        avatarUrl: currentProfile?.avatar_url || null,
        text: data.text,
        likes: 0,
        liked: false,
        replies: [],
      };

      const addToTree = (comments: Comment[]): Comment[] => {
        if (!replyingTo) return [...comments, newComment];
        let inserted = false;
        const result = comments.map((comment) => {
          if (comment.id === replyingTo) {
            inserted = true;
            return { ...comment, replies: [...comment.replies, newComment] };
          }
          const replies = addToTree(comment.replies);
          if (replies !== comment.replies) inserted = true;
          return { ...comment, replies };
        });
        return result;
      };

      const updatePost = (post: AnalysisPost) => post.id === selectedPost.id
        ? { ...post, comments: addToTree(post.comments) }
        : post;
      setPosts((prev) => prev.map(updatePost));
      setSelectedPost((current) => current ? updatePost(current) : current);
      setCommentText('');
      setReplyingTo(null);
    } catch (error: any) {
      Alert.alert('خطا', error?.message || 'ثبت نظر انجام نشد.');
    }
  };

  // =========================================================
  // DELETE
  // =========================================================

  const deleteOwnAnalysis = (postId: string) => {
    Alert.alert('حذف تحلیل', 'آیا از حذف این تحلیل مطمئن هستید؟', [
      { text: 'انصراف', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          if (!sessionUserId) return;
          try {
            const post = posts.find((item) => item.id === postId);
            const { error } = await supabase
              .from('analysis_posts')
              .delete()
              .eq('id', postId)
              .eq('user_id', sessionUserId);
            if (error) throw error;

            if (post?.imageUri) await removeAnalysisImage(post.imageUri);
            setPosts((prev) => prev.filter((item) => item.id !== postId));
            if (selectedPost?.id === postId) setSelectedPost(null);
            Alert.alert('حذف شد', 'تحلیل با موفقیت حذف شد.');
          } catch (error: any) {
            Alert.alert('خطا', error?.message || 'حذف تحلیل انجام نشد.');
          }
        },
      },
    ]);
  };

  const reportAnalysis = (post: AnalysisPost) => {
    if (!sessionUserId) {
      Alert.alert('ورود لازم است', 'برای گزارش تحلیل وارد حساب خود شوید.');
      return;
    }

    const submitReport = async (reason: string) => {
      try {
        const { error } = await supabase
          .from('analysis_reports')
          .insert({ analysis_id: post.id, user_id: sessionUserId, reason });

        if (error && error.code !== '23505') throw error;
        Alert.alert('ثبت شد', error?.code === '23505' ? 'این تحلیل را قبلاً گزارش کرده‌ای.' : 'گزارش شما با موفقیت ثبت شد.');
      } catch (error: any) {
        Alert.alert('خطا', error?.message || 'ثبت گزارش انجام نشد.');
      }
    };

    Alert.alert('گزارش تحلیل', 'دلیل گزارش را انتخاب کنید.', [
      { text: 'محتوای نامناسب', onPress: () => submitReport('محتوای نامناسب') },
      { text: 'اطلاعات گمراه‌کننده', onPress: () => submitReport('اطلاعات گمراه‌کننده') },
      { text: 'اسپم', onPress: () => submitReport('اسپم') },
      { text: 'انصراف', style: 'cancel' },
    ]);
  };

  // =========================================================
  // SHARE
  // =========================================================

  const shareAnalysis = async (
    post: AnalysisPost
  ) => {
    try {
      await Share.share({
        message:
          `تحلیل ${post.symbol} - ${post.direction}\n` +
          `تایم‌فریم: ${post.timeframe}\n` +
          `Entry: ${post.entry}\n` +
          `SL: ${post.sl}\n` +
          `TP: ${post.tp}\n` +
          `RR: ${post.rr}\n\n` +
          `${post.text}\n\n` +
          `NAVASAN`,
      });
    } catch {
      Alert.alert(
        'خطا',
        'اشتراک‌گذاری انجام نشد.'
      );
    }
  };

  // =========================================================
  // REFRESH
  // =========================================================

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadCurrentUser();
      await loadAnalysisPosts(true);
    } finally {
      setRefreshing(false);
    }
  };

  const loadMore = async () => {
    if (!loadingMore && hasMore) {
      await loadAnalysisPosts(false);
    }
  };

  // =========================================================
  // OPEN POST
  // =========================================================

  const openPost = (
    post: AnalysisPost
  ) => {
    setSelectedPost(post);
    setCommentText('');
    setReplyingTo(null);
  };

  // =========================================================
  // AVATAR
  // =========================================================

  const Avatar = ({
    uri,
    size = 42,
  }: {
    uri?: string | null;
    size?: number;
  }) => {
    if (uri) {
      return (
        <Image
          source={{ uri }}
          style={{
            width: size,
            height: size,
            borderRadius:
              size * 0.32,
            marginRight: 10,
          }}
        />
      );
    }

    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius:
            size * 0.32,
          backgroundColor:
            colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 10,
        }}
      >
        <Ionicons
          name="person"
          size={size * 0.45}
          color={colors.primary}
        />
      </View>
    );
  };

  // =========================================================
  // COMMENT
  // =========================================================

  const renderComment = (
    comment: Comment,
    postId: string,
    isReply = false
  ) => {
    return (
      <View
        key={comment.id}
        style={[
          styles.commentContainer,
          isReply &&
            styles.replyContainer,
          {
            backgroundColor:
              isDark
                ? '#111827'
                : '#F8FAFC',
            borderColor:
              isDark
                ? '#1E293B'
                : '#E2E8F0',
          },
        ]}
      >
        <View
          style={styles.commentHeader}
        >
          <Avatar
            uri={
              comment.avatarUrl
            }
            size={34}
          />

          <View
            style={{ flex: 1 }}
          >
            <Text
              style={[
                styles.commentName,
                {
                  color: isDark
                    ? '#F8FAFC'
                    : '#0F172A',
                },
              ]}
            >
              {comment.name}
            </Text>

            <Text
              style={[
                styles.commentUsername,
                {
                  color: isDark
                    ? '#94A3B8'
                    : '#64748B',
                },
              ]}
            >
              {comment.username}
            </Text>
          </View>
        </View>

        <Text
          style={[
            styles.commentText,
            {
              color: isDark
                ? '#CBD5E1'
                : '#334155',
            },
          ]}
        >
          {comment.text}
        </Text>

        <View
          style={
            styles.commentActions
          }
        >
          <TouchableOpacity
            style={
              styles.commentAction
            }
            onPress={() =>
              likeComment(
                postId,
                comment.id
              )
            }
          >
            <Ionicons
              name={
                comment.liked
                  ? 'heart'
                  : 'heart-outline'
              }
              size={17}
              color={
                comment.liked
                  ? '#EF4444'
                  : '#64748B'
              }
            />

            <Text
              style={[
                styles.commentActionText,
                {
                  color: isDark
                    ? '#94A3B8'
                    : '#64748B',
                },
              ]}
            >
              {comment.likes}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={
              styles.commentAction
            }
            onPress={() =>
              setReplyingTo(
                comment.id
              )
            }
          >
            <Ionicons
              name="return-down-forward-outline"
              size={17}
              color="#64748B"
            />

            <Text
              style={[
                styles.commentActionText,
                {
                  color: isDark
                    ? '#94A3B8'
                    : '#64748B',
                },
              ]}
            >
              پاسخ
            </Text>
          </TouchableOpacity>
        </View>

        {comment.replies.length >
          0 && (
          <View
            style={{
              marginTop: 10,
            }}
          >
            {comment.replies.map(
              (reply) =>
                renderComment(
                  reply,
                  postId,
                  true
                )
            )}
          </View>
        )}
      </View>
    );
  };

  // =========================================================
  // FOLLOW BUTTON
  // =========================================================

  const FollowButton = ({
    post,
    large = false,
  }: {
    post: AnalysisPost;
    large?: boolean;
  }) => {
    const isOwn =
      !!sessionUserId &&
      !!post.userId &&
      sessionUserId ===
        post.userId;

    if (isOwn) {
      return null;
    }

    const busy =
      busyFollowId ===
      post.id;

    return (
      <TouchableOpacity
        disabled={busy}
        style={[
          large
            ? styles.followLargeButton
            : styles.followButton,
          {
            backgroundColor:
              post.following
                ? isDark
                  ? '#1E293B'
                  : '#F1F5F9'
                : '#2563EB',
          },
        ]}
        onPress={() =>
          toggleFollow(post)
        }
      >
        {busy ? (
          <ActivityIndicator
            size="small"
            color={
              post.following
                ? '#64748B'
                : '#FFFFFF'
            }
          />
        ) : (
          <Text
            style={{
              color:
                post.following
                  ? isDark
                    ? '#CBD5E1'
                    : '#334155'
                  : '#FFFFFF',
              fontSize: large
                ? 13
                : 11,
              fontWeight: '800',
            }}
          >
            {post.following
              ? 'دنبال می‌کنی'
              : 'دنبال کردن'}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  // =========================================================
  // DATA ITEM
  // =========================================================

  const DataItem = ({
    label,
    value,
  }: {
    label: string;
    value: string;
  }) => (
    <View
      style={styles.dataItem}
    >
      <Text
        style={[
          styles.dataLabel,
          {
            color: isDark
              ? '#94A3B8'
              : '#64748B',
          },
        ]}
      >
        {label}
      </Text>

      <Text
        style={[
          styles.dataValue,
          {
            color: isDark
              ? '#F8FAFC'
              : '#0F172A',
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );

  // =========================================================
  // ANALYSIS CARD
  // =========================================================

  const AnalysisCard = ({
    post,
  }: {
    post: AnalysisPost;
  }) => {
    return (
      <TouchableOpacity
        activeOpacity={0.96}
        onPress={() =>
          openPost(post)
        }
        style={[
          styles.card,
          {
            backgroundColor:
              isDark
                ? '#111827'
                : '#FFFFFF',
            borderColor:
              isDark
                ? '#1E293B'
                : '#E2E8F0',
          },
        ]}
      >
        <View
          style={
            styles.cardHeader
          }
        >
          <TouchableOpacity
            style={
              styles.userSection
            }
            onPress={(event) => {
              event.stopPropagation();
              openProfile(post);
            }}
          >
            <Avatar
              uri={post.avatarUrl}
              size={42}
            />

            <View>
              <Text
                style={[
                  styles.userName,
                  {
                    color: isDark
                      ? '#F8FAFC'
                      : '#0F172A',
                  },
                ]}
              >
                {post.name}
              </Text>

              <Text
                style={[
                  styles.username,
                  {
                    color: isDark
                      ? '#94A3B8'
                      : '#64748B',
                  },
                ]}
              >
                {post.username} •{' '}
                {post.createdAt}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              Alert.alert(
                'گزینه‌ها',
                '',
                [
                  {
                    text: post.saved
                      ? 'حذف از ذخیره‌ها'
                      : 'ذخیره تحلیل',
                    onPress: () =>
                      toggleSave(
                        post.id
                      ),
                  },
                  {
                    text: 'گزارش',
                    onPress: () =>
                      reportAnalysis(
                        post
                      ),
                  },
                  {
                    text: 'انصراف',
                    style: 'cancel',
                  },
                ]
              )
            }
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={22}
              color={
                isDark
                  ? '#94A3B8'
                  : '#64748B'
              }
            />
          </TouchableOpacity>
        </View>

        <View
          style={
            styles.symbolRow
          }
        >
          <View
            style={[
              styles.symbolBadge,
              {
                backgroundColor:
                  isDark
                    ? '#172554'
                    : '#EFF6FF',
              },
            ]}
          >
            <Text
              style={
                styles.symbolText
              }
            >
              {post.symbol}
            </Text>
          </View>

          <View
            style={[
              styles.directionBadge,
              {
                backgroundColor:
                  post.direction ===
                  'BUY'
                    ? isDark
                      ? '#052E16'
                      : '#F0FDF4'
                    : isDark
                    ? '#450A0A'
                    : '#FEF2F2',
              },
            ]}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '800',
                color:
                  post.direction ===
                  'BUY'
                    ? '#16A34A'
                    : '#EF4444',
              }}
            >
              {post.direction}
            </Text>
          </View>

          <Text
            style={[
              styles.timeframe,
              {
                color: isDark
                  ? '#94A3B8'
                  : '#64748B',
              },
            ]}
          >
            {post.timeframe}
          </Text>

          <View
            style={{ flex: 1 }}
          />

          <Text
            style={
              styles.rrText
            }
          >
            RR {post.rr}
          </Text>
        </View>

        {post.imageUri ? (
          <Image
            source={{
              uri: post.imageUri,
            }}
            style={
              styles.postImage
            }
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.chartPlaceholder,
              {
                backgroundColor:
                  isDark
                    ? '#0B1220'
                    : '#F8FAFC',
                borderColor:
                  isDark
                    ? '#1E293B'
                    : '#E2E8F0',
              },
            ]}
          >
            <Ionicons
              name="analytics-outline"
              size={32}
              color="#2563EB"
            />

            <Text
              style={[
                styles.placeholderText,
                {
                  color: isDark
                    ? '#64748B'
                    : '#94A3B8',
                },
              ]}
            >
              نمودار تحلیل
            </Text>
          </View>
        )}

        <Text
          numberOfLines={3}
          style={[
            styles.postText,
            {
              color: isDark
                ? '#CBD5E1'
                : '#334155',
            },
          ]}
        >
          {post.text}
        </Text>

        <View
          style={[
            styles.tradeInfoRow,
            {
              backgroundColor:
                isDark ? '#0F172A' : '#F8FAFC',
            },
          ]}
        >
          <DataItem
            label="Entry"
            value={post.entry}
          />

          <DataItem
            label="SL"
            value={post.sl}
          />

          <DataItem
            label="TP"
            value={post.tp}
          />
        </View>

        <View
          style={[
            styles.actionRow,
            {
              borderTopColor:
                isDark
                  ? '#1E293B'
                  : '#E2E8F0',
            },
          ]}
        >
          <TouchableOpacity
            style={
              styles.actionButton
            }
            onPress={() =>
              toggleLike(
                post.id
              )
            }
          >
            <Ionicons
              name={
                post.liked
                  ? 'heart'
                  : 'heart-outline'
              }
              size={21}
              color={
                post.liked
                  ? '#EF4444'
                  : '#64748B'
              }
            />

            <Text
              style={[
                styles.actionText,
                {
                  color: isDark
                    ? '#94A3B8'
                    : '#64748B',
                },
              ]}
            >
              {post.likes}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={
              styles.actionButton
            }
            onPress={() =>
              openPost(post)
            }
          >
            <Ionicons
              name="chatbubble-outline"
              size={20}
              color="#64748B"
            />

            <Text
              style={[
                styles.actionText,
                {
                  color: isDark
                    ? '#94A3B8'
                    : '#64748B',
                },
              ]}
            >
              {post.comments.length}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={
              styles.actionButton
            }
            onPress={() =>
              toggleSave(
                post.id
              )
            }
          >
            <Ionicons
              name={
                post.saved
                  ? 'bookmark'
                  : 'bookmark-outline'
              }
              size={20}
              color={
                post.saved
                  ? '#2563EB'
                  : '#64748B'
              }
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={
              styles.actionButton
            }
            onPress={() =>
              shareAnalysis(post)
            }
          >
            <Ionicons
              name="share-social-outline"
              size={20}
              color="#64748B"
            />
          </TouchableOpacity>

          <View
            style={{ flex: 1 }}
          />

          <FollowButton
            post={post}
          />
        </View>
      </TouchableOpacity>
    );
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loadingUser || loadingPosts) {
    return (
      <View style={[styles.center, { backgroundColor: isDark ? '#020617' : '#F8FAFC' }]}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={{ marginTop: 12, color: isDark ? '#94A3B8' : '#64748B' }}>
          در حال بارگذاری...
        </Text>
      </View>
    );
  }

  if (loadError && posts.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: isDark ? '#020617' : '#F8FAFC', padding: 24 }]}>
        <Ionicons name="cloud-offline-outline" size={48} color="#94A3B8" />
        <Text style={{ marginTop: 12, fontSize: 17, fontWeight: '800', color: isDark ? '#F8FAFC' : '#0F172A' }}>
          دریافت تحلیل‌ها انجام نشد
        </Text>
        <Text style={{ marginTop: 8, textAlign: 'center', color: isDark ? '#94A3B8' : '#64748B' }}>
          اتصال اینترنت یا تنظیمات Supabase را بررسی کن.
        </Text>
        <TouchableOpacity style={{ marginTop: 18, backgroundColor: '#2563EB', paddingHorizontal: 22, paddingVertical: 12, borderRadius: 12 }} onPress={() => loadAnalysisPosts(true)}>
          <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>تلاش دوباره</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // =========================================================
  // UI
  // =========================================================

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor:
            isDark
              ? '#020617'
              : '#F8FAFC',
        },
      ]}
    >
      {/* HEADER */}

      <View
        style={[
          styles.header,
          {
            backgroundColor:
              isDark
                ? '#020617'
                : '#F8FAFC',
          },
        ]}
      >
        <View>
          <Text
            style={[
              styles.title,
              {
                color: isDark
                  ? '#F8FAFC'
                  : '#0F172A',
              },
            ]}
          >
            اتاق تحلیل
          </Text>

          <Text
            style={[
              styles.subtitle,
              {
                color: isDark
                  ? '#94A3B8'
                  : '#64748B',
              },
            ]}
          >
            تحلیل‌ها را ببین، منتشر کن و با تریدرها تعامل داشته باش
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.savedButton,
            {
              backgroundColor:
                isDark
                  ? '#172554'
                  : '#EFF6FF',
            },
          ]}
          onPress={() =>
            setShowSaved(true)
          }
        >
          <Ionicons
            name="bookmark-outline"
            size={21}
            color="#2563EB"
          />
        </TouchableOpacity>
      </View>

      {/* SEARCH */}

      <View
        style={[
          styles.searchContainer,
          {
            backgroundColor:
              isDark
                ? '#111827'
                : '#FFFFFF',
            borderColor:
              isDark
                ? '#1E293B'
                : '#E2E8F0',
          },
        ]}
      >
        <Ionicons
          name="search-outline"
          size={21}
          color="#94A3B8"
        />

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="جستجوی نماد، تحلیل‌گر یا تحلیل..."
          placeholderTextColor="#94A3B8"
          style={[
            styles.searchInput,
            {
              color: isDark
                ? '#F8FAFC'
                : '#0F172A',
            },
          ]}
        />
      </View>

      {/* FILTERS */}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.filterContainer
        }
      >
        <FilterButton
          title="همه"
          active={
            filter === 'ALL'
          }
          isDark={isDark}
          onPress={() =>
            setFilter('ALL')
          }
        />

        <FilterButton
          title="BUY"
          active={
            filter === 'BUY'
          }
          isDark={isDark}
          onPress={() =>
            setFilter('BUY')
          }
        />

        <FilterButton
          title="SELL"
          active={
            filter === 'SELL'
          }
          isDark={isDark}
          onPress={() =>
            setFilter('SELL')
          }
        />
      </ScrollView>

      {/* FEED */}

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.feed
        }
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={
              onRefresh
            }
            tintColor="#2563EB"
          />
        }
      >
        {filteredPosts.length ===
        0 ? (
          <View
            style={
              styles.emptyState
            }
          >
            <Ionicons
              name="search-outline"
              size={42}
              color="#94A3B8"
            />

            <Text
              style={[
                styles.emptyTitle,
                {
                  color: isDark
                    ? '#F8FAFC'
                    : '#0F172A',
                },
              ]}
            >
              تحلیلی پیدا نشد
            </Text>

            <Text
              style={[
                styles.emptyText,
                {
                  color: isDark
                    ? '#64748B'
                    : '#94A3B8',
                },
              ]}
            >
              عبارت جستجو یا فیلتر را تغییر بده.
            </Text>
          </View>
        ) : (
          filteredPosts.map(
            (post) => (
              <AnalysisCard
                key={post.id}
                post={post}
              />
            )
          )
        )}

        {hasMore && filteredPosts.length > 0 && !search.trim() && filter === 'ALL' && (
          <TouchableOpacity
            onPress={loadMore}
            disabled={loadingMore}
            style={{ marginTop: 4, marginBottom: 12, alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 11, borderRadius: 12, backgroundColor: isDark ? '#172554' : '#EFF6FF' }}
          >
            {loadingMore ? (
              <ActivityIndicator size="small" color="#2563EB" />
            ) : (
              <Text style={{ color: '#2563EB', fontWeight: '800' }}>نمایش تحلیل‌های بیشتر</Text>
            )}
          </TouchableOpacity>
        )}

        <View
          style={{
            height: 100,
          }}
        />
      </ScrollView>

      {/* FAB */}

      <TouchableOpacity
        activeOpacity={0.9}
        style={[
          styles.fab,
          publishing &&
            styles.fabDisabled,
        ]}
        disabled={publishing}
        onPress={() => {
          setEditingPost(null);
          resetCreateForm();
          setShowCreate(true);
        }}
      >
        <Ionicons
          name="add"
          size={30}
          color="#FFFFFF"
        />

        <Text
          style={styles.fabText}
        >
          تحلیل جدید
        </Text>
      </TouchableOpacity>

      {/* ===================================================== */}
      {/* CREATE MODAL */}
      {/* ===================================================== */}

      <Modal
        visible={showCreate}
        animationType="slide"
        transparent
        onRequestClose={() =>
          setShowCreate(false)
        }
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <View
            style={[
              styles.createModal,
              {
                backgroundColor:
                  isDark
                    ? '#0F172A'
                    : '#FFFFFF',
              },
            ]}
          >
            <View
              style={
                styles.modalHeader
              }
            >
              <Text
                style={[
                  styles.modalTitle,
                  {
                    color: isDark
                      ? '#F8FAFC'
                      : '#0F172A',
                  },
                ]}
              >
                {editingPost ? 'ویرایش تحلیل' : 'انتشار تحلیل جدید'}
              </Text>

              <TouchableOpacity
                disabled={publishing}
                onPress={() => {
                  setShowCreate(false);
                  setEditingPost(null);
                }}
              >
                <Ionicons
                  name="close"
                  size={25}
                  color={
                    isDark
                      ? '#CBD5E1'
                      : '#475569'
                  }
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={
                false
              }
              contentContainerStyle={{
                paddingBottom: 30,
              }}
            >
              <Text
                style={[
                  styles.fieldLabel,
                  {
                    color: isDark ? '#CBD5E1' : '#64748B',
                  },
                ]}
              >
                نماد
              </Text>

              <TextInput
                value={symbol}
                onChangeText={
                  setSymbol
                }
                editable={!publishing}
                placeholder="XAUUSD"
                placeholderTextColor="#94A3B8"
                style={[
                  styles.input,
                  {
                    color: isDark
                      ? '#F8FAFC'
                      : '#0F172A',
                    backgroundColor:
                      isDark
                        ? '#111827'
                        : '#F8FAFC',
                    borderColor:
                      isDark
                        ? '#1E293B'
                        : '#E2E8F0',
                  },
                ]}
              />

              <Text
                style={[
                  styles.fieldLabel,
                  {
                    color: isDark ? '#CBD5E1' : '#64748B',
                  },
                ]}
              >
                جهت معامله
              </Text>

              <View
                style={
                  styles.twoColumns
                }
              >
                <TouchableOpacity
                  disabled={publishing}
                  style={[
                    styles.directionButton,
                    {
                      backgroundColor:
                        direction ===
                        'BUY'
                          ? '#16A34A'
                          : isDark
                          ? '#111827'
                          : '#F8FAFC',
                      borderColor:
                        direction ===
                        'BUY'
                          ? '#16A34A'
                          : isDark
                          ? '#1E293B'
                          : '#E2E8F0',
                    },
                  ]}
                  onPress={() =>
                    setDirection(
                      'BUY'
                    )
                  }
                >
                  <Text
                    style={{
                      color:
                        direction ===
                        'BUY'
                          ? '#FFFFFF'
                          : '#16A34A',
                      fontWeight:
                        '800',
                    }}
                  >
                    BUY
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  disabled={publishing}
                  style={[
                    styles.directionButton,
                    {
                      backgroundColor:
                        direction ===
                        'SELL'
                          ? '#EF4444'
                          : isDark
                          ? '#111827'
                          : '#F8FAFC',
                      borderColor:
                        direction ===
                        'SELL'
                          ? '#EF4444'
                          : isDark
                          ? '#1E293B'
                          : '#E2E8F0',
                    },
                  ]}
                  onPress={() =>
                    setDirection(
                      'SELL'
                    )
                  }
                >
                  <Text
                    style={{
                      color:
                        direction ===
                        'SELL'
                          ? '#FFFFFF'
                          : '#EF4444',
                      fontWeight:
                        '800',
                    }}
                  >
                    SELL
                  </Text>
                </TouchableOpacity>
              </View>

              <Text
                style={[
                  styles.fieldLabel,
                  {
                    color: isDark ? '#CBD5E1' : '#64748B',
                  },
                ]}
              >
                تایم‌فریم
              </Text>

              <TextInput
                value={timeframe}
                onChangeText={
                  setTimeframe
                }
                editable={!publishing}
                placeholder="5M"
                placeholderTextColor="#94A3B8"
                style={[
                  styles.input,
                  {
                    color: isDark
                      ? '#F8FAFC'
                      : '#0F172A',
                    backgroundColor:
                      isDark
                        ? '#111827'
                        : '#F8FAFC',
                    borderColor:
                      isDark
                        ? '#1E293B'
                        : '#E2E8F0',
                  },
                ]}
              />

              <View
                style={
                  styles.twoColumns
                }
              >
                <View
                  style={{
                    flex: 1,
                  }}
                >
                  <Text
                    style={[
                      styles.fieldLabel,
                      {
                        color: isDark ? '#CBD5E1' : '#64748B',
                      },
                    ]}
                  >
                    Entry
                  </Text>

                  <TextInput
                    value={entry}
                    onChangeText={
                      setEntry
                    }
                    editable={!publishing}
                    keyboardType="decimal-pad"
                    placeholder="3650.20"
                    placeholderTextColor="#94A3B8"
                    style={[
                      styles.input,
                      {
                        color: isDark
                          ? '#F8FAFC'
                          : '#0F172A',
                        backgroundColor:
                          isDark
                            ? '#111827'
                            : '#F8FAFC',
                        borderColor:
                          isDark
                            ? '#1E293B'
                            : '#E2E8F0',
                      },
                    ]}
                  />
                </View>

                <View
                  style={{
                    flex: 1,
                  }}
                >
                  <Text
                    style={[
                      styles.fieldLabel,
                      {
                        color: isDark ? '#CBD5E1' : '#64748B',
                      },
                    ]}
                  >
                    Stop Loss
                  </Text>

                  <TextInput
                    value={sl}
                    onChangeText={
                      setSl
                    }
                    editable={!publishing}
                    keyboardType="decimal-pad"
                    placeholder="3646.20"
                    placeholderTextColor="#94A3B8"
                    style={[
                      styles.input,
                      {
                        color: isDark
                          ? '#F8FAFC'
                          : '#0F172A',
                        backgroundColor:
                          isDark
                            ? '#111827'
                            : '#F8FAFC',
                        borderColor:
                          isDark
                            ? '#1E293B'
                            : '#E2E8F0',
                      },
                    ]}
                  />
                </View>
              </View>

              <Text
                style={[
                  styles.fieldLabel,
                  {
                    color: isDark ? '#CBD5E1' : '#64748B',
                  },
                ]}
              >
                Take Profit
              </Text>

              <TextInput
                value={tp}
                onChangeText={
                  setTp
                }
                editable={!publishing}
                keyboardType="decimal-pad"
                placeholder="3662.20"
                placeholderTextColor="#94A3B8"
                style={[
                  styles.input,
                  {
                    color: isDark
                      ? '#F8FAFC'
                      : '#0F172A',
                    backgroundColor:
                      isDark
                        ? '#111827'
                        : '#F8FAFC',
                    borderColor:
                      isDark
                        ? '#1E293B'
                        : '#E2E8F0',
                  },
                ]}
              />

              {calculateRR() && (
                <View
                  style={[
                    styles.rrPreview,
                    {
                      backgroundColor: isDark ? '#172554' : '#EFF6FF',
                    },
                  ]}
                >
                  <Ionicons
                    name="speedometer-outline"
                    size={20}
                    color="#2563EB"
                  />

                  <Text
                    style={
                      styles.rrPreviewText
                    }
                  >
                    ریسک به ریوارد: 1:
                    {calculateRR()!.toFixed(
                      2
                    )}
                  </Text>
                </View>
              )}

              <Text
                style={[
                  styles.fieldLabel,
                  {
                    color: isDark ? '#CBD5E1' : '#64748B',
                  },
                ]}
              >
                تصویر تحلیل
              </Text>

              {imageUri ? (
                <View
                  style={
                    styles.imagePreviewWrapper
                  }
                >
                  <Image
                    source={{
                      uri: imageUri,
                    }}
                    style={
                      styles.imagePreview
                    }
                    resizeMode="cover"
                  />

                  <TouchableOpacity
                    disabled={publishing}
                    style={
                      styles.removeImageButton
                    }
                    onPress={() =>
                      setImageUri(
                        undefined
                      )
                    }
                  >
                    <Ionicons
                      name="trash-outline"
                      size={20}
                      color="#FFFFFF"
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    disabled={publishing}
                    style={
                      styles.changeImageButton
                    }
                    onPress={
                      pickImage
                    }
                  >
                    <Ionicons
                      name="image-outline"
                      size={18}
                      color="#FFFFFF"
                    />

                    <Text
                      style={
                        styles.changeImageText
                      }
                    >
                      تغییر تصویر
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  disabled={publishing}
                  style={[
                    styles.uploadBox,
                    {
                      backgroundColor:
                        isDark
                          ? '#111827'
                          : '#F8FAFC',
                      borderColor:
                        isDark
                          ? '#334155'
                          : '#CBD5E1',
                    },
                  ]}
                  onPress={
                    pickImage
                  }
                >
                  <Ionicons
                    name="image-outline"
                    size={32}
                    color="#2563EB"
                  />

                  <Text
                    style={
                      styles.uploadTitle
                    }
                  >
                    انتخاب تصویر
                  </Text>

                  <Text
                    style={
                      styles.uploadSubtitle
                    }
                  >
                    نسبت تصویر پیشنهادی 16:9
                  </Text>
                </TouchableOpacity>
              )}

              <Text
                style={[
                  styles.fieldLabel,
                  {
                    color: isDark ? '#CBD5E1' : '#64748B',
                  },
                ]}
              >
                توضیحات تحلیل
              </Text>

              <TextInput
                value={analysisText}
                onChangeText={
                  setAnalysisText
                }
                editable={!publishing}
                multiline
                textAlignVertical="top"
                placeholder="سناریوی معاملاتی، دلایل ورود، ساختار بازار و..."
                placeholderTextColor="#94A3B8"
                style={[
                  styles.textArea,
                  {
                    color: isDark
                      ? '#F8FAFC'
                      : '#0F172A',
                    backgroundColor:
                      isDark
                        ? '#111827'
                        : '#F8FAFC',
                    borderColor:
                      isDark
                        ? '#1E293B'
                        : '#E2E8F0',
                  },
                ]}
              />

              <TouchableOpacity
                disabled={publishing}
                style={[
                  styles.publishButton,
                  publishing &&
                    styles.publishButtonDisabled,
                ]}
                onPress={
                  createAnalysis
                }
              >
                {publishing ? (
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                  />
                ) : (
                  <Ionicons
                    name="paper-plane-outline"
                    size={20}
                    color="#FFFFFF"
                  />
                )}

                <Text
                  style={
                    styles.publishButtonText
                  }
                >
                  {publishing
                    ? (editingPost ? 'در حال ذخیره...' : 'در حال انتشار...')
                    : (editingPost ? 'ذخیره تغییرات' : 'انتشار تحلیل')}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ===================================================== */}
      {/* SAVED */}
      {/* ===================================================== */}

      <Modal
        visible={showSaved}
        animationType="slide"
        transparent
        onRequestClose={() =>
          setShowSaved(false)
        }
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <View
            style={[
              styles.savedModal,
              {
                backgroundColor:
                  isDark
                    ? '#0F172A'
                    : '#FFFFFF',
              },
            ]}
          >
            <View
              style={
                styles.modalHeader
              }
            >
              <Text
                style={[
                  styles.modalTitle,
                  {
                    color: isDark
                      ? '#F8FAFC'
                      : '#0F172A',
                  },
                ]}
              >
                تحلیل‌های ذخیره‌شده
              </Text>

              <TouchableOpacity
                onPress={() =>
                  setShowSaved(
                    false
                  )
                }
              >
                <Ionicons
                  name="close"
                  size={25}
                  color={
                    isDark
                      ? '#CBD5E1'
                      : '#475569'
                  }
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={
                false
              }
              contentContainerStyle={{
                paddingBottom: 30,
              }}
            >
              {savedPosts.length ===
              0 ? (
                <View
                  style={
                    styles.emptySaved
                  }
                >
                  <Ionicons
                    name="bookmark-outline"
                    size={45}
                    color="#94A3B8"
                  />

                  <Text
                    style={[
                      styles.emptyTitle,
                      {
                        color: isDark
                          ? '#F8FAFC'
                          : '#0F172A',
                      },
                    ]}
                  >
                    هنوز تحلیلی ذخیره نکردی
                  </Text>

                  <Text
                    style={[
                      styles.emptyText,
                      {
                        color: isDark
                          ? '#64748B'
                          : '#94A3B8',
                      },
                    ]}
                  >
                    تحلیل‌های مورد علاقه‌ات را ذخیره کن.
                  </Text>
                </View>
              ) : (
                savedPosts.map(
                  (post) => (
                    <TouchableOpacity
                      key={post.id}
                      style={[
                        styles.savedItem,
                        {
                          backgroundColor:
                            isDark
                              ? '#111827'
                              : '#F8FAFC',
                          borderColor:
                            isDark
                              ? '#1E293B'
                              : '#E2E8F0',
                        },
                      ]}
                      onPress={() => {
                        setShowSaved(
                          false
                        );
                        setSelectedPost(
                          post
                        );
                      }}
                    >
                      <View
                        style={
                          styles.savedItemTop
                        }
                      >
                        <Text
                          style={[
                            styles.savedSymbol,
                            {
                              color:
                                isDark
                                  ? '#F8FAFC'
                                  : '#0F172A',
                            },
                          ]}
                        >
                          {post.symbol}
                        </Text>

                        <Text
                          style={{
                            color:
                              post.direction ===
                              'BUY'
                                ? '#16A34A'
                                : '#EF4444',
                            fontWeight:
                              '800',
                          }}
                        >
                          {
                            post.direction
                          }
                        </Text>
                      </View>

                      <Text
                        numberOfLines={
                          2
                        }
                        style={{
                          color:
                            isDark
                              ? '#94A3B8'
                              : '#64748B',
                          lineHeight: 21,
                        }}
                      >
                        {post.text}
                      </Text>
                    </TouchableOpacity>
                  )
                )
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ===================================================== */}
      {/* DETAIL */}
      {/* ===================================================== */}

      <Modal
        visible={
          !!selectedPost
        }
        animationType="slide"
        transparent
        onRequestClose={() =>
          setSelectedPost(null)
        }
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <View
            style={[
              styles.detailModal,
              {
                backgroundColor:
                  isDark
                    ? '#020617'
                    : '#F8FAFC',
              },
            ]}
          >
            <View
              style={
                styles.detailHeader
              }
            >
              <TouchableOpacity
                onPress={() =>
                  setSelectedPost(
                    null
                  )
                }
              >
                <Ionicons
                  name="arrow-forward"
                  size={25}
                  color={
                    isDark
                      ? '#F8FAFC'
                      : '#0F172A'
                  }
                />
              </TouchableOpacity>

              <Text
                style={[
                  styles.detailTitle,
                  {
                    color: isDark
                      ? '#F8FAFC'
                      : '#0F172A',
                  },
                ]}
              >
                جزئیات تحلیل
              </Text>

              <TouchableOpacity
                onPress={() =>
                  selectedPost &&
                  reportAnalysis(
                    selectedPost
                  )
                }
              >
                <Ionicons
                  name="flag-outline"
                  size={22}
                  color="#64748B"
                />
              </TouchableOpacity>
            </View>

            {selectedPost && (
              <ScrollView
                showsVerticalScrollIndicator={
                  false
                }
                contentContainerStyle={{
                  paddingBottom: 40,
                }}
              >
                <View
                  style={[
                    styles.detailUserCard,
                    {
                      backgroundColor:
                        isDark
                          ? '#111827'
                          : '#FFFFFF',
                      borderColor:
                        isDark
                          ? '#1E293B'
                          : '#E2E8F0',
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={
                      styles.userSection
                    }
                    onPress={() =>
                      openProfile(
                        selectedPost
                      )
                    }
                  >
                    <Avatar
                      uri={
                        selectedPost.avatarUrl
                      }
                      size={42}
                    />

                    <View
                      style={{
                        flex: 1,
                      }}
                    >
                      <Text
                        style={[
                          styles.userName,
                          {
                            color:
                              isDark
                                ? '#F8FAFC'
                                : '#0F172A',
                          },
                        ]}
                      >
                        {
                          selectedPost.name
                        }
                      </Text>

                      <Text
                        style={[
                          styles.username,
                          {
                            color:
                              isDark
                                ? '#94A3B8'
                                : '#64748B',
                          },
                        ]}
                      >
                        {
                          selectedPost.username
                        }{' '}
                        •{' '}
                        {
                          selectedPost.createdAt
                        }
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <FollowButton
                    post={
                      selectedPost
                    }
                    large
                  />
                </View>

                <View
                  style={
                    styles.detailSymbolRow
                  }
                >
                  <Text
                    style={[
                      styles.detailSymbol,
                      {
                        color: isDark
                          ? '#F8FAFC'
                          : '#0F172A',
                      },
                    ]}
                  >
                    {
                      selectedPost.symbol
                    }
                  </Text>

                  <View
                    style={[
                      styles.directionBadge,
                      {
                        backgroundColor:
                          selectedPost.direction ===
                          'BUY'
                            ? isDark
                              ? '#052E16'
                              : '#F0FDF4'
                            : isDark
                            ? '#450A0A'
                            : '#FEF2F2',
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color:
                          selectedPost.direction ===
                          'BUY'
                            ? '#16A34A'
                            : '#EF4444',
                        fontWeight:
                          '800',
                      }}
                    >
                      {
                        selectedPost.direction
                      }
                    </Text>
                  </View>

                  <Text
                    style={{
                      color:
                        isDark
                          ? '#94A3B8'
                          : '#64748B',
                      fontWeight:
                        '700',
                    }}
                  >
                    {
                      selectedPost.timeframe
                    }
                  </Text>

                  <View
                    style={{
                      flex: 1,
                    }}
                  />

                  <Text
                    style={
                      styles.detailRR
                    }
                  >
                    RR{' '}
                    {
                      selectedPost.rr
                    }
                  </Text>
                </View>

                {selectedPost.imageUri ? (
                  <Image
                    source={{
                      uri: selectedPost.imageUri,
                    }}
                    style={
                      styles.detailImage
                    }
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.detailChartPlaceholder,
                      {
                        backgroundColor:
                          isDark
                            ? '#0B1220'
                            : '#FFFFFF',
                        borderColor:
                          isDark
                            ? '#1E293B'
                            : '#E2E8F0',
                      },
                    ]}
                  >
                    <Ionicons
                      name="analytics-outline"
                      size={50}
                      color="#2563EB"
                    />

                    <Text
                      style={{
                        marginTop: 8,
                        color:
                          '#94A3B8',
                        fontWeight:
                          '700',
                      }}
                    >
                      نمودار تحلیل
                    </Text>
                  </View>
                )}

                <View
                  style={[
                    styles.detailTradeCard,
                    {
                      backgroundColor:
                        isDark
                          ? '#0F172A'
                          : '#FFFFFF',
                      borderColor:
                        isDark
                          ? '#1E293B'
                          : '#E2E8F0',
                    },
                  ]}
                >
                  <DataItem
                    label="Entry"
                    value={
                      selectedPost.entry
                    }
                  />

                  <DataItem
                    label="Stop Loss"
                    value={
                      selectedPost.sl
                    }
                  />

                  <DataItem
                    label="Take Profit"
                    value={
                      selectedPost.tp
                    }
                  />

                  <DataItem
                    label="Risk / Reward"
                    value={
                      selectedPost.rr
                    }
                  />
                </View>

                <Text
                  style={[
                    styles.detailText,
                    {
                      color: isDark
                        ? '#CBD5E1'
                        : '#334155',
                    },
                  ]}
                >
                  {
                    selectedPost.text
                  }
                </Text>

                <View
                  style={[
                    styles.detailActions,
                    {
                      backgroundColor:
                        isDark
                          ? '#111827'
                          : '#FFFFFF',
                      borderColor:
                        isDark
                          ? '#1E293B'
                          : '#E2E8F0',
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={
                      styles.detailAction
                    }
                    onPress={() =>
                      toggleLike(
                        selectedPost.id
                      )
                    }
                  >
                    <Ionicons
                      name={
                        selectedPost.liked
                          ? 'heart'
                          : 'heart-outline'
                      }
                      size={23}
                      color={
                        selectedPost.liked
                          ? '#EF4444'
                          : '#64748B'
                      }
                    />

                    <Text
                      style={{
                        color:
                          isDark
                            ? '#CBD5E1'
                            : '#475569',
                        fontWeight:
                          '700',
                      }}
                    >
                      {
                        selectedPost.likes
                      }
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={
                      styles.detailAction
                    }
                    onPress={() =>
                      toggleSave(
                        selectedPost.id
                      )
                    }
                  >
                    <Ionicons
                      name={
                        selectedPost.saved
                          ? 'bookmark'
                          : 'bookmark-outline'
                      }
                      size={23}
                      color={
                        selectedPost.saved
                          ? '#2563EB'
                          : '#64748B'
                      }
                    />

                    <Text
                      style={{
                        color:
                          isDark
                            ? '#CBD5E1'
                            : '#475569',
                        fontWeight:
                          '700',
                      }}
                    >
                      ذخیره
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={
                      styles.detailAction
                    }
                    onPress={() =>
                      shareAnalysis(
                        selectedPost
                      )
                    }
                  >
                    <Ionicons
                      name="share-social-outline"
                      size={23}
                      color="#64748B"
                    />

                    <Text
                      style={{
                        color:
                          isDark
                            ? '#CBD5E1'
                            : '#475569',
                        fontWeight:
                          '700',
                      }}
                    >
                      اشتراک
                    </Text>
                  </TouchableOpacity>

                  {sessionUserId &&
                    selectedPost.userId ===
                      sessionUserId && (
                      <>
                        <TouchableOpacity
                          style={styles.detailAction}
                          onPress={() => startEditAnalysis(selectedPost)}
                        >
                          <Ionicons name="create-outline" size={23} color="#2563EB" />
                          <Text style={{ color: '#2563EB', fontWeight: '700' }}>ویرایش</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                        style={
                          styles.detailAction
                        }
                        onPress={() =>
                          deleteOwnAnalysis(
                            selectedPost.id
                          )
                        }
                      >
                        <Ionicons
                          name="trash-outline"
                          size={23}
                          color="#EF4444"
                        />

                        <Text
                          style={{
                            color:
                              '#EF4444',
                            fontWeight:
                              '700',
                          }}
                        >
                          حذف
                        </Text>
                      </TouchableOpacity>
                      </>
                    )}
                </View>

                <Text
                  style={[
                    styles.commentsTitle,
                    {
                      color: isDark
                        ? '#F8FAFC'
                        : '#0F172A',
                    },
                  ]}
                >
                  نظرات (
                  {
                    selectedPost
                      .comments
                      .length
                  }
                  )
                </Text>

                {selectedPost.comments
                  .length === 0 ? (
                  <View
                    style={
                      styles.noComments
                    }
                  >
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={36}
                      color="#94A3B8"
                    />

                    <Text
                      style={{
                        marginTop: 8,
                        color:
                          '#94A3B8',
                      }}
                    >
                      هنوز نظری ثبت نشده است.
                    </Text>
                  </View>
                ) : (
                  selectedPost.comments.map(
                    (comment) =>
                      renderComment(
                        comment,
                        selectedPost.id
                      )
                  )
                )}

                {replyingTo && (
                  <View
                    style={[
                      styles.replyingBox,
                      {
                        backgroundColor: isDark ? '#172554' : '#EFF6FF',
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color:
                          '#2563EB',
                        fontWeight:
                          '700',
                        flex: 1,
                      }}
                    >
                      در حال پاسخ به کامنت
                    </Text>

                    <TouchableOpacity
                      onPress={() =>
                        setReplyingTo(
                          null
                        )
                      }
                    >
                      <Ionicons
                        name="close"
                        size={20}
                        color="#64748B"
                      />
                    </TouchableOpacity>
                  </View>
                )}

                <View
                  style={[
                    styles.commentInputContainer,
                    {
                      backgroundColor:
                        isDark
                          ? '#111827'
                          : '#FFFFFF',
                      borderColor:
                        isDark
                          ? '#1E293B'
                          : '#E2E8F0',
                    },
                  ]}
                >
                  <TextInput
                    value={
                      commentText
                    }
                    onChangeText={
                      setCommentText
                    }
                    placeholder={
                      replyingTo
                        ? 'پاسخ خود را بنویس...'
                        : 'نظر خود را بنویس...'
                    }
                    placeholderTextColor="#94A3B8"
                    multiline
                    style={[
                      styles.commentInput,
                      {
                        color:
                          isDark
                            ? '#F8FAFC'
                            : '#0F172A',
                      },
                    ]}
                  />

                  <TouchableOpacity
                    style={
                      styles.sendCommentButton
                    }
                    onPress={
                      addComment
                    }
                  >
                    <Ionicons
                      name="send"
                      size={19}
                      color="#FFFFFF"
                    />
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// =========================================================
// WRAPPER با LoginGuard
// =========================================================

export default function Analysis() {
  return (
    <LoginGuard message="برای دیدن و انتشار تحلیل‌ها ابتدا وارد حساب کاربری خود شوید.">
      <AnalysisContent />
    </LoginGuard>
  );
}

// =========================================================
// FILTER BUTTON
// =========================================================

function FilterButton({
  title,
  active,
  isDark,
  onPress,
}: {
  title: string;
  active: boolean;
  isDark: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.filterButton,
        {
          backgroundColor:
            active
              ? '#2563EB'
              : isDark
              ? '#111827'
              : '#FFFFFF',

          borderColor:
            active
              ? '#2563EB'
              : isDark
              ? '#1E293B'
              : '#E2E8F0',
        },
      ]}
    >
      <Text
        style={{
          color: active
            ? '#FFFFFF'
            : isDark
            ? '#CBD5E1'
            : '#64748B',

          fontWeight: '800',
          fontSize: 12,
        }}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

// =========================================================
// STYLES
// =========================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  header: {
    paddingTop: 58,
    paddingHorizontal: 18,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },

  title: {
    fontSize: 26,
    fontWeight: '900',
  },

  subtitle: {
    marginTop: 5,
    fontSize: 12,
    fontWeight: '500',
  },

  savedButton: {
    marginLeft: 'auto',
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchContainer: {
    marginHorizontal: 16,
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },

  searchInput: {
    flex: 1,
    marginLeft: 9,
    fontSize: 13,
    textAlign: 'right',
  },

  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },

  filterButton: {
    minWidth: 72,
    height: 38,
    paddingHorizontal: 18,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  feed: {
    paddingHorizontal: 16,
    paddingTop: 2,
  },

  card: {
    borderWidth: 1,
    borderRadius: 20,
    marginBottom: 14,
    padding: 14,
    overflow: 'hidden',
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  userName: {
    fontSize: 14,
    fontWeight: '800',
  },

  username: {
    fontSize: 11,
    marginTop: 3,
  },

  symbolRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },

  symbolBadge: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },

  symbolText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#2563EB',
  },

  directionBadge: {
    marginLeft: 7,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 9,
  },

  timeframe: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '700',
  },

  rrText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#2563EB',
  },

  chartPlaceholder: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 15,
    borderWidth: 1,
    marginTop: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  placeholderText: {
    marginTop: 6,
    fontSize: 11,
  },

  postImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 15,
    marginTop: 13,
  },

  postText: {
    marginTop: 13,
    fontSize: 13,
    lineHeight: 23,
    textAlign: 'right',
  },

  tradeInfoRow: {
    marginTop: 14,
    borderRadius: 14,
    padding: 10,
    flexDirection: 'row',
  },

  dataItem: {
    flex: 1,
    alignItems: 'center',
  },

  dataLabel: {
    fontSize: 10,
    fontWeight: '600',
  },

  dataValue: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '800',
  },

  actionRow: {
    marginTop: 13,
    paddingTop: 11,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 18,
    gap: 5,
  },

  actionText: {
    fontSize: 12,
    fontWeight: '700',
  },

  followButton: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },

  fab: {
    position: 'absolute',
    right: 18,
    bottom: 92,
    height: 54,
    paddingHorizontal: 17,
    borderRadius: 18,
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },

  fabDisabled: {
    opacity: 0.65,
  },

  fabText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    marginLeft: 5,
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },

  emptyTitle: {
    marginTop: 14,
    fontSize: 17,
    fontWeight: '900',
  },

  emptyText: {
    marginTop: 7,
    fontSize: 12,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor:
      'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },

  createModal: {
    maxHeight: '94%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 18,
  },

  savedModal: {
    maxHeight: '88%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 18,
  },

  detailModal: {
    flex: 1,
    marginTop: 35,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: 'hidden',
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
  },

  fieldLabel: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 13,
    marginBottom: 7,
    textAlign: 'right',
  },

  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 13,
    fontSize: 13,
    textAlign: 'right',
  },

  textArea: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 13,
    paddingTop: 12,
    fontSize: 13,
    textAlign: 'right',
    lineHeight: 22,
  },

  twoColumns: {
    flexDirection: 'row',
    gap: 10,
  },

  directionButton: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rrPreview: {
    marginTop: 12,
    height: 46,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  rrPreviewText: {
    color: '#2563EB',
    fontWeight: '900',
    fontSize: 13,
  },

  uploadBox: {
    height: 145,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },

  uploadTitle: {
    marginTop: 8,
    color: '#2563EB',
    fontWeight: '900',
  },

  uploadSubtitle: {
    marginTop: 4,
    color: '#94A3B8',
    fontSize: 11,
  },

  imagePreviewWrapper: {
    position: 'relative',
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 16,
    overflow: 'hidden',
  },

  imagePreview: {
    width: '100%',
    height: '100%',
  },

  removeImageButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },

  changeImageButton: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    backgroundColor:
      'rgba(15,23,42,0.75)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  changeImageText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },

  publishButton: {
    marginTop: 18,
    height: 52,
    borderRadius: 15,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  publishButtonDisabled: {
    opacity: 0.7,
  },

  publishButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },

  emptySaved: {
    alignItems: 'center',
    paddingVertical: 70,
  },

  savedItem: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },

  savedItemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  savedSymbol: {
    fontSize: 15,
    fontWeight: '900',
    flex: 1,
  },

  detailHeader: {
    height: 62,
    paddingHorizontal: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  detailTitle: {
    fontSize: 18,
    fontWeight: '900',
  },

  detailUserCard: {
    marginHorizontal: 16,
    padding: 13,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  followLargeButton: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 11,
    minWidth: 95,
    alignItems: 'center',
    justifyContent: 'center',
  },

  detailSymbolRow: {
    marginHorizontal: 16,
    marginTop: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },

  detailSymbol: {
    fontSize: 22,
    fontWeight: '900',
    marginRight: 9,
  },

  detailRR: {
    color: '#2563EB',
    fontWeight: '900',
  },

  detailImage: {
    marginHorizontal: 16,
    marginTop: 14,
    width: 'auto',
    aspectRatio: 16 / 9,
    borderRadius: 17,
  },

  detailChartPlaceholder: {
    marginHorizontal: 16,
    marginTop: 14,
    aspectRatio: 16 / 9,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  detailTradeCard: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 12,
    borderRadius: 17,
    borderWidth: 1,
    flexDirection: 'row',
  },

  detailText: {
    marginHorizontal: 16,
    marginTop: 15,
    fontSize: 14,
    lineHeight: 25,
    textAlign: 'right',
  },

  detailActions: {
    marginHorizontal: 16,
    marginTop: 15,
    padding: 12,
    borderRadius: 17,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },

  detailAction: {
    alignItems: 'center',
    gap: 5,
  },

  commentsTitle: {
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 11,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'right',
  },

  noComments: {
    alignItems: 'center',
    paddingVertical: 30,
  },

  commentContainer: {
    marginHorizontal: 16,
    marginBottom: 9,
    padding: 12,
    borderRadius: 15,
    borderWidth: 1,
  },

  replyContainer: {
    marginLeft: 22,
    marginRight: 0,
    marginTop: 9,
  },

  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  commentName: {
    fontSize: 12,
    fontWeight: '800',
  },

  commentUsername: {
    fontSize: 10,
    marginTop: 2,
  },

  commentText: {
    marginTop: 9,
    fontSize: 12,
    lineHeight: 21,
    textAlign: 'right',
  },

  commentActions: {
    flexDirection: 'row',
    marginTop: 10,
    alignItems: 'center',
  },

  commentAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    gap: 4,
  },

  commentActionText: {
    fontSize: 11,
    fontWeight: '700',
  },

  replyingBox: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  commentInputContainer: {
    marginHorizontal: 16,
    marginTop: 12,
    minHeight: 52,
    borderRadius: 15,
    borderWidth: 1,
    paddingLeft: 7,
    paddingRight: 7,
    flexDirection: 'row',
    alignItems: 'center',
  },

  commentInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    paddingHorizontal: 10,
    fontSize: 12,
    textAlign: 'right',
  },

  sendCommentButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
});