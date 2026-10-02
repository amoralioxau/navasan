import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomTabInset, Radius, Spacing } from '@/constants/theme';
import { useNavasanTheme } from '@/context/theme-context';

function StoreEmptyState() {
  const { colors } = useNavasanTheme();

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(18)).current;
  const scale = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    const animation = Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 550,
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: 0,
        duration: 550,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 550,
        useNativeDriver: true,
      }),
    ]);

    animation.start();

    return () => animation.stop();
  }, [fade, slide, scale]);

  return (
    <Animated.View
      style={[
        styles.empty,
        {
          opacity: fade,
          transform: [
            { translateY: slide },
            { scale },
          ],
        },
      ]}
    >
      <View
        style={[
          styles.iconOuter,
          {
            backgroundColor: colors.primarySoft,
            borderColor: colors.border,
          },
        ]}
      >
        <View
          style={[
            styles.iconInner,
            {
              backgroundColor: colors.primarySoft,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons
            name="storefront-outline"
            size={42}
            color={colors.primary}
          />
        </View>
      </View>

      <View
        style={[
          styles.badge,
          {
            backgroundColor: colors.primarySoft,
            borderColor: colors.border,
          },
        ]}
      >
        <View
          style={[
            styles.badgeDot,
            {
              backgroundColor: colors.primary,
            },
          ]}
        />

        <Text
          style={[
            styles.badgeText,
            {
              color: colors.primary,
            },
          ]}
        >
          به‌زودی
        </Text>
      </View>

      <Text
        style={[
          styles.emptyTitle,
          {
            color: colors.text,
          },
        ]}
      >
        محصولات به‌زودی اضافه می‌شوند
      </Text>

      <Text
        style={[
          styles.emptyDescription,
          {
            color: colors.secondaryText,
          },
        ]}
      >
        محصولات و امکانات فروشگاه NAVASAN در آپدیت‌های بعدی به این بخش
        اضافه خواهند شد.
      </Text>

      <View
        style={[
          styles.infoCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <View
          style={[
            styles.infoIcon,
            {
              backgroundColor: colors.primarySoft,
            },
          ]}
        >
          <Ionicons
            name="notifications-outline"
            size={20}
            color={colors.primary}
          />
        </View>

        <View style={styles.infoContent}>
          <Text
            style={[
              styles.infoTitle,
              {
                color: colors.text,
              },
            ]}
          >
            منتظر آپدیت‌های NAVASAN باشید
          </Text>

          <Text
            style={[
              styles.infoText,
              {
                color: colors.secondaryText,
              },
            ]}
          >
            امکانات و محصولات جدید به مرور به فروشگاه اضافه خواهند شد.
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

export default function Store() {
  const { colors } = useNavasanTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.background,
        },
      ]}
    >
      {/* Very subtle background glows */}
      <View
        pointerEvents="none"
        style={[
          styles.glowTop,
          {
            backgroundColor: colors.primarySoft,
          },
        ]}
      />

      <View
        pointerEvents="none"
        style={[
          styles.glowBottom,
          {
            backgroundColor: colors.primarySoft,
          },
        ]}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + Spacing.five,
            paddingBottom: BottomTabInset + Spacing.six,
          },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text
              style={[
                styles.title,
                {
                  color: colors.text,
                },
              ]}
            >
              فروشگاه
            </Text>

            <Text
              style={[
                styles.subtitle,
                {
                  color: colors.secondaryText,
                },
              ]}
            >
              محصولات و امکانات NAVASAN
            </Text>
          </View>

          <View
            style={[
              styles.headerIcon,
              {
                backgroundColor: colors.primarySoft,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              name="bag-handle-outline"
              size={22}
              color={colors.primary}
            />
          </View>
        </View>

        <StoreEmptyState />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },

  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.five,
  },

  glowTop: {
    position: 'absolute',
    top: -150,
    right: -120,
    width: 320,
    height: 320,
    borderRadius: 160,
    opacity: 0.28,
  },

  glowBottom: {
    position: 'absolute',
    bottom: 20,
    left: -130,
    width: 280,
    height: 280,
    borderRadius: 140,
    opacity: 0.18,
  },

  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerText: {
    flex: 1,
    alignItems: 'flex-end',
  },

  title: {
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'right',
  },

  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: Spacing.one,
    textAlign: 'right',
  },

  headerIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.three,
  },

  empty: {
    flex: 1,
    minHeight: 430,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.seven,
    paddingBottom: Spacing.five,
  },

  iconOuter: {
    width: 136,
    height: 136,
    borderRadius: 68,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.five,
  },

  iconInner: {
    width: 94,
    height: 94,
    borderRadius: 47,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  badge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    marginBottom: Spacing.four,
  },

  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: Spacing.two,
  },

  badgeText: {
    fontSize: 12,
    fontWeight: '800',
  },

  emptyTitle: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 32,
  },

  emptyDescription: {
    fontSize: 14,
    lineHeight: 24,
    textAlign: 'center',
    marginTop: Spacing.three,
    maxWidth: 310,
  },

  infoCard: {
    width: '100%',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    padding: Spacing.three,
    marginTop: Spacing.six,
  },

  infoIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.three,
  },

  infoContent: {
    flex: 1,
    alignItems: 'flex-end',
  },

  infoTitle: {
    width: '100%',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
  },

  infoText: {
    width: '100%',
    fontSize: 11,
    lineHeight: 19,
    marginTop: 3,
    textAlign: 'right',
  },
});