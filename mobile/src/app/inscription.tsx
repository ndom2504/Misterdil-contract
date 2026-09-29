import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';

import { Button, Card, Field, Message } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { space } from '@/lib/theme';

export default function Register() {
  const { register, pendingInvitation } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError('');
    setBusy(true);
    try {
      await register(name.trim(), email.trim(), password);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {pendingInvitation ? (
          <Message tone="info" text="Créez votre compte avec le courriel qui a reçu l'invitation pour rejoindre l'entente." />
        ) : null}
        <Card style={{ gap: space.lg }}>
          <Field label="Nom complet" value={name} onChangeText={setName} autoComplete="name" textContentType="name" />
          <Field
            label="Courriel"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <Field
            label="Mot de passe"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            hint="Au moins 8 caractères."
          />
          <Message text={error} />
          <Button label="Créer mon compte" onPress={submit} loading={busy} disabled={!name || !email || password.length < 8} />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.lg },
});
