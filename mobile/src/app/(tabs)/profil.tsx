import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, SectionTitle } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { API_URL } from '@/lib/config';
import { colorFor, initials } from '@/lib/format';
import { colors, space } from '@/lib/theme';

export default function Profile() {
  const { me, signOut } = useAuth();
  if (!me) return null;
  const { user } = me;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: colorFor(user.name) }]}>
          <Text style={styles.avatarText}>{initials(user.name)}</Text>
        </View>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.meta}>{user.email}</Text>
      </View>

      <Card>
        <SectionTitle>Profil</SectionTitle>
        <Row label={user.organization?.kind === 'INDIVIDUAL' ? 'Type' : 'Organisation'} value={user.organization?.kind === 'INDIVIDUAL' ? 'Personne physique' : user.organization?.name ?? ''} />
        {user.jobTitle ? <Row label="Fonction" value={user.jobTitle} /> : null}
        {user.phone ? <Row label="Téléphone" value={user.phone} /> : null}
      </Card>

      <Card>
        <SectionTitle>Microsoft 365</SectionTitle>
        <Text style={styles.meta}>
          {me.microsoftEmail
            ? `Connecté avec ${me.microsoftEmail}. Les invitations partent de votre Outlook.`
            : "Non connecté. Les invitations sont partagées par lien jusqu'à la connexion de votre compte Microsoft."}
        </Text>
      </Card>

      <Button label="Se déconnecter" variant="danger" onPress={signOut} />
      <Text style={styles.server}>Serveur : {API_URL}</Text>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.meta}>{label}</Text>
      <Text style={styles.value}>{value || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.lg },
  header: { alignItems: 'center', gap: 4, paddingVertical: space.lg },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
  avatarText: { color: '#fff', fontSize: 26, fontWeight: '700' },
  name: { fontSize: 20, fontWeight: '700', color: colors.text },
  meta: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md, paddingVertical: 4 },
  value: { fontSize: 14, color: colors.text, fontWeight: '500', flexShrink: 1, textAlign: 'right' },
  server: { fontSize: 12, color: colors.faint, textAlign: 'center' },
});
