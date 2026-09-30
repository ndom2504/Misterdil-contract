import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { absoluteUrl, api, authHeaders } from '@/lib/api';

const MAX_UPLOAD = 10 * 1024 * 1024;
const ACCEPTED = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg', 'webp'];

function safeName(name: string) {
  return name.replace(/[\\/:*?"<>|]+/g, '_').trim() || 'document';
}

// Files are private: they are downloaded with the session token, then handed to the system share sheet.
export async function openRemoteFile(path: string, name: string, mimeType: string) {
  if (Platform.OS === 'web') throw new Error("L'ouverture des fichiers est disponible dans l'application mobile.");
  const folder = new Directory(Paths.cache, 'misterdil');
  folder.create({ idempotent: true, intermediates: true });
  const file = await File.downloadFileAsync(absoluteUrl(path), new File(folder, safeName(name)), {
    headers: authHeaders(),
    idempotent: true,
  });
  if (!(await Sharing.isAvailableAsync())) throw new Error("Le partage n'est pas disponible sur cet appareil.");
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: name });
}

export function ententePdf(documentId: string, title: string) {
  return openRemoteFile(`/api/documents/${documentId}/export?format=pdf`, `${safeName(title)}.pdf`, 'application/pdf');
}

// Returns false when the user cancels the picker.
export async function pickAndUpload(workspaceId: string, documentId: string) {
  const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
  if (result.canceled || !result.assets?.length) return false;
  const asset = result.assets[0];
  const extension = asset.name.split('.').pop()?.toLowerCase() ?? '';
  if (!ACCEPTED.includes(extension)) throw new Error('Type de fichier non accepté (PDF, Word, Excel ou image).');
  if (asset.size && asset.size > MAX_UPLOAD) throw new Error('Le fichier dépasse 10 Mo.');

  const form = new FormData();
  form.append('workspaceId', workspaceId);
  form.append('documentId', documentId);
  form.append('file', { uri: asset.uri, name: asset.name, type: asset.mimeType ?? 'application/octet-stream' } as unknown as Blob);
  await api('/api/attachments', { method: 'POST', form });
  return true;
}
