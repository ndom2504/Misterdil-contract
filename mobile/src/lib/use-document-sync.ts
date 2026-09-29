import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { api } from '@/lib/api';
import { SYNC_INTERVAL_MS } from '@/lib/config';
import type { PresenceEntry, SyncPayload, SyncSection } from '@/lib/types';

type Options = {
  documentId: string;
  loadedAt: string | null;
  editing: string | null;
  onSections: (sections: SyncSection[]) => void;
  onSignal: () => void;
};

// Polls the same endpoint as the web app: presence, sections changed since the last
// poll, and a signal that changes when anything else moved (comments, parties, status).
export function useDocumentSync({ documentId, loadedAt, editing, onSections, onSignal }: Options) {
  const [presence, setPresence] = useState<PresenceEntry[]>([]);
  const sinceRef = useRef<string | null>(loadedAt);
  const signalRef = useRef<string | null>(null);
  const editingRef = useRef(editing);
  const callbacks = useRef({ onSections, onSignal });
  const kickRef = useRef<(() => void) | null>(null);

  callbacks.current = { onSections, onSignal };

  useEffect(() => {
    if (loadedAt && (!sinceRef.current || loadedAt > sinceRef.current)) sinceRef.current = loadedAt;
  }, [loadedAt]);

  useEffect(() => {
    editingRef.current = editing;
    kickRef.current?.();
  }, [editing]);

  useEffect(() => {
    if (!loadedAt) return;
    let active = AppState.currentState === 'active';
    let stopped = false;
    let running = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let controller: AbortController | null = null;

    const schedule = (delay: number) => {
      if (timer) clearTimeout(timer);
      if (!stopped && active) timer = setTimeout(poll, delay);
    };

    async function poll() {
      if (running || stopped || !active) return;
      running = true;
      controller = new AbortController();
      try {
        const query = [
          sinceRef.current ? `since=${encodeURIComponent(sinceRef.current)}` : '',
          editingRef.current ? `section=${encodeURIComponent(editingRef.current)}` : '',
        ]
          .filter(Boolean)
          .join('&');
        const payload = await api<SyncPayload>(`/api/documents/${documentId}/sync?${query}`, {
          signal: controller.signal,
        });
        sinceRef.current = payload.now;
        setPresence(payload.presence);
        if (payload.sections.length) callbacks.current.onSections(payload.sections);
        if (signalRef.current !== null && signalRef.current !== payload.signal) callbacks.current.onSignal();
        signalRef.current = payload.signal;
      } catch {
        // Network hiccups are retried on the next tick.
      } finally {
        running = false;
        schedule(SYNC_INTERVAL_MS);
      }
    }

    kickRef.current = () => schedule(0);
    const subscription = AppState.addEventListener('change', (state) => {
      active = state === 'active';
      if (active) schedule(0);
      else if (timer) clearTimeout(timer);
    });
    schedule(0);

    return () => {
      stopped = true;
      kickRef.current = null;
      subscription.remove();
      if (timer) clearTimeout(timer);
      controller?.abort();
    };
  }, [documentId, loadedAt]);

  return presence;
}
