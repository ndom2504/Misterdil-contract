import * as ImagePicker from 'expo-image-picker';

import { api } from '@/lib/api';

// Returns false when the user cancels.
export async function chooseAvatar(source: 'library' | 'camera') {
  const permission =
    source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error(
      source === 'camera'
        ? "L'accès à l'appareil photo est refusé. Autorisez-le dans les réglages du téléphone."
        : "L'accès aux photos est refusé. Autorisez-le dans les réglages du téléphone.",
    );
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 };
  const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets.length) return false;
  const asset = result.assets[0];
  const type = asset.mimeType && ['image/jpeg', 'image/png', 'image/webp'].includes(asset.mimeType) ? asset.mimeType : 'image/jpeg';
  const extension = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
  if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) throw new Error("L'image dépasse 5 Mo.");

  const form = new FormData();
  form.append('file', { uri: asset.uri, name: `photo.${extension}`, type } as unknown as Blob);
  await api('/api/avatar', { method: 'POST', form });
  return true;
}

export async function deleteAvatar() {
  await api('/api/avatar', { method: 'DELETE' });
}
