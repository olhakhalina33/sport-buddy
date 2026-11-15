import { describe, expect, it } from 'vitest';
import { formatWhen, hasStarted, isFreeCancel, HOUR } from './dates';

const now = new Date('2026-11-15T10:00:00Z'); // 12:00 за Києвом

describe('formatWhen', () => {
  it('сьогодні', () => expect(formatWhen('2026-11-15T17:00:00Z', now)).toBe('Сьогодні, 19:00'));
  it('завтра', () => expect(formatWhen('2026-11-16T05:30:00Z', now)).toBe('Завтра, 07:30'));
  it('день тижня в межах тижня', () => expect(formatWhen('2026-11-21T07:00:00Z', now)).toBe('Субота, 09:00'));
  it('далека дата', () => expect(formatWhen('2026-12-12T08:00:00Z', now)).toMatch(/^12 грудня, 10:00$/));
});

describe('скасування за 12 годин', () => {
  it('рівно 12 год — безкоштовно', () =>
    expect(isFreeCancel(new Date(now.getTime() + 12 * HOUR).toISOString(), now)).toBe(true));
  it('11 год 59 хв — уже ні', () =>
    expect(isFreeCancel(new Date(now.getTime() + 12 * HOUR - 60_000).toISOString(), now)).toBe(false));
});

describe('hasStarted', () => {
  it('за 1 с до початку — ще ні', () => expect(hasStarted(new Date(now.getTime() + 1000).toISOString(), now)).toBe(false));
  it('у момент початку — так', () => expect(hasStarted(now.toISOString(), now)).toBe(true));
});
