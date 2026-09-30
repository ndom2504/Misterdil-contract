import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';

import { FileRow } from '@/components/file-row';
import { Loading, Message, StatusBadge } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { ententePdf, openRemoteFile, pickAndUpload } from '@/lib/files';
import { colors, space } from '@/lib/theme';
import type { FileGroup } from '@/lib/types';

export default function Documents() {
  const [groups, setGroups] = useState<FileGroup[] | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await api<{ ententes: FileGroup[] }>('/api/mobile/files');
      setGroups(data.ententes);
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

  async function run(key: string, task: () => Promise<unknown>) {
    if (busy) return;
    setBusy(key);
    try {
      await task();
    } catch (reason) {
      Alert.alert('Documents', errorMessage(reason));
    } finally {
      setBusy('');
    }
  }

  async function upload(group: FileGroup) {
    await run(`upload-${group.id}`, async () => {
      if (await pickAndUpload(group.workspaceId, group.id)) await load();
    });
  }

  if (!groups && !error) return <Loading />;

  const sections = (groups ?? []).map((group) => ({ group, data: group.files }));

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      stickySectionHeadersEnabled={false}
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
      ListHeaderComponent={error ? <Message text={error} /> : null}
      ListEmptyComponent={
        groups ? (
          <View style={styles.empty}>
            <Ionicons name="folder-open-outline" size={40} color={colors.faint} />
            <Text style={styles.emptyTitle}>Aucun document</Text>
            <Text style={styles.emptyText}>Les fichiers joints à vos ententes et leur PDF apparaîtront ici.</Text>
          </View>
        ) : null
      }
      renderSectionHeader={({ section: { group } }) => (
        <View style={styles.groupHeader}>
          <Pressable style={{ flex: 1, gap: 4 }} onPress={() => router.push(`/documents/${group.id}`)}>
            <Text style={styles.groupTitle} numberOfLines={2}>
              {group.title}
            </Text>
            <View style={styles.groupMeta}>
              <StatusBadge status={group.status} kind="document" />
              <Text style={styles.meta}>{group.typeLabel}</Text>
            </View>
          </Pressable>
          <View style={styles.actions}>
            <Action
              icon="document-text-outline"
              label="PDF"
              loading={busy === `pdf-${group.id}`}
              onPress={() => void run(`pdf-${group.id}`, () => ententePdf(group.id, group.title))}
            />
            {group.canUpload ? (
              <Action icon="cloud-upload-outline" label="Ajouter" loading={busy === `upload-${group.id}`} onPress={() => void upload(group)} />
            ) : null}
          </View>
        </View>
      )}
      renderSectionFooter={({ section }) =>
        section.data.length ? null : <Text style={styles.noFiles}>Aucun fichier joint.</Text>
      }
      renderItem={({ item }) => <FileRow file={item} busy={busy === item.id} onOpen={() => void run(item.id, () => openRemoteFile(`/api/attachments/${item.id}`, item.name, item.mimeType))} />}
    />
  );
}

function Action({ icon, label, loading, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; loading: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.action}>
      {loading ? <ActivityIndicator color={colors.brand} size="small" /> : <Ionicons name={icon} size={20} color={colors.brand} />}
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { padding: space.lg, gap: space.sm, flexGrow: 1 },
  groupHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, marginTop: space.lg, marginBottom: space.xs },
  groupTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  groupMeta: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  actions: { flexDirection: 'row', gap: space.xs },
  action: { alignItems: 'center', minWidth: 54, paddingVertical: 4, gap: 2 },
  actionLabel: { fontSize: 11, color: colors.brand, fontWeight: '600' },
  meta: { fontSize: 12, color: colors.faint },
  noFiles: { fontSize: 13, color: colors.faint, paddingVertical: space.sm },
  empty: { alignItems: 'center', gap: space.md, paddingVertical: space.xl * 2, paddingHorizontal: space.lg },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20 },
});
