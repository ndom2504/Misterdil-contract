import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { dayLabel, dayToDate, localDay, localTime } from '@/lib/agenda';
import { colors, radius, space } from '@/lib/theme';

// A date ("YYYY-MM-DD") or time ("HH:MM") field using the platform's native picker.
export function PickerField({
  label,
  mode,
  value,
  onChange,
  minimumDay,
  hint,
  placeholder,
}: {
  label: string;
  mode: 'date' | 'time';
  value: string;
  onChange: (value: string) => void;
  minimumDay?: string;
  hint?: string;
  placeholder?: string;
}) {
  const current = mode === 'date' ? dayToDate(value || minimumDay || localDay()) : dayToDate(localDay(), value || '10:00');
  const minimumDate = mode === 'date' && minimumDay ? dayToDate(minimumDay, '00:00') : undefined;
  const pick = (date: Date) => onChange(mode === 'date' ? localDay(date) : localTime(date));

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {Platform.OS === 'ios' && value ? (
        <View style={styles.iosRow}>
          <DateTimePicker
            value={current}
            mode={mode}
            display="compact"
            locale="fr-CA"
            minimumDate={minimumDate}
            onValueChange={(_event, date) => pick(date)}
          />
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          style={styles.input}
          onPress={() =>
            Platform.OS === 'ios'
              ? pick(current)
              : DateTimePickerAndroid.open({
                  value: current,
                  mode,
                  is24Hour: true,
                  minimumDate,
                  onValueChange: (_event, date) => pick(date),
                })
          }>
          <Text style={[styles.value, !value && { color: colors.faint }]}>
            {value ? (mode === 'date' ? dayLabel(value) : value.replace(':', ' h ')) : placeholder ?? 'Choisir'}
          </Text>
          <Ionicons name={mode === 'date' ? 'calendar-outline' : 'time-outline'} size={18} color={colors.muted} />
        </Pressable>
      )}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6, flex: 1 },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted },
  input: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  value: { fontSize: 16, color: colors.text },
  iosRow: { minHeight: 48, justifyContent: 'center', alignItems: 'flex-start' },
  hint: { fontSize: 12, color: colors.faint },
});
