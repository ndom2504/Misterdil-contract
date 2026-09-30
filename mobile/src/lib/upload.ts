import { File, UploadType } from 'expo-file-system';
import { Platform } from 'react-native';

import { api } from '@/lib/api';

export type LocalFile = { uri: string; name: string; mimeType: string; size?: number | null };
export type UploadTarget = { purpose: 'avatar' | 'chat'; documentId?: string };

type Prepared = { mode: 'direct'; url: string; pathname: string } | { mode: 'form' };

// The server refuses request bodies above 4.5 MB, so the file goes straight to storage with a
// signed URL; the returned pathname is then attached to the avatar or the message.
// Returns null when the server wants the file in a regular form upload instead.
export async function uploadDirect(file: LocalFile, target: UploadTarget): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  const prepared = await api<Prepared>('/api/mobile/uploads', {
    method: 'POST',
    body: { purpose: target.purpose, documentId: target.documentId, name: file.name, size: file.size ?? 0 },
  });
  if (prepared.mode === 'form') return null;
  const result = await new File(file.uri).upload(prepared.url, { httpMethod: 'PUT', uploadType: UploadType.BINARY_CONTENT });
  if (result.status < 200 || result.status >= 300) throw new Error("L'envoi du fichier a échoué. Vérifiez votre connexion et réessayez.");
  return prepared.pathname;
}

export function formFile(file: LocalFile) {
  return { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob;
}
