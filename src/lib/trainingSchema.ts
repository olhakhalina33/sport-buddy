import { z } from 'zod';
import { T } from './labels';
import { DAY, HOUR } from './dates';

/** Валідація форми «Нове тренування» (US 1.1). `now` — для детермінованих тестів. Ті самі правила дублює RPC create_training. */
export function makeTrainingSchema(now: () => Date = () => new Date()) {
  return z
    .object({
      title: z.string().trim().max(80, 'Назва – не більше 80 символів'),
      sport: z.enum(['run', 'tennis', 'football', 'cycling']),
      level: z.enum(['beginner', 'intermediate', 'advanced']),
      startsAt: z.string().min(1, 'Вкажіть дату й час'),
      placeText: z.string(),
      place: z.object({ lat: z.number(), lng: z.number(), label: z.string() }).nullable(),
      capacity: z
        .number({ invalid_type_error: 'Вкажіть ліміт учасників' })
        .int('Ліміт – ціле число')
        .min(2, T.errMinLimit)
        .max(50, T.errMaxLimit),
      description: z.string().max(500, 'Опис – не більше 500 символів'),
      joinMode: z.enum(['auto', 'approval']),
    })
    .superRefine((v, ctx) => {
      if (v.startsAt) {
        const t = new Date(v.startsAt).getTime();
        const n = now().getTime();
        if (Number.isNaN(t)) ctx.addIssue({ code: 'custom', path: ['startsAt'], message: 'Некоректна дата' });
        else if (t < n + HOUR) ctx.addIssue({ code: 'custom', path: ['startsAt'], message: T.errStartTooSoon });
        else if (t > n + 90 * DAY) ctx.addIssue({ code: 'custom', path: ['startsAt'], message: T.errStartTooLate });
      }
      if (!v.place) {
        ctx.addIssue({
          code: 'custom',
          path: ['placeText'],
          message: v.placeText.trim()
            ? 'Адресу не розпізнано. Оберіть варіант зі списку або точку на карті'
            : T.errPlace,
        });
      }
    });
}

export type TrainingFormValues = z.infer<ReturnType<typeof makeTrainingSchema>>;
