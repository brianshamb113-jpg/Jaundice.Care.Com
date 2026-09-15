import { useEffect, useState } from 'react';
import { MapPin, Crosshair, AlertCircle, Check, RefreshCw } from 'lucide-react';
import {
  getCurrentPositionOnce,
  setManualLocation,
  checkPermission,
  type CurrentLocation,
  type LocationPermissionState,
} from '../lib/locationService';

interface LocationCaptureProps {
  onLocation: (loc: CurrentLocation) => void;
  initialLocation?: CurrentLocation | null;
}

export default function LocationCapture({ onLocation, initialLocation }: LocationCaptureProps) {
  const [location, setLocation] = useState<CurrentLocation | null>(initialLocation || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<LocationPermissionState>('unknown');
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [showManual, setShowManual] = useState(false);

  useEffect(() => {
    checkPermission().then(setPermission);
    if (!initialLocation) {
      detectLocation();
    }
  }, []);

  const detectLocation = async () => {
    setLoading(true);
    setError(null);
    const loc = await getCurrentPositionOnce();
    if (loc) {
      setLocation(loc);
      onLocation(loc);
    } else {
      setError('Could not get GPS location. Please enter manually.');
      setShowManual(true);
    }
    setLoading(false);
    checkPermission().then(setPermission);
  };

  const handleManualSubmit = async () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (isNaN(lat) || isNaN(lng)) {
      setError('Please enter valid coordinates.');
      return;
    }
    const loc = await setManualLocation(lat, lng, manualAddress || 'Manual location');
    setLocation(loc);
    onLocation(loc);
    setError(null);
    setShowManual(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-[#0F6E56]" />
        <h3 className="font-bold text-sm text-[#1A1A1A]">Current Location</h3>
      </div>

      {location && !showManual && (
        <div className="bg-[#E1F5EE] border border-[#0F6E56]/20 rounded-xl p-3 space-y-1.5">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-[#0F6E56]" />
            <span className="text-sm font-semibold text-[#0F6E56]">
              {location.source === 'gps' ? 'GPS Location Locked' : location.source === 'cached' ? 'Last Known Location' : 'Manual Location'}
            </span>
          </div>
          <p className="text-xs text-[#1A1A1A] font-mono">
            {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
          </p>
          {location.accuracy > 0 && (
            <p className="text-xs text-[#5F5E5A]">Accuracy: ±{Math.round(location.accuracy)}m</p>
          )}
          {location.address && (
            <p className="text-xs text-[#5F5E5A]">{location.address}</p>
          )}
          {location.source === 'cached' && (
            <p className="text-xs text-[#BA7517]">
              Cached {Math.round((Date.now() - location.timestamp) / 60000)} min ago — may be outdated
            </p>
          )}
          <button
            onClick={detectLocation}
            disabled={loading}
            className="text-xs text-[#0F6E56] font-semibold flex items-center gap-1 hover:underline mt-1"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            Refresh GPS
          </button>
        </div>
      )}

      {loading && (
        <div className="bg-[#E1F5EE] rounded-xl p-4 flex items-center gap-3">
          <Crosshair className="w-5 h-5 text-[#0F6E56] animate-spin" />
          <span className="text-sm text-[#0F6E56] font-semibold">Getting GPS location...</span>
        </div>
      )}

      {error && !loading && (
        <div className="bg-[#FAECE7] border border-[#A32D2D]/20 rounded-xl p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-[#A32D2D] mt-0.5 flex-shrink-0" />
          <p className="text-xs text-[#A32D2D]">{error}</p>
        </div>
      )}

      {permission === 'denied' && !location && (
        <div className="bg-[#FAEEDA] border border-[#BA7517]/20 rounded-xl p-3">
          <p className="text-xs text-[#BA7517] font-semibold mb-1">Location permission denied</p>
          <p className="text-xs text-[#5F5E5A]">
            To enable: tap the lock icon in your browser address bar, allow location access, then refresh this page.
          </p>
        </div>
      )}

      {showManual && (
        <div className="bg-white border border-[#E5E3DC] rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-[#1A1A1A]">Enter Location Manually</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-[#5F5E5A] block mb-1">Latitude</label>
              <input
                type="number"
                step="0.00001"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
                placeholder="-6.82349"
                className="w-full px-3 py-2 border border-[#E5E3DC] rounded-lg text-sm focus:outline-none focus:border-[#0F6E56]"
              />
            </div>
            <div>
              <label className="text-xs text-[#5F5E5A] block mb-1">Longitude</label>
              <input
                type="number"
                step="0.00001"
                value={manualLng}
                onChange={(e) => setManualLng(e.target.value)}
                placeholder="39.26951"
                className="w-full px-3 py-2 border border-[#E5E3DC] rounded-lg text-sm focus:outline-none focus:border-[#0F6E56]"
              />
            </div>
          </div>
          <input
            type="text"
            value={manualAddress}
            onChange={(e) => setManualAddress(e.target.value)}
            placeholder="Address or landmark (optional)"
            className="w-full px-3 py-2 border border-[#E5E3DC] rounded-lg text-sm focus:outline-none focus:border-[#0F6E56]"
          />
          <button
            onClick={handleManualSubmit}
            className="w-full bg-[#0F6E56] text-white font-bold py-2.5 rounded-lg text-sm"
          >
            Set Location
          </button>
        </div>
      )}

      {!showManual && (
        <button
          onClick={() => setShowManual(true)}
          className="text-xs text-[#185FA5] font-semibold hover:underline"
        >
          Enter location manually instead
        </button>
      )}
    </div>
  );
}
