import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Loading, Message } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { appRoute, formatRelative } from '@/lib/format';
import { colors, radius, space } from '@/lib/theme';
import type { AppNotification } from '@/lib/types';

export default function Notifications() {
  const { refresh: refreshMe } = useAuth();
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<{ notifications: AppNotification[] }>('/api/mobile/notifications');
      setItems(data.notifications);
      setError('');
      if (data.notifications.some((item) => !item.read)) {
        await api('/api/mobile/notifications', { method: 'POST' });
        await refreshMe();
      }
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }, [refreshMe]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!items && !error) return <Loading />;

  return (
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
      ListHeaderComponent={error ? <Message text={error} /> : null}
      ListEmptyComponent={items ? <Text style={styles.empty}>Aucune notification.</Text> : null}
      renderItem={({ item }) => (
        <Pressable onPress={() => item.href && router.push(appRoute(item.href))} style={[styles.item, !item.read && styles.unread]}>
          {!item.read ? <View style={styles.dot} /> : null}
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.title}>{item.title}</Text>
            {item.body ? <Text style={styles.body}>{item.body}</Text> : null}
            <Text style={styles.time}>{formatRelative(item.createdAt)}</Text>
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
    gap: space.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: space.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  unread: { borderColor: colors.brand, backgroundColor: '#f7faff' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand, marginTop: 6 },
  title: { fontSize: 15, fontWeight: '600', color: colors.text },
  body: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  time: { fontSize: 12, color: colors.faint, marginTop: 2 },
  empty: { textAlign: 'center', color: colors.faint, marginTop: space.xl * 2 },
});
