const TZ = 'Europe/Kyiv';

function dayKey(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: TZ });
}

/** «Сьогодні, 19:00», «Завтра, 07:30», «Субота, 09:00», «12 грудня, 10:00». */
export function formatWhen(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString('uk-UA', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
  const today = dayKey(now);
  const tomorrow = dayKey(new Date(now.getTime() + 86_400_000));
  const key = dayKey(d);
  let day: string;
  if (key === today) day = 'Сьогодні';
  else if (key === tomorrow) day = 'Завтра';
  else if (d.getTime() - now.getTime() < 6 * 86_400_000 && d > now) {
    const w = d.toLocaleDateString('uk-UA', { timeZone: TZ, weekday: 'long' });
    day = w.charAt(0).toUpperCase() + w.slice(1);
  } else {
    day = d.toLocaleDateString('uk-UA', { timeZone: TZ, day: 'numeric', month: 'long' });
  }
  return `${day}, ${time}`;
}

export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;

/** Чи безкоштовне скасування (не пізніше ніж за 12 годин до початку). */
export function isFreeCancel(startsAt: string, now: Date = new Date()): boolean {
  return new Date(startsAt).getTime() - now.getTime() >= 12 * HOUR;
}

export function hasStarted(startsAt: string, now: Date = new Date()): boolean {
  return new Date(startsAt).getTime() <= now.getTime();
}

/** Значення для <input type="datetime-local"> у локальному часі. */
export function toLocalInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
