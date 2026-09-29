import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, Loading, Message, SectionTitle, StatusBadge } from '@/components/ui';
import { ApiError, api, errorMessage } from '@/lib/api';
import { formatRelative } from '@/lib/format';
import { colors, radius, space } from '@/lib/theme';
import type { DocumentView, Section } from '@/lib/types';
import { useDocumentSync } from '@/lib/use-document-sync';

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

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.head}>
          <StatusBadge status={section.status} />
          <Text style={[styles.meta, styles.status]}>
            {saving ? 'Enregistrement…' : savedLabel || (section.updatedByName ? `Modifié par ${section.updatedByName} ${formatRelative(section.updatedAt)}` : '')}
          </Text>
        </View>

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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xl * 2 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
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
