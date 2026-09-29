import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, Chip, Field, Loading, Message, SectionTitle } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { partyLabel, roleLabel } from '@/lib/format';
import { colors, radius, space } from '@/lib/theme';
import type { Catalog, PartyInput, PersonMatch } from '@/lib/types';

const EMPTY: PartyInput = {
  name: '',
  organization: '',
  partyType: 'PROVIDER',
  email: '',
  phone: '',
  representative: '',
  jobTitle: '',
  address: '',
  accessRole: 'PARTICIPANT',
};

export default function NewAgreement() {
  const { me } = useAuth();
  const user = me?.user;
  const individual = user?.organization?.kind === 'INDIVIDUAL';
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [step, setStep] = useState<0 | 1>(0);
  const [parties, setParties] = useState<PartyInput[]>(() => [
    {
      ...EMPTY,
      name: user?.name ?? '',
      organization: individual ? '' : user?.organization?.name ?? '',
      partyType: 'CLIENT',
      email: user?.email ?? '',
      phone: user?.phone ?? '',
      representative: user?.name ?? '',
      jobTitle: individual ? '' : user?.jobTitle ?? '',
      address: user?.organization?.address ?? '',
      accessRole: 'MODERATOR',
    },
  ]);
  const [form, setForm] = useState<PartyInput>(EMPTY);
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<PersonMatch[]>([]);
  const [typeId, setTypeId] = useState('');
  const [title, setTitle] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Catalog>('/api/mobile/catalog')
      .then((data) => {
        setCatalog(data);
        setWorkspaceId(data.workspaces[0]?.id ?? '');
      })
      .catch((reason) => setError(errorMessage(reason)));
  }, []);

  useEffect(() => {
    const text = query.trim();
    if (text.length < 2) {
      setMatches([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      api<{ people: PersonMatch[] }>(`/api/mobile/people?q=${encodeURIComponent(text)}`, { signal: controller.signal })
        .then((data) => setMatches(data.people.filter((person) => !parties.some((party) => party.email === person.email))))
        .catch(() => {});
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, parties]);

  function addParty(party: PartyInput) {
    setParties((current) => [...current, party]);
    setForm(EMPTY);
    setQuery('');
    setMatches([]);
  }

  function addMatch(person: PersonMatch) {
    addParty({
      ...EMPTY,
      name: person.name,
      organization: person.organization,
      email: person.email,
      phone: person.phone,
      representative: person.name,
      jobTitle: person.jobTitle,
    });
  }

  async function create() {
    setError('');
    setBusy(true);
    try {
      const result = await api<{ ok: true; id: string }>('/api/mobile/documents', {
        method: 'POST',
        body: { workspaceId, typeId, title, parties },
      });
      router.back();
      router.push(`/documents/${result.id}`);
    } catch (reason) {
      setError(errorMessage(reason));
      setBusy(false);
    }
  }

  if (!catalog) return error ? <View style={{ padding: space.lg }}><Message text={error} /></View> : <Loading />;

  const formValid = (form.name.trim() || form.organization.trim()).length > 1;
  const email = form.email.trim();
  const emailValid = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.steps}>
          {['Équipe', 'Type'].map((label, index) => (
            <View key={label} style={[styles.step, step === index && styles.stepActive]}>
              <Text style={[styles.stepLabel, step === index && { color: colors.brand }]}>
                {index + 1}. {label}
              </Text>
            </View>
          ))}
        </View>

        {step === 0 ? (
          <>
            <Text style={styles.lead}>Qui participe à l&apos;entente ?</Text>
            {parties.map((party, index) => (
              <Card key={`${party.email}-${index}`} style={styles.party}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.partyName}>
                    {party.organization || party.name}
                    {index === 0 ? <Text style={styles.you}> (vous)</Text> : null}
                  </Text>
                  <Text style={styles.meta}>
                    {partyLabel(party.partyType)} · {roleLabel(party.accessRole)}
                    {party.email ? ` · ${party.email}` : ' · sans courriel'}
                  </Text>
                </View>
                {index > 0 ? (
                  <Pressable
                    accessibilityLabel={`Retirer ${party.name}`}
                    hitSlop={10}
                    onPress={() => setParties((current) => current.filter((_, position) => position !== index))}>
                    <Ionicons name="close-circle" size={22} color={colors.faint} />
                  </Pressable>
                ) : null}
              </Card>
            ))}

            <Card style={{ gap: space.md }}>
              <SectionTitle>Ajouter un utilisateur inscrit</SectionTitle>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Nom, organisation ou courriel exact"
                placeholderTextColor={colors.faint}
                autoCapitalize="none"
                style={styles.search}
              />
              {matches.map((person) => (
                <Pressable key={person.id} onPress={() => addMatch(person)} style={styles.match}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.partyName}>{person.name}</Text>
                    <Text style={styles.meta}>{[person.organization, person.email].filter(Boolean).join(' · ')}</Text>
                  </View>
                  <Ionicons name="add-circle-outline" size={22} color={colors.brand} />
                </Pressable>
              ))}
            </Card>

            <Card style={{ gap: space.md }}>
              <SectionTitle>Ou saisir une partie</SectionTitle>
              <Field label="Nom du représentant" value={form.name} onChangeText={(name) => setForm({ ...form, name, representative: name })} />
              <Field label="Organisation" value={form.organization} onChangeText={(organization) => setForm({ ...form, organization })} />
              <Field
                label="Courriel"
                value={form.email}
                onChangeText={(value) => setForm({ ...form, email: value })}
                autoCapitalize="none"
                keyboardType="email-address"
                hint="Nécessaire pour l'inviter. Sans compte, la personne devra s'inscrire."
              />
              <View style={styles.wrap}>
                {catalog.partyTypes.map((item) => (
                  <Chip key={item.id} label={item.label} selected={form.partyType === item.id} onPress={() => setForm({ ...form, partyType: item.id })} />
                ))}
              </View>
              <View style={styles.wrap}>
                {catalog.accessRoles.map((item) => (
                  <Chip key={item.id} label={item.label} selected={form.accessRole === item.id} onPress={() => setForm({ ...form, accessRole: item.id })} />
                ))}
              </View>
              {!emailValid ? <Message text="Ce courriel n'est pas valide." /> : null}
              <Button label="Ajouter la partie" variant="secondary" onPress={() => addParty(form)} disabled={!formValid || !emailValid} />
            </Card>

            <Button label="Continuer" onPress={() => setStep(1)} disabled={parties.length < 2} />
            {parties.length < 2 ? <Text style={styles.center}>Ajoutez au moins une autre partie.</Text> : null}
          </>
        ) : (
          <>
            <Text style={styles.lead}>Quel type d&apos;entente ?</Text>
            <View style={{ gap: space.sm }}>
              {catalog.types.map((type) => (
                <Pressable
                  key={type.id}
                  onPress={() => {
                    setTypeId(type.id);
                    if (!title.trim() || catalog.types.some((item) => item.label === title)) setTitle(type.label);
                  }}
                  style={[styles.type, typeId === type.id && styles.typeActive]}>
                  <Text style={styles.partyName}>{type.label}</Text>
                  <Text style={styles.meta} numberOfLines={2}>
                    {type.description}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Field label="Titre de l'entente" value={title} onChangeText={setTitle} />
            {catalog.workspaces.length > 1 ? (
              <View style={{ gap: space.sm }}>
                <SectionTitle>Espace</SectionTitle>
                <View style={styles.wrap}>
                  {catalog.workspaces.map((workspace) => (
                    <Chip key={workspace.id} label={workspace.name} selected={workspaceId === workspace.id} onPress={() => setWorkspaceId(workspace.id)} />
                  ))}
                </View>
              </View>
            ) : null}
            <Message text={error} />
            <Message tone="info" text="Les sections de l'entente seront créées vides. Vous pourrez les rédiger, puis envoyer l'entente aux membres." />
            <View style={styles.row}>
              <Button label="Retour" variant="secondary" onPress={() => setStep(0)} style={{ flex: 1 }} />
              <Button label="Créer l'entente" onPress={create} loading={busy} disabled={!typeId} style={{ flex: 2 }} />
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.xl * 2 },
  steps: { flexDirection: 'row', gap: space.sm },
  step: { flex: 1, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, paddingVertical: 8, alignItems: 'center' },
  stepActive: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  stepLabel: { fontSize: 13, fontWeight: '600', color: colors.faint },
  lead: { fontSize: 18, fontWeight: '700', color: colors.text },
  party: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  partyName: { fontSize: 15, fontWeight: '600', color: colors.text },
  you: { fontWeight: '400', color: colors.faint },
  meta: { fontSize: 13, color: colors.muted, lineHeight: 18 },
  search: {
    minHeight: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.md,
    fontSize: 16,
    color: colors.text,
  },
  match: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 6 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  center: { textAlign: 'center', color: colors.faint, fontSize: 13 },
  type: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: 4,
  },
  typeActive: { borderColor: colors.brand, backgroundColor: '#f7faff' },
  row: { flexDirection: 'row', gap: space.sm },
});
