import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { useNavasanTheme } from '@/context/theme-context';

type Props = {
  value?: string;
  onChange: (uri: string | undefined) => void;
  readOnly?: boolean;
};

export default function VoiceNoteRecorder({ readOnly }: Props) {
  const { colors } = useNavasanTheme();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.input, borderColor: colors.border },
      ]}
    >
      <Ionicons name="mic-off-outline" size={24} color={colors.mutedText} />
      <Text style={[styles.hint, { color: colors.mutedText }]}>
        {readOnly ? 'یادداشت صوتی ثبت نشده' : 'ضبط صدا به‌زودی برمی‌گرده'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    alignItems: 'center',
    gap: 10,
  },
  hint: { fontSize: 11, fontWeight: '600' },
});