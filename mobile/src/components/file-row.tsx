import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { formatRelative, formatSize } from '@/lib/format';
import { colors, radius, space } from '@/lib/theme';
import type { FileItem } from '@/lib/types';

function fileIcon(name: string): keyof typeof Ionicons.glyphMap {
  const extension = name.split('.').pop()?.toLowerCase() ?? '';
  if (extension === 'pdf') return 'document-text';
  if (['png', 'jpg', 'jpeg', 'webp'].includes(extension)) return 'image';
  if (['xls', 'xlsx'].includes(extension)) return 'grid';
  return 'document';
}

export function FileRow({ file, busy, onOpen }: { file: FileItem; busy: boolean; onOpen: () => void }) {
  return (
    <Pressable onPress={onOpen} style={({ pressed }) => [styles.file, pressed && { opacity: 0.85 }]}>
      <View style={styles.icon}>
        <Ionicons name={fileIcon(file.name)} size={20} color={colors.brand} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.name} numberOfLines={1}>
          {file.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {formatSize(file.size)} · {formatRelative(file.createdAt)}
          {file.uploadedByName ? ` · ${file.uploadedByName}` : ''}
        </Text>
      </View>
      {busy ? <ActivityIndicator color={colors.brand} /> : <Ionicons name="share-outline" size={20} color={colors.faint} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  file: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: space.md,
    marginTop: space.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  icon: { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  meta: { fontSize: 12, color: colors.faint },
});
