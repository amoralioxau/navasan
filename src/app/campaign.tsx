import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { FeatureGuard } from '@/components/FeatureGuard';
import { useNavasanTheme } from '@/context/theme-context';

function CampaignScreenContent() {
  const router = useRouter();
  const { colors } = useNavasanTheme();

  const styles = useMemo(
    () => createStyles(colors),
    [colors],
  );

  const handleRegister = async () => {
    try {
      await Linking.openURL('https://t.me/NAVASAN_Lottery');
    } catch (error) {
      console.log('Could not open Telegram:', error);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.8}
            onPress={() => router.back()}
          >
            <Ionicons
              name="arrow-forward"
              size={23}
              color={colors.text}
            />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>کمپین NAVASAN</Text>

          <View style={styles.headerPlaceholder} />
        </View>

        {/* Hero */}
        <View style={styles.heroCard}>
          <View style={styles.trophyCircle}>
            <Ionicons
              name="trophy"
              size={42}
              color="#FFFFFF"
            />
          </View>

          <Text style={styles.heroSmallTitle}>
            کمپین ویژه NAVASAN
          </Text>

          <Text style={styles.heroTitle}>
            فرصت دریافت حساب پراپ
          </Text>

          <Text style={styles.heroAmount}>
            $100,000
          </Text>

          <Text style={styles.heroDescription}>
            در کمپین NAVASAN شرکت کن و شانس خودت را برای دریافت
            حساب پراپ 100,000 دلاری امتحان کن.
          </Text>

          <View style={styles.freeBadge}>
            <Ionicons
              name="checkmark-circle"
              size={18}
              color={colors.success}
            />
            <Text style={styles.freeBadgeText}>
             ثبت‌نام با فقط 1 دلار
            </Text>
          </View>
        </View>

        {/* Register */}
        <View style={styles.registerCard}>
          <View style={styles.registerIcon}>
            <Ionicons
              name="paper-plane"
              size={25}
              color="#FFFFFF"
            />
          </View>

          <View style={styles.registerTextContainer}>
            <Text style={styles.registerTitle}>
              آماده‌ای شرکت کنی؟
            </Text>

            <Text style={styles.registerDescription}>
              برای ثبت‌نام و دریافت اطلاعات کامل کمپین،
              وارد صفحه ثبت‌نام در تلگرام شو.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.registerButton}
            activeOpacity={0.85}
            onPress={handleRegister}
          >
            <Text style={styles.registerButtonText}>
              ثبت‌نام در کمپین
            </Text>

            <Ionicons
              name="arrow-back"
              size={20}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>

        {/* Steps */}
        <Text style={styles.sectionTitle}>
          مراحل شرکت در کمپین
        </Text>

        <View style={styles.stepsCard}>
          <Step
            number="1"
            icon="person-add-outline"
            title="ثبت‌نام"
            description="از طریق صفحه رسمی کمپین در تلگرام ثبت‌نام کن."
            styles={styles}
            colors={colors}
          />

          <Step
            number="2"
            icon="document-text-outline"
            title="بررسی شرایط"
            description="شرایط و قوانین کمپین را با دقت مطالعه کن."
            styles={styles}
            colors={colors}
          />

          <Step
            number="3"
            icon="checkmark-circle-outline"
            title="تکمیل شرکت"
            description="اطلاعات موردنیاز را طبق دستورالعمل کمپین تکمیل کن."
            styles={styles}
            colors={colors}
          />

          <Step
            number="4"
            icon="trophy-outline"
            title="اعلام نتیجه"
            description="نتیجه نهایی طبق قوانین اعلام‌شده منتشر خواهد شد."
            last
            styles={styles}
            colors={colors}
          />
        </View>

        {/* Rules */}
        <Text style={styles.sectionTitle}>
          قوانین و شرایط
        </Text>

        <View style={styles.rulesCard}>
          <Rule
            icon="shield-checkmark-outline"
            text="شرکت در کمپین باید مطابق قوانین اعلام‌شده توسط NAVASAN انجام شود."
            styles={styles}
            colors={colors}
          />

          <Rule
            icon="calendar-outline"
            text="ثبت‌نام فقط در بازه زمانی اعلام‌شده امکان‌پذیر است."
            styles={styles}
            colors={colors}
          />

          <Rule
            icon="person-outline"
            text="هر شرکت‌کننده باید اطلاعات صحیح و معتبر ارائه کند."
            styles={styles}
            colors={colors}
          />

          <Rule
            icon="megaphone-outline"
            text="نتیجه و اطلاع‌رسانی‌های رسمی از طریق کانال‌های اعلام‌شده انجام می‌شود."
            styles={styles}
            colors={colors}
          />

          <Rule
            icon="information-circle-outline"
            text="جزئیات کامل شرایط و نحوه شرکت هنگام ثبت‌نام در اختیار کاربران قرار می‌گیرد."
            last
            styles={styles}
            colors={colors}
          />
        </View>

        {/* FAQ */}
        <Text style={styles.sectionTitle}>
          سؤالات متداول
        </Text>

        <View style={styles.faqCard}>
          <FAQ
            question="آیا ثبت‌نام هزینه‌ای دارد؟"
            answer="بله. این نسخه از کمپین به‌صورت پولی با یک دلار برگزار می‌شود."
            styles={styles}
            colors={colors}
          />

          <FAQ
            question="چطور ثبت‌نام کنم؟"
            answer="روی دکمه ثبت‌نام بزن تا به صفحه رسمی کمپین در تلگرام منتقل شوی."
            styles={styles}
            colors={colors}
          />

          <FAQ
            question="اطلاعات کمپین را از کجا دریافت کنم؟"
            answer="اطلاعات و اطلاعیه‌های مربوط به کمپین از طریق کانال رسمی اعلام می‌شود."
            styles={styles}
            colors={colors}
          />

          <FAQ
            question="نتیجه کمپین چه زمانی اعلام می‌شود؟"
            answer="زمان اعلام نتیجه طبق برنامه و قوانین رسمی کمپین اطلاع‌رسانی خواهد شد."
            last
            styles={styles}
            colors={colors}
          />
        </View>

        {/* Telegram */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.telegramCard}
          onPress={handleRegister}
        >
          <View style={styles.telegramIcon}>
            <Ionicons
              name="paper-plane"
              size={24}
              color="#FFFFFF"
            />
          </View>

          <View style={styles.telegramText}>
            <Text style={styles.telegramTitle}>
              صفحه رسمی کمپین
            </Text>

            <Text style={styles.telegramUsername}>
              @NAVASAN_Lottery
            </Text>
          </View>

          <Ionicons
            name="chevron-back"
            size={21}
            color={colors.mutedText}
          />
        </TouchableOpacity>

        <Text style={styles.footer}>
          NAVASAN
        </Text>

        <Text style={styles.footerSub}>
          Trading Journal & Analysis
        </Text>
      </ScrollView>
    </View>
  );
}

