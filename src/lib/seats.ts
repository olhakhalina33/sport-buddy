/** Вільні місця = ліміт − (1 Організатор + підтверджені). Очікуючі місце не займають. */
export function freeSeats(capacity: number, confirmedCount: number): number {
  return Math.max(0, capacity - 1 - confirmedCount);
}

/** «Вільно: N з M» або «Місць немає». */
export function seatsLabel(capacity: number, confirmedCount: number): string {
  const free = freeSeats(capacity, confirmedCount);
  return free === 0 ? 'Місць немає' : `Вільно: ${free} з ${capacity}`;
}

/**
 * Ініціали для аватара: «Марія Шевчук» → «МШ», «Андрій К.» → «АК».
 * Без літер — перший непробільний символ («007» → «0»), для порожнього імені — порожній рядок (не «?»).
 */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((p) => p.replace(/[^\p{L}]/gu, '').charAt(0));
  return letters.join('').toUpperCase() || (parts[0]?.charAt(0) ?? '');
}

/** Стабільний колір аватара (teal/orange) за іменем. */
export function avatarTone(name: string): 'teal' | 'orange' {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(h) % 2 === 0 ? 'teal' : 'orange';
}
