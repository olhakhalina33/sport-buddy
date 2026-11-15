import type { SearchFilters, SkillLevel, SortMode, Sport } from '../types';
import { LEVELS, SPORTS } from './labels';

/** Радіус «поруч» за замовчуванням, коли обрано точку. */
export const DEFAULT_RADIUS_KM = 10;

export const EMPTY_FILTERS: SearchFilters = { sports: [], levels: [], sort: 'time', location: null };

function pickList<T extends string>(raw: string | null, allowed: readonly T[]): T[] {
  if (!raw) return [];
  const set = new Set(raw.split(',').map((s) => s.trim()));
  return allowed.filter((v) => set.has(v)); // відкидаємо сміття з URL, порядок — канонічний
}

/** URL → фільтри. Невалідні значення ігноруються. */
export function parseFilters(params: URLSearchParams): SearchFilters {
  const lat = Number(params.get('lat'));
  const lng = Number(params.get('lng'));
  const hasLoc =
    params.has('lat') && params.has('lng') && Number.isFinite(lat) && Number.isFinite(lng) &&
    Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  const location = hasLoc ? { lat, lng, label: params.get('place') ?? 'Обрана точка' } : null;
  const sortRaw = params.get('sort');
  const sort: SortMode = sortRaw === 'distance' && location ? 'distance' : 'time';
  return {
    sports: pickList<Sport>(params.get('sport'), SPORTS),
    levels: pickList<SkillLevel>(params.get('level'), LEVELS),
    sort,
    location,
  };
}

/** Параметри URL, наявність яких означає «фільтри задано явно». */
const FILTER_KEYS = ['sport', 'level', 'lat', 'lng'] as const;

export function hasUrlFilters(params: URLSearchParams): boolean {
  return FILTER_KEYS.some((k) => params.has(k));
}

/**
 * Фільтри екрана пошуку: якщо в URL є будь-який фільтр — URL має пріоритет,
 * інакше початковий рівень береться з профілю.
 */
export function resolveFilters(params: URLSearchParams, profileLevel: SkillLevel | null | undefined): SearchFilters {
  if (hasUrlFilters(params) || !profileLevel) return parseFilters(params);
  return { ...EMPTY_FILTERS, levels: [profileLevel] };
}

/**
 * Фільтри → URL. `level` пишемо завжди (`all`, якщо рівень не обрано): після будь-якої дії
 * користувача, зокрема «Скинути фільтри», URL фіксує вибір і рівень з профілю вже не підставляється.
 */
export function serializeFilters(f: SearchFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.sports.length) p.set('sport', f.sports.join(','));
  p.set('level', f.levels.length ? f.levels.join(',') : 'all');
  if (f.location) {
    p.set('lat', f.location.lat.toFixed(5));
    p.set('lng', f.location.lng.toFixed(5));
    p.set('place', f.location.label);
    if (f.sort === 'distance') p.set('sort', 'distance');
  }
  return p;
}

export function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function hasActiveFilters(f: SearchFilters): boolean {
  return f.sports.length > 0 || f.levels.length > 0 || f.location !== null;
}

/** Параметри RPC search_trainings («І» між категоріями, «АБО» всередині — у SQL). */
export function toRpcParams(f: SearchFilters) {
  return {
    p_sports: f.sports.length ? f.sports : null,
    p_levels: f.levels.length ? f.levels : null,
    p_lat: f.location?.lat ?? null,
    p_lng: f.location?.lng ?? null,
    p_radius_km: f.location ? DEFAULT_RADIUS_KM : null,
    p_sort: f.sort,
  };
}

/** «Знайдено 3 тренування» з правильною формою множини. */
export function foundLabel(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  const word = m10 === 1 && m100 !== 11 ? 'тренування' : 'тренувань';
  const w = m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 'тренування' : word;
  return `Знайдено ${n} ${w}`;
}
