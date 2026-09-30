import '@/lib/livekit-setup';

import * as Notifications from 'expo-notifications';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, View } from 'react-native';

import { IntroVideo } from '@/components/intro-video';
import { ToastHost } from '@/components/toast-host';
import { api, errorMessage } from '@/lib/api';
import { AuthProvider, useAuth } from '@/lib/auth';
import { appRoute } from '@/lib/format';
import { registerPushToken } from '@/lib/push';
import { colors } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

const useLastNotificationResponse = Platform.OS === 'web' ? () => null : Notifications.useLastNotificationResponse;

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <RootNavigator />
    </AuthProvider>
  );
}

function RootNavigator() {
  const { status, me, pendingInvitation, setPendingInvitation } = useAuth();
  const signedIn = status === 'signedIn';
  const onboarded = Boolean(me?.user.onboarded);
  const ready = signedIn && onboarded;
  const lastResponse = useLastNotificationResponse();
  const handledResponse = useRef<string | null>(null);
  const [introReady, setIntroReady] = useState(false);
  const [introDone, setIntroDone] = useState(false);

  useEffect(() => {
    if (status !== 'loading' && (introReady || introDone)) SplashScreen.hideAsync();
  }, [status, introReady, introDone]);

  useEffect(() => {
    if (signedIn) registerPushToken().catch(() => {});
  }, [signedIn]);

  useEffect(() => {
    if (!ready || !lastResponse) return;
    const id = lastResponse.notification.request.identifier;
    if (handledResponse.current === id) return;
    handledResponse.current = id;
    const href = lastResponse.notification.request.content.data?.href;
    if (typeof href === 'string') router.push(appRoute(href));
  }, [ready, lastResponse]);

  useEffect(() => {
    if (!ready || !pendingInvitation) return;
    const token = pendingInvitation;
    setPendingInvitation(null);
    api<{ ok: true; documentId: string }>(`/api/mobile/invitations/${encodeURIComponent(token)}`, { method: 'POST' })
      .then((result) => {
        if (result.documentId) router.push(`/documents/${result.documentId}`);
      })
      .catch((error) => Alert.alert('Invitation', errorMessage(error)));
  }, [ready, pendingInvitation, setPendingInvitation]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.navy }}>
      {status !== 'loading' && (
        <Stack
          screenOptions={{
            headerTintColor: colors.brand,
            headerTitleStyle: { color: colors.text },
            headerBackButtonDisplayMode: 'minimal',
            contentStyle: { backgroundColor: colors.background },
          }}>
          <Stack.Protected guard={!signedIn}>
            <Stack.Screen name="connexion" options={{ headerShown: false }} />
            <Stack.Screen name="inscription" options={{ headerShown: false }} />
          </Stack.Protected>
          <Stack.Protected guard={signedIn && !onboarded}>
            <Stack.Screen name="onboarding" options={{ title: 'Votre profil', headerBackVisible: false }} />
          </Stack.Protected>
          <Stack.Protected guard={ready}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="documents/[id]/index" options={{ title: 'Entente' }} />
            <Stack.Screen name="documents/[id]/[sectionId]" options={{ title: 'Section' }} />
            <Stack.Screen name="nouveau" options={{ title: 'Nouvelle entente', presentation: 'modal' }} />
            <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
            <Stack.Screen name="conversation/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="appel/[id]" options={{ headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false }} />
            <Stack.Screen name="parametres" options={{ title: 'Paramètres du profil' }} />
            <Stack.Screen name="assistant/[id]" options={{ title: 'Assistant Misterdil' }} />
          </Stack.Protected>
          <Stack.Screen name="invitation/[token]" options={{ title: 'Invitation' }} />
          <Stack.Screen name="auth" options={{ headerShown: false }} />
        </Stack>
      )}
      {ready && <ToastHost />}
      {status !== 'loading' && !introDone && <IntroVideo onReady={() => setIntroReady(true)} onDone={() => setIntroDone(true)} />}
    </View>
  );
}
