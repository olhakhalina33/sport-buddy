import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Navigate, useLocation } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { Select } from '../../components/ui/Select';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { useAuth } from '../../hooks/useAuth';
import { resetPassword, signIn, signUp } from '../../api/auth';
import { LEVELS, LEVEL_LABEL } from '../../lib/labels';
import { signInSchema, signUpSchema, type SignUpValues } from '../../lib/validation';

type Mode = 'signin' | 'signup';

export function AuthPage() {
  const { session } = useAuth();
  const location = useLocation();
  const [mode, setMode] = useState<Mode>('signin');
  const [serverError, setServerError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const form = useForm<SignUpValues>({
    resolver: zodResolver(mode === 'signin' ? (signInSchema as never) : signUpSchema),
    defaultValues: { email: '', password: '', name: '', level: 'beginner' },
  });
  const { register, handleSubmit, formState, getValues, trigger } = form;
  const errors = formState.errors;

  if (session) {
    const from = (location.state as { from?: string } | null)?.from ?? '/';
    return <Navigate to={from} replace />;
  }

  const onSubmit = handleSubmit(async (v) => {
    setServerError(null);
    setInfo(null);
    try {
      if (mode === 'signin') await signIn(v.email, v.password);
      else {
        const r = await signUp(v.email, v.password, v.name, v.level);
        if (r.needsConfirmation) setInfo('Ми надіслали лист для підтвердження email. Після підтвердження увійдіть.');
      }
    } catch (e) {
      setServerError((e as Error).message);
    }
  });

  const onForgot = async () => {
    setServerError(null);
    if (!(await trigger('email'))) return;
    try {
      await resetPassword(getValues('email'));
      setInfo('Якщо акаунт існує, ми надіслали лист для відновлення пароля.');
    } catch (e) {
      setServerError((e as Error).message);
    }
  };

  const switchMode = () => {
    setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
    setServerError(null);
    setInfo(null);
    form.clearErrors();
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-app flex-col justify-center px-6 py-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <h1 className="text-[40px] font-semibold leading-[120%] text-brand">Sport Buddy</h1>
      <p className="mb-6 mt-3 text-[16px] italic text-muted">Знайди компанію для тренування свого рівня</p>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 animate-fade-up" key={mode}>
        {mode === 'signup' && (
          <>
            <TextField label="Ім’я" autoComplete="name" error={errors.name?.message} {...register('name')} />
            <Select
              label="Рівень"
              options={LEVELS.map((l) => ({ value: l, label: LEVEL_LABEL[l] }))}
              {...register('level')}
            />
          </>
        )}
        <TextField label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <TextField
          label="Пароль"
          type="password"
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          error={errors.password?.message}
          {...register('password')}
        />
        {mode === 'signin' && (
          <div>
            <Button variant="link" className="!text-p !font-normal" onClick={onForgot}>
              Забули пароль?
            </Button>
          </div>
        )}
        {serverError && (
          <p role="alert" className="text-p text-danger">
            {serverError}
          </p>
        )}
        {info && (
          <p role="status" className="text-p text-accent">
            {info}
          </p>
        )}
        <Button type="submit" full loading={formState.isSubmitting}>
          {mode === 'signin' ? 'Увійти' : 'Зареєструватися'}
        </Button>
      </form>

      <p className="mt-5 text-center text-p text-muted">
        {mode === 'signin' ? 'Немає акаунта? ' : 'Вже є акаунт? '}
        <button type="button" onClick={switchMode} className="text-accent underline-offset-2 hover:underline">
          {mode === 'signin' ? 'Зареєструватися' : 'Увійти'}
        </button>
      </p>
    </main>
  );
}
