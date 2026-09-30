import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthStage } from '@/components/auth-stage';
import { Button, Field, Message } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors, space } from '@/lib/theme';

export default function SignIn() {
  const { signIn, signInWithMicrosoft, pendingInvitation } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'' | 'password' | 'microsoft'>('');

  async function submit() {
    setError('');
    setBusy('password');
    try {
      await signIn(email.trim(), password);
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
      title="Connectez-vous à votre espace"
      subtitle="Accédez à vos projets et collaborez avec votre réseau en toute sécurité."
      footer={
        <Text style={styles.footer}>
          Vous n'avez pas de compte ?{' '}
          <Link href="/inscription" style={styles.footerLink}>
            Créer un compte
          </Link>
        </Text>
      }>
      {pendingInvitation ? <Message tone="info" text="Connectez-vous pour rejoindre l'entente à laquelle vous êtes invité." /> : null}
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
        autoComplete="password"
        textContentType="password"
        placeholder="Votre mot de passe"
        onSubmitEditing={submit}
      />
      <Message text={error} />
      <Button label="Se connecter →" onPress={submit} loading={busy === 'password'} disabled={!email || !password || busy === 'microsoft'} />
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
