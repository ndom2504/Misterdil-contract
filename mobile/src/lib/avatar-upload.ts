import * as ImagePicker from 'expo-image-picker';

import { api } from '@/lib/api';
import { formFile, uploadDirect } from '@/lib/upload';

const MAX = 10 * 1024 * 1024;

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
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.6 };
  const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets.length) return false;
  const asset = result.assets[0];
  const type = asset.mimeType && ['image/jpeg', 'image/png', 'image/webp'].includes(asset.mimeType) ? asset.mimeType : 'image/jpeg';
  const extension = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
  if (asset.fileSize && asset.fileSize > MAX) throw new Error("L'image dépasse 10 Mo.");

  const file = { uri: asset.uri, name: `photo.${extension}`, mimeType: type, size: asset.fileSize };
  const pathname = await uploadDirect(file, { purpose: 'avatar' });
  if (pathname) {
    await api('/api/avatar', { method: 'POST', body: { pathname } });
  } else {
    const form = new FormData();
    form.append('file', formFile(file));
    await api('/api/avatar', { method: 'POST', form });
  }
  return true;
}

export async function deleteAvatar() {
  await api('/api/avatar', { method: 'DELETE' });
}
