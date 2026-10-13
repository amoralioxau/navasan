import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useNavasanTheme } from '@/context/theme-context';

export default function BacktestScreen() {
  const { colors } = useNavasanTheme();
  const router = useRouter();

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Text style={[styles.text, { color: colors.text }]}>
        بک‌تست به‌زودی برمی‌گرده
      </Text>
      <TouchableOpacity
        onPress={() => router.back()}
        style={[styles.btn, { backgroundColor: colors.primary }]}
      >
        <Text style={styles.btnText}>بازگشت</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 },
  text: { fontSize: 16, fontWeight: '800' },
  btn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  btnText: { color: '#FFF', fontWeight: '900' },
});