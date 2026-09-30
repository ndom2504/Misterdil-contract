import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PALETTE, paletteColor } from '@/lib/palette';
import { colors, radius, space } from '@/lib/theme';

export type SheetAction = {
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  hint?: string;
  destructive?: boolean;
};

type Props = {
  visible: boolean;
  title: string;
  onClose: () => void;
  value?: string;
  onPick?: (key: string) => void;
  actions?: SheetAction[];
  note?: string;
};

// Without onPick the sheet only lists the actions (settings of a conversation, for example).
export function ColorPickerSheet({ visible, title, value = '', onPick, onClose, actions = [], note }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fermer" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
        <View style={styles.grabber} />
        <Text style={styles.title}>{title}</Text>
        {onPick ? (
          <>
            <Text style={styles.hint}>La couleur est visible par toutes les parties de l&apos;entente.</Text>
            <Palette value={value} onPick={onPick} />
          </>
        ) : null}
        {actions.length ? (
          <View style={[styles.actions, onPick && styles.actionsSeparated]}>
            {actions.map((action) => (
              <Pressable
                key={action.label}
                accessibilityRole="button"
                onPress={() => {
                  onClose();
                  // iOS drops an alert presented while the sheet is still sliding away.
                  setTimeout(action.onPress, 350);
                }}
                style={({ pressed }) => [styles.action, pressed && { backgroundColor: colors.background }]}>
                <View style={[styles.actionIcon, action.destructive && styles.actionIconDanger]}>
                  <Ionicons name={action.icon} size={19} color={action.destructive ? colors.danger : colors.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.actionLabel, action.destructive && { color: colors.danger }]}>{action.label}</Text>
                  {action.hint ? <Text style={styles.actionHint}>{action.hint}</Text> : null}
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}
        {note ? <Text style={styles.note}>{note}</Text> : null}
      </View>
    </Modal>
  );
}

function Palette({ value, onPick }: { value: string; onPick: (key: string) => void }) {
  return (
    <View style={styles.grid}>
      {PALETTE.map((item) => {
        const selected = item.key === value;
        return (
          <Pressable
            key={item.key}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={item.label}
            onPress={() => onPick(item.key)}
            style={styles.cell}>
            <View style={[styles.swatch, { backgroundColor: item.hex }, selected && styles.swatchSelected]}>
              {selected ? <Ionicons name="checkmark" size={22} color="#fff" /> : null}
            </View>
            <Text style={styles.label}>{item.label}</Text>
          </Pressable>
        );
      })}
      <Pressable accessibilityRole="button" accessibilityLabel="Sans couleur" onPress={() => onPick('')} style={styles.cell}>
        <View style={[styles.swatch, styles.none, !value && styles.swatchSelected]}>
          <Ionicons name={value ? 'close' : 'checkmark'} size={20} color={colors.muted} />
        </View>
        <Text style={styles.label}>Aucune</Text>
      </Pressable>
    </View>
  );
}

export function ColorDot({ value, size = 12 }: { value?: string; size?: number }) {
  const color = paletteColor(value);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color?.hex ?? 'transparent',
        borderWidth: color ? 0 : 1.5,
        borderColor: colors.faint,
        borderStyle: color ? 'solid' : 'dashed',
      }}
    />
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(11,31,58,0.35)' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg + 6,
    borderTopRightRadius: radius.lg + 6,
    paddingHorizontal: space.xl,
    paddingTop: space.sm,
    gap: space.sm,
  },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border, marginBottom: space.sm },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  hint: { fontSize: 13, color: colors.muted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: space.lg, marginTop: space.md },
  cell: { width: '20%', alignItems: 'center', gap: 6 },
  swatch: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  swatchSelected: { borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 6, elevation: 4 },
  none: { backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed' },
  label: { fontSize: 11, color: colors.muted },
  actions: { gap: 2, marginTop: space.sm },
  actionsSeparated: { marginTop: space.lg, paddingTop: space.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  action: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm, paddingHorizontal: space.xs, borderRadius: radius.md },
  actionIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brandSoft },
  actionIconDanger: { backgroundColor: colors.dangerSoft },
  actionLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  actionHint: { fontSize: 12, color: colors.muted, marginTop: 1 },
  note: { fontSize: 12, color: colors.faint, marginTop: space.xs },
});
