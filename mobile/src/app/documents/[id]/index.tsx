import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useLayoutEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { FileRow } from '@/components/file-row';
import { buildPeople, PresenceBubbles } from '@/components/presence-bubbles';
import { SignaturePanel } from '@/components/signature-panel';
import { Button, Card, Loading, Message, ProgressBar, SectionTitle, StatusBadge } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { ententePdf, openRemoteFile, pickAndUpload } from '@/lib/files';
import { formatRelative, partyLabel, roleLabel } from '@/lib/format';
import { colors, radius, space } from '@/lib/theme';
import type { DocumentView, InvitationLink, ShareResult, SyncSection } from '@/lib/types';
import { useDocumentSync } from '@/lib/use-document-sync';

type Tab = 'sections' | 'participants' | 'fichiers' | 'activite';

const STEPS = ['Équipe', 'Type', 'Sections', 'Envoyer'];

export default function DocumentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const [view, setView] = useState<DocumentView | null>(null);
  const [live, setLive] = useState<Record<string, SyncSection>>({});
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('sections');
  const [sending, setSending] = useState(false);
  const [outcome, setOutcome] = useState<{ shared: ShareResult[]; links: InvitationLink[] } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [fileBusy, setFileBusy] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await api<{ document: DocumentView }>(`/api/mobile/documents/${id}`);
      setView(data.document);
      setError('');
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useLayoutEffect(() => {
    if (!view) return;
    navigation.setOptions({
      title: view.title,
      headerRight: () => (
        <Pressable accessibilityLabel="Discussion de l'entente" hitSlop={12} onPress={() => router.push(`/conversation/${id}`)}>
          <Ionicons name="chatbubbles-outline" size={24} color={colors.brand} />
        </Pressable>
      ),
    });
  }, [navigation, view, id]);

  const presence = useDocumentSync({
    documentId: id,
    loadedAt: view?.loadedAt ?? null,
    editing: null,
    onSections: (changed) =>
      setLive((current) => {
        const next = { ...current };
        for (const section of changed) {
          if (!next[section.id] || next[section.id].updatedAt <= section.updatedAt) next[section.id] = section;
        }
        return next;
      }),
    onSignal: () => void load(),
  });

  if (!view) return error ? <View style={{ padding: space.lg }}><Message text={error} /></View> : <Loading />;

  const sections = view.sections.map((section) => {
    const fresh = live[section.id];
    return fresh && fresh.updatedAt >= section.updatedAt
      ? { ...section, ...fresh, updatedByName: fresh.updatedByName || section.updatedByName }
      : section;
  });
  const people = buildPeople(view, presence);
  const recipients = view.stakeholders.filter((party) => party.userId !== view.currentUserId && !party.isCurrentUser);
  const reachable = recipients.filter((party) => party.userId || party.email);
  const drafting = !view.sentAt && view.access.canInvite;
  const setupStep = sections.some((section) => section.anchor !== 'parties' && section.content.trim()) ? 3 : 2;
  const writers = new Map(
    presence
      .filter((entry) => entry.online && entry.sectionId && entry.userId !== view.currentUserId)
      .map((entry) => [entry.sectionId as string, entry.name]),
  );

  async function fileTask(key: string, task: () => Promise<unknown>) {
    if (fileBusy) return;
    setFileBusy(key);
    setError('');
    try {
      await task();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setFileBusy('');
    }
  }

  async function send() {
    setSending(true);
    setError('');
    try {
      const result = await api<{ shared: ShareResult[]; links: InvitationLink[] }>(`/api/mobile/documents/${id}/send`, { method: 'POST' });
      setOutcome({ shared: result.shared, links: result.links });
      await load();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSending(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
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
      }>
      <View style={{ gap: space.sm }}>
        <Text style={styles.meta}>
          {view.typeLabel} · {view.workspaceName}
        </Text>
        <View style={styles.headRow}>
          <PresenceBubbles people={people} />
          <StatusBadge status={view.status} kind="document" />
        </View>
      </View>

      <Message text={error} />

      {drafting ? (
        <Card style={{ borderColor: colors.brand }}>
          <Text style={styles.cardTitle}>Préparez l&apos;entente, puis envoyez-la aux membres</Text>
          <Text style={styles.meta}>
            Les sections sont vides et modifiables. Les autres parties n&apos;y ont pas accès avant l&apos;envoi.
          </Text>
          <View style={styles.steps}>
            {STEPS.map((label, index) => (
              <View key={label} style={[styles.step, index < setupStep && styles.stepDone, index === setupStep && styles.stepCurrent]}>
                {index < setupStep ? <Ionicons name="checkmark" size={12} color={colors.brand} /> : null}
                <Text style={[styles.stepLabel, index <= setupStep && { color: colors.brand }]}>{label}</Text>
              </View>
            ))}
          </View>
          <View style={styles.wrap}>
            {recipients.map((party) => (
              <View key={party.id} style={styles.recipient}>
                <Text style={styles.recipientName}>{party.representative || party.name}</Text>
                {!party.userId && !party.email ? <Text style={styles.noEmail}>Sans courriel</Text> : null}
              </View>
            ))}
          </View>
          {!reachable.length ? <Message tone="warning" text="Ajoutez le courriel d'au moins une autre partie pour pouvoir envoyer l'entente." /> : null}
          <Button
            label="Envoyer aux membres"
            icon={<Ionicons name="paper-plane-outline" size={18} color="#fff" />}
            onPress={send}
            loading={sending}
            disabled={!reachable.length}
          />
        </Card>
      ) : null}

      {outcome ? <SendResults shared={outcome.shared} links={outcome.links} onClose={() => setOutcome(null)} /> : null}

      <Card>
        <View style={styles.progressHead}>
          <Text style={styles.meta}>
            {view.progress.validated}/{view.progress.total} sections validées · {view.progress.discussion} en discussion
          </Text>
          <Text style={styles.percent}>{view.progress.percent} %</Text>
        </View>
        <ProgressBar percent={view.progress.percent} />
      </Card>

      {view.sentAt ? <SignaturePanel view={view} onChanged={load} /> : null}

      <View style={styles.tabs}>
        {(
          [
            ['sections', 'Sections'],
            ['participants', `Parties (${view.stakeholders.length})`],
            ['fichiers', `Fichiers (${view.attachments.length})`],
            ['activite', 'Activité'],
          ] as const
        ).map(([key, label]) => (
          <Pressable key={key} onPress={() => setTab(key)} style={[styles.tab, tab === key && styles.tabActive]}>
            <Text style={[styles.tabLabel, tab === key && styles.tabLabelActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'sections' ? (
        <View style={{ gap: space.sm }}>
          {sections.map((section) => {
            const writer = writers.get(section.id);
            return (
              <Pressable
                key={section.id}
                onPress={() => router.push(`/documents/${id}/${section.id}`)}
                style={({ pressed }) => [styles.section, pressed && { opacity: 0.85 }]}>
                <View style={styles.sectionHead}>
                  <Text style={styles.sectionTitle}>
                    {section.position}. {section.title}
                  </Text>
                  <StatusBadge status={section.status} />
                </View>
                <Text style={[styles.preview, !section.content.trim() && styles.previewEmpty]} numberOfLines={3}>
                  {section.content.trim() || 'Section vide. Touchez pour commencer la rédaction.'}
                </Text>
                {writer ? (
                  <Text style={styles.writer}>
                    <Ionicons name="create-outline" size={13} color={colors.success} /> {writer} modifie cette section
                  </Text>
                ) : section.updatedByName && section.content.trim() ? (
                  <Text style={styles.meta}>
                    Modifié par {section.updatedByName} {formatRelative(section.updatedAt)}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {tab === 'participants' ? (
        <View style={{ gap: space.sm }}>
          <Text style={styles.meta}>Modérateur : {view.moderatorName}</Text>
          {view.stakeholders.map((party) => {
            const person = people.find((item) => item.key === party.id);
            const link = view.invitationLinks.find((item) => item.email === party.email);
            return (
              <Card key={party.id}>
                <Text style={styles.cardTitle}>{party.organization || party.name}</Text>
                <Text style={styles.meta}>
                  {partyLabel(party.partyType)} · {party.representative || party.name} · {roleLabel(party.accessRole)}
                </Text>
                {party.email ? <Text style={styles.meta}>{party.email}</Text> : null}
                {person ? (
                  <Text style={[styles.meta, person.state === 'online' && { color: colors.success, fontWeight: '600' }]}>{person.detail}</Text>
                ) : null}
                {link ? (
                  <Button
                    label="Partager le lien d'invitation"
                    variant="secondary"
                    icon={<Ionicons name="share-outline" size={16} color={colors.brand} />}
                    onPress={() => Share.share({ message: `Rejoignez l'entente « ${view.title} » sur Misterdil : ${link.link}` })}
                  />
                ) : null}
              </Card>
            );
          })}
        </View>
      ) : null}

      {tab === 'fichiers' ? (
        <View style={{ gap: space.sm }}>
          <View style={styles.fileActions}>
            <Button
              label="PDF de l'entente"
              variant="secondary"
              style={{ flex: 1 }}
              loading={fileBusy === 'pdf'}
              icon={<Ionicons name="document-text-outline" size={18} color={colors.brand} />}
              onPress={() => void fileTask('pdf', () => ententePdf(view.id, view.title))}
            />
            {view.access.documentRole !== 'READER' ? (
              <Button
                label="Ajouter"
                variant="secondary"
                style={{ flex: 1 }}
                loading={fileBusy === 'upload'}
                icon={<Ionicons name="cloud-upload-outline" size={18} color={colors.brand} />}
                onPress={() =>
                  void fileTask('upload', async () => {
                    if (await pickAndUpload(view.workspaceId, view.id)) await load();
                  })
                }
              />
            ) : null}
          </View>
          {view.attachments.length ? (
            view.attachments.map((file) => (
              <FileRow
                key={file.id}
                file={file}
                busy={fileBusy === file.id}
                onOpen={() => void fileTask(file.id, () => openRemoteFile(`/api/attachments/${file.id}`, file.name, file.mimeType))}
              />
            ))
          ) : (
            <Text style={styles.meta}>Aucun fichier joint. Ajoutez un PDF, un document Word, Excel ou une image (10 Mo max).</Text>
          )}
        </View>
      ) : null}

      {tab === 'activite' ? (
        <View style={{ gap: space.sm }}>
          {view.activities.length ? (
            view.activities.map((item) => (
              <View key={item.id} style={styles.activity}>
                <Text style={styles.preview}>{item.message}</Text>
                <Text style={styles.meta}>{formatRelative(item.createdAt)}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.meta}>Aucune activité pour l&apos;instant.</Text>
          )}
        </View>
      ) : null}
    </ScrollView>
  );
}

function SendResults({ shared, links, onClose }: { shared: ShareResult[]; links: InvitationLink[]; onClose: () => void }) {
  return (
    <Card style={{ borderColor: colors.success }}>
      <SectionTitle>Entente envoyée</SectionTitle>
      {shared.length ? (
        shared.map((item) => (
          <Text key={`${item.email}-${item.name}`} style={styles.preview}>
            {item.name} :{' '}
            {item.status === 'notified'
              ? 'déjà inscrit, accès donné et notifié.'
              : item.status === 'emailed'
                ? 'invitation envoyée par courriel.'
                : 'lien à partager ci-dessous.'}
          </Text>
        ))
      ) : (
        <Text style={styles.meta}>Tous les membres avaient déjà reçu l&apos;entente.</Text>
      )}
      {links
        .filter((item) => !item.emailed)
        .map((item) => (
          <Button
            key={item.link}
            label={`Partager le lien pour ${item.email}`}
            variant="secondary"
            onPress={() => Share.share({ message: item.link })}
          />
        ))}
      <Button label="Fermer" variant="ghost" onPress={onClose} />
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.lg },
  meta: { fontSize: 13, color: colors.muted, lineHeight: 18 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  steps: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  stepDone: { backgroundColor: colors.brandSoft, borderColor: colors.brandSoft },
  stepCurrent: { borderColor: colors.brand },
  stepLabel: { fontSize: 12, color: colors.faint, fontWeight: '600' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  recipient: {
    flexDirection: 'row',
    gap: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  recipientName: { fontSize: 13, color: colors.text },
  noEmail: { fontSize: 13, color: colors.danger },
  progressHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  percent: { fontSize: 15, fontWeight: '700', color: colors.brand },
  tabs: { flexDirection: 'row', backgroundColor: '#e9edf3', borderRadius: radius.md, padding: 3 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: radius.sm, alignItems: 'center' },
  tabActive: { backgroundColor: '#fff' },
  tabLabel: { fontSize: 13, color: colors.muted, fontWeight: '600' },
  tabLabelActive: { color: colors.text },
  section: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: space.lg,
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm, alignItems: 'flex-start' },
  sectionTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
  preview: { fontSize: 14, color: colors.text, lineHeight: 20 },
  previewEmpty: { color: colors.faint, fontStyle: 'italic' },
  writer: { fontSize: 13, color: colors.success, fontWeight: '600' },
  fileActions: { flexDirection: 'row', gap: space.sm },
  activity: { gap: 2, paddingVertical: space.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
});
