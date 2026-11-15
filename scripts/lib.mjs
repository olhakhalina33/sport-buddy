// Спільне для інтеграційних скриптів: читає .env.local і створює клієнтів, увійшовши тестовими акаунтами.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  const env = {};
  for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

const env = loadEnv();
const URL_ = env.VITE_SUPABASE_URL;
const KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const PASSWORD = 'Test1234!';

export function anonClient() {
  return createClient(URL_, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function login(email) {
  const c = anonClient();
  const { data, error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`login ${email}: ${error.message}`);
  return { client: c, id: data.user.id };
}

let failed = 0;
export function check(name, ok, details = '') {
  console.log(`${ok ? '✅' : '❌'} ${name}${details ? ` — ${details}` : ''}`);
  if (!ok) failed++;
}
export function done() {
  console.log(failed ? `\n${failed} перевірок не пройдено` : '\nУсі перевірки пройдено');
  process.exit(failed ? 1 : 0);
}
