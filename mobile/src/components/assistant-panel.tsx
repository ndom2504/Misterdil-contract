import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Message } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { colors, radius, space } from '@/lib/theme';
import type { AssistantMessage } from '@/lib/types';

const DOCUMENT_PROMPTS = [
  "Qu'est-ce qui manque à mon contrat ?",
  'Résume les modifications.',
  'Quels points sont encore en discussion ?',
  'Explique cette clause.',
  'Prépare une synthèse pour le directeur.',
  'Identifie les incohérences dans le document.',
  'Propose une formulation plus claire.',
];

const SECTION_PROMPTS = [
  'Rédige une première version de cette section.',
  'Propose une formulation plus claire.',
  'Complète cette section avec les points manquants.',
  'Explique cette clause simplement.',
  'Quels points de cette section sont encore en discussion ?',
];

type Props = {
  documentId: string;
  sectionId?: string;
  sectionTitle?: string;
  onInsert?: (text: string) => void;
};

export function AssistantPanel({ documentId, sectionId, sectionTitle, onInsert }: Props) {
  const [messages, setMessages] = useState<AssistantMessage[] | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [inserted, setInserted] = useState<string | null>(null);
  const list = useRef<FlatList<AssistantMessage>>(null);

  useEffect(() => {
    let active = true;
    api<{ messages: AssistantMessage[] }>(`/api/mobile/assistant?documentId=${encodeURIComponent(documentId)}`)
      .then((data) => {
        if (active) setMessages(data.messages);
      })
      .catch((reason) => {
        if (active) {
          setMessages([]);
          setError(errorMessage(reason));
        }
      });
    return () => {
      active = false;
    };
  }, [documentId]);

  async function ask(question: string) {
    const message = question.trim();
    if (message.length < 2 || busy) return;
    setBusy(true);
    setError('');
    setText('');
    const pending: AssistantMessage = { id: `local-${Date.now()}`, role: 'user', content: message, createdAt: new Date().toISOString() };
    setMessages((current) => [...(current ?? []), pending]);
    try {
      const result = await api<{ answer: string }>('/api/mobile/assistant', {
        method: 'POST',
        body: { message, documentId, sectionId },
      });
      setMessages((current) => [
        ...(current ?? []),
        { id: `answer-${Date.now()}`, role: 'assistant', content: result.answer, createdAt: new Date().toISOString() },
      ]);
    } catch (reason) {
      setError(errorMessage(reason));
      setText(message);
      setMessages((current) => (current ?? []).filter((item) => item.id !== pending.id));
    } finally {
      setBusy(false);
    }
  }

  const prompts = sectionId ? SECTION_PROMPTS : DOCUMENT_PROMPTS;

  return (
    <View style={styles.root}>
      <View style={styles.banner}>
        <View style={styles.bannerIcon}>
          <Ionicons name="sparkles" size={18} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>{sectionTitle ? `Rédiger « ${sectionTitle} »` : 'Assistant Misterdil'}</Text>
          <Text style={styles.bannerText}>Misterdil AI propose. Le modérateur décide. Les parties valident.</Text>
        </View>
      </View>

      {messages === null ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: space.xl }} />
      ) : (
        <FlatList
          ref={list}
          data={messages}
          keyExtractor={(item) => item.id}
          style={{ flex: 1 }}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {sectionId
                ? "Demandez une première version, une reformulation ou une explication. Vous pourrez insérer la réponse dans la section."
                : "Posez une question sur l'entente : points manquants, incohérences, synthèse…"}
            </Text>
          }
          renderItem={({ item }) => {
            const mine = item.role === 'user';
            return (
              <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleAi]}>
                {!mine ? (
                  <View style={styles.aiHead}>
                    <Ionicons name="sparkles" size={12} color={colors.brand} />
                    <Text style={styles.aiName}>Misterdil AI</Text>
                  </View>
                ) : null}
                <Text selectable style={[styles.bubbleText, mine && { color: '#fff' }]}>
                  {item.content}
                </Text>
                {!mine && onInsert ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      onInsert(item.content);
                      setInserted(item.id);
                    }}
                    style={({ pressed }) => [styles.insert, pressed && { opacity: 0.8 }]}>
                    <Ionicons name={inserted === item.id ? 'checkmark-circle' : 'arrow-down-circle-outline'} size={16} color={colors.brand} />
                    <Text style={styles.insertText}>{inserted === item.id ? 'Inséré dans la section' : 'Insérer dans la section'}</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          }}
          ListFooterComponent={
            busy ? (
              <View style={[styles.bubble, styles.bubbleAi, styles.thinking]}>
                <ActivityIndicator size="small" color={colors.brand} />
                <Text style={styles.aiName}>Misterdil AI rédige…</Text>
              </View>
            ) : null
          }
        />
      )}

      <Message text={error} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.promptRow}
        contentContainerStyle={styles.prompts}
        keyboardShouldPersistTaps="handled">
        {prompts.map((prompt) => (
          <Pressable key={prompt} disabled={busy} onPress={() => void ask(prompt)} style={({ pressed }) => [styles.prompt, pressed && { opacity: 0.8 }]}>
            <Text style={styles.promptText}>{prompt}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.composer}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Demandez à Misterdil AI…"
          placeholderTextColor={colors.faint}
          multiline
          style={styles.input}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Envoyer"
          disabled={busy || text.trim().length < 2}
          onPress={() => void ask(text)}
          style={[styles.send, (busy || text.trim().length < 2) && { opacity: 0.4 }]}>
          <Ionicons name="arrow-up" size={20} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, gap: space.sm },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.brandSoft,
    borderRadius: radius.md,
    padding: space.md,
    marginHorizontal: space.lg,
    marginTop: space.md,
  },
  bannerIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  bannerTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  bannerText: { fontSize: 12, color: colors.muted, marginTop: 2 },
  list: { padding: space.lg, gap: space.sm, flexGrow: 1 },
  empty: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20, marginTop: space.xl },
  bubble: { maxWidth: '88%', borderRadius: radius.md, padding: space.md, gap: 6 },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: colors.brand, borderBottomRightRadius: 4 },
  bubbleAi: {
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    borderBottomLeftRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  aiHead: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  aiName: { fontSize: 12, fontWeight: '700', color: colors.brand },
  bubbleText: { fontSize: 15, lineHeight: 22, color: colors.text },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  insert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.brandSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 2,
  },
  insertText: { fontSize: 13, fontWeight: '600', color: colors.brand },
  // A ScrollView grows by default; in this column it would take half of the screen.
  promptRow: { flexGrow: 0, flexShrink: 0 },
  prompts: { paddingHorizontal: space.lg, gap: space.sm, alignItems: 'center' },
  prompt: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: space.md,
    paddingVertical: 8,
  },
  promptText: { fontSize: 13, color: colors.text },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    backgroundColor: colors.background,
    paddingHorizontal: space.lg,
    paddingTop: 11,
    paddingBottom: 11,
    fontSize: 15,
    color: colors.text,
  },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
});
