import { putItem, getLastKnownLocation, type CachedLocation } from './offlineDB';

export interface CurrentLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  address: string;
  source: 'gps' | 'manual' | 'cached';
  timestamp: number;
}

export type LocationPermissionState = 'granted' | 'denied' | 'prompt' | 'unknown';

let watchId: number | null = null;
let currentLocation: CurrentLocation | null = null;
const listeners = new Set<(loc: CurrentLocation | null) => void>();

export function getCurrentLocation(): CurrentLocation | null {
  return currentLocation;
}

export function onLocationUpdate(cb: (loc: CurrentLocation | null) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function notifyListeners() {
  listeners.forEach(cb => cb(currentLocation));
}

function generateId(): string {
  return `loc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function cacheLocation(loc: CurrentLocation) {
  const cached: CachedLocation = {
    id: generateId(),
    latitude: loc.latitude,
    longitude: loc.longitude,
    accuracy: loc.accuracy,
    address: loc.address,
    timestamp: loc.timestamp,
    source: loc.source,
  };
  await putItem('locations', cached);
}

export async function checkPermission(): Promise<LocationPermissionState> {
  if (!navigator.geolocation) return 'unknown';
  try {
    const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
    return result.state as LocationPermissionState;
  } catch {
    return 'unknown';
  }
}

export function startLocationWatch(): Promise<void> {
  return new Promise(async (resolve) => {
    if (!navigator.geolocation) {
      const cached = await getLastKnownLocation();
      if (cached) {
        currentLocation = {
          latitude: cached.latitude,
          longitude: cached.longitude,
          accuracy: cached.accuracy,
          address: cached.address,
          source: 'cached',
          timestamp: cached.timestamp,
        };
        notifyListeners();
      }
      resolve();
      return;
    }

    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
    }

    watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const loc: CurrentLocation = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          address: currentLocation?.address || '',
          source: 'gps',
          timestamp: Date.now(),
        };
        currentLocation = loc;
        notifyListeners();
        await cacheLocation(loc);
      },
      async () => {
        const cached = await getLastKnownLocation();
        if (cached) {
          currentLocation = {
            latitude: cached.latitude,
            longitude: cached.longitude,
            accuracy: cached.accuracy,
            address: cached.address,
            source: 'cached',
            timestamp: cached.timestamp,
          };
          notifyListeners();
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );

    resolve();
  });
}

export function stopLocationWatch() {
  if (watchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}

export async function getCurrentPositionOnce(): Promise<CurrentLocation | null> {
  return new Promise(async (resolve) => {
    if (!navigator.geolocation) {
      const cached = await getLastKnownLocation();
      if (cached) {
        const loc: CurrentLocation = {
          latitude: cached.latitude,
          longitude: cached.longitude,
          accuracy: cached.accuracy,
          address: cached.address,
          source: 'cached',
          timestamp: cached.timestamp,
        };
        resolve(loc);
      } else {
        resolve(null);
      }
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc: CurrentLocation = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          address: '',
          source: 'gps',
          timestamp: Date.now(),
        };
        currentLocation = loc;
        notifyListeners();
        await cacheLocation(loc);
        resolve(loc);
      },
      async () => {
        const cached = await getLastKnownLocation();
        if (cached) {
          const loc: CurrentLocation = {
            latitude: cached.latitude,
            longitude: cached.longitude,
            accuracy: cached.accuracy,
            address: cached.address,
            source: 'cached',
            timestamp: cached.timestamp,
          };
          resolve(loc);
        } else {
          resolve(null);
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  });
}

export async function setManualLocation(lat: number, lng: number, address: string): Promise<CurrentLocation> {
  const loc: CurrentLocation = {
    latitude: lat,
    longitude: lng,
    accuracy: 0,
    address,
    source: 'manual',
    timestamp: Date.now(),
  };
  currentLocation = loc;
  notifyListeners();
  await cacheLocation(loc);
  return loc;
}

export function generateMapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export function formatLocation(loc: CurrentLocation): string {
  const parts: string[] = [];
  if (loc.address) parts.push(loc.address);
  parts.push(`${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}`);
  if (loc.accuracy > 0) parts.push(`(±${Math.round(loc.accuracy)}m)`);
  return parts.join(' · ');
}

export function isStale(loc: CurrentLocation, maxAgeMs: number = 30 * 60 * 1000): boolean {
  return Date.now() - loc.timestamp > maxAgeMs;
}
