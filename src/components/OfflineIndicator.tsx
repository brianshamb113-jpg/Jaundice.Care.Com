import { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw, Upload } from 'lucide-react';
import { getSyncStatus, onSyncStatusChange, type SyncStatus } from '../lib/syncEngine';

export default function OfflineIndicator() {
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus());

  useEffect(() => {
    const unsub = onSyncStatusChange(setStatus);
    return unsub;
  }, []);

  const pending = status.pendingScans + status.pendingAlerts;

  if (status.isOnline && pending === 0 && !status.isSyncing) {
    return null;
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 max-w-2xl mx-auto px-4 pt-2"
      style={{ pointerEvents: 'none' }}
    >
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg shadow-md text-xs font-semibold"
        style={{
          background: status.isOnline ? '#E1F5EE' : '#FAEEDA',
          border: `1px solid ${status.isOnline ? '#0F6E56' : '#BA7517'}`,
          color: status.isOnline ? '#0F6E56' : '#BA7517',
          pointerEvents: 'auto',
        }}
      >
        {status.isSyncing ? (
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        ) : status.isOnline ? (
          <Wifi className="w-3.5 h-3.5" />
        ) : (
          <WifiOff className="w-3.5 h-3.5" />
        )}
        <span>
          {status.isSyncing
            ? `Syncing ${pending} item${pending !== 1 ? 's' : ''}...`
            : status.isOnline
            ? pending > 0
              ? `${pending} item${pending !== 1 ? 's' : ''} pending sync`
              : 'Online'
            : `Offline · ${pending} item${pending !== 1 ? 's' : ''} queued`}
        </span>
        {status.isOnline && pending > 0 && !status.isSyncing && (
          <Upload className="w-3.5 h-3.5 ml-auto" />
        )}
      </div>
    </div>
  );
}
