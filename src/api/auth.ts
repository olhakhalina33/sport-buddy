import { supabase, toApiError } from './supabase';
import type { Profile, SkillLevel } from '../types';

const AUTH_ERRORS: Record<string, string> = {
  'Invalid login credentials': 'Невірний email або пароль',
  'User already registered': 'Користувач з таким email уже існує',
  'Email not confirmed': 'Email не підтверджено. Перевірте пошту.',
};

function translate(e: { message: string }) {
  return new Error(AUTH_ERRORS[e.message] ?? toApiError(e).message);
}

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw translate(error);
}

export async function signUp(email: string, password: string, name: string, level: SkillLevel) {
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name, level } } });
  if (error) throw translate(error);
  return { needsConfirmation: !data.session };
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
  if (error) throw translate(error);
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function fetchProfile(id: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, level, avatar_url, rating')
    .eq('id', id)
    .maybeSingle();
  if (error) throw toApiError(error);
  return data as Profile | null;
}

/** Змінити свій рівень (RLS: лише власний профіль; grant дозволяє оновлювати name, level, avatar_url). */
export async function updateMyLevel(id: string, level: SkillLevel) {
  const { error } = await supabase.from('profiles').update({ level }).eq('id', id);
  if (error) throw toApiError(error);
}
