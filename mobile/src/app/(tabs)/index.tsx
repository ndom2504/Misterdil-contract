import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useNavigation } from 'expo-router';
import { useCallback, useLayoutEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Button, Loading, Message, ProgressBar, StatusBadge } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatRelative } from '@/lib/format';
import { colors, radius, space } from '@/lib/theme';
import type { DocumentSummary } from '@/lib/types';

export default function Documents() {
  const navigation = useNavigation();
  const { me, refresh: refreshMe } = useAuth();
  const unread = me?.unread ?? 0;
  const [documents, setDocuments] = useState<DocumentSummary[] | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<{ documents: DocumentSummary[] }>('/api/mobile/documents');
      setDocuments(data.documents);
      setError('');
      await refreshMe().catch(() => {});
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }, [refreshMe]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          accessibilityLabel={unread ? `Notifications, ${unread} non lues` : 'Notifications'}
          onPress={() => router.push('/notifications')}
          hitSlop={12}
          style={{ marginRight: space.lg }}>
          <Ionicons name="notifications-outline" size={25} color={colors.text} />
          {unread ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
            </View>
          ) : null}
        </Pressable>
      ),
    });
  }, [navigation, unread]);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (!documents && !error) return <Loading />;

  return (
    <FlatList
      data={documents ?? []}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} />}
      ListHeaderComponent={error ? <Message text={error} /> : null}
      ListEmptyComponent={
        documents ? (
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={40} color={colors.faint} />
            <Text style={styles.emptyTitle}>Aucune entente pour l&apos;instant</Text>
            <Text style={styles.emptyText}>Créez votre première entente : choisissez l&apos;équipe, le type, puis rédigez ensemble.</Text>
            <Button label="Nouvelle entente" onPress={() => router.push('/nouveau')} style={{ alignSelf: 'stretch' }} />
          </View>
        ) : null
      }
      renderItem={({ item }) => (
        <Pressable onPress={() => router.push(`/documents/${item.id}`)} style={({ pressed }) => [styles.item, pressed && { opacity: 0.85 }]}>
          <View style={styles.itemTop}>
            <Text style={styles.itemTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <StatusBadge status={item.status} kind="document" />
          </View>
          <Text style={styles.itemMeta} numberOfLines={1}>
            {item.typeLabel} · {item.workspaceName}
          </Text>
          <ProgressBar percent={item.progress.percent} />
          <View style={styles.itemFoot}>
            <Text style={styles.itemMeta}>
              {item.progress.validated}/{item.progress.total} sections validées
            </Text>
            <Text style={styles.itemMeta}>
              <Ionicons name="people-outline" size={13} color={colors.faint} /> {item.participants} · {formatRelative(item.updatedAt)}
            </Text>
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: space.lg, gap: space.md, flexGrow: 1 },
  item: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md },
  itemTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.text },
  itemMeta: { fontSize: 13, color: colors.faint },
  itemFoot: { flexDirection: 'row', justifyContent: 'space-between' },
  empty: { alignItems: 'center', gap: space.md, paddingVertical: space.xl * 2, paddingHorizontal: space.lg },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20 },
  badge: {
    position: 'absolute',
    top: -5,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.card,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
