import { describe, expect, it } from 'vitest';
import { cardAction } from './bookingState';

const base = { isOrganizer: false, myStatus: null, capacity: 10, confirmedCount: 3, started: false, cancelled: false };

describe('кнопка картки (US 2.3)', () => {
  it('є місця → «Записатися»', () => expect(cardAction(base)).toEqual({ kind: 'join', label: 'Записатися' }));
  it('SPEC: 0 вільних → неактивна «Місць немає»', () =>
    expect(cardAction({ ...base, confirmedCount: 9 })).toMatchObject({ kind: 'disabled', label: 'Місць немає' }));
  it('SPEC: Організатор на власне → заборонено', () =>
    expect(cardAction({ ...base, isOrganizer: true }).kind).toBe('organizer'));
  it('підтверджено → «Ви записані» + підказка зі SPEC', () =>
    expect(cardAction({ ...base, myStatus: 'confirmed' })).toMatchObject({
      label: 'Ви записані',
      hint: 'Місце закріплено за вами. Чат учасників відкрито.',
      canCancel: true,
    }));
  it('підтверджено, навіть якщо тепер 0 вільних — показуємо свій статус', () =>
    expect(cardAction({ ...base, myStatus: 'confirmed', confirmedCount: 9 }).label).toBe('Ви записані'));
  it('SPEC: повторна заявка → показується поточний статус', () =>
    expect(cardAction({ ...base, myStatus: 'pending' })).toMatchObject({ label: 'Очікує рішення', canCancel: true }));
  it('відхилено / скасовано — без повторної заявки', () => {
    expect(cardAction({ ...base, myStatus: 'rejected' }).kind).toBe('disabled');
    expect(cardAction({ ...base, myStatus: 'cancelled' }).label).toBe('Скасовано');
  });
  it('тренування почалося → не можна записатися й скасувати', () => {
    expect(cardAction({ ...base, started: true }).label).toBe('Тренування вже почалося');
    expect(cardAction({ ...base, started: true, myStatus: 'confirmed' })).toMatchObject({ canCancel: false });
  });
});
