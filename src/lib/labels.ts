import type { BookingStatus, JoinMode, SkillLevel, Sport } from '../types';

export const SPORTS: Sport[] = ['run', 'tennis', 'football', 'cycling'];
export const LEVELS: SkillLevel[] = ['beginner', 'intermediate', 'advanced'];

export const SPORT_LABEL: Record<Sport, string> = {
  run: 'Біг',
  tennis: 'Теніс',
  football: 'Футбол',
  cycling: 'Велоспорт',
};

export const LEVEL_LABEL: Record<SkillLevel, string> = {
  beginner: 'Новачок',
  intermediate: 'Середній',
  advanced: 'Просунутий',
};

export const JOIN_MODE_LABEL: Record<JoinMode, string> = {
  auto: 'Автоприйом',
  approval: 'За підтвердженням',
};

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  pending: 'Очікує рішення',
  confirmed: 'Підтверджено',
  rejected: 'Відхилено',
  cancelled: 'Скасовано',
};

/** Тексти зі SPEC — дослівно. */
export const T = {
  noSeats: 'Місць немає',
  booked: 'Ви записані',
  bookedHint: 'Місце закріплено за вами. Чат учасників відкрито.',
  join: 'Забронювати слот',
  limitReached: 'Ліміт учасників досягнуто',
  notFound: 'Тренувань не знайдено',
  resetFilters: 'Скинути фільтри',
  stale: 'Дані можуть бути неактуальними',
  locationPlaceholder: 'Місто, район або точка на карті',
  freeCancel: 'Скасування безкоштовне не пізніше ніж за 12 годин до початку.',
  errMinLimit: 'Мінімальний ліміт – 2 учасники',
  errMaxLimit: 'Максимальний ліміт – 50 учасників',
  errStartTooSoon: 'Початок не раніше ніж через 1 годину',
  errStartTooLate: 'Початок не пізніше ніж через 90 днів',
  errPlace: 'Вкажіть місце збору',
  errDuplicate: 'Таке тренування вже існує',
} as const;
