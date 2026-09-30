import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { DeadlineBadge } from '@/components/deadline-badge';
import { PickerField } from '@/components/picker-field';
import { Button, Card, Chip, Field, Loading, Message, SectionTitle } from '@/components/ui';
import { addDays, clock, dayLabel, localDay, weekdayLabel } from '@/lib/agenda';
import { api, errorMessage } from '@/lib/api';
import { colors, radius, space } from '@/lib/theme';
import type { AgendaItem, DocumentAgenda } from '@/lib/types';

export function AgendaSection({ documentId, onDueChanged }: { documentId: string; onDueChanged: () => void }) {
  const [agenda, setAgenda] = useState<DocumentAgenda | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [adding, setAdding] = useState(false);
  const [due, setDue] = useState('');
  const [savingDue, setSavingDue] = useState(false);
  const [showPast, setShowPast] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<DocumentAgenda>(`/api/mobile/documents/${documentId}/agenda`);
      setAgenda(data);
      setDue(data.dueDate ?? '');
      setError('');
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }, [documentId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!agenda) return error ? <Message text={error} /> : <Loading />;

  const today = localDay();
  const upcoming = agenda.events.filter((event) => event.day >= today);
  const past = agenda.events.filter((event) => event.day < today).reverse();

  async function saveDue() {
    setSavingDue(true);
    setError('');
    try {
      await api(`/api/mobile/documents/${documentId}/agenda`, { method: 'PATCH', body: { dueDate: due } });
      setAgenda((current) => (current ? { ...current, dueDate: due } : current));
      onDueChanged();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSavingDue(false);
    }
  }

  function remove(event: AgendaItem) {
    Alert.alert(
      event.kind === 'MEETING' ? 'Annuler la rencontre ?' : "Retirer l'échéance ?",
      event.outlook ? 'Les participants invités via Outlook recevront l’annulation.' : event.title,
      [
        { text: 'Garder', style: 'cancel' },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: async () => {
            try {
              await api(`/api/mobile/documents/${documentId}/agenda/${event.id}`, { method: 'DELETE' });
              setAgenda((current) => (current ? { ...current, events: current.events.filter((item) => item.id !== event.id) } : current));
            } catch (reason) {
              setError(errorMessage(reason));
            }
          },
        },
      ],
    );
  }

  return (
    <View style={{ gap: space.md }}>
      <Card>
        <SectionTitle>Échéance de l&apos;entente</SectionTitle>
        {agenda.dueDate ? (
          <>
            <Text style={styles.dueDate}>{dayLabel(agenda.dueDate)}</Text>
            <DeadlineBadge dueDate={agenda.dueDate} status={agenda.status} />
          </>
        ) : (
          <Text style={styles.meta}>Aucune échéance fixée.</Text>
        )}
        {agenda.canEditDue ? (
          <View style={styles.dueEdit}>
            <PickerField label="Modifier" mode="date" value={due} onChange={setDue} minimumDay={today} />
            <Button label="Enregistrer" variant="secondary" onPress={saveDue} loading={savingDue} disabled={!due || due === agenda.dueDate} />
          </View>
        ) : null}
      </Card>

      <Message text={error} />
      <Message tone="warning" text={notice} />

      {agenda.canAdd ? (
        adding ? (
          <EventForm
            documentId={documentId}
            onCancel={() => setAdding(false)}
            onCreated={(event, hint) => {
              setAgenda((current) =>
                current ? { ...current, events: [...current.events, event].sort((a, b) => a.startsAt.localeCompare(b.startsAt)) } : current,
              );
              setAdding(false);
              setNotice(hint);
            }}
          />
        ) : (
          <Button
            label="Planifier une rencontre ou une échéance"
            icon={<Ionicons name="add" size={18} color="#fff" />}
            onPress={() => {
              setAdding(true);
              setNotice('');
            }}
          />
        )
      ) : null}

      <SectionTitle>À venir</SectionTitle>
      {upcoming.length ? (
        upcoming.map((event) => <EventCard key={event.id} event={event} onDelete={() => remove(event)} />)
      ) : (
        <Text style={styles.meta}>Aucune rencontre ni échéance à venir.</Text>
      )}

      {past.length ? (
        <>
          <Pressable onPress={() => setShowPast((value) => !value)} style={styles.pastToggle}>
            <Text style={styles.meta}>Passés ({past.length})</Text>
            <Ionicons name={showPast ? 'chevron-up' : 'chevron-down'} size={16} color={colors.muted} />
          </Pressable>
          {showPast ? past.map((event) => <EventCard key={event.id} event={event} past onDelete={() => remove(event)} />) : null}
        </>
      ) : null}
    </View>
  );
}

