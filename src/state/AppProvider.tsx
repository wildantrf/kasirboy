import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { createAppStore, type AppStore, type StoreSnapshot } from './store';

interface AppContextValue {
  snapshot: StoreSnapshot;
  actions: AppStore['actions'];
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<AppStore | null>(null);

  if (!storeRef.current) {
    storeRef.current = createAppStore();
  }

  const store = storeRef.current;
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  useEffect(() => {
    void store.hydrateOffline();
  }, [store]);

  const value = useMemo<AppContextValue>(
    () => ({ snapshot, actions: store.actions }),
    [snapshot, store],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp harus dipakai di dalam AppProvider');
  }
  return context;
}

export function useAppState() {
  return useApp().snapshot.state;
}

export function useAppActions() {
  return useApp().actions;
}
