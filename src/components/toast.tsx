import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  message?: string;
}

interface ToastContextValue {
  pushToast: (toast: { tone: ToastTone; title: string; message?: string }) => void;
  clearToasts: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback<ToastContextValue['pushToast']>(
    (toast) => {
      counter.current += 1;
      const id = counter.current;
      setToasts((current) => [...current, { id, ...toast }]);
      window.setTimeout(() => remove(id), 5200);
    },
    [remove],
  );

  const clearToasts = useCallback(() => setToasts([]), []);

  const value = useMemo<ToastContextValue>(() => ({ pushToast, clearToasts }), [pushToast, clearToasts]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-host" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast--${toast.tone}`} role="status">
            <div className="toast__body">
              <strong className="toast__title">{toast.title}</strong>
              {toast.message ? <p className="toast__message">{toast.message}</p> : null}
            </div>
            <button
              type="button"
              className="toast__close"
              aria-label="Tutup notifikasi"
              onClick={() => remove(toast.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast harus dipakai di dalam ToastProvider');
  }
  return context;
}