function EventCard({ event, past, onDelete }: { event: AgendaItem; past?: boolean; onDelete: () => void }) {
  const meeting = event.kind === 'MEETING';
  const tone = meeting ? { background: colors.brandSoft, text: colors.brand } : { background: '#fff6ed', text: '#b54708' };
  return (
    <Card style={[styles.event, past && { opacity: 0.6 }]}>
      <View style={[styles.dateBlock, { backgroundColor: tone.background }]}>
        <Text style={[styles.weekday, { color: tone.text }]}>{weekdayLabel(event.day)}</Text>
        <Text style={[styles.dayNumber, { color: tone.text }]}>{Number(event.day.slice(8))}</Text>
        <Text style={[styles.weekday, { color: tone.text }]}>{dayLabel(event.day, false).split(' ')[1]}</Text>
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={[styles.kind, { color: tone.text }]}>{meeting ? 'Rencontre' : 'Échéance'}</Text>
        <Text style={styles.title}>{event.title}</Text>
        <Text style={styles.meta}>
          {meeting ? `${clock(event.time)} – ${clock(event.endTime)}` : `Avant ${clock(event.time)}`}
          {event.location ? ` · ${event.location}` : ''} · par {event.createdByName}
        </Text>
        {event.notes ? <Text style={styles.notes}>{event.notes}</Text> : null}
        <View style={styles.row}>
          {event.outlook ? (
            <View style={styles.outlook}>
              <Ionicons name="checkmark-circle" size={13} color={colors.success} />
              <Text style={{ fontSize: 12, color: colors.success }}>Dans Outlook</Text>
            </View>
          ) : null}
          {event.onlineUrl && !past ? (
            <Pressable onPress={() => Linking.openURL(event.onlineUrl)} style={styles.teams}>
              <Ionicons name="videocam" size={13} color="#fff" />
              <Text style={styles.teamsLabel}>Rejoindre Teams</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      {event.canDelete ? (
        <Pressable accessibilityLabel="Retirer" hitSlop={10} onPress={onDelete}>
          <Ionicons name="trash-outline" size={19} color={colors.faint} />
        </Pressable>
      ) : null}
    </Card>
  );
}

function EventForm({
  documentId,
  onCreated,
  onCancel,
}: {
  documentId: string;
  onCreated: (event: AgendaItem, hint: string) => void;
  onCancel: () => void;
}) {
  const today = localDay();
  const [kind, setKind] = useState<'MEETING' | 'DEADLINE'>('MEETING');
  const [title, setTitle] = useState('');
  const [day, setDay] = useState(addDays(today, 1));
  const [time, setTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [online, setOnline] = useState(true);
  const [outlook, setOutlook] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const meeting = kind === 'MEETING';

  function pickKind(next: 'MEETING' | 'DEADLINE') {
    setKind(next);
    if (next === 'DEADLINE' && time === '10:00') setTime('17:00');
    if (next === 'MEETING' && time === '17:00') setTime('10:00');
  }

  async function submit() {
    setBusy(true);
    setError('');
    try {
      const result = await api<{ event: AgendaItem; hint: string }>(`/api/mobile/documents/${documentId}/agenda`, {
        method: 'POST',
        body: { kind, title, notes, location, day, time, endTime, online: meeting && online, outlook },
      });
      onCreated(result.event, result.hint);
    } catch (reason) {
      setError(errorMessage(reason));
      setBusy(false);
    }
  }

  return (
    <Card style={{ gap: space.md }}>
      <View style={styles.row}>
        <Chip label="Rencontre" selected={meeting} onPress={() => pickKind('MEETING')} />
        <Chip label="Échéance" selected={!meeting} onPress={() => pickKind('DEADLINE')} />
      </View>
      <Field
        label={meeting ? 'Objet de la rencontre' : 'Ce qui doit être remis'}
        value={title}
        onChangeText={setTitle}
        placeholder={meeting ? 'Revue des articles 3 à 5' : 'Version révisée des annexes'}
        maxLength={160}
      />
      <PickerField label="Date" mode="date" value={day} onChange={setDay} minimumDay={today} />
      <View style={styles.row}>
        <PickerField label={meeting ? 'Début' : 'Heure limite'} mode="time" value={time} onChange={setTime} />
        {meeting ? <PickerField label="Fin" mode="time" value={endTime} onChange={setEndTime} /> : null}
      </View>
      {meeting ? <Field label="Lieu (facultatif)" value={location} onChangeText={setLocation} maxLength={200} /> : null}
      <Field label="Notes (facultatif)" value={notes} onChangeText={setNotes} multiline maxLength={2000} />
      {meeting ? (
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Réunion Teams (lien de visioconférence)</Text>
          <Switch value={online} onValueChange={setOnline} trackColor={{ true: colors.brand }} />
        </View>
      ) : null}
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>{meeting ? 'Ajouter à mon Outlook et inviter les parties' : 'Rappel dans mon calendrier Outlook'}</Text>
        <Switch value={outlook} onValueChange={setOutlook} trackColor={{ true: colors.brand }} />
      </View>
      <Text style={styles.hint}>Heures de Montréal/Toronto. Outlook est utilisé seulement si votre compte Microsoft est connecté.</Text>
      <Message text={error} />
      <View style={styles.row}>
        <Button label="Annuler" variant="secondary" onPress={onCancel} style={{ flex: 1 }} />
        <Button label={meeting ? 'Planifier' : 'Ajouter'} onPress={submit} loading={busy} disabled={title.trim().length < 2} style={{ flex: 2 }} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  meta: { fontSize: 13, color: colors.muted, lineHeight: 18 },
  hint: { fontSize: 12, color: colors.faint },
  dueDate: { fontSize: 22, fontWeight: '700', color: colors.text },
  dueEdit: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, marginTop: space.sm },
  pastToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  event: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  dateBlock: { width: 54, borderRadius: radius.md, alignItems: 'center', paddingVertical: 6 },
  weekday: { fontSize: 11, textTransform: 'uppercase' },
  dayNumber: { fontSize: 20, fontWeight: '700', lineHeight: 24 },
  kind: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  title: { fontSize: 15, fontWeight: '600', color: colors.text },
  notes: { fontSize: 13, color: colors.text, lineHeight: 18 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm },
  outlook: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  teams: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.brand, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  teamsLabel: { color: '#fff', fontSize: 12, fontWeight: '600' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  switchLabel: { flex: 1, fontSize: 14, color: colors.text },
});
