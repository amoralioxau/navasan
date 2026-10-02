import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import { useNavasanTheme } from '@/context/theme-context';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { colors } = useNavasanTheme();

  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSendReset = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      Alert.alert('خطا', 'لطفاً ایمیل خود را وارد کنید.');
      return;
    }

    // اعتبارسنجی ساده ایمیل
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      Alert.alert('خطا', 'ایمیل وارد شده معتبر نیست.');
      return;
    }

    setBusy(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        cleanEmail,
        {
          redirectTo: 'navasan:///reset-password',
        }
      );

      if (error) {
        Alert.alert('خطا', error.message);
        return;
      }

      setSent(true);
    } catch (error: any) {
      Alert.alert('خطا', error?.message || 'ارسال ایمیل بازیابی انجام نشد.');
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <View
        style={[
          styles.screen,
          { backgroundColor: colors.background },
        ]}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.successIcon,
              { backgroundColor: colors.primarySoft },
            ]}
          >
            <Ionicons
              name="mail-open-outline"
              size={42}
              color={colors.primary}
            />
          </View>

          <Text style={[styles.successTitle, { color: colors.text }]}>
            ایمیل ارسال شد
          </Text>

          <Text
            style={[
              styles.successSubtitle,
              { color: colors.secondaryText },
            ]}
          >
            یه لینک بازیابی رمز به آدرس{' '}
            <Text style={{ color: colors.primary, fontWeight: '800' }}>
              {email}
            </Text>{' '}
            ارسال شد.
            {'\n\n'}
            ایمیلت رو باز کن و روی لینک بزن تا رمز جدید تنظیم کنی.
          </Text>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              { backgroundColor: colors.primary },
            ]}
            onPress={() => router.replace('/account')}
            disabled={busy}
          >
            <Ionicons
              name="arrow-back-outline"
              size={19}
              color="#FFFFFF"
            />
            <Text style={styles.primaryButtonText}>
              بازگشت به صفحه ورود
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.secondaryButton,
              { borderColor: colors.border },
            ]}
            onPress={() => setSent(false)}
            disabled={busy}
          >
            <Text
              style={[
                styles.secondaryButtonText,
                { color: colors.text },
              ]}
            >
              ایمیل اشتباه بود؟ دوباره بفرست
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[
        styles.screen,
        { backgroundColor: colors.background },
      ]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <TouchableOpacity
          style={[
            styles.backBtn,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
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

        <View
          style={[
            styles.iconCircle,
            { backgroundColor: colors.primarySoft },
          ]}
        >
          <Ionicons
            name="lock-closed-outline"
            size={42}
            color={colors.primary}
          />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>
          بازیابی رمز عبور
        </Text>

        <Text
          style={[styles.subtitle, { color: colors.secondaryText }]}
        >
          ایمیل حسابت رو وارد کن، یه لینک بازیابی برات می‌فرستیم.
        </Text>

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
              styles.inputLabel,
              { color: colors.secondaryText },
            ]}
          >
            ایمیل
          </Text>

          <View
            style={[
              styles.inputWrapper,
              {
                backgroundColor: colors.input,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              name="mail-outline"
              size={19}
              color={colors.mutedText}
            />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.mutedText}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              editable={!busy}
              style={[styles.input, { color: colors.text }]}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              {
                backgroundColor: colors.primary,
                opacity: busy ? 0.6 : 1,
              },
            ]}
            onPress={handleSendReset}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons
                  name="send-outline"
                  size={19}
                  color="#FFFFFF"
                />
                <Text style={styles.primaryButtonText}>
                  ارسال لینک بازیابی
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => router.replace('/account')}
          style={styles.footerLink}
        >
          <Text
            style={[
              styles.footerLinkText,
              { color: colors.secondaryText },
            ]}
          >
            رمزت رو یادت اومد؟{' '}
            <Text style={{ color: colors.primary, fontWeight: '800' }}>
              ورود
            </Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  container: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 60,
    alignItems: 'center',
  },

  backBtn: {
    position: 'absolute',
    top: 50,
    right: 24,
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    marginBottom: 24,
  },

  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    marginBottom: 24,
  },

  title: {
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10,
  },

  subtitle: {
    fontSize: 13,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 320,
    marginBottom: 32,
  },

  successTitle: {
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 12,
  },

  successSubtitle: {
    fontSize: 13,
    lineHeight: 24,
    textAlign: 'center',
    maxWidth: 340,
    marginBottom: 30,
  },

  card: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },

  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
    marginBottom: 8,
  },

  inputWrapper: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 14,
    minHeight: 52,
  },

  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    paddingVertical: 12,
  },

  primaryButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    minHeight: 52,
    borderRadius: 14,
    marginTop: 20,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },

  secondaryButton: {
    width: '100%',
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },

  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },

  footerLink: {
    marginTop: 24,
  },

  footerLinkText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});