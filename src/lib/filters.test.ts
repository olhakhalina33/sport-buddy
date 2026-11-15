import { describe, expect, it } from 'vitest';
import { DEFAULT_RADIUS_KM, foundLabel, parseFilters, serializeFilters, toRpcParams, toggle } from './filters';

const parse = (q: string) => parseFilters(new URLSearchParams(q));

describe('фільтри в URL', () => {
  it('SPEC: біг + новачок', () => {
    expect(parse('sport=run&level=beginner')).toMatchObject({ sports: ['run'], levels: ['beginner'] });
  });
  it('SPEC: теніс,велоспорт + середній («АБО» всередині категорії)', () => {
    const f = parse('sport=tennis,cycling&level=intermediate');
    expect(f.sports).toEqual(['tennis', 'cycling']);
    expect(toRpcParams(f)).toMatchObject({ p_sports: ['tennis', 'cycling'], p_levels: ['intermediate'] });
  });
  it('SPEC: велоспорт + просунутий', () => {
    expect(toRpcParams(parse('sport=cycling&level=advanced'))).toMatchObject({
      p_sports: ['cycling'],
      p_levels: ['advanced'],
    });
  });
  it('порожні категорії → null (без фільтра)', () => {
    expect(toRpcParams(parse(''))).toMatchObject({ p_sports: null, p_levels: null, p_lat: null, p_radius_km: null });
  });
  it('сміття в URL ігнорується', () => {
    expect(parse('sport=run,chess,<script>&level=pro')).toMatchObject({ sports: ['run'], levels: [] });
  });
  it('сортування за відстанню лише з локацією', () => {
    expect(parse('sort=distance').sort).toBe('time');
    expect(parse('sort=distance&lat=50.45&lng=30.52').sort).toBe('distance');
  });
  it('некоректні координати відкидаються', () => {
    expect(parse('lat=999&lng=30').location).toBeNull();
    expect(parse('lat=abc&lng=30').location).toBeNull();
  });
  it('локація → радіус за замовчуванням', () => {
    expect(toRpcParams(parse('lat=50.45&lng=30.52&place=Поділ')).p_radius_km).toBe(DEFAULT_RADIUS_KM);
  });
  it('round-trip: serialize → parse', () => {
    const f = parse('sport=football,run&level=advanced&lat=50.45&lng=30.52&place=Оболонь&sort=distance');
    expect(parseFilters(serializeFilters(f))).toEqual(f);
  });
});

describe('toggle', () => {
  it('додає і знімає', () => {
    expect(toggle(['run'], 'tennis')).toEqual(['run', 'tennis']);
    expect(toggle(['run', 'tennis'], 'run')).toEqual(['tennis']);
  });
});

describe('foundLabel', () => {
  it.each([
    [1, 'Знайдено 1 тренування'],
    [3, 'Знайдено 3 тренування'],
    [5, 'Знайдено 5 тренувань'],
    [11, 'Знайдено 11 тренувань'],
    [21, 'Знайдено 21 тренування'],
    [12, 'Знайдено 12 тренувань'],
  ])('%i', (n, s) => expect(foundLabel(n)).toBe(s));
});
