import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { formatRelative, initials, roleLabel } from '@/lib/format';
import { colors, radius, space } from '@/lib/theme';
import type { DocumentView, PresenceEntry } from '@/lib/types';

export type BubblePerson = {
  key: string;
  name: string;
  organization: string;
  role: string;
  state: 'online' | 'offline' | 'invited' | 'draft';
  detail: string;
  isYou: boolean;
  avatarUrl?: string;
};

export function buildPeople(view: DocumentView, presence: PresenceEntry[]): BubblePerson[] {
  const byUser = new Map(presence.map((entry) => [entry.userId, entry]));
  const sectionTitle = (id: string | null) => view.sections.find((section) => section.id === id)?.title ?? '';
  const people: BubblePerson[] = [];
  const seen = new Set<string>();

  const describe = (entry: PresenceEntry | undefined) => {
    if (!entry) return { state: 'offline' as const, detail: 'Pas encore venu sur ce document' };
    if (entry.online) {
      const title = sectionTitle(entry.sectionId);
      return { state: 'online' as const, detail: title ? `En ligne · modifie « ${title} »` : 'En ligne' };
    }
    return { state: 'offline' as const, detail: `Vu ${formatRelative(entry.lastSeenAt)}` };
  };

  for (const party of view.stakeholders) {
    const role = `${roleLabel(party.accessRole)}`;
    if (party.userId) {
      seen.add(party.userId);
      const entry = byUser.get(party.userId);
      people.push({
        key: party.id,
        name: party.representative || party.name,
        organization: party.organization,
        role,
        ...describe(entry),
        isYou: party.userId === view.currentUserId,
        avatarUrl: party.avatarUrl || entry?.avatarUrl,
      });
      continue;
    }
    people.push({
      key: party.id,
      name: party.representative || party.name,
      organization: party.organization,
      role,
      state: party.invitedAt ? 'invited' : 'draft',
      detail: party.invitedAt
        ? "Invitation envoyée, en attente d'inscription"
        : party.email
          ? "Sera invité à l'envoi de l'entente"
          : 'Sans courriel : ajoutez-en un pour l’inviter',
      isYou: false,
    });
  }

  if (view.moderatorId && !seen.has(view.moderatorId)) {
    seen.add(view.moderatorId);
    const entry = byUser.get(view.moderatorId);
    people.unshift({
      key: `moderator-${view.moderatorId}`,
      name: view.moderatorName,
      organization: '',
      role: 'Modérateur',
      ...describe(entry),
      isYou: view.moderatorId === view.currentUserId,
      avatarUrl: view.moderatorAvatar || entry?.avatarUrl,
    });
  }

  for (const entry of presence) {
    if (seen.has(entry.userId) || !entry.online) continue;
    people.push({
      key: `presence-${entry.userId}`,
      name: entry.name,
      organization: entry.organization,
      role: entry.jobTitle,
      ...describe(entry),
      isYou: entry.userId === view.currentUserId,
      avatarUrl: entry.avatarUrl,
    });
  }
  return people;
}

export function PresenceBubbles({ people, max = 6 }: { people: BubblePerson[]; max?: number }) {
  const [open, setOpen] = useState<BubblePerson | null>(null);
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  const online = people.filter((person) => person.state === 'online').length;

  return (
    <View style={styles.row}>
      <View style={styles.stack}>
        {shown.map((person, index) => {
          const pending = person.state === 'invited' || person.state === 'draft';
          return (
            <Pressable
              key={person.key}
              accessibilityRole="button"
              accessibilityLabel={`${person.name} — ${person.detail}`}
              onPress={() => setOpen(person)}
              style={[styles.bubble, { marginLeft: index === 0 ? 0 : -10 }, pending && styles.bubblePending]}>
              {pending ? (
                <Text style={[styles.initials, { color: colors.muted }]}>{initials(person.name)}</Text>
              ) : (
                <Avatar name={person.name} url={person.avatarUrl} size={32} />
              )}
              {!pending ? (
                <View style={[styles.dot, { backgroundColor: person.state === 'online' ? colors.success : '#b8bfc9' }]} />
              ) : null}
            </Pressable>
          );
        })}
        {extra > 0 ? (
          <View style={[styles.bubble, styles.more, { marginLeft: -10 }]}>
            <Text style={[styles.initials, { color: colors.muted }]}>+{extra}</Text>
          </View>
        ) : null}
      </View>
      {online ? <Text style={styles.online}>{online} en ligne</Text> : null}

      <Modal transparent visible={Boolean(open)} animationType="fade" onRequestClose={() => setOpen(null)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(null)}>
          {open ? (
            <View style={styles.popover}>
              <View style={styles.popHead}>
                {open.state === 'invited' || open.state === 'draft' ? null : <Avatar name={open.name} url={open.avatarUrl} size={44} />}
                <View style={{ flex: 1 }}>
                  <Text style={styles.popName}>
                    {open.name}
                    {open.isYou ? <Text style={styles.popYou}> (vous)</Text> : null}
                  </Text>
                  {open.organization ? <Text style={styles.popMeta}>{open.organization}</Text> : null}
                  {open.role ? <Text style={styles.popMeta}>{open.role}</Text> : null}
                </View>
              </View>
              <View style={styles.popStatus}>
                <View
                  style={[
                    styles.popDot,
                    { backgroundColor: open.state === 'online' ? colors.success : open.state === 'offline' ? '#b8bfc9' : colors.warning },
                  ]}
                />
                <Text style={styles.popDetail}>{open.detail}</Text>
              </View>
            </View>
          ) : null}
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  stack: { flexDirection: 'row', alignItems: 'center' },
  bubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#fff',
  },
  bubblePending: { borderStyle: 'dashed', borderColor: '#b8bfc9' },
  more: { backgroundColor: '#eef1f5' },
  initials: { color: '#fff', fontSize: 13, fontWeight: '700' },
  dot: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  online: { fontSize: 13, color: colors.success, fontWeight: '600' },
  backdrop: { flex: 1, backgroundColor: 'rgba(11,31,58,0.25)', justifyContent: 'center', padding: space.xl },
  popover: { backgroundColor: '#fff', borderRadius: radius.lg, padding: space.lg, gap: 4 },
  popHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  popName: { fontSize: 17, fontWeight: '700', color: colors.text },
  popYou: { fontWeight: '400', color: colors.faint },
  popMeta: { fontSize: 14, color: colors.muted },
  popStatus: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm },
  popDot: { width: 8, height: 8, borderRadius: 4 },
  popDetail: { fontSize: 14, color: colors.text, flexShrink: 1 },
});
