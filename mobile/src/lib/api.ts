import { API_URL } from '@/lib/config';

let token: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setApiToken(value: string | null) {
  token = value;
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

export class ApiError extends Error {
  status: number;
  data: Record<string, unknown> | null;

  constructor(message: string, status: number, data: Record<string, unknown> | null) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

type Options = { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown; form?: FormData; signal?: AbortSignal };

export function authHeaders(): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function absoluteUrl(path: string) {
  return /^https?:\/\//.test(path) ? path : `${API_URL}${path}`;
}

export async function api<T>(path: string, options: Options = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json', ...authHeaders() };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.form ?? (options.body === undefined ? undefined : JSON.stringify(options.body)),
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new ApiError('Connexion au serveur impossible. Vérifiez votre réseau.', 0, null);
  }

  let data: Record<string, unknown> | null = null;
  try {
    data = (await response.json()) as Record<string, unknown>;
  } catch {
    data = null;
  }
  if (response.status === 401 && token) onUnauthorized?.();
  if (!response.ok) {
    const message = typeof data?.error === 'string' ? data.error : `Erreur ${response.status}`;
    throw new ApiError(message, response.status, data);
  }
  return data as T;
}

export function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Une erreur est survenue.';
}