// =========================================================
// ✅ WRAPPER با FeatureGuard
// =========================================================

export default function CampaignScreen() {
  return (
    <FeatureGuard feature="campaign">
      <CampaignScreenContent />
    </FeatureGuard>
  );
}

// =========================================================
// SUB-COMPONENTS
// =========================================================

function Step({
  number,
  icon,
  title,
  description,
  last = false,
  styles,
  colors,
}: {
  number: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  last?: boolean;
  styles: any;
  colors: any;
}) {
  return (
    <View
      style={[
        styles.step,
        !last && styles.stepBorder,
      ]}
    >
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>
          {number}
        </Text>
      </View>

      <View style={styles.stepIcon}>
        <Ionicons
          name={icon}
          size={22}
          color={colors.primary}
        />
      </View>

      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>
          {title}
        </Text>

        <Text style={styles.stepDescription}>
          {description}
        </Text>
      </View>
    </View>
  );
}

function Rule({
  icon,
  text,
  last = false,
  styles,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  last?: boolean;
  styles: any;
  colors: any;
}) {
  return (
    <View
      style={[
        styles.rule,
        !last && styles.ruleBorder,
      ]}
    >
      <View style={styles.ruleIcon}>
        <Ionicons
          name={icon}
          size={20}
          color={colors.primary}
        />
      </View>

      <Text style={styles.ruleText}>
        {text}
      </Text>
    </View>
  );
}

