import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  FlatList,
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { Message } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatTime } from '@/lib/format';
import { colors, radius, space } from '@/lib/theme';
import type { CallStatus, ChatMessage } from '@/lib/types';

const POLL_MS = 3000;

type Reply = { title?: string; messages: ChatMessage[]; call: CallStatus; serverTime: string };

function merge(current: ChatMessage[], incoming: ChatMessage[]) {
  if (!incoming.length) return current;
  const known = new Set(current.map((item) => item.id));
  const added = incoming.filter((item) => !known.has(item.id));
  return added.length ? [...current, ...added] : current;
}

export default function Conversation() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { me } = useAuth();
  const myId = me?.user.id ?? '';
  const [title, setTitle] = useState('');
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [call, setCall] = useState<CallStatus | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const cursor = useRef<string | null>(null);

  const load = useCallback(async () => {
    try {
      const after = cursor.current ? `?after=${encodeURIComponent(cursor.current)}` : '';
      const data = await api<Reply>(`/api/mobile/documents/${id}/messages${after}`);
      if (data.title) setTitle(data.title);
      setMessages((current) => merge(current ?? [], data.messages));
      setCall(data.call);
      const last = data.messages[data.messages.length - 1];
      if (last) cursor.current = last.createdAt;
      setError('');
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
      const timer = setInterval(() => {
        if (AppState.currentState === 'active') void load();
      }, POLL_MS);
      return () => clearInterval(timer);
    }, [load]),
  );

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const data = await api<{ message: ChatMessage }>(`/api/mobile/documents/${id}/messages`, { method: 'POST', body: { body } });
      setMessages((current) => merge(current ?? [], [data.message]));
      setDraft('');
      setError('');
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSending(false);
    }
  }

  const rows = useMemo(() => [...(messages ?? [])].reverse(), [messages]);
  const callers = call?.participants.length ?? 0;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Retour" hitSlop={12} onPress={() => (router.canGoBack() ? router.back() : router.replace('/discussions'))}>
          <Ionicons name="chevron-back" size={26} color={colors.brand} />
        </Pressable>
        <Pressable style={{ flex: 1 }} onPress={() => router.push(`/documents/${id}`)}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title || 'Discussion'}
          </Text>
          <Text style={styles.headerMeta}>Discussion de l&apos;entente · voir l&apos;entente</Text>
        </Pressable>
        {call?.configured ? (
          <Pressable accessibilityLabel="Lancer un appel audio" hitSlop={10} onPress={() => router.push(`/appel/${id}`)} style={styles.callButton}>
            <Ionicons name="call" size={20} color="#fff" />
          </Pressable>
        ) : null}
      </View>

      {call?.active ? (
        <Pressable onPress={() => router.push(`/appel/${id}`)} style={styles.callBanner}>
          <View style={styles.liveDot} />
          <Text style={styles.callBannerText} numberOfLines={1}>
            Appel en cours · {callers} participant{callers > 1 ? 's' : ''}
          </Text>
          <Text style={styles.callBannerAction}>Rejoindre</Text>
        </Pressable>
      ) : null}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        {messages === null && !error ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.brand} />
          </View>
        ) : (
          <FlatList
            inverted
            data={rows}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>Aucun message. Écrivez aux parties prenantes de cette entente.</Text>
              </View>
            }
            renderItem={({ item, index }) => {
              if (item.kind === 'CALL') {
                return (
                  <View style={styles.system}>
                    <Ionicons name="call-outline" size={14} color={colors.muted} />
                    <Text style={styles.systemText}>
                      {item.body} · {formatTime(item.createdAt)}
                    </Text>
                  </View>
                );
              }
              const mine = item.authorId === myId;
              const older = rows[index + 1];
              const firstOfGroup = !older || older.authorId !== item.authorId || older.kind === 'CALL';
              return (
                <View style={[styles.row, mine ? styles.rowMine : null, firstOfGroup && { marginTop: space.sm }]}>
                  {!mine ? (
                    <View style={styles.avatarSlot}>{firstOfGroup ? <Avatar name={item.authorName} url={item.authorAvatar} size={30} /> : null}</View>
                  ) : null}
                  <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
                    {!mine && firstOfGroup ? <Text style={styles.author}>{item.authorName}</Text> : null}
                    <Text style={[styles.body, mine && { color: '#fff' }]}>{item.body}</Text>
                    <Text style={[styles.time, mine && { color: 'rgba(255,255,255,0.75)' }]}>{formatTime(item.createdAt)}</Text>
                  </View>
                </View>
              );
            }}
          />
        )}

        {error ? (
          <View style={{ paddingHorizontal: space.lg }}>
            <Message text={error} />
          </View>
        ) : null}

        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Votre message"
            placeholderTextColor={colors.faint}
            multiline
            maxLength={2000}
            style={styles.input}
          />
          <Pressable
            accessibilityLabel="Envoyer"
            onPress={send}
            disabled={!draft.trim() || sending}
            style={[styles.send, (!draft.trim() || sending) && { opacity: 0.45 }]}>
            {sending ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send" size={18} color="#fff" />}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  headerMeta: { fontSize: 12, color: colors.faint },
  callButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' },
  callBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    backgroundColor: colors.successSoft,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  callBannerText: { flex: 1, color: colors.success, fontWeight: '600', fontSize: 14 },
  callBannerAction: { color: colors.success, fontWeight: '700', fontSize: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: space.lg, gap: 3, flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, transform: [{ scaleY: -1 }] },
  emptyText: { color: colors.faint, textAlign: 'center', fontSize: 14, lineHeight: 20 },
  system: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginVertical: space.sm },
  systemText: { fontSize: 12, color: colors.muted },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, maxWidth: '100%' },
  rowMine: { justifyContent: 'flex-end' },
  avatarSlot: { width: 30 },
  bubble: { maxWidth: '78%', borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: space.sm, gap: 2 },
  bubbleMine: { backgroundColor: colors.brand, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: colors.card, borderBottomLeftRadius: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  author: { fontSize: 12, fontWeight: '700', color: colors.brand },
  body: { fontSize: 15, color: colors.text, lineHeight: 21 },
  time: { fontSize: 11, color: colors.faint, alignSelf: 'flex-end' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    backgroundColor: colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    borderRadius: 21,
    backgroundColor: colors.background,
    paddingHorizontal: space.lg,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    color: colors.text,
  },
  send: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
});
