import { describe, expect, it } from 'vitest';
import { freeSeats, initials, seatsLabel } from './seats';

describe('freeSeats: ліміт − (1 Організатор + підтверджені)', () => {
  it('нове тренування: вільно = ліміт − 1', () => expect(freeSeats(10, 0)).toBe(9));
  it('SPEC: 4 з 10 зайнято (Орг + 3) → вільно 6; підтвердження → 5', () => {
    expect(freeSeats(10, 3)).toBe(6);
    expect(freeSeats(10, 4)).toBe(5);
  });
  it('футбол 10, зайнято 10 → 0', () => expect(freeSeats(10, 9)).toBe(0));
  it('ліміт 2 → одне вільне місце', () => expect(freeSeats(2, 0)).toBe(1));
  it('ліміт 50 → 49', () => expect(freeSeats(50, 0)).toBe(49));
  it('ніколи не від’ємне', () => expect(freeSeats(5, 10)).toBe(0));
});

describe('seatsLabel', () => {
  it('«Вільно: N з M»', () => expect(seatsLabel(10, 6)).toBe('Вільно: 3 з 10'));
  it('«Місць немає» при 0', () => expect(seatsLabel(10, 9)).toBe('Місць немає'));
});

describe('initials', () => {
  it('ім’я + прізвище', () => expect(initials('Марія Шевчук')).toBe('МШ'));
  it('скорочення з крапкою', () => expect(initials('Андрій К.')).toBe('АК'));
  it('одне слово', () => expect(initials('ольга')).toBe('О'));
  it('порожнє', () => expect(initials('  ')).toBe('?'));
});
