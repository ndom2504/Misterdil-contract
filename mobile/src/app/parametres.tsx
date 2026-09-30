import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text } from 'react-native';

import { Button, Card, Field, Message, SectionTitle } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors, space } from '@/lib/theme';

export default function Settings() {
  const { me, refresh } = useAuth();
  const user = me?.user;
  const company = user?.organization && user.organization.kind !== 'INDIVIDUAL';
  const [name, setName] = useState(user?.name ?? '');
  const [jobTitle, setJobTitle] = useState(user?.jobTitle ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [organization, setOrganization] = useState(user?.organization?.name ?? '');
  const [profileState, setProfileState] = useState<{ saving: boolean; error: string; done: boolean }>({ saving: false, error: '', done: false });

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordState, setPasswordState] = useState<{ saving: boolean; error: string; done: boolean }>({ saving: false, error: '', done: false });

  if (!user) return null;

  async function saveProfile() {
    setProfileState({ saving: true, error: '', done: false });
    try {
      await api('/api/mobile/profile', { method: 'PUT', body: { name, jobTitle, phone, organization } });
      await refresh();
      setProfileState({ saving: false, error: '', done: true });
    } catch (reason) {
      setProfileState({ saving: false, error: errorMessage(reason), done: false });
    }
  }

  async function savePassword() {
    if (next !== confirm) {
      setPasswordState({ saving: false, error: 'Les deux nouveaux mots de passe ne correspondent pas.', done: false });
      return;
    }
    setPasswordState({ saving: true, error: '', done: false });
    try {
      await api('/api/mobile/profile/password', { method: 'POST', body: { current, next } });
      setCurrent('');
      setNext('');
      setConfirm('');
      setPasswordState({ saving: false, error: '', done: true });
    } catch (reason) {
      setPasswordState({ saving: false, error: errorMessage(reason), done: false });
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card>
          <SectionTitle>Informations</SectionTitle>
          <Field label="Nom complet" value={name} onChangeText={setName} autoComplete="name" />
          <Field label="Fonction" value={jobTitle} onChangeText={setJobTitle} placeholder="Ex. Directrice des opérations" />
          <Field label="Téléphone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" />
          {company ? <Field label="Organisation" value={organization} onChangeText={setOrganization} /> : null}
          <Text style={styles.meta}>Courriel : {user.email}</Text>
          <Message text={profileState.error} />
          {profileState.done ? <Message tone="success" text="Profil enregistré." /> : null}
          <Button label="Enregistrer" onPress={saveProfile} loading={profileState.saving} />
        </Card>

        <Card>
          <SectionTitle>Mot de passe</SectionTitle>
          <Field label="Mot de passe actuel" value={current} onChangeText={setCurrent} secureTextEntry autoComplete="current-password" />
          <Field
            label="Nouveau mot de passe"
            value={next}
            onChangeText={setNext}
            secureTextEntry
            autoComplete="new-password"
            hint="Au moins 8 caractères."
          />
          <Field label="Confirmer le nouveau mot de passe" value={confirm} onChangeText={setConfirm} secureTextEntry autoComplete="new-password" />
          <Message text={passwordState.error} />
          {passwordState.done ? <Message tone="success" text="Mot de passe modifié." /> : null}
          <Button
            label="Changer le mot de passe"
            variant="secondary"
            onPress={savePassword}
            loading={passwordState.saving}
            disabled={!current || next.length < 8}
          />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.lg },
  meta: { fontSize: 13, color: colors.muted },
});
