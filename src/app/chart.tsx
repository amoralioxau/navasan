import Ionicons from '@expo/vector-icons/Ionicons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useNavasanTheme } from '@/context/theme-context';

export default function ChartScreen() {
  const { colors } = useNavasanTheme();

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.brand, { color: colors.text }]}>NAVASAN</Text>
          <Text style={[styles.subtitle, { color: colors.mutedText }]}>
            چارت و تحلیل تکنیکال
          </Text>
        </View>

        <View
          style={[
            styles.placeholder,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Ionicons
            name="trending-up-outline"
            size={64}
            color={colors.primary}
          />
          <Text style={[styles.placeholderTitle, { color: colors.text }]}>
            چارت
          </Text>
          <Text
            style={[styles.placeholderText, { color: colors.mutedText }]}
          >
            این بخش به‌زودی اضافه می‌شه.{'\n'}
            اینجا چارت زنده، تحلیل تکنیکال و ابزارهای ترسیم قرار می‌گیره.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 120,
  },
  header: {
    marginBottom: 24,
  },
  brand: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'right',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'right',
  },
  placeholder: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginTop: 20,
  },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginTop: 6,
  },
  placeholderText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 22,
    textAlign: 'center',
  },
});