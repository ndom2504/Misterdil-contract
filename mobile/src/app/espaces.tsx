import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { ColorPickerSheet } from '@/components/color-picker';
import { Loading, Message, ProgressBar } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { roleLabel } from '@/lib/format';
import { deleteWorkspaceAction } from '@/lib/manage';
import { colors, radius, space } from '@/lib/theme';
import type { WorkspaceSummary } from '@/lib/types';

export default function Workspaces() {
  const [items, setItems] = useState<WorkspaceSummary[] | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<WorkspaceSummary | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api<{ workspaces: WorkspaceSummary[] }>('/api/mobile/workspaces');
      setItems(data.workspaces);
      setError('');
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!items && !error) return <Loading />;

  return (
    <>
      <FlatList
        data={items ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.brand}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
        ListHeaderComponent={
          <>
            {error ? <Message text={error} /> : null}
            <Text style={styles.tip}>Chaque projet a son espace. Touchez un espace pour ouvrir ses réglages.</Text>
          </>
        }
        ListEmptyComponent={items ? <Text style={styles.empty}>Aucun espace pour le moment.</Text> : null}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Réglages de ${item.name}`}
            onPress={() => setSelected(item)}
            style={({ pressed }) => [styles.item, pressed && { opacity: 0.8 }]}>
            <View style={styles.head}>
              <View style={styles.icon}>
                <Ionicons name="folder-open-outline" size={20} color={colors.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.meta}>
                  {item.documents} entente{item.documents > 1 ? 's' : ''} · {item.participants} participant{item.participants > 1 ? 's' : ''} · {roleLabel(item.role)}
                </Text>
              </View>
              <Ionicons name="ellipsis-horizontal" size={20} color={colors.faint} />
            </View>
            {item.description ? (
              <Text style={styles.description} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
            <ProgressBar percent={item.progress.percent} />
          </Pressable>
        )}
      />
      <ColorPickerSheet
        visible={Boolean(selected)}
        title={selected ? `Réglages de « ${selected.name} »` : ''}
        onClose={() => setSelected(null)}
        actions={selected?.canDelete ? [deleteWorkspaceAction(selected, () => void load())] : []}
        note={selected && !selected.canDelete ? "Seul l'administrateur ou le créateur de l'espace peut le supprimer." : undefined}
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: { padding: space.lg, gap: space.sm, flexGrow: 1 },
  tip: { fontSize: 13, color: colors.muted, marginBottom: space.sm },
  item: {
    gap: space.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: space.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  icon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brandSoft },
  title: { fontSize: 15, fontWeight: '600', color: colors.text },
  meta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  description: { fontSize: 13, color: colors.muted, lineHeight: 18 },
  empty: { textAlign: 'center', color: colors.faint, marginTop: space.xl * 2 },
});
