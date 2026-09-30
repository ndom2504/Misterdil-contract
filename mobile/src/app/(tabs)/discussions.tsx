import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Loading, Message } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { colorFor, formatRelative, initials } from '@/lib/format';
import { colors, radius, space } from '@/lib/theme';
import type { Conversation } from '@/lib/types';

export default function Discussions() {
  const [items, setItems] = useState<Conversation[] | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<{ conversations: Conversation[] }>('/api/mobile/conversations');
      setItems(data.conversations);
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
    <FlatList
      data={items ?? []}
      keyExtractor={(item) => item.documentId}
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
      ListHeaderComponent={error ? <Message text={error} /> : null}
      ListEmptyComponent={
        items ? (
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={40} color={colors.faint} />
            <Text style={styles.emptyTitle}>Aucune discussion</Text>
            <Text style={styles.emptyText}>Chaque entente a sa discussion de groupe avec toutes les parties prenantes.</Text>
          </View>
        ) : null
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => router.push(`/conversation/${item.documentId}`)}
          style={({ pressed }) => [styles.item, pressed && { opacity: 0.85 }]}>
          <View style={[styles.icon, { backgroundColor: colorFor(item.title) }]}>
            <Text style={styles.iconText}>{initials(item.title)}</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <View style={styles.top}>
              <Text style={styles.title} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.time}>{formatRelative(item.updatedAt)}</Text>
            </View>
            <Text style={styles.preview} numberOfLines={2}>
              {item.lastMessage?.kind === 'CALL' ? <Ionicons name="call-outline" size={13} color={colors.muted} /> : null}
              {item.lastMessage
                ? item.lastMessage.kind === 'CALL'
                  ? ` ${item.lastMessage.body}`
                  : `${item.lastMessage.authorName} : ${item.lastMessage.body}`
                : `${item.typeLabel} · ${item.participants} partie${item.participants > 1 ? 's' : ''} prenante${item.participants > 1 ? 's' : ''}`}
            </Text>
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: space.lg, gap: space.sm, flexGrow: 1 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  icon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  iconText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  top: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  title: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
  time: { fontSize: 12, color: colors.faint },
  preview: { fontSize: 14, color: colors.muted, lineHeight: 19 },
  empty: { alignItems: 'center', gap: space.md, paddingVertical: space.xl * 2, paddingHorizontal: space.lg },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20 },
});
