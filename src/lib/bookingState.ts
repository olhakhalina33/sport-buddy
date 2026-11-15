import type { BookingStatus, SkillLevel } from '../types';
import { BOOKING_STATUS_LABEL, LEVELS, LEVEL_LABEL, T } from './labels';
import { freeSeats } from './seats';

export type CardAction =
  | { kind: 'join'; label: string }
  | { kind: 'disabled'; label: string; hint?: string; tone?: 'muted' | 'error'; canCancel?: boolean }
  | { kind: 'organizer'; label: string };

interface Input {
  isOrganizer: boolean;
  myStatus: BookingStatus | null;
  capacity: number;
  confirmedCount: number;
  started: boolean;
  cancelled: boolean;
}

/** Що показати на головній кнопці картки (US 2.3). Порядок перевірок важливий. */
export function cardAction(i: Input): CardAction {
  if (i.isOrganizer) return { kind: 'organizer', label: 'Ви організатор' };
  if (i.myStatus === 'confirmed') {
    return { kind: 'disabled', label: T.booked, hint: T.bookedHint, canCancel: !i.started };
  }
  if (i.myStatus === 'pending') {
    return {
      kind: 'disabled',
      label: BOOKING_STATUS_LABEL.pending,
      hint: 'Заявку надіслано Організатору. Місце закріпиться після підтвердження.',
      canCancel: !i.started,
    };
  }
  if (i.myStatus === 'rejected') {
    return { kind: 'disabled', label: BOOKING_STATUS_LABEL.rejected, hint: 'Організатор відхилив заявку.' };
  }
  if (i.myStatus === 'cancelled') {
    return { kind: 'disabled', label: BOOKING_STATUS_LABEL.cancelled, hint: 'Повторна заявка на це тренування неможлива.' };
  }
  if (i.cancelled) return { kind: 'disabled', label: 'Тренування скасовано' };
  if (i.started) return { kind: 'disabled', label: 'Тренування вже почалося' };
  if (freeSeats(i.capacity, i.confirmedCount) === 0) {
    return { kind: 'disabled', label: T.noSeats, hint: 'Спробуйте інше тренування.', tone: 'error' };
  }
  return { kind: 'join', label: T.join };
}

/** Попередження перед записом, якщо рівень тренування вищий за рівень користувача. Запис не блокує. */
export function levelWarning(trainingLevel: SkillLevel, userLevel: SkillLevel | null | undefined): string | null {
  if (!userLevel || LEVELS.indexOf(trainingLevel) <= LEVELS.indexOf(userLevel)) return null;
  const l = (x: SkillLevel) => LEVEL_LABEL[x].toLowerCase();
  return `Це тренування рівня «${l(trainingLevel)}», твій рівень — «${l(userLevel)}». Все одно записатися?`;
}
