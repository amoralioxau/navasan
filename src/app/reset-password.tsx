import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { colors } = useNavasanTheme();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      // کاربر باید از طریق لینک ایمیل اومده باشه
      // اگه session معتبر داشته باشه، یعنی لینک کار کرده
      setHasSession(!!data.session?.user);
      setChecking(false);
    };

    check();

    // به تغییرات auth هم گوش می‌ده (چون لینک ممکنه session بسازه)
    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((_event, session) => {
        if (!mounted) return;
        setHasSession(!!session?.user);
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleReset = async () => {
    if (!password || !confirmPassword) {
      Alert.alert('خطا', 'لطفاً هر دو فیلد را پر کنید.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('خطا', 'رمز عبور باید حداقل ۶ کاراکتر باشد.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('خطا', 'رمز عبور و تکرار آن یکسان نیستند.');
      return;
    }

    setBusy(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        Alert.alert('خطا', error.message);
        return;
      }

      setDone(true);
    } catch (error: any) {
      Alert.alert('خطا', error?.message || 'تغییر رمز انجام نشد.');
    } finally {
      setBusy(false);
    }
  };

  // در حال بررسی
  if (checking) {
    return (
      <View
        style={[
          styles.screen,
          styles.center,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.secondaryText }]}>
          در حال بررسی لینک بازیابی...
        </Text>
      </View>
    );
  }

  // لینک نامعتبر یا منقضی
  if (!hasSession) {
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
              styles.iconCircle,
              { backgroundColor: `${colors.danger}15` },
            ]}
          >
            <Ionicons
              name="alert-circle-outline"
              size={42}
              color={colors.danger}
            />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>
            لینک نامعتبر
          </Text>

          <Text
            style={[styles.subtitle, { color: colors.secondaryText }]}
          >
            این لینک بازیابی معتبر نیست یا منقضی شده است.
            {'\n\n'}
            لطفاً دوباره از صفحه «فراموشی رمز» درخواست بازیابی بده.
          </Text>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              { backgroundColor: colors.primary },
            ]}
            onPress={() => router.replace('/forgot-password')}
          >
            <Ionicons
              name="mail-outline"
              size={19}
              color="#FFFFFF"
            />
            <Text style={styles.primaryButtonText}>
              درخواست لینک جدید
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.secondaryButton,
              { borderColor: colors.border },
            ]}
            onPress={() => router.replace('/account')}
          >
            <Text
              style={[
                styles.secondaryButtonText,
                { color: colors.text },
              ]}
            >
              بازگشت به ورود
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // موفق
  if (done) {
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
              styles.iconCircle,
              { backgroundColor: colors.primarySoft },
            ]}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={42}
              color={colors.primary}
            />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>
            رمز عبور تغییر کرد
          </Text>

          <Text
            style={[styles.subtitle, { color: colors.secondaryText }]}
          >
            رمز عبور جدید شما با موفقیت ثبت شد.
            {'\n\n'}
            حالا می‌توانید با رمز جدید وارد شوید.
          </Text>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              { backgroundColor: colors.primary },
            ]}
            onPress={async () => {
              await supabase.auth.signOut();
              router.replace('/account');
            }}
          >
            <Ionicons
              name="log-in-outline"
              size={19}
              color="#FFFFFF"
            />
            <Text style={styles.primaryButtonText}>
              ورود به حساب
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // فرم تغییر رمز
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
          رمز عبور جدید
        </Text>

        <Text
          style={[styles.subtitle, { color: colors.secondaryText }]}
        >
          یک رمز عبور قوی و جدید برای حساب خود انتخاب کنید.
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
            رمز عبور جدید
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
            <TouchableOpacity
              onPress={() => setShowPass(!showPass)}
              hitSlop={10}
            >
              <Ionicons
                name={showPass ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={colors.mutedText}
              />
            </TouchableOpacity>

            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="حداقل ۶ کاراکتر"
              placeholderTextColor={colors.mutedText}
              secureTextEntry={!showPass}
              editable={!busy}
              autoCapitalize="none"
              style={[styles.input, { color: colors.text }]}
            />
          </View>

          <Text
            style={[
              styles.inputLabel,
              { color: colors.secondaryText, marginTop: 16 },
            ]}
          >
            تکرار رمز عبور
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
            <TouchableOpacity
              onPress={() => setShowConfirm(!showConfirm)}
              hitSlop={10}
            >
              <Ionicons
                name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={colors.mutedText}
              />
            </TouchableOpacity>

            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="تکرار رمز عبور"
              placeholderTextColor={colors.mutedText}
              secureTextEntry={!showConfirm}
              editable={!busy}
              autoCapitalize="none"
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
            onPress={handleReset}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons
                  name="checkmark-outline"
                  size={19}
                  color="#FFFFFF"
                />
                <Text style={styles.primaryButtonText}>
                  ثبت رمز جدید
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
  },

  container: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
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
    maxWidth: 340,
    marginBottom: 28,
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
});