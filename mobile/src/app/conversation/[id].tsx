import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  FlatList,
  KeyboardAvoidingView,
  Modal,
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
import { playChime } from '@/lib/chime';
import { formatTime } from '@/lib/format';
import { REACTIONS } from '@/lib/palette';
import { colors, radius, space } from '@/lib/theme';
import type { CallStatus, ChatMessage, ReactionSummary } from '@/lib/types';

const POLL_MS = 3000;

type Reactions = Record<string, ReactionSummary[]>;
type Reply = { title?: string; messages: ChatMessage[]; reactions?: Reactions; call: CallStatus; serverTime: string };

function receivedCount(reactions: Reactions, mine: Set<string>, myId: string) {
  let total = 0;
  for (const [messageId, list] of Object.entries(reactions)) {
    if (!mine.has(messageId)) continue;
    for (const entry of list) total += entry.userIds.filter((userId) => userId !== myId).length;
  }
  return total;
}

function toggleLocal(list: ReactionSummary[], emoji: string, myId: string, myName: string) {
  const existing = list.find((item) => item.emoji === emoji);
  if (existing?.userIds.includes(myId)) {
    const index = existing.userIds.indexOf(myId);
    const next = {
      ...existing,
      count: existing.count - 1,
      userIds: existing.userIds.filter((_, position) => position !== index),
      names: existing.names.filter((_, position) => position !== index),
    };
    return next.count ? list.map((item) => (item.emoji === emoji ? next : item)) : list.filter((item) => item.emoji !== emoji);
  }
  if (existing) {
    return list.map((item) =>
      item.emoji === emoji ? { ...item, count: item.count + 1, userIds: [...item.userIds, myId], names: [...item.names, myName] } : item,
    );
  }
  return [...list, { emoji, count: 1, userIds: [myId], names: [myName] }];
}

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
  const [reactions, setReactions] = useState<Reactions>({});
  const [picker, setPicker] = useState<ChatMessage | null>(null);
  const cursor = useRef<string | null>(null);
  const received = useRef<number | null>(null);
  const mineIds = useRef(new Set<string>());
  const pendingReaction = useRef(0);

  const load = useCallback(async () => {
    try {
      const after = cursor.current ? `?after=${encodeURIComponent(cursor.current)}` : '';
      const data = await api<Reply>(`/api/mobile/documents/${id}/messages${after}`);
      if (data.title) setTitle(data.title);
      for (const message of data.messages) if (message.authorId === myId) mineIds.current.add(message.id);
      setMessages((current) => merge(current ?? [], data.messages));
      setCall(data.call);
      // A poll that raced an optimistic toggle would briefly undo it; the next one catches up.
      if (data.reactions && !pendingReaction.current) {
        const total = receivedCount(data.reactions, mineIds.current, myId);
        if (received.current !== null && total > received.current) playChime();
        received.current = total;
        setReactions(data.reactions);
      }
      const last = data.messages[data.messages.length - 1];
      if (last) cursor.current = last.createdAt;
      setError('');
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }, [id, myId]);

  async function react(message: ChatMessage, emoji: string) {
    setPicker(null);
    const before = reactions[message.id] ?? [];
    const adding = !before.find((item) => item.emoji === emoji)?.userIds.includes(myId);
    if (adding) playChime();
    setReactions((current) => ({ ...current, [message.id]: toggleLocal(current[message.id] ?? [], emoji, myId, me?.user.name ?? 'Vous') }));
    pendingReaction.current += 1;
    try {
      const result = await api<{ reactions: ReactionSummary[] }>(`/api/mobile/documents/${id}/messages/${message.id}/reactions`, {
        method: 'POST',
        body: { emoji },
      });
      setReactions((current) => ({ ...current, [message.id]: result.reactions }));
    } catch (reason) {
      setReactions((current) => ({ ...current, [message.id]: before }));
      setError(errorMessage(reason));
    } finally {
      pendingReaction.current -= 1;
    }
  }

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
      mineIds.current.add(data.message.id);
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
              const list = reactions[item.id] ?? [];
              return (
                <View style={[styles.row, mine ? styles.rowMine : null, firstOfGroup && { marginTop: space.sm }, list.length ? { marginBottom: 14 } : null]}>
                  {!mine ? (
                    <View style={styles.avatarSlot}>{firstOfGroup ? <Avatar name={item.authorName} url={item.authorAvatar} size={30} /> : null}</View>
                  ) : null}
                  <Pressable
                    onLongPress={() => setPicker(item)}
                    delayLongPress={280}
                    accessibilityHint="Appui long pour réagir"
                    style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
                    {!mine && firstOfGroup ? <Text style={styles.author}>{item.authorName}</Text> : null}
                    <Text style={[styles.body, mine && { color: '#fff' }]}>{item.body}</Text>
                    <Text style={[styles.time, mine && { color: 'rgba(255,255,255,0.75)' }]}>{formatTime(item.createdAt)}</Text>
                    {list.length ? (
                      <View style={[styles.chips, mine ? { right: 6 } : { left: 6 }]}>
                        {list.map((entry) => {
                          const selected = entry.userIds.includes(myId);
                          return (
                            <Pressable
                              key={entry.emoji}
                              accessibilityLabel={`${entry.emoji} ${entry.names.join(', ')}`}
                              onPress={() => void react(item, entry.emoji)}
                              style={[styles.chip, selected && styles.chipMine]}>
                              <Text style={styles.chipEmoji}>{entry.emoji}</Text>
                              {entry.count > 1 ? <Text style={[styles.chipCount, selected && { color: colors.brand }]}>{entry.count}</Text> : null}
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : null}
                  </Pressable>
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

      <Modal visible={Boolean(picker)} transparent animationType="fade" onRequestClose={() => setPicker(null)}>
        <Pressable style={styles.pickerBackdrop} onPress={() => setPicker(null)}>
          <View style={styles.pickerCard}>
            <Text style={styles.pickerPreview} numberOfLines={3}>
              {picker?.authorId === myId ? 'Vous' : picker?.authorName} : {picker?.body}
            </Text>
            <View style={styles.pickerRow}>
              {REACTIONS.map((emoji) => {
                const selected = Boolean(picker && reactions[picker.id]?.find((item) => item.emoji === emoji)?.userIds.includes(myId));
                return (
                  <Pressable
                    key={emoji}
                    accessibilityLabel={`Réagir ${emoji}`}
                    onPress={() => picker && void react(picker, emoji)}
                    style={({ pressed }) => [styles.pickerEmoji, selected && styles.pickerEmojiSelected, pressed && { transform: [{ scale: 1.2 }] }]}>
                    <Text style={{ fontSize: 30 }}>{emoji}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Pressable>
      </Modal>
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
  chips: { position: 'absolute', bottom: -16, flexDirection: 'row', gap: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  chipMine: { backgroundColor: colors.brandSoft, borderColor: colors.brand },
  chipEmoji: { fontSize: 13 },
  chipCount: { fontSize: 11, fontWeight: '700', color: colors.muted },
  pickerBackdrop: { flex: 1, backgroundColor: 'rgba(11,31,58,0.35)', justifyContent: 'center', padding: space.xl },
  pickerCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg, gap: space.md },
  pickerPreview: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  pickerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  pickerEmoji: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  pickerEmojiSelected: { backgroundColor: colors.brandSoft },
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
