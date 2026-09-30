import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { api } from '@/lib/api';

let registered: string | null = null;

export const CHIME_CHANNEL = 'misterdil';

// In the foreground the app shows its own pop-up and plays the chime (see ToastHost),
// so the system banner and sound are skipped to avoid a double alert.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: true,
    shouldShowBanner: false,
    shouldShowList: true,
  }),
});

// Remote push needs a development or store build with an EAS project id;
// Expo Go and simulators without push support are skipped quietly.
export async function registerPushToken() {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient || !Device.isDevice) return;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Misterdil',
      importance: Notifications.AndroidImportance.HIGH,
    });
    await Notifications.setNotificationChannelAsync(CHIME_CHANNEL, {
      name: 'Réactions et messages',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'misterdil_pop.wav',
      vibrationPattern: [0, 120, 80, 120],
      lightColor: '#0B51CD',
    });
  }
  const current = await Notifications.getPermissionsAsync();
  const status = current.status === 'granted' ? current.status : (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return;

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  if (token === registered) return;
  // `chime` tells the server this build ships the custom sound and the Android channel.
  await api('/api/mobile/push', { method: 'POST', body: { token, platform: Platform.OS, chime: true } });
  registered = token;
}

export async function forgetPushToken() {
  if (!registered) return;
  const token = registered;
  registered = null;
  await api('/api/mobile/push', { method: 'DELETE', body: { token } }).catch(() => {});
}
