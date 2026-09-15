const DB_NAME = 'jaundicecare_offline';
const DB_VERSION = 1;

export interface OfflineScan {
  id: string;
  babyId: string;
  motherName: string;
  ageHours: number;
  birthWeight: number;
  gestationalAge: string;
  bilirubin: number;
  status: 'Normal' | 'Monitor' | 'Refer Urgently';
  ward: string;
  workerName: string;
  notes: string;
  imageBase64: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  address: string;
  scannedAt: number;
  isSynced: boolean;
  syncAttempts: number;
  lastSyncAttempt: number | null;
}

export interface OfflineAlert {
  id: string;
  scanId: string;
  babyId: string;
  bilirubin: number;
  parentName: string;
  parentPhone: string;
  facilityName: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  address: string;
  isSent: boolean;
  retryCount: number;
  lastRetry: number | null;
  createdAt: number;
  sentAt: number | null;
}

export interface CachedLocation {
  id: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  address: string;
  timestamp: number;
  source: 'gps' | 'manual' | 'cached';
}

export interface SyncQueueItem {
  id: string;
  store: 'scans' | 'alerts';
  recordId: string;
  priority: 'high' | 'normal';
  attempts: number;
  createdAt: number;
  lastAttempt: number | null;
}

type StoreName = 'scans' | 'alerts' | 'locations' | 'syncQueue';

let dbInstance: IDBDatabase | null = null;

export function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('scans')) {
        const scanStore = db.createObjectStore('scans', { keyPath: 'id' });
        scanStore.createIndex('isSynced', 'isSynced', { unique: false });
        scanStore.createIndex('scannedAt', 'scannedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains('alerts')) {
        const alertStore = db.createObjectStore('alerts', { keyPath: 'id' });
        alertStore.createIndex('isSent', 'isSent', { unique: false });
        alertStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
      if (!db.objectStoreNames.contains('locations')) {
        const locStore = db.createObjectStore('locations', { keyPath: 'id' });
        locStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      if (!db.objectStoreNames.contains('syncQueue')) {
        const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
        syncStore.createIndex('priority', 'priority', { unique: false });
      }
    };
  });
}

export async function putItem<T extends { id: string }>(store: StoreName, item: T): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getItem<T>(store: StoreName, id: string): Promise<T | undefined> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(id);
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  });
}

export async function getAll<T>(store: StoreName): Promise<T[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

export async function getByIndex<T>(store: StoreName, indexName: string, value: IDBValidKey): Promise<T[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const idx = tx.objectStore(store).index(indexName);
    const req = idx.getAll(value);
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteItem(store: StoreName, id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearStore(store: StoreName): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getUnsyncedScans(): Promise<OfflineScan[]> {
  return getByIndex<OfflineScan>('scans', 'isSynced', 0);
}

export async function getUnsentAlerts(): Promise<OfflineAlert[]> {
  return getByIndex<OfflineAlert>('alerts', 'isSent', 0);
}

export async function getLastKnownLocation(): Promise<CachedLocation | null> {
  const all = await getAll<CachedLocation>('locations');
  if (all.length === 0) return null;
  return all.sort((a, b) => b.timestamp - a.timestamp)[0];
}

export async function getPendingSyncCount(): Promise<number> {
  const scans = await getUnsyncedScans();
  const alerts = await getUnsentAlerts();
  return scans.length + alerts.length;
}
