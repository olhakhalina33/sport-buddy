import { useEffect } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Маркер у кольорі бренду (divIcon — без PNG-іконок Leaflet, які ламаються в бандлі).
const brandIcon = L.divIcon({
  className: '',
  html: '<span style="display:block;width:22px;height:22px;border-radius:50%;background:rgb(var(--btn-default));border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

interface Props {
  lat: number;
  lng: number;
  zoom?: number;
  marker?: boolean;
  onPick?: (lat: number, lng: number) => void;
  className?: string;
  label: string;
}

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom(), { animate: true });
  }, [lat, lng, map]);
  return null;
}

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

/** Карта OpenStreetMap (Leaflet, без ключів API). onPick — вибір точки кліком. */
export function MapView({ lat, lng, zoom = 14, marker = true, onPick, className = 'h-56', label }: Props) {
  return (
    <div role="region" aria-label={label} className={`overflow-hidden rounded-2xl border border-line-off ${className}`}>
      <MapContainer center={[lat, lng]} zoom={zoom} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {marker && <Marker position={[lat, lng]} icon={brandIcon} keyboard={false} />}
        <Recenter lat={lat} lng={lng} />
        {onPick && <ClickHandler onPick={onPick} />}
      </MapContainer>
    </div>
  );
}
