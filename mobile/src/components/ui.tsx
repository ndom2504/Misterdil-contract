import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { DOCUMENT_STATUS, SECTION_STATUS } from '@/lib/format';
import { colors, radius, space } from '@/lib/theme';

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, variant = 'primary', disabled, loading, icon, style }: ButtonProps) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'ghost' && styles.buttonGhost,
        variant === 'danger' && styles.buttonDanger,
        inactive && styles.buttonDisabled,
        pressed && !inactive && styles.buttonPressed,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : colors.brand} />
      ) : (
        <View style={styles.buttonContent}>
          {icon}
          <Text
            style={[
              styles.buttonLabel,
              variant === 'primary' && { color: '#fff' },
              variant === 'danger' && { color: colors.danger },
            ]}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export function Field({ label, hint, ...props }: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput placeholderTextColor={colors.faint} {...props} style={[styles.input, props.multiline && styles.inputMultiline, props.style]} />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

export function Message({ text, tone = 'danger' }: { text: string; tone?: 'danger' | 'success' | 'warning' | 'info' }) {
  if (!text) return null;
  const palette = {
    danger: [colors.dangerSoft, colors.danger],
    success: [colors.successSoft, colors.success],
    warning: [colors.warningSoft, colors.warning],
    info: [colors.brandSoft, colors.brand],
  }[tone];
  return (
    <View style={[styles.message, { backgroundColor: palette[0] }]}>
      <Text style={{ color: palette[1], fontSize: 14, lineHeight: 20 }}>{text}</Text>
    </View>
  );
}

const SECTION_TONES: Record<string, [string, string]> = {
  NOT_STARTED: ['#f1f3f6', '#5e6875'],
  IN_PREPARATION: ['#eaf1ff', '#2f6fed'],
  IN_DISCUSSION: ['#fff4e5', '#b45309'],
  CHANGES_REQUESTED: ['#fdecec', '#dc2626'],
  VALIDATED: ['#e8f7ee', '#16a34a'],
  LOCKED: ['#ede9fe', '#6d28d9'],
};

export function StatusBadge({ status, kind = 'section' }: { status: string; kind?: 'section' | 'document' }) {
  const label = kind === 'section' ? SECTION_STATUS[status] ?? status : DOCUMENT_STATUS[status] ?? status;
  const [background, color] =
    kind === 'section'
      ? SECTION_TONES[status] ?? SECTION_TONES.NOT_STARTED
      : status === 'FINAL'
        ? SECTION_TONES.VALIDATED
        : status === 'DRAFT'
          ? SECTION_TONES.NOT_STARTED
          : SECTION_TONES.IN_PREPARATION;
  return (
    <View style={[styles.badge, { backgroundColor: background }]}>
      <Text style={[styles.badgeLabel, { color }]}>{label}</Text>
    </View>
  );
}

export function ProgressBar({ percent }: { percent: number }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, percent))}%` }]} />
    </View>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function Loading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.brand} />
    </View>
  );
}

export const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.sm,
  },
  button: {
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  buttonPrimary: { backgroundColor: colors.brand },
  buttonSecondary: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  buttonGhost: { backgroundColor: 'transparent' },
  buttonDanger: { backgroundColor: colors.dangerSoft },
  buttonDisabled: { opacity: 0.5 },
  buttonPressed: { opacity: 0.85 },
  buttonContent: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  buttonLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.muted },
  input: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: space.md,
    fontSize: 16,
    color: colors.text,
  },
  inputMultiline: { minHeight: 120, paddingTop: space.md, textAlignVertical: 'top' },
  hint: { fontSize: 12, color: colors.faint },
  chip: {
    paddingHorizontal: space.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipSelected: { backgroundColor: colors.brandSoft, borderColor: colors.brand },
  chipLabel: { fontSize: 14, color: colors.text },
  chipLabelSelected: { color: colors.brand, fontWeight: '600' },
  message: { borderRadius: radius.md, padding: space.md },
  badge: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  badgeLabel: { fontSize: 12, fontWeight: '600' },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: '#e8edf5', overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: colors.brand },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.6 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
});
