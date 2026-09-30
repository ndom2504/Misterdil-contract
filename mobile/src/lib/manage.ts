import { Alert } from 'react-native';

import type { SheetAction } from '@/components/color-picker';
import { api, errorMessage } from '@/lib/api';

export function confirmDeleteDocument(document: { id: string; title: string }, onDeleted: () => void) {
  Alert.alert(
    "Supprimer l'entente",
    `« ${document.title} » sera supprimée pour toutes les parties, avec ses sections, commentaires, discussion et fichiers. Cette action est définitive.`,
    [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          api(`/api/mobile/documents/${document.id}`, { method: 'DELETE' })
            .then(onDeleted)
            .catch((reason) => Alert.alert("Supprimer l'entente", errorMessage(reason)));
        },
      },
    ],
  );
}

export function deleteDocumentAction(document: { id: string; title: string }, onDeleted: () => void): SheetAction {
  return {
    label: "Supprimer l'entente",
    hint: 'Définitif, pour toutes les parties',
    icon: 'trash-outline',
    destructive: true,
    onPress: () => confirmDeleteDocument(document, onDeleted),
  };
}

function confirmClear(documentId: string, scope: 'me' | 'all', onCleared: () => void) {
  const forAll = scope === 'all';
  Alert.alert(
    forAll ? "Supprimer l'historique pour tous" : "Effacer l'historique",
    forAll
      ? 'Tous les messages et fichiers de la discussion seront supprimés pour toutes les parties. Cette action est définitive.'
      : 'Les messages actuels disparaîtront de votre écran uniquement. Les autres parties les verront toujours.',
    [
      { text: 'Annuler', style: 'cancel' },
      {
        text: forAll ? 'Supprimer' : 'Effacer',
        style: 'destructive',
        onPress: () => {
          api(`/api/mobile/documents/${documentId}/messages/clear`, { method: 'POST', body: { scope } })
            .then(onCleared)
            .catch((reason) => Alert.alert('Historique', errorMessage(reason)));
        },
      },
    ],
  );
}

export function historyActions(documentId: string, canManage: boolean, onCleared: () => void): SheetAction[] {
  const actions: SheetAction[] = [
    {
      label: "Effacer l'historique pour moi",
      hint: 'Les autres parties gardent les messages',
      icon: 'eye-off-outline',
      onPress: () => confirmClear(documentId, 'me', onCleared),
    },
  ];
  if (canManage) {
    actions.push({
      label: "Supprimer l'historique pour tous",
      hint: 'Messages et fichiers, pour toutes les parties',
      icon: 'trash-outline',
      destructive: true,
      onPress: () => confirmClear(documentId, 'all', onCleared),
    });
  }
  return actions;
}
