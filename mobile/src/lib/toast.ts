export type Toast = { id: number; title: string; body: string; href?: string; kind?: string };

type Listener = (toast: Toast) => void;

const listeners = new Set<Listener>();
let counter = 0;

export function showToast(toast: Omit<Toast, 'id'>) {
  counter += 1;
  const next = { ...toast, id: counter };
  for (const listener of listeners) listener(next);
}

export function subscribeToasts(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
