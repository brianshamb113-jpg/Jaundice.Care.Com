import { createClient } from '@supabase/supabase-js';
import {
  getUnsyncedScans,
  getUnsentAlerts,
  putItem,
  deleteItem,
  type OfflineScan,
  type OfflineAlert,
  type SyncQueueItem,
} from './offlineDB';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

let isSyncing = false;
let isOnline = navigator.onLine;
const syncListeners = new Set<(status: SyncStatus) => void>();

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingScans: number;
  pendingAlerts: number;
  lastSyncAt: number | null;
  error: string | null;
}

let currentStatus: SyncStatus = {
  isOnline,
  isSyncing: false,
  pendingScans: 0,
  pendingAlerts: 0,
  lastSyncAt: null,
  error: null,
};

export function getSyncStatus(): SyncStatus {
  return currentStatus;
}

export function onSyncStatusChange(cb: (status: SyncStatus) => void): () => void {
  syncListeners.add(cb);
  return () => syncListeners.delete(cb);
}

function notifyListeners() {
  syncListeners.forEach(cb => cb(currentStatus));
}

function updateStatus(patch: Partial<SyncStatus>) {
  currentStatus = { ...currentStatus, ...patch };
  notifyListeners();
}

function getBackoffMs(attempts: number): number {
  const base = 2000;
  const max = 60000;
  return Math.min(base * Math.pow(2, attempts), max);
}

export async function syncNow(): Promise<void> {
  if (isSyncing || !isOnline) return;
  isSyncing = true;
  updateStatus({ isSyncing: true, error: null });

  try {
    // Priority 1: alerts (critical)
    const unsentAlerts = await getUnsentAlerts();
    for (const alert of unsentAlerts) {
      try {
        const { error } = await supabase.from('alerts').insert({
          id: alert.id,
          scan_id: alert.scanId || null,
          baby_id: alert.babyId,
          bilirubin: alert.bilirubin,
          parent_name: alert.parentName,
          parent_phone: alert.parentPhone,
          facility_name: alert.facilityName,
          latitude: alert.latitude,
          longitude: alert.longitude,
          location_accuracy: alert.accuracy,
          location_address: alert.address,
          is_sent: true,
          retry_count: alert.retryCount,
          resolved: false,
          sent_at: new Date().toISOString(),
        });

        if (!error) {
          const updated: OfflineAlert = {
            ...alert,
            isSent: true,
            sentAt: Date.now(),
          };
          await putItem('alerts', updated);
          await deleteItem('syncQueue', `alerts_${alert.id}`);
        } else {
          const updated: OfflineAlert = {
            ...alert,
            retryCount: alert.retryCount + 1,
            lastRetry: Date.now(),
          };
          await putItem('alerts', updated);
        }
      } catch {
        const updated: OfflineAlert = {
          ...alert,
          retryCount: alert.retryCount + 1,
          lastRetry: Date.now(),
        };
        await putItem('alerts', updated);
      }
    }

    // Priority 2: scans
    const unsyncedScans = await getUnsyncedScans();
    for (const scan of unsyncedScans) {
      try {
        const { error } = await supabase.from('scans').insert({
          id: scan.id,
          baby_id: scan.babyId,
          mother_name: scan.motherName,
          age_hours: scan.ageHours,
          birth_weight: scan.birthWeight,
          gestational_age: scan.gestationalAge,
          bilirubin: scan.bilirubin,
          status: scan.status,
          ward: scan.ward,
          worker_name: scan.workerName,
          notes: scan.notes,
          image_base64: scan.imageBase64,
          latitude: scan.latitude,
          longitude: scan.longitude,
          location_accuracy: scan.accuracy,
          location_address: scan.address,
          scanned_at: new Date(scan.scannedAt).toISOString(),
        });

        if (!error) {
          const updated: OfflineScan = {
            ...scan,
            isSynced: true,
            lastSyncAttempt: Date.now(),
          };
          await putItem('scans', updated);
          await deleteItem('syncQueue', `scans_${scan.id}`);
        } else {
          const updated: OfflineScan = {
            ...scan,
            syncAttempts: scan.syncAttempts + 1,
            lastSyncAttempt: Date.now(),
          };
          await putItem('scans', updated);
        }
      } catch {
        const updated: OfflineScan = {
          ...scan,
          syncAttempts: scan.syncAttempts + 1,
          lastSyncAttempt: Date.now(),
        };
        await putItem('scans', updated);
      }
    }

    // Update pending counts
    const stillPendingScans = await getUnsyncedScans();
    const stillPendingAlerts = await getUnsentAlerts();
    updateStatus({
      isSyncing: false,
      pendingScans: stillPendingScans.length,
      pendingAlerts: stillPendingAlerts.length,
      lastSyncAt: Date.now(),
      error: null,
    });
  } catch (err) {
    updateStatus({
      isSyncing: false,
      error: err instanceof Error ? err.message : 'Sync failed',
    });
  }

  isSyncing = false;
}

export async function refreshPendingCounts() {
  const scans = await getUnsyncedScans();
  const alerts = await getUnsentAlerts();
  updateStatus({ pendingScans: scans.length, pendingAlerts: alerts.length });
}

export async function queueScan(scan: OfflineScan): Promise<void> {
  await putItem('scans', scan);
  const queueItem: SyncQueueItem = {
    id: `scans_${scan.id}`,
    store: 'scans',
    recordId: scan.id,
    priority: scan.status === 'Refer Urgently' ? 'high' : 'normal',
    attempts: 0,
    createdAt: Date.now(),
    lastAttempt: null,
  };
  await putItem('syncQueue', queueItem);
  await refreshPendingCounts();
  if (isOnline) {
    syncNow();
  }
}

export async function queueAlert(alert: OfflineAlert): Promise<void> {
  await putItem('alerts', alert);
  const queueItem: SyncQueueItem = {
    id: `alerts_${alert.id}`,
    store: 'alerts',
    recordId: alert.id,
    priority: 'high',
    attempts: 0,
    createdAt: Date.now(),
    lastAttempt: null,
  };
  await putItem('syncQueue', queueItem);
  await refreshPendingCounts();
  if (isOnline) {
    syncNow();
  }
}

let retryTimer: number | null = null;

export function initSyncEngine(): () => void {
  const handleOnline = () => {
    isOnline = true;
    updateStatus({ isOnline: true });
    syncNow();
  };
  const handleOffline = () => {
    isOnline = false;
    updateStatus({ isOnline: false });
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  refreshPendingCounts();
  if (isOnline) {
    syncNow();
  }

  // Periodic retry every 30 seconds if there are pending items
  const interval = window.setInterval(async () => {
    const status = getSyncStatus();
    if (isOnline && !isSyncing && (status.pendingScans > 0 || status.pendingAlerts > 0)) {
      syncNow();
    }
  }, 30000);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    if (retryTimer !== null) clearTimeout(retryTimer);
    clearInterval(interval);
  };
}
