import { useRouter } from 'expo-router';
import { ReactNode, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useNavasanTheme } from '@/context/theme-context';
import { supabase } from '@/lib/supabase';

type LoginGuardProps = {
  children: ReactNode;
  /**
   * پیام نمایشی وقتی کاربر لاگین نیست
   */
  message?: string;
};

export function LoginGuard({
  children,
  message = 'برای دسترسی به این بخش ابتدا وارد حساب کاربری خود شوید.',
}: LoginGuardProps) {
  const router = useRouter();
  const { colors } = useNavasanTheme();
  const [checking, setChecking] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setLoggedIn(!!data.session?.user);
      setChecking(false);
    };

    check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        setLoggedIn(!!session?.user);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // در حال چک کردن
  if (checking) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.secondaryText }]}>
          در حال بررسی حساب...
        </Text>
      </View>
    );
  }

  // لاگین نیست — پیام + دکمه
  if (!loggedIn) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <View style={[styles.iconCircle, { backgroundColor: colors.primarySoft }]}>
          <Text style={styles.lockIcon}>🔒</Text>
        </View>

        <Text style={[styles.title, { color: colors.text }]}>
          ورود لازم است
        </Text>

        <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
          {message}
        </Text>

        <Text
          onPress={() => router.replace('/account')}
          style={[styles.button, { backgroundColor: colors.primary }]}
        >
          ورود / ثبت‌نام
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '700',
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  lockIcon: {
    fontSize: 42,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 320,
    marginBottom: 26,
  },
  button: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    overflow: 'hidden',
    textAlign: 'center',
  },
});