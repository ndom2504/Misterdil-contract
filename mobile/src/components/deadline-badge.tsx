import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { DEADLINE_TONES, deadlineInfo } from '@/lib/agenda';

export function DeadlineBadge({
  dueDate,
  status,
  withDate = false,
  style,
}: {
  dueDate: string | null | undefined;
  status: string;
  withDate?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const info = deadlineInfo(dueDate, status);
  if (!info) return null;
  const tone = DEADLINE_TONES[info.tone];
  return (
    <View
      accessibilityLabel={`Échéance : ${info.date}, ${info.label}`}
      style={[styles.badge, { backgroundColor: tone.background, borderColor: tone.border }, style]}>
      <Ionicons name="time-outline" size={12} color={tone.text} />
      <Text style={[styles.label, { color: tone.text }]} numberOfLines={1}>
        {info.label}
        {withDate && info.tone !== 'done' ? <Text style={styles.date}> · {info.date}</Text> : null}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  label: { fontSize: 12, fontWeight: '600' },
  date: { fontWeight: '400' },
});
