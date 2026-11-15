import type { GeoPoint } from '../types';

/** Nominatim (OpenStreetMap): без ключа, але з обмеженням ≤1 запит/с — викликати лише через debounce. */
const BASE = 'https://nominatim.openstreetmap.org';
// Пріоритет — Київ (viewbox), але без жорсткого обмеження.
const KYIV_VIEWBOX = '30.23,50.59,30.83,50.21';

export const KYIV_CENTER: GeoPoint = { lat: 50.4501, lng: 30.5234, label: 'Київ, центр' };

let lastCall = 0;
async function throttle() {
  const wait = lastCall + 1100 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
}

interface NominatimItem {
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
}

function shortLabel(item: NominatimItem): string {
  const parts = item.display_name.split(',').map((s) => s.trim());
  return parts.slice(0, 3).join(', ');
}

export async function searchAddress(query: string, signal?: AbortSignal): Promise<GeoPoint[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  await throttle();
  const url = `${BASE}/search?format=jsonv2&limit=5&accept-language=uk&countrycodes=ua&viewbox=${KYIV_VIEWBOX}&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('Сервіс адрес тимчасово недоступний');
  const items = (await res.json()) as NominatimItem[];
  return items.map((i) => ({ lat: Number(i.lat), lng: Number(i.lon), label: shortLabel(i) }));
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    await throttle();
    const res = await fetch(`${BASE}/reverse?format=jsonv2&accept-language=uk&zoom=17&lat=${lat}&lon=${lng}`);
    if (!res.ok) throw new Error();
    const item = (await res.json()) as NominatimItem;
    return item.display_name ? shortLabel(item) : 'Точка на карті';
  } catch {
    return 'Точка на карті';
  }
}
