// tiny module-level pub-sub for toasts.
// any component (or server-action callback) calls emitToast(); a single
// <Toaster /> subscribes and renders. avoids threading a context provider
// through every panel.

type Listener = (msg: string) => void;

let listener: Listener | null = null;

export function emitToast(msg: string): void {
  listener?.(msg);
}

export function subscribeToast(l: Listener): () => void {
  listener = l;
  return () => {
    if (listener === l) listener = null;
  };
}
