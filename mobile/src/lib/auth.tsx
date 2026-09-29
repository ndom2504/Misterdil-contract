import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { api, setApiToken, setUnauthorizedHandler } from '@/lib/api';
import { API_URL } from '@/lib/config';
import { forgetPushToken } from '@/lib/push';
import type { Me } from '@/lib/types';

WebBrowser.maybeCompleteAuthSession();

const TOKEN_KEY = 'misterdil.session';

type Status = 'loading' | 'signedOut' | 'signedIn';
type SessionReply = { ok: true; token: string; onboarded: boolean };

type AuthContextValue = {
  status: Status;
  me: Me | null;
  pendingInvitation: string | null;
  setPendingInvitation: (token: string | null) => void;
  signIn: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  signInWithMicrosoft: () => Promise<string | null>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const MICROSOFT_ERRORS: Record<string, string> = {
  configuration: "La connexion Microsoft n'est pas configurée sur le serveur.",
  'consentement-admin': "Votre organisation doit d'abord autoriser Misterdil dans Microsoft.",
  'connexion-annulee': 'Connexion Microsoft annulée.',
  'connexion-refusee': 'Microsoft a refusé la connexion.',
  'connexion-interrompue': 'La connexion Microsoft a été interrompue. Réessayez.',
  'compte-inconnu': "Ce compte Microsoft n'a pas d'adresse courriel utilisable.",
};

function base64Url(value: string) {
  return value.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [me, setMe] = useState<Me | null>(null);
  const [pendingInvitation, setPendingInvitation] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);

  const clear = useCallback(async () => {
    tokenRef.current = null;
    setApiToken(null);
    setMe(null);
    setStatus('signedOut');
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    const data = await api<Me & { ok: true }>('/api/mobile/me');
    setMe({ user: data.user, unread: data.unread, microsoftEmail: data.microsoftEmail, sectors: data.sectors });
    setStatus('signedIn');
  }, []);

  const adopt = useCallback(
    async (token: string) => {
      tokenRef.current = token;
      setApiToken(token);
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      await load();
    },
    [load],
  );

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void clear();
    });
    (async () => {
      const saved = await SecureStore.getItemAsync(TOKEN_KEY).catch(() => null);
      if (!saved) {
        setStatus('signedOut');
        return;
      }
      tokenRef.current = saved;
      setApiToken(saved);
      try {
        await load();
      } catch {
        setStatus('signedOut');
      }
    })();
    return () => setUnauthorizedHandler(null);
  }, [clear, load]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const data = await api<SessionReply>('/api/mobile/auth/login', { method: 'POST', body: { email, password } });
      await adopt(data.token);
    },
    [adopt],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const data = await api<SessionReply>('/api/mobile/auth/register', { method: 'POST', body: { name, email, password } });
      await adopt(data.token);
    },
    [adopt],
  );

  // Returns an error message, or null once signed in (or cancelled by the user).
  const signInWithMicrosoft = useCallback(async () => {
    const verifier = `${Crypto.randomUUID()}${Crypto.randomUUID()}`.replace(/-/g, '');
    const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier, {
      encoding: Crypto.CryptoEncoding.BASE64,
    });
    const redirect = Linking.createURL('auth');
    const url = `${API_URL}/api/mobile/auth/microsoft?redirect=${encodeURIComponent(redirect)}&challenge=${base64Url(digest)}`;
    const result = await WebBrowser.openAuthSessionAsync(url, redirect);
    if (result.type !== 'success') return null;
    const params = Linking.parse(result.url).queryParams ?? {};
    const error = typeof params.error === 'string' ? params.error : '';
    if (error) return MICROSOFT_ERRORS[error] ?? 'La connexion Microsoft a échoué.';
    const code = typeof params.code === 'string' ? params.code : '';
    if (!code) return 'La connexion Microsoft a échoué.';
    const data = await api<SessionReply>('/api/mobile/auth/exchange', { method: 'POST', body: { code, verifier } });
    await adopt(data.token);
    return null;
  }, [adopt]);

  const signOut = useCallback(async () => {
    await forgetPushToken();
    await clear();
  }, [clear]);

  const refresh = useCallback(async () => {
    if (tokenRef.current) await load();
  }, [load]);

  const value = useMemo(
    () => ({ status, me, pendingInvitation, setPendingInvitation, signIn, register, signInWithMicrosoft, signOut, refresh }),
    [status, me, pendingInvitation, signIn, register, signInWithMicrosoft, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
