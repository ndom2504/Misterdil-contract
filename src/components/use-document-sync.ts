"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SYNC_INTERVAL_MS, type PresenceEntry, type SyncPayload, type SyncSection } from "@/lib/document-sync";

export function useDocumentSync({
  documentId,
  loadedAt,
  editing,
  onSections,
}: {
  documentId: string;
  loadedAt: string;
  editing: string | null;
  onSections: (sections: SyncSection[]) => void;
}) {
  const router = useRouter();
  const [presence, setPresence] = useState<PresenceEntry[]>([]);
  const editingRef = useRef(editing);
  const onSectionsRef = useRef(onSections);
  const kickRef = useRef<() => void>(() => {});

  useEffect(() => {
    editingRef.current = editing;
    onSectionsRef.current = onSections;
  });

  useEffect(() => {
    let since = loadedAt;
    let signal = "";
    let timer: ReturnType<typeof setTimeout> | undefined;
    let running = false;
    let stopped = false;
    const controller = new AbortController();

    async function tick() {
      clearTimeout(timer);
      if (stopped || running) return;
      if (document.hidden) {
        schedule();
        return;
      }
      running = true;
      try {
        const params = new URLSearchParams({ since });
        if (editingRef.current) params.set("section", editingRef.current);
        const response = await fetch(`/api/documents/${documentId}/sync?${params}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (response.ok) {
          const data = (await response.json()) as SyncPayload;
          since = data.now;
          setPresence(data.presence);
          if (data.sections.length) onSectionsRef.current(data.sections);
          if (signal && data.signal !== signal) router.refresh();
          signal = data.signal;
        }
      } catch {
        // Offline or aborted: the next tick retries.
      } finally {
        running = false;
        schedule();
      }
    }

    function schedule() {
      if (stopped) return;
      clearTimeout(timer);
      timer = setTimeout(tick, SYNC_INTERVAL_MS);
    }

    function onVisibility() {
      if (!document.hidden) void tick();
    }

    kickRef.current = () => void tick();
    void tick();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller.abort();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [documentId, loadedAt, router]);

  useEffect(() => {
    kickRef.current();
  }, [editing]);

  return presence;
}
