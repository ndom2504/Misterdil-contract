import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CallRoom } from '@/components/call-room';
import { Button } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { colors, space } from '@/lib/theme';

type Credentials = { url: string; token: string; title: string };

export default function Call() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [error, setError] = useState('');
  const left = useRef(false);

  useEffect(() => {
    api<Credentials & { ok: true }>(`/api/mobile/documents/${id}/call`, { method: 'POST' })
      .then(setCredentials)
      .catch((reason) => setError(errorMessage(reason)));
  }, [id]);

  const leave = useCallback(() => {
    if (left.current) return;
    left.current = true;
    if (router.canGoBack()) router.back();
    else router.replace(`/conversation/${id}`);
  }, [id]);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      {error ? (
        <View style={styles.center}>
          <Ionicons name="call-outline" size={40} color="#fff" />
          <Text style={styles.notice}>{error}</Text>
          <Button label="Retour" variant="secondary" onPress={leave} />
        </View>
      ) : credentials ? (
        <CallRoom url={credentials.url} token={credentials.token} title={credentials.title} onLeave={leave} />
      ) : (
        <View style={styles.center}>
          <ActivityIndicator color="#fff" />
          <Text style={styles.notice}>Préparation de l&apos;appel…</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg, padding: space.xl },
  notice: { color: '#fff', fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
