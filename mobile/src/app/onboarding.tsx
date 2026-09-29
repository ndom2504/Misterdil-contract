import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Chip, Field, Message } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors, space } from '@/lib/theme';

export default function Onboarding() {
  const { me, refresh, signOut } = useAuth();
  const [kind, setKind] = useState<'ORGANIZATION' | 'INDIVIDUAL'>('ORGANIZATION');
  const [name, setName] = useState(me?.user.name ?? '');
  const [organization, setOrganization] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [sector, setSector] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError('');
    setBusy(true);
    try {
      await api('/api/mobile/me', {
        method: 'PATCH',
        body: { kind, name, organization, jobTitle, sector, phone, address },
      });
      await refresh();
    } catch (reason) {
      setError(errorMessage(reason));
      setBusy(false);
    }
  }

  const individual = kind === 'INDIVIDUAL';

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.lead}>Pour qui signez-vous vos ententes ?</Text>
        <View style={styles.row}>
          <Chip label="Une organisation" selected={!individual} onPress={() => setKind('ORGANIZATION')} />
          <Chip label="Moi, personne physique" selected={individual} onPress={() => setKind('INDIVIDUAL')} />
        </View>

        <Card style={{ gap: space.lg }}>
          <Field label="Votre nom complet" value={name} onChangeText={setName} />
          {!individual ? (
            <>
              <Field label="Organisation" value={organization} onChangeText={setOrganization} />
              <Field label="Fonction" value={jobTitle} onChangeText={setJobTitle} placeholder="Ex. Directrice générale" />
              <View style={{ gap: space.sm }}>
                <Text style={styles.label}>Secteur</Text>
                <View style={styles.wrap}>
                  {(me?.sectors ?? []).map((item) => (
                    <Chip key={item.id} label={item.label} selected={sector === item.id} onPress={() => setSector(sector === item.id ? '' : item.id)} />
                  ))}
                </View>
              </View>
            </>
          ) : null}
          <Field label="Téléphone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Field label="Adresse" value={address} onChangeText={setAddress} />
          <Message text={error} />
          <Button label="Continuer" onPress={submit} loading={busy} disabled={name.trim().length < 2 || (!individual && organization.trim().length < 2)} />
        </Card>
        <Button label="Se déconnecter" variant="ghost" onPress={signOut} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.lg },
  lead: { fontSize: 17, fontWeight: '600', color: colors.text },
  row: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted },
});
