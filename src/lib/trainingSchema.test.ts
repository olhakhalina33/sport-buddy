import { describe, expect, it } from 'vitest';
import { makeTrainingSchema, type TrainingFormValues } from './trainingSchema';
import { toLocalInput, HOUR, DAY } from './dates';

const NOW = new Date('2026-11-15T10:00:00');
const schema = makeTrainingSchema(() => NOW);
const at = (ms: number) => toLocalInput(new Date(NOW.getTime() + ms));

const valid: TrainingFormValues = {
  title: '',
  sport: 'run',
  level: 'intermediate',
  startsAt: at(2 * HOUR),
  placeText: 'Парк Наталка',
  place: { lat: 50.507, lng: 30.516, label: 'Парк Наталка' },
  capacity: 10,
  description: '',
  joinMode: 'approval',
};

function errorsOf(patch: Partial<TrainingFormValues>) {
  const r = schema.safeParse({ ...valid, ...patch });
  return r.success ? {} : Object.fromEntries(r.error.issues.map((i) => [i.path.join('.'), i.message]));
}

describe('US 1.1 — валідація створення тренування', () => {
  it('1. коректні дані → без помилок', () => expect(errorsOf({})).toEqual({}));
  it('2. ліміт 1 → «Мінімальний ліміт – 2 учасники»', () =>
    expect(errorsOf({ capacity: 1 }).capacity).toBe('Мінімальний ліміт – 2 учасники'));
  it('3. ліміт 51 → «Максимальний ліміт – 50 учасників»', () =>
    expect(errorsOf({ capacity: 51 }).capacity).toBe('Максимальний ліміт – 50 учасників'));
  it('4. межі 2 і 50 — допустимі', () => {
    expect(errorsOf({ capacity: 2 })).toEqual({});
    expect(errorsOf({ capacity: 50 })).toEqual({});
  });
  it('5. початок через 30 хв → «Початок не раніше ніж через 1 годину»', () =>
    expect(errorsOf({ startsAt: at(30 * 60_000) }).startsAt).toBe('Початок не раніше ніж через 1 годину'));
  it('6. початок через 91 день → «Початок не пізніше ніж через 90 днів»', () =>
    expect(errorsOf({ startsAt: at(91 * DAY) }).startsAt).toBe('Початок не пізніше ніж через 90 днів'));
  it('6a. межі: рівно +1 год і рівно +90 днів — допустимі', () => {
    expect(errorsOf({ startsAt: at(HOUR) })).toEqual({});
    expect(errorsOf({ startsAt: at(90 * DAY) })).toEqual({});
  });
  it('7. без місця → «Вкажіть місце збору»', () =>
    expect(errorsOf({ place: null, placeText: '' }).placeText).toBe('Вкажіть місце збору'));
  it('7a. нерозпізнана адреса (текст без координат) → помилка', () =>
    expect(errorsOf({ place: null, placeText: 'фывапр' }).placeText).toMatch(/Адресу не розпізнано/));
  it('8. опис 501 символ → помилка; 500 — ок', () => {
    expect(errorsOf({ description: 'а'.repeat(501) }).description).toBe('Опис – не більше 500 символів');
    expect(errorsOf({ description: 'а'.repeat(500) })).toEqual({});
  });
  it('ліміт не ціле / не число', () => {
    expect(errorsOf({ capacity: 2.5 }).capacity).toBe('Ліміт – ціле число');
    expect(errorsOf({ capacity: NaN }).capacity).toBeDefined();
  });
  it('опис з HTML приймається як звичайний текст (екранування — при рендері)', () =>
    expect(errorsOf({ description: '<script>alert(1)</script>' })).toEqual({}));
});
