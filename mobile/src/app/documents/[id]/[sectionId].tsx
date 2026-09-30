import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AssistantPanel } from '@/components/assistant-panel';
import { ColorDot, ColorPickerSheet } from '@/components/color-picker';
import { AvatarStack, SocialBar } from '@/components/social';
import { Button, Card, Loading, Message, SectionTitle, StatusBadge } from '@/components/ui';
import { ApiError, api, errorMessage } from '@/lib/api';
import { playChime } from '@/lib/chime';
import { formatRelative } from '@/lib/format';
import { paletteColor } from '@/lib/palette';
import { colors, radius, space } from '@/lib/theme';
import type { DocumentView, Section, SectionSocial } from '@/lib/types';
import { useDocumentSync } from '@/lib/use-document-sync';

const NO_SOCIAL: SectionSocial = { likes: 0, liked: false, views: 0, comments: 0, people: [] };

function reactorsLabel(social: SectionSocial) {
  const names = social.people.map((person) => person.name.split(' ')[0]);
  if (!names.length) return '';
  if (names.length === 1) return `${names[0]} a réagi`;
  if (names.length === 2) return `${names[0]} et ${names[1]} ont réagi`;
  return `${names[0]}, ${names[1]} et ${names.length - 2} autre${names.length > 3 ? 's' : ''} ont réagi`;
}

type Conflict = { content: string; updatedAt: string; by: string };
type SaveReply = { ok: true; updatedAt: string };

const AUTOSAVE_MS = 900;

