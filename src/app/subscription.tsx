import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useNavasanTheme } from '@/context/theme-context';

export default function Subscription() {
  const { colors, isDark } = useNavasanTheme();

  const handleUpgrade = (plan: string) => {
    alert('به‌زودی امکان ارتقا به اشتراک ' + plan + ' فعال می‌شود');
  };

  return (
    <ScrollView
      style={[
        styles.screen,
        {
          backgroundColor: colors.background,
        },
      ]}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Text
        style={[
          styles.title,
          {
            color: colors.text,
          },
        ]}
      >
        اشتراک ویژه
      </Text>

      <Text
        style={[
          styles.subtitle,
          {
            color: colors.secondaryText,
          },
        ]}
      >
        با ارتقا، به امکانات پیشرفته‌تری دسترسی پیدا کن
      </Text>

      {/* پلن نقره‌ای */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <Text
          style={[
            styles.planName,
            {
              color: colors.text,
            },
          ]}
        >
          نقره‌ای
        </Text>

        <Text
          style={[
            styles.planPrice,
            {
              color: colors.secondaryText,
            },
          ]}
        >
          $9.99 / ماهانه
        </Text>

        <View style={styles.featureList}>
          <Text
            style={[
              styles.feature,
              {
                color: colors.secondaryText,
              },
            ]}
          >
            ✓ ژورنال نامحدود
          </Text>

          <Text
            style={[
              styles.feature,
              {
                color: colors.secondaryText,
              },
            ]}
          >
            ✓ نمودارهای ماهانه و تحلیل روند
          </Text>

          <Text
            style={[
              styles.feature,
              {
                color: colors.secondaryText,
              },
            ]}
          >
            ✓ ۳ ستاپ اختصاصی در ماه
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.upgradeButton,
            {
              backgroundColor: isDark ? '#475569' : '#64748B',
            },
          ]}
          onPress={() => handleUpgrade('نقره‌ای')}
          activeOpacity={0.85}
        >
          <Text style={styles.upgradeButtonText}>
            ارتقا به نقره‌ای
          </Text>
        </TouchableOpacity>
      </View>

      {/* پلن طلایی */}
      <View
        style={[
          styles.card,
          styles.goldCard,
          {
            backgroundColor: isDark ? '#211A0B' : '#FFFBEB',
            borderColor: isDark ? '#8A6415' : '#FBBF24',
          },
        ]}
      >
        <View
          style={[
            styles.popularBadge,
            {
              backgroundColor: '#F59E0B',
            },
          ]}
        >
          <Text style={styles.popularBadgeText}>
            پیشنهاد ویژه
          </Text>
        </View>

        <Text
          style={[
            styles.planName,
            {
              color: colors.text,
            },
          ]}
        >
          طلایی
        </Text>

        <Text
          style={[
            styles.planPrice,
            {
              color: colors.secondaryText,
            },
          ]}
        >
          $19.99 / ماهانه
        </Text>

        <View style={styles.featureList}>
          <Text
            style={[
              styles.feature,
              {
                color: colors.secondaryText,
              },
            ]}
          >
            ✓ همه‌ی امکانات نقره‌ای
          </Text>

          <Text
            style={[
              styles.feature,
              {
                color: colors.secondaryText,
              },
            ]}
          >
            ✓ دسترسی کامل به همه‌ی ستاپ‌ها
          </Text>

          <Text
            style={[
              styles.feature,
              {
                color: colors.secondaryText,
              },
            ]}
          >
            ✓ ۲۰٪ تخفیف روی همه‌ی دوره‌ها
          </Text>

          <Text
            style={[
              styles.feature,
              {
                color: colors.secondaryText,
              },
            ]}
          >
            ✓ یک جلسه مشاوره‌ی ماهانه رایگان
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.upgradeButton,
            {
              backgroundColor: '#D97706',
            },
          ]}
          onPress={() => handleUpgrade('طلایی')}
          activeOpacity={0.85}
        >
          <Text style={styles.upgradeButtonText}>
            ارتقا به طلایی
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  container: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 60,
  },

  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },

  subtitle: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: 20,
    lineHeight: 20,
  },

  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },

  goldCard: {
    position: 'relative',
  },

  popularBadge: {
    position: 'absolute',
    top: -12,
    right: 16,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },

  popularBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  planName: {
    fontSize: 18,
    fontWeight: 'bold',
  },

  planPrice: {
    fontSize: 15,
    marginTop: 4,
    marginBottom: 14,
  },

  featureList: {
    gap: 6,
  },

  feature: {
    fontSize: 13,
    lineHeight: 20,
  },

  upgradeButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 18,
  },

  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});