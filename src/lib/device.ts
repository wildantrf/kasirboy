import { newId } from './id';

const DEVICE_KEY = 'mejaflow.device.id';

/**
 * Identitas perangkat untuk registrasi "satu perangkat utama" per cabang.
 * Nilai ini hanya identitas lokal, bukan kredensial offline.
 */
export function getLocalDeviceId(): string {
  if (typeof localStorage === 'undefined') {
    return 'dev_server';
  }

  const existing = localStorage.getItem(DEVICE_KEY);
  if (existing) {
    return existing;
  }

  const created = newId('dev');
  localStorage.setItem(DEVICE_KEY, created);
  return created;
}