export default function SectionScreen() {
  const { id, sectionId } = useLocalSearchParams<{ id: string; sectionId: string }>();
  const navigation = useNavigation();
  const [view, setView] = useState<DocumentView | null>(null);
  const [section, setSection] = useState<Section | null>(null);
  const [draft, setDraft] = useState('');
  const [dirty, setDirty] = useState(false);
  const [focused, setFocused] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedLabel, setSavedLabel] = useState('');
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const [remote, setRemote] = useState('');
  const [comment, setComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [liking, setLiking] = useState(false);
  const [picking, setPicking] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const commentRef = useRef<TextInput>(null);
  const baseRef = useRef('');
  const draftRef = useRef('');
  const dirtyRef = useRef(false);
  draftRef.current = draft;
  dirtyRef.current = dirty;

  const load = useCallback(async () => {
    try {
      const data = await api<{ document: DocumentView }>(`/api/mobile/documents/${id}`);
      const found = data.document.sections.find((item) => item.id === sectionId) ?? null;
      setView(data.document);
      setSection(found);
      if (found && !dirtyRef.current) {
        setDraft(found.content);
        baseRef.current = found.updatedAt;
      }
      setError(found ? '' : 'Section introuvable.');
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }, [id, sectionId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    api<{ views: number }>(`/api/mobile/documents/${id}/sections/${sectionId}/view`, { method: 'POST' })
      .then((result) =>
        setSection((current) => (current ? { ...current, social: { ...(current.social ?? NO_SOCIAL), views: result.views } } : current)),
      )
      .catch(() => {});
  }, [id, sectionId]);

  const save = useCallback(
    async (log: boolean) => {
      if (!section) return true;
      setSaving(true);
      const content = draftRef.current;
      try {
        const result = await api<SaveReply>(`/api/mobile/documents/${id}/sections/${section.id}`, {
          method: 'PUT',
          body: { content, log, expectedUpdatedAt: baseRef.current },
        });
        baseRef.current = result.updatedAt;
        if (draftRef.current === content) setDirty(false);
        setSavedLabel('Enregistré');
        setError('');
        return true;
      } catch (reason) {
        if (reason instanceof ApiError && reason.status === 409 && reason.data) {
          setConflict({
            content: String(reason.data.content ?? ''),
            updatedAt: String(reason.data.updatedAt ?? ''),
            by: reason.message,
          });
        } else {
          setError(errorMessage(reason));
        }
        return false;
      } finally {
        setSaving(false);
      }
    },
    [id, section],
  );

  useEffect(() => {
    if (!dirty || conflict) return;
    setSavedLabel('');
    const timer = setTimeout(() => void save(false), AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [draft, dirty, conflict, save]);

  const presence = useDocumentSync({
    documentId: id,
    loadedAt: view?.loadedAt ?? null,
    editing: focused ? sectionId : null,
    onSections: (changed) => {
      const mine = changed.find((item) => item.id === sectionId);
      if (!mine || !view || mine.updatedById === view.currentUserId || mine.updatedAt <= baseRef.current) return;
      setSection((current) => (current ? { ...current, ...mine } : current));
      if (!dirtyRef.current) {
        setDraft(mine.content);
        baseRef.current = mine.updatedAt;
        setRemote(`${mine.updatedByName || 'Un participant'} a mis à jour cette section.`);
      } else {
        setRemote(`${mine.updatedByName || 'Un participant'} vient de modifier cette section pendant que vous écriviez.`);
      }
    },
    onSignal: () => void load(),
  });

  const lockedBy =
    presence.find((entry) => entry.online && entry.sectionId === sectionId && entry.userId !== view?.currentUserId)?.name ?? '';
  const canWrite = Boolean(view?.access.canWrite && section && section.status !== 'LOCKED' && (!lockedBy || dirty));

  const finish = useCallback(async () => {
    if (dirtyRef.current && !(await save(true))) return;
    router.back();
  }, [save]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: section ? section.title : 'Section',
      headerRight: () =>
        canWrite ? (
          <Pressable onPress={finish} hitSlop={12} style={{ marginRight: space.lg }}>
            <Text style={{ color: colors.brand, fontSize: 16, fontWeight: '600' }}>Terminer</Text>
          </Pressable>
        ) : null,
    });
  }, [navigation, section, canWrite, finish]);

  async function toggleLike() {
    if (!section || liking) return;
    const before = section.social ?? NO_SOCIAL;
    const liked = !before.liked;
    if (liked) playChime();
    setLiking(true);
    setSection({ ...section, social: { ...before, liked, likes: Math.max(0, before.likes + (liked ? 1 : -1)) } });
    try {
      const result = await api<{ liked: boolean; likes: number }>(`/api/mobile/documents/${id}/sections/${section.id}/like`, { method: 'POST' });
      setSection((current) =>
        current ? { ...current, social: { ...(current.social ?? NO_SOCIAL), liked: result.liked, likes: result.likes } } : current,
      );
      void load();
    } catch (reason) {
      setSection((current) => (current ? { ...current, social: before } : current));
      setError(errorMessage(reason));
    } finally {
      setLiking(false);
    }
  }

  async function applyColor(color: string) {
    setPicking(false);
    if (!section) return;
    const previous = section.color ?? '';
    setSection({ ...section, color });
    try {
      await api(`/api/mobile/documents/${id}/sections/${section.id}/color`, { method: 'PUT', body: { color } });
    } catch (reason) {
      setSection((current) => (current ? { ...current, color: previous } : current));
      setError(errorMessage(reason));
    }
  }

  function insertFromAssistant(text: string) {
    const current = draftRef.current.trimEnd();
    setDraft(current ? `${current}\n\n${text.trim()}` : text.trim());
    setDirty(true);
  }

  function focusComment() {
    scrollRef.current?.scrollToEnd({ animated: true });
    setTimeout(() => commentRef.current?.focus(), 250);
  }

  async function postComment() {
    setPosting(true);
    try {
      await api(`/api/mobile/documents/${id}/comments`, { method: 'POST', body: { sectionId, body: comment } });
      setComment('');
      await load();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setPosting(false);
    }
  }

  if (!view || !section) return error ? <View style={{ padding: space.lg }}><Message text={error} /></View> : <Loading />;

  const discussions = view.discussions.filter((item) => item.sectionId === section.id);
  const social = section.social ?? NO_SOCIAL;
  const tint = paletteColor(section.color);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.banner, { backgroundColor: tint?.soft ?? colors.card, borderColor: tint?.soft ?? colors.border }]}>
          <View style={[styles.bannerStripe, { backgroundColor: tint?.hex ?? colors.brand }]} />
          <View style={styles.bannerBody}>
            <View style={styles.head}>
              <StatusBadge status={section.status} />
              <Text style={[styles.meta, styles.status]}>
                {saving ? 'Enregistrement…' : savedLabel || (section.updatedByName ? `Modifié par ${section.updatedByName} ${formatRelative(section.updatedAt)}` : '')}
              </Text>
            </View>
            <View style={styles.head}>
              {social.people.length ? (
                <View style={styles.reactors}>
                  <AvatarStack people={social.people} size={26} />
                  <Text style={styles.reactorsText} numberOfLines={1}>
                    {reactorsLabel(social)}
                  </Text>
                </View>
              ) : (
                <Text style={[styles.meta, { flex: 1 }]}>Soyez le premier à réagir.</Text>
              )}
              <View style={styles.tools}>
                {view.access.canWrite ? (
                  <Pressable accessibilityLabel="Couleur de la section" onPress={() => setPicking(true)} style={styles.toolButton} hitSlop={6}>
                    <ColorDot value={section.color} size={14} />
                  </Pressable>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Assistant Misterdil"
                  onPress={() => setAssistantOpen(true)}
                  style={({ pressed }) => [styles.assistantButton, pressed && { opacity: 0.85 }]}>
                  <Ionicons name="sparkles" size={15} color="#fff" />
                  <Text style={styles.assistantButtonText}>Assistant</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        <SocialBar social={social} busy={liking} onLike={() => void toggleLike()} onComment={focusComment} />

        {lockedBy && !dirty ? <Message tone="warning" text={`${lockedBy} modifie cette section. Elle est en lecture seule le temps qu'il ou elle termine.`} /> : null}
        {!view.access.canWrite ? <Message tone="info" text="Votre accès à ce document est en lecture seule." /> : null}
        {section.status === 'LOCKED' ? <Message tone="info" text="Cette section est verrouillée." /> : null}
        {remote ? (
          <Pressable onPress={() => setRemote('')}>
            <Message tone="info" text={remote} />
          </Pressable>
        ) : null}
        {conflict ? (
          <Card style={{ borderColor: colors.warning }}>
            <Text style={styles.conflictTitle}>{conflict.by}</Text>
            <Text style={styles.meta}>Choisissez la version à conserver.</Text>
            <Text style={styles.theirs} numberOfLines={6}>
              {conflict.content || '(vide)'}
            </Text>
            <View style={styles.row}>
              <Button
                label="Reprendre leur version"
                variant="secondary"
                style={{ flex: 1 }}
                onPress={() => {
                  setDraft(conflict.content);
                  baseRef.current = conflict.updatedAt;
                  setDirty(false);
                  setConflict(null);
                }}
              />
              <Button
                label="Garder mon texte"
                style={{ flex: 1 }}
                onPress={() => {
                  baseRef.current = conflict.updatedAt;
                  setConflict(null);
                  void save(false);
                }}
              />
            </View>
          </Card>
        ) : null}
        <Message text={error} />

        <TextInput
          value={draft}
          onChangeText={(text) => {
            setDraft(text);
            setDirty(true);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          editable={canWrite}
          multiline
          placeholder={canWrite ? 'Rédigez cette section…' : 'Section vide.'}
          placeholderTextColor={colors.faint}
          style={[styles.editor, !canWrite && styles.editorReadOnly]}
        />

        <View style={{ gap: space.sm }}>
          <SectionTitle>Discussion</SectionTitle>
          {discussions.flatMap((item) => item.comments).length ? (
            discussions.flatMap((item) =>
              item.comments.map((entry) => (
                <View key={entry.id} style={styles.comment}>
                  <Text style={styles.commentAuthor}>
                    {entry.authorName} · <Text style={styles.meta}>{formatRelative(entry.createdAt)}</Text>
                  </Text>
                  <Text style={styles.commentBody}>{entry.body}</Text>
                </View>
              )),
            )
          ) : (
            <Text style={styles.meta}>Aucun commentaire sur cette section.</Text>
          )}
          {view.access.canComment ? (
            <View style={styles.commentForm}>
              <TextInput
                ref={commentRef}
                value={comment}
                onChangeText={setComment}
                placeholder="Ajouter un commentaire"
                placeholderTextColor={colors.faint}
                multiline
                style={styles.commentInput}
              />
              <Button label="Envoyer" onPress={postComment} loading={posting} disabled={comment.trim().length < 2} />
            </View>
          ) : null}
        </View>
      </ScrollView>

      <ColorPickerSheet
        visible={picking}
        title={`Couleur de « ${section.title} »`}
        value={section.color ?? ''}
        onClose={() => setPicking(false)}
        onPick={(color) => void applyColor(color)}
      />

      <Modal
        visible={assistantOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setAssistantOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle}>Assistant Misterdil</Text>
            <Pressable onPress={() => setAssistantOpen(false)} hitSlop={12}>
              <Text style={styles.modalClose}>Fermer</Text>
            </Pressable>
          </View>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
            <AssistantPanel
              documentId={id}
              sectionId={section.id}
              sectionTitle={section.title}
              onInsert={canWrite ? insertFromAssistant : undefined}
            />
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xl * 2 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  banner: { flexDirection: 'row', borderRadius: radius.md, borderWidth: 1, overflow: 'hidden' },
  bannerStripe: { width: 5 },
  bannerBody: { flex: 1, padding: space.md, gap: space.sm },
  reactors: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  reactorsText: { flex: 1, fontSize: 13, color: colors.text, fontWeight: '600' },
  tools: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  toolButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assistantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  assistantButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  modalHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  modalClose: { fontSize: 16, fontWeight: '600', color: colors.brand },
  meta: { fontSize: 13, color: colors.muted },
  status: { flexShrink: 1, textAlign: 'right' },
  editor: {
    minHeight: 260,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
    textAlignVertical: 'top',
  },
  editorReadOnly: { backgroundColor: '#f9fafc', color: colors.muted },
  conflictTitle: { fontSize: 15, fontWeight: '700', color: colors.warning },
  theirs: { fontSize: 14, color: colors.text, backgroundColor: colors.background, borderRadius: radius.sm, padding: space.md },
  row: { flexDirection: 'row', gap: space.sm },
  comment: { backgroundColor: colors.card, borderRadius: radius.md, padding: space.md, gap: 4 },
  commentAuthor: { fontSize: 13, fontWeight: '600', color: colors.text },
  commentBody: { fontSize: 14, color: colors.text, lineHeight: 20 },
  commentForm: { gap: space.sm },
  commentInput: {
    minHeight: 60,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    fontSize: 15,
    color: colors.text,
    textAlignVertical: 'top',
  },
});
