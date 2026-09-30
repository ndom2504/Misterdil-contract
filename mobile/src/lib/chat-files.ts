import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import { api } from '@/lib/api';
import type { ChatMessage } from '@/lib/types';
import { formFile, uploadDirect, type LocalFile } from '@/lib/upload';

export type ChatFileSource = 'library' | 'camera' | 'document';

const MAX = 25 * 1024 * 1024;
const INLINE_IMAGES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function isInlineImage(type: string) {
  return INLINE_IMAGES.includes(type);
}

function extensionFor(type: string) {
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  if (type === 'image/gif') return 'gif';
  if (type === 'image/heic') return 'heic';
  return 'jpg';
}

// Returns null when the user cancels.
export async function pickChatFile(source: ChatFileSource): Promise<LocalFile | null> {
  let file: LocalFile;
  if (source === 'document') {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
    if (result.canceled || !result.assets?.length) return null;
    const asset = result.assets[0];
    file = { uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? 'application/octet-stream', size: asset.size };
  } else {
    const permission =
      source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      throw new Error(
        source === 'camera'
          ? "L'accès à l'appareil photo est refusé. Autorisez-le dans les réglages du téléphone."
          : "L'accès aux photos est refusé. Autorisez-le dans les réglages du téléphone.",
      );
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7 };
    const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled || !result.assets.length) return null;
    const asset = result.assets[0];
    const type = asset.mimeType ?? 'image/jpeg';
    const name = asset.fileName && asset.fileName.includes('.') ? asset.fileName : `photo-${Date.now()}.${extensionFor(type)}`;
    file = { uri: asset.uri, name, mimeType: type, size: asset.fileSize };
  }
  if (file.size && file.size > MAX) throw new Error('Le fichier dépasse 25 Mo.');
  return file;
}

export async function sendChatFile(documentId: string, file: LocalFile, caption: string) {
  const pathname = await uploadDirect(file, { purpose: 'chat', documentId });
  if (pathname) {
    return api<{ message: ChatMessage }>(`/api/mobile/documents/${documentId}/messages`, {
      method: 'POST',
      body: { body: caption, upload: { pathname, name: file.name } },
    });
  }
  const form = new FormData();
  form.append('body', caption);
  form.append('file', formFile(file));
  return api<{ message: ChatMessage }>(`/api/mobile/documents/${documentId}/messages`, { method: 'POST', form });
}
