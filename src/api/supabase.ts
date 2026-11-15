import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isConfigured = Boolean(url && key && !url.includes('your-project-ref'));

/** Єдиний клієнт Supabase. Якщо змінних немає — застосунок показує екран налаштування. */
export const supabase: SupabaseClient = createClient(
  isConfigured ? url! : 'http://localhost:54321',
  isConfigured ? key! : 'missing-key',
);

/** Помилка з бекенду → зрозумілий текст + поле форми (RPC передають його в hint). */
export class ApiError extends Error {
  field?: string;
  constructor(message: string, field?: string) {
    super(message);
    this.field = field;
  }
}

interface PgErr {
  message: string;
  hint?: string | null;
}

export function toApiError(e: PgErr | null | unknown): ApiError {
  if (e && typeof e === 'object' && 'message' in e) {
    const err = e as PgErr;
    if (/Failed to fetch|NetworkError|fetch failed/i.test(err.message)) {
      return new ApiError('Немає з’єднання з сервером. Перевірте інтернет і спробуйте ще раз.');
    }
    return new ApiError(err.message, err.hint ?? undefined);
  }
  return new ApiError('Сталася невідома помилка');
}
