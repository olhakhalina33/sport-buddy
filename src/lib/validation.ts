import { z } from 'zod';

export const signInSchema = z.object({
  email: z.string().trim().min(1, 'Вкажіть email').email('Некоректний email'),
  password: z.string().min(1, 'Вкажіть пароль'),
});

export const signUpSchema = signInSchema.extend({
  name: z.string().trim().min(2, 'Вкажіть ім’я (мінімум 2 символи)').max(60, 'Ім’я – не більше 60 символів'),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  password: z.string().min(8, 'Пароль – мінімум 8 символів'),
});

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
