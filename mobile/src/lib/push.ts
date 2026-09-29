import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { api } from '@/lib/api';

let registered: string | null = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
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
  }
  const current = await Notifications.getPermissionsAsync();
  const status = current.status === 'granted' ? current.status : (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return;

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  if (token === registered) return;
  await api('/api/mobile/push', { method: 'POST', body: { token, platform: Platform.OS } });
  registered = token;
}

export async function forgetPushToken() {
  if (!registered) return;
  const token = registered;
  registered = null;
  await api('/api/mobile/push', { method: 'DELETE', body: { token } }).catch(() => {});
}
