import { useSyncExternalStore } from 'react';

interface NetworkSnapshot {
  online: boolean;
  simulatedOffline: boolean;
}

type Listener = () => void;

const listeners = new Set<Listener>();
let simulatedOffline = false;
let snapshot: NetworkSnapshot = {
  online: true,
  simulatedOffline: false,
};

function computeSnapshot(): NetworkSnapshot {
  const navigatorOnline = typeof navigator === 'undefined' ? true : navigator.onLine;
  return {
    online: navigatorOnline && !simulatedOffline,
    simulatedOffline,
  };
}

function refresh(): void {
  snapshot = computeSnapshot();
  for (const listener of listeners) {
    listener();
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', refresh);
  window.addEventListener('offline', refresh);
}

export function isOnline(): boolean {
  return computeSnapshot().online;
}

export function subscribeNetwork(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): NetworkSnapshot {
  return snapshot;
}

export function setSimulatedOffline(value: boolean): void {
  simulatedOffline = value;
  refresh();
}

export function useNetwork(): NetworkSnapshot {
  return useSyncExternalStore(subscribeNetwork, getSnapshot, getSnapshot);
}
