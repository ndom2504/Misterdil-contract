import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Text style={styles.logoLetter}>M</Text>
            </View>
            <Text style={styles.title}>Misterdil</Text>
            <Text style={styles.subtitle}>Vos ententes, rédigées ensemble.</Text>
          </View>

          <View style={styles.panel}>
            {pendingInvitation ? <Message tone="info" text="Connectez-vous pour rejoindre l'entente à laquelle vous êtes invité." /> : null}
            <Field
              label="Courriel"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              placeholder="vous@entreprise.com"
            />
            <Field
              label="Mot de passe"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              textContentType="password"
              onSubmitEditing={submit}
            />
            <Message text={error} />
            <Button label="Se connecter" onPress={submit} loading={busy === 'password'} disabled={!email || !password || busy === 'microsoft'} />
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
          </View>

          <Link href="/inscription" style={styles.link}>
            Pas encore de compte ? <Text style={{ fontWeight: '700' }}>Créer un compte</Text>
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navy },
  content: { flexGrow: 1, justifyContent: 'center', padding: space.xl, gap: space.xl },
  brand: { alignItems: 'center', gap: space.sm },
  logo: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  logoLetter: { color: '#fff', fontSize: 32, fontWeight: '800' },
  title: { color: '#fff', fontSize: 28, fontWeight: '800' },
  subtitle: { color: '#b9c6da', fontSize: 15 },
  panel: { backgroundColor: '#fff', borderRadius: 24, padding: space.xl, gap: space.lg },
  divider: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  or: { color: colors.faint, fontSize: 13 },
  link: { color: '#dbe5f5', textAlign: 'center', fontSize: 15 },
});