function FAQ({
  question,
  answer,
  last = false,
  styles,
  colors,
}: {
  question: string;
  answer: string;
  last?: boolean;
  styles: any;
  colors: any;
}) {
  return (
    <View
      style={[
        styles.faq,
        !last && styles.faqBorder,
      ]}
    >
      <View style={styles.faqQuestionRow}>
        <Text style={styles.faqQuestion}>
          {question}
        </Text>

        <Ionicons
          name="help-circle-outline"
          size={21}
          color={colors.primary}
        />
      </View>

      <Text style={styles.faqAnswer}>
        {answer}
      </Text>
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
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    content: {
      paddingHorizontal: 18,
      paddingTop: 55,
      paddingBottom: 120,
    },

    header: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 18,
    },

    backButton: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },

    headerTitle: {
      flex: 1,
      fontSize: 20,
      fontWeight: '900',
      color: colors.text,
      textAlign: 'center',
    },

    headerPlaceholder: {
      width: 44,
    },

    heroCard: {
      backgroundColor: colors.primary,
      borderRadius: 28,
      paddingHorizontal: 22,
      paddingVertical: 28,
      alignItems: 'center',
      marginBottom: 16,

      shadowColor: '#000000',
      shadowOffset: {
        width: 0,
        height: 6,
      },
      shadowOpacity: 0.14,
      shadowRadius: 14,
      elevation: 5,
    },

    trophyCircle: {
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },

    heroSmallTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: '#DBEAFE',
      marginBottom: 7,
    },

    heroTitle: {
      fontSize: 21,
      fontWeight: '900',
      color: '#FFFFFF',
      textAlign: 'center',
    },

    heroAmount: {
      fontSize: 38,
      fontWeight: '900',
      color: '#FFFFFF',
      marginTop: 4,
      letterSpacing: 1,
    },

    heroDescription: {
      fontSize: 13,
      lineHeight: 22,
      color: '#DBEAFE',
      textAlign: 'center',
      marginTop: 12,
    },

    freeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 8,
      marginTop: 18,
    },

    freeBadgeText: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.success,
      marginLeft: 6,
    },

    registerCard: {
      backgroundColor: colors.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
      marginBottom: 26,

      shadowColor: '#000000',
      shadowOffset: {
        width: 0,
        height: 3,
      },
      shadowOpacity: 0.05,
      shadowRadius: 9,
      elevation: 2,
    },

    registerIcon: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'flex-end',
    },

    registerTextContainer: {
      marginTop: 12,
      alignItems: 'flex-end',
    },

    registerTitle: {
      fontSize: 18,
      fontWeight: '900',
      color: colors.text,
    },

    registerDescription: {
      fontSize: 12,
      lineHeight: 20,
      color: colors.mutedText,
      textAlign: 'right',
      marginTop: 6,
    },

    registerButton: {
      height: 52,
      borderRadius: 16,
      backgroundColor: colors.primary,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 16,
    },

    registerButtonText: {
      fontSize: 14,
      fontWeight: '900',
      color: '#FFFFFF',
      marginRight: 8,
    },

    sectionTitle: {
      fontSize: 16,
      fontWeight: '900',
      color: colors.text,
      textAlign: 'right',
      marginBottom: 10,
    },

    stepsCard: {
      backgroundColor: colors.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 24,
      overflow: 'hidden',
    },

    step: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      padding: 15,
    },

    stepBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },

    stepNumber: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },

    stepNumberText: {
      fontSize: 12,
      fontWeight: '900',
      color: colors.primary,
    },

    stepIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: colors.cardSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 10,
    },

    stepContent: {
      flex: 1,
    },

    stepTitle: {
      fontSize: 14,
      fontWeight: '900',
      color: colors.text,
      textAlign: 'right',
    },

    stepDescription: {
      fontSize: 11,
      lineHeight: 18,
      color: colors.mutedText,
      textAlign: 'right',
      marginTop: 3,
    },

    rulesCard: {
      backgroundColor: colors.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 24,
      overflow: 'hidden',
    },

    rule: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      padding: 15,
    },

    ruleBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },

    ruleIcon: {
      width: 40,
      height: 40,
      borderRadius: 13,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 12,
    },

    ruleText: {
      flex: 1,
      fontSize: 12,
      lineHeight: 20,
      color: colors.secondaryText,
      textAlign: 'right',
    },

    faqCard: {
      backgroundColor: colors.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 24,
      overflow: 'hidden',
    },

    faq: {
      padding: 16,
    },

    faqBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },

    faqQuestionRow: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    faqQuestion: {
      flex: 1,
      fontSize: 13,
      fontWeight: '900',
      color: colors.text,
      textAlign: 'right',
      marginLeft: 10,
    },

    faqAnswer: {
      fontSize: 11,
      lineHeight: 19,
      color: colors.mutedText,
      textAlign: 'right',
      marginTop: 8,
    },

    telegramCard: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 15,
      marginBottom: 28,
    },

    telegramIcon: {
      width: 46,
      height: 46,
      borderRadius: 15,
      backgroundColor: '#229ED9',
      alignItems: 'center',
      justifyContent: 'center',
    },

    telegramText: {
      flex: 1,
      marginHorizontal: 12,
      alignItems: 'flex-end',
    },

    telegramTitle: {
      fontSize: 13,
      fontWeight: '900',
      color: colors.text,
    },

    telegramUsername: {
      fontSize: 11,
      color: colors.mutedText,
      marginTop: 4,
    },

    footer: {
      fontSize: 14,
      fontWeight: '900',
      color: colors.primary,
      textAlign: 'center',
    },

    footerSub: {
      fontSize: 10,
      color: colors.mutedText,
      textAlign: 'center',
      marginTop: 4,
    },
  });