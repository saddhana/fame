'use client';

import { useState, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { toast } from 'sonner';
import { LocateFixed, Trash2 } from 'lucide-react';
import type { LatLngTuple } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default marker icon broken by webpack bundling
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const DEFAULT_CENTER: LatLngTuple = [-2.5, 118]; // Indonesia
const DEFAULT_ZOOM = 4;

interface LocationPickerProps {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number | null, lng: number | null) => void;
}

/** Handles map click to drop pin */
function ClickHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onChange(
        parseFloat(e.latlng.lat.toFixed(7)),
        parseFloat(e.latlng.lng.toFixed(7)),
      );
    },
  });
  return null;
}

/** Flies the map to a new center when coords change */
function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 15, { duration: 1 });
  }, [map, lat, lng]);
  return null;
}

export function LocationPicker({ lat, lng, onChange }: LocationPickerProps) {
  const [isDetecting, setIsDetecting] = useState(false);

  const handleMapClick = useCallback(
    (newLat: number, newLng: number) => onChange(newLat, newLng),
    [onChange],
  );

  function detectLocation() {
    if (!navigator.geolocation) {
      toast.error('Browser tidak mendukung geolokasi');
      return;
    }
    setIsDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange(
          parseFloat(pos.coords.latitude.toFixed(7)),
          parseFloat(pos.coords.longitude.toFixed(7)),
        );
        setIsDetecting(false);
        toast.success('Lokasi berhasil dideteksi!');
      },
      () => {
        toast.error('Gagal mendeteksi lokasi');
        setIsDetecting(false);
      },
    );
  }

  const center: LatLngTuple = lat != null && lng != null ? [lat, lng] : DEFAULT_CENTER;

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-amber-600/60">Klik pada peta untuk menentukan lokasi</span>
        <div className="flex gap-1.5 shrink-0">
          <button
            type="button"
            disabled={isDetecting}
            onClick={detectLocation}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 transition-colors disabled:opacity-50"
          >
            <LocateFixed className="w-3 h-3 shrink-0" />
            {isDetecting ? 'Mendeteksi...' : 'Lokasi Saya'}
          </button>
          {lat != null && lng != null && (
            <button
              type="button"
              onClick={() => onChange(null, null)}
              className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg border border-red-100 text-red-400 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Hapus
            </button>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="rounded-xl overflow-hidden border border-amber-200" style={{ height: 260 }}>
        <MapContainer
          center={center}
          zoom={lat != null && lng != null ? 15 : DEFAULT_ZOOM}
          style={{ width: '100%', height: '100%' }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onChange={handleMapClick} />
          {lat != null && lng != null && (
            <>
              <Marker position={[lat, lng]} />
              <FlyTo lat={lat} lng={lng} />
            </>
          )}
        </MapContainer>
      </div>

      {lat == null && (
        <p className="text-xs text-amber-500/60">Belum ada pin. Klik peta atau gunakan &ldquo;Lokasi Saya&rdquo;.</p>
      )}
    </div>
  );
}
