import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LocationMapProps {
  latitude: number;
  longitude: number;
  accuracy?: number;
  label?: string;
  destinationLat?: number;
  destinationLng?: number;
  destinationLabel?: string;
  height?: number;
}

const babyIcon = L.divIcon({
  className: '',
  html: `<div style="background:#A32D2D;width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:14px;">👶</span></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

const hospitalIcon = L.divIcon({
  className: '',
  html: `<div style="background:#185FA5;width:28px;height:28px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><span style="color:#fff;font-size:14px;font-weight:bold;">H</span></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

export default function LocationMap({
  latitude,
  longitude,
  accuracy,
  label = 'Baby location',
  destinationLat,
  destinationLng,
  destinationLabel = 'Hospital',
  height = 200,
}: LocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current, {
        zoomControl: true,
        attributionControl: false,
      }).setView([latitude, longitude], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(mapInstance.current);
    } else {
      mapInstance.current.setView([latitude, longitude], 13);
    }

    const map = mapInstance.current;
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Circle || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    const marker = L.marker([latitude, longitude], { icon: babyIcon }).addTo(map);
    marker.bindPopup(`<strong>${label}</strong><br/>${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);

    if (accuracy && accuracy > 0) {
      L.circle([latitude, longitude], {
        radius: accuracy,
        color: '#A32D2D',
        fillColor: '#A32D2D',
        fillOpacity: 0.1,
        weight: 1,
      }).addTo(map);
    }

    if (destinationLat !== undefined && destinationLng !== undefined) {
      const destMarker = L.marker([destinationLat, destinationLng], { icon: hospitalIcon }).addTo(map);
      destMarker.bindPopup(`<strong>${destinationLabel}</strong>`);

      L.polyline(
        [
          [latitude, longitude],
          [destinationLat, destinationLng],
        ],
        { color: '#185FA5', weight: 3, dashArray: '8 8', opacity: 0.7 }
      ).addTo(map);

      const bounds = L.latLngBounds([
        [latitude, longitude],
        [destinationLat, destinationLng],
      ]);
      map.fitBounds(bounds, { padding: [40, 40] });
    }

    setTimeout(() => map.invalidateSize(), 100);
  }, [latitude, longitude, accuracy, label, destinationLat, destinationLng, destinationLabel]);

  useEffect(() => {
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={mapRef}
      style={{ height, width: '100%', borderRadius: 12, overflow: 'hidden' }}
    />
  );
}
