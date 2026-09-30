import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Button, Card, SectionTitle } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { chooseAvatar, deleteAvatar } from '@/lib/avatar-upload';
import { API_URL } from '@/lib/config';
import { colors, space } from '@/lib/theme';

export default function Profile() {
  const { me, signOut, refresh } = useAuth();
  const [uploading, setUploading] = useState(false);
  if (!me) return null;
  const { user } = me;

  async function change(task: () => Promise<unknown>) {
    setUploading(true);
    try {
      await task();
      await refresh();
    } catch (reason) {
      Alert.alert('Photo de profil', errorMessage(reason));
    } finally {
      setUploading(false);
    }
  }

  function editPhoto() {
    const buttons = [
      { text: 'Choisir dans la galerie', onPress: () => void change(() => chooseAvatar('library')) },
      { text: 'Prendre une photo', onPress: () => void change(() => chooseAvatar('camera')) },
      ...(user.avatarUrl ? [{ text: 'Retirer la photo', style: 'destructive' as const, onPress: () => void change(deleteAvatar) }] : []),
      { text: 'Annuler', style: 'cancel' as const },
    ];
    Alert.alert('Photo de profil', 'Elle est visible par les parties prenantes de vos ententes.', buttons);
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Modifier la photo de profil" onPress={editPhoto} disabled={uploading}>
          <Avatar name={user.name} url={user.avatarUrl} size={92} />
          <View style={styles.cameraBadge}>
            {uploading ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="camera" size={16} color="#fff" />}
          </View>
        </Pressable>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.meta}>{user.email}</Text>
      </View>

      <Card>
        <View style={styles.cardHead}>
          <SectionTitle>Profil</SectionTitle>
          <Pressable hitSlop={10} onPress={() => router.push('/parametres')}>
            <Text style={styles.link}>Modifier</Text>
          </Pressable>
        </View>
        <Row label={user.organization?.kind === 'INDIVIDUAL' ? 'Type' : 'Organisation'} value={user.organization?.kind === 'INDIVIDUAL' ? 'Personne physique' : user.organization?.name ?? ''} />
        <Row label="Fonction" value={user.jobTitle} />
        <Row label="Téléphone" value={user.phone} />
      </Card>

      <Card style={{ padding: 0, gap: 0 }}>
        <MenuItem icon="settings-outline" label="Paramètres du profil" onPress={() => router.push('/parametres')} />
        <MenuItem icon="folder-open-outline" label="Mes espaces" onPress={() => router.push('/espaces')} />
        <MenuItem icon="notifications-outline" label="Notifications" badge={me.unread} onPress={() => router.push('/notifications')} last />
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

function MenuItem({
  icon,
  label,
  badge,
  last,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  badge?: number;
  last?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.menuItem, !last && styles.menuDivider, pressed && { opacity: 0.7 }]}>
      <Ionicons name={icon} size={20} color={colors.brand} />
      <Text style={styles.menuLabel}>{label}</Text>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={18} color={colors.faint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.lg },
  header: { alignItems: 'center', gap: 4, paddingVertical: space.lg },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.background,
  },
  name: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: space.sm },
  meta: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  link: { color: colors.brand, fontWeight: '600', fontSize: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md, paddingVertical: 4 },
  value: { fontSize: 14, color: colors.text, fontWeight: '500', flexShrink: 1, textAlign: 'right' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md + 2 },
  menuDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  menuLabel: { flex: 1, fontSize: 15, color: colors.text, fontWeight: '500' },
  badge: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  server: { fontSize: 12, color: colors.faint, textAlign: 'center' },
});
