import { useEffect, useState } from 'react';
import { AddressInput } from '../../components/map/AddressInput';
import { MapView } from '../../components/map/MapView';
import { Button } from '../../components/ui/Button';
import { KYIV_CENTER, reverseGeocode } from '../../api/geocode';
import { T } from '../../lib/labels';
import type { GeoPoint } from '../../types';

interface Props {
  value: GeoPoint | null;
  onChange: (p: GeoPoint | null) => void;
}

/** Локація пошуку (US 2.2): геолокація браузера → адреса з підказками → точка на карті. */
export function LocationPicker({ value, onChange }: Props) {
  const [text, setText] = useState(value?.label ?? '');
  const [showMap, setShowMap] = useState(false);
  const [geoState, setGeoState] = useState<'idle' | 'busy' | 'denied'>('idle');

  useEffect(() => setText(value?.label ?? ''), [value?.label]);

  const useMyLocation = () => {
    if (!('geolocation' in navigator)) {
      setGeoState('denied');
      return;
    }
    setGeoState('busy');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setGeoState('idle');
        onChange({ lat, lng, label: 'Моє місцезнаходження' });
        const label = await reverseGeocode(lat, lng);
        onChange({ lat, lng, label });
      },
      () => setGeoState('denied'),
      { timeout: 10_000, maximumAge: 60_000 },
    );
  };

  const pickOnMap = async (lat: number, lng: number) => {
    onChange({ lat, lng, label: 'Точка на карті' });
    onChange({ lat, lng, label: await reverseGeocode(lat, lng) });
  };

  return (
    <div className="flex flex-col gap-2">
      <AddressInput
        label="Локація"
        placeholder={T.locationPlaceholder}
        value={text}
        onTextChange={(t) => {
          setText(t);
          if (!t.trim() && value) onChange(null);
        }}
        onSelect={onChange}
      />
      {geoState === 'denied' && (
        <p role="status" className="text-ps text-muted">
          Доступ до геолокації відхилено. Введіть місто, район або оберіть точку на карті.
        </p>
      )}
      <div className="flex flex-wrap gap-x-4">
        <Button variant="link" className="!text-p" onClick={useMyLocation} loading={geoState === 'busy'}>
          Біля мене
        </Button>
        <Button variant="link" className="!text-p" onClick={() => setShowMap((s) => !s)} aria-expanded={showMap}>
          {showMap ? 'Сховати карту' : 'Точка на карті'}
        </Button>
        {value && (
          <Button variant="link" className="!text-p !text-muted" onClick={() => onChange(null)}>
            Очистити локацію
          </Button>
        )}
      </div>
      {showMap && (
        <MapView
          label="Карта для вибору точки пошуку"
          lat={value?.lat ?? KYIV_CENTER.lat}
          lng={value?.lng ?? KYIV_CENTER.lng}
          zoom={12}
          marker={!!value}
          onPick={pickOnMap}
          className="h-56 animate-fade-up"
        />
      )}
    </div>
  );
}
