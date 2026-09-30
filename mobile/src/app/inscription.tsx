import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthStage } from '@/components/auth-stage';
import { Button, Field, Message } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors, space } from '@/lib/theme';

export default function Register() {
  const { register, signInWithMicrosoft, pendingInvitation } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'' | 'password' | 'microsoft'>('');

  async function submit() {
    setError('');
    setBusy('password');
    try {
      await register(name.trim(), email.trim(), password);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy('');
    }
  }

  async function microsoft() {
    setError('');
    setBusy('microsoft');
    try {
      const problem = await signInWithMicrosoft();
      if (problem) setError(problem);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy('');
    }
  }

  return (
    <AuthStage
      title="Créer un compte"
      subtitle={
        pendingInvitation
          ? "Créez votre compte avec le courriel qui a reçu l'invitation pour participer à l'entente."
          : 'Ouvrez votre espace, puis votre première entente.'
      }
      footer={
        <Text style={styles.footer}>
          Déjà un compte ?{' '}
          <Link href="/connexion" replace style={styles.footerLink}>
            Se connecter
          </Link>
        </Text>
      }>
      <Field label="Nom" value={name} onChangeText={setName} autoComplete="name" textContentType="name" placeholder="Votre nom" />
      <Field
        label="Adresse courriel"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        placeholder="votre@entreprise.com"
      />
      <Field
        label="Mot de passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        placeholder="Au moins 8 caractères"
        onSubmitEditing={submit}
      />
      <Message text={error} />
      <Button
        label="Créer un compte →"
        onPress={submit}
        loading={busy === 'password'}
        disabled={!name || !email || password.length < 8 || busy === 'microsoft'}
      />
      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.or}>ou</Text>
        <View style={styles.line} />
      </View>
      <Button
        label="Continuer avec Microsoft"
        variant="secondary"
        icon={<Ionicons name="logo-windows" size={18} color="#0078d4" />}
        onPress={microsoft}
        loading={busy === 'microsoft'}
        disabled={busy === 'password'}
      />
    </AuthStage>
  );
}

const styles = StyleSheet.create({
  divider: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  or: { color: colors.faint, fontSize: 13 },
  footer: { textAlign: 'center', fontSize: 14, color: colors.muted },
  footerLink: { color: colors.brand, fontWeight: '600' },
});
