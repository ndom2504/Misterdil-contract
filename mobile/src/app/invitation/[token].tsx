import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Loading, Message } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { partyLabel } from '@/lib/format';
import { colors, space } from '@/lib/theme';
import type { InvitationPreview } from '@/lib/types';

export default function InvitationScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { status, me, setPendingInvitation } = useAuth();
  const [invitation, setInvitation] = useState<InvitationPreview | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ invitation: InvitationPreview }>(`/api/mobile/invitations/${encodeURIComponent(token)}`)
      .then((data) => setInvitation(data.invitation))
      .catch((reason) => setError(errorMessage(reason)));
  }, [token]);

  async function join() {
    if (!me?.user.onboarded) {
      setPendingInvitation(token);
      router.replace('/onboarding');
      return;
    }
    setBusy(true);
    try {
      const result = await api<{ documentId: string }>(`/api/mobile/invitations/${encodeURIComponent(token)}`, { method: 'POST' });
      router.replace(result.documentId ? `/documents/${result.documentId}` : '/');
    } catch (reason) {
      setError(errorMessage(reason));
      setBusy(false);
    }
  }

  function continueTo(path: '/inscription' | '/connexion') {
    setPendingInvitation(token);
    router.replace(path);
  }

  if (!invitation) return error ? <View style={{ padding: space.lg }}><Message text={error} /></View> : <Loading />;

  const revoked = invitation.status === 'REVOKED';

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>Invitation</Text>
      <Text style={styles.title}>{invitation.inviterName} vous invite à rejoindre une entente</Text>
      {invitation.inviterOrganization ? <Text style={styles.meta}>{invitation.inviterOrganization}</Text> : null}

      <Card>
        <Text style={styles.docTitle}>{invitation.title}</Text>
        {invitation.typeLabel ? <Text style={styles.meta}>{invitation.typeLabel}</Text> : null}
        {invitation.parties.map((party, index) => (
          <Text key={`${party.name}-${index}`} style={styles.party}>
            {party.name}
            {party.organization && party.organization !== party.name ? ` · ${party.organization}` : ''}
            <Text style={styles.meta}> · {partyLabel(party.partyType)}</Text>
          </Text>
        ))}
      </Card>

      <Message text={error} />

      {revoked ? (
        <Message tone="warning" text="Cette invitation a été annulée. Demandez à la personne qui vous a invité de vous renvoyer l'entente." />
      ) : status === 'signedIn' ? (
        <>
          <Text style={styles.meta}>Connecté en tant que {me?.user.email}</Text>
          <Button label={invitation.status === 'ACCEPTED' ? "Ouvrir l'entente" : "Rejoindre l'entente"} onPress={join} loading={busy} />
        </>
      ) : (
        <>
          <Text style={styles.meta}>
            Pour participer, créez votre compte Misterdil avec <Text style={{ fontWeight: '700', color: colors.text }}>{invitation.email}</Text>.
          </Text>
          <Button label="Créer mon compte" onPress={() => continueTo('/inscription')} />
          <Button label="J'ai déjà un compte" variant="secondary" onPress={() => continueTo('/connexion')} />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.lg },
  kicker: { fontSize: 12, fontWeight: '700', color: colors.brand, textTransform: 'uppercase', letterSpacing: 0.8 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  meta: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  docTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  party: { fontSize: 14, color: colors.text },
});
