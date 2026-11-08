import type { OfflineOrderRecord } from '../types/domain';
import { AppError } from './errors';

const DB_NAME = 'mejaflow-offline';
const DB_VERSION = 1;
const STORE_NAME = 'offline_orders';

let databasePromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(
      new AppError('offline/unavailable', 'Penyimpanan lokal tidak tersedia di browser ini.'),
    );
  }

  if (databasePromise) {
    return databasePromise;
  }

  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'localId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(new AppError('offline/open-failed', 'Gagal membuka penyimpanan transaksi lokal.'));
  });

  return databasePromise;
}

/**
 * Menyimpan satu transaksi tunai offline beserta antreannya dalam satu record.
 * Pemanggil wajib menampilkan kegagalan dan TIDAK boleh menampilkan sukses palsu.
 */
export async function saveOfflineOrder(record: OfflineOrderRecord): Promise<void> {
  const database = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(record);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(new AppError('offline/write-failed', 'Transaksi gagal disimpan di perangkat ini.'));
    transaction.onabort = () =>
      reject(new AppError('offline/write-failed', 'Penyimpanan lokal dibatalkan oleh browser.'));
  });
}

export async function listOfflineOrders(): Promise<OfflineOrderRecord[]> {
  const database = await openDatabase();

  return new Promise<OfflineOrderRecord[]>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => {
      const records = (request.result as OfflineOrderRecord[]).sort(
        (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
      );
      resolve(records);
    };
    request.onerror = () =>
      reject(new AppError('offline/read-failed', 'Gagal membaca transaksi lokal.'));
  });
}

export async function clearOfflineOrders(): Promise<void> {
  const database = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).clear();
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(new AppError('offline/clear-failed', 'Gagal membersihkan data lokal.'));
  });
}

export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
    return null;
  }

  try {
    const estimate = await navigator.storage.estimate();
    return { usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 };
  } catch {
    return null;
  }
}

export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) {
    return false;
  }

  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
