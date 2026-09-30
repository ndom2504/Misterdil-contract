import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Message, SectionTitle } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { formatRelative, partyLabel } from '@/lib/format';
import { colors, space } from '@/lib/theme';
import type { DocumentView } from '@/lib/types';

type Action = 'request-validation' | 'approve' | 'send-signature' | 'sign';

export function SignaturePanel({ view, onChanged }: { view: DocumentView; onChanged: () => Promise<void> }) {
  const [busy, setBusy] = useState<string>('');
  const [error, setError] = useState('');

  const moderator = view.access.canValidate;
  const myApproval = view.approvals.find((item) => item.userId === view.currentUserId);
  const mySignature = view.signatures.find((item) => item.canSign);
  const signed = view.signatures.filter((item) => item.status === 'SIGNED').length;

  async function run(action: Action, signatureId?: string) {
    setBusy(signatureId ?? action);
    setError('');
    try {
      await api(`/api/mobile/documents/${view.id}/workflow`, { method: 'POST', body: { action, signatureId } });
      await onChanged();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy('');
    }
  }

  function confirmSign(signatureId: string) {
    Alert.alert(
      'Signer l’entente',
      `En signant, vous acceptez la version finale de « ${view.title} » au nom de votre partie. Cette action est définitive.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Signer', onPress: () => void run('sign', signatureId) },
      ],
    );
  }

  let step: string;
  if (view.status === 'FINAL') step = 'Entente signée par toutes les parties.';
  else if (view.signatures.length) step = `Signatures : ${signed}/${view.signatures.length}.`;
  else if (view.approvals.length) step = view.partiesApproved ? 'Toutes les parties ont validé. Prête pour la signature.' : 'Validation finale en cours.';
  else if (view.readyForFinal) step = 'Toutes les sections sont validées. La validation finale peut être demandée.';
  else step = 'Toutes les sections doivent être validées avant la validation finale et la signature.';

  return (
    <Card style={view.status === 'FINAL' ? { borderColor: colors.success } : undefined}>
      <View style={styles.head}>
        <Ionicons
          name={view.status === 'FINAL' ? 'checkmark-done-circle' : 'create-outline'}
          size={20}
          color={view.status === 'FINAL' ? colors.success : colors.brand}
        />
        <SectionTitle>Validation et signature</SectionTitle>
      </View>
      <Text style={styles.meta}>{step}</Text>
      <Message text={error} />

      {view.approvals.length && !view.signatures.length ? (
        <View style={styles.list}>
          {view.approvals.map((item) => (
            <Row
              key={item.id}
              name={item.name}
              detail={item.roleLabel}
              done={item.status === 'APPROVED'}
              doneLabel={item.decidedAt ? `Validé ${formatRelative(item.decidedAt)}` : 'Validé'}
              pendingLabel="En attente"
            />
          ))}
        </View>
      ) : null}

      {view.signatures.length ? (
        <View style={styles.list}>
          {view.signatures.map((item) => (
            <Row
              key={item.id}
              name={item.organization || item.name}
              detail={partyLabel(item.partyType)}
              done={item.status === 'SIGNED'}
              doneLabel={item.signedAt ? `Signé par ${item.signerName} ${formatRelative(item.signedAt)}` : 'Signé'}
              pendingLabel="Signature requise"
            />
          ))}
        </View>
      ) : null}

      {moderator && view.readyForFinal && !view.approvals.length && !view.signatures.length ? (
        <Button label="Demander la validation finale" loading={busy === 'request-validation'} onPress={() => void run('request-validation')} />
      ) : null}
      {myApproval && myApproval.status !== 'APPROVED' && !view.signatures.length ? (
        <Button label="Je valide l’entente" loading={busy === 'approve'} onPress={() => void run('approve')} />
      ) : null}
      {moderator && view.partiesApproved && !view.signatures.length ? (
        <Button label="Envoyer en signature" loading={busy === 'send-signature'} onPress={() => void run('send-signature')} />
      ) : null}
      {mySignature ? (
        <Button
          label="Signer l’entente"
          icon={<Ionicons name="finger-print-outline" size={18} color="#fff" />}
          loading={busy === mySignature.id}
          onPress={() => confirmSign(mySignature.id)}
        />
      ) : null}
    </Card>
  );
}

function Row({ name, detail, done, doneLabel, pendingLabel }: { name: string; detail: string; done: boolean; doneLabel: string; pendingLabel: string }) {
  return (
    <View style={styles.row}>
      <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={done ? colors.success : colors.faint} />
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.meta}>
          {detail} · {done ? doneLabel : pendingLabel}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  meta: { fontSize: 13, color: colors.muted, lineHeight: 18 },
  list: { gap: space.sm, marginVertical: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
});
