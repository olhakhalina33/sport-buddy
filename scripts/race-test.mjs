// Гонка за останнє місце (US 2.3 п.5) + правила заявки — проти реальної БД.
// Створює окреме тренування (ліміт 2 → 1 вільне місце, автоприйом), 5 користувачів
// одночасно тиснуть «Записатися». Очікування: рівно один «Підтверджено», решта — «Місць немає».
import { check, done, login } from './lib.mjs';

const org = await login('andriy@sportbuddy.test');
const racers = await Promise.all(
  ['olga', 'maria', 'taras', 'lilia', 'nazar'].map((n) => login(`${n}@sportbuddy.test`)),
);

const startsAt = new Date(Date.now() + 3 * 3600_000 + Math.floor(Math.random() * 600) * 60_000);
const { data: tid, error: createErr } = await org.client.rpc('create_training', {
  p_sport: 'tennis', p_level: 'intermediate', p_starts_at: startsAt.toISOString(),
  p_place_name: '[тест гонки] Корт', p_lat: 50.4 + Math.random() / 100, p_lng: 30.5 + Math.random() / 100,
  p_capacity: 2, p_description: null, p_join_mode: 'auto', p_title: '[тест] Гонка за останнє місце',
});
if (createErr) throw createErr;
check('створено тренування з лімітом 2 (вільно 1)', !!tid);

try {
  // ── Гонка ──
  const results = await Promise.allSettled(racers.map((r) => r.client.rpc('book_training', { p_training_id: tid })));
  const outcomes = results.map((r) => (r.value?.error ? `помилка: ${r.value.error.message}` : r.value?.data));
  console.log('   результати 5 одночасних заявок:', outcomes);
  const winners = outcomes.filter((o) => o === 'confirmed');
  const losers = outcomes.filter((o) => o === 'помилка: Місць немає');
  check('рівно одна заявка «Підтверджено»', winners.length === 1);
  check('решта 4 отримали «Місць немає»', losers.length === 4);

  const { data: parts } = await org.client.rpc('get_participants', { p_training_id: tid });
  check('учасників: Організатор + 1', parts.length === 2);
  const { data: row } = await org.client.from('trainings').select('confirmed_count, capacity').eq('id', tid).single();
  check('confirmed_count = 1, вільно 0', row.confirmed_count === 1 && row.capacity - 1 - row.confirmed_count === 0);

  // ── Подвійний клік переможця: дубліката немає, повертається поточний статус ──
  const winner = racers[outcomes.indexOf('confirmed')];
  const dbl = await Promise.all([1, 2].map(() => winner.client.rpc('book_training', { p_training_id: tid })));
  check('повторна/подвійна заявка → поточний статус, без помилки', dbl.every((r) => r.data === 'confirmed' && !r.error));
  const { data: myRows } = await winner.client.from('bookings').select('id').eq('training_id', tid);
  check('у БД одна заявка переможця', myRows.length === 1);

  // ── Організатор не може записатися на власне ──
  const own = await org.client.rpc('book_training', { p_training_id: tid });
  check('Організатор на власне → заборонено', own.error?.message === 'Організатор не може подати заявку на власне тренування');

  // ── Скасування підтвердженої звільняє місце ──
  const c = await winner.client.rpc('cancel_booking', { p_training_id: tid });
  const { data: row2 } = await org.client.from('trainings').select('confirmed_count').eq('id', tid).single();
  check('скасування підтвердженої → «Скасовано», +1 місце', c.data?.status === 'cancelled' && row2.confirmed_count === 0);
  check('пізнє скасування (< 12 год) позначено', c.data?.late === true);

  // ── Звільнене місце знову доступне іншому ──
  const loser = racers.find((r) => r !== winner);
  const again = await loser.client.rpc('book_training', { p_training_id: tid });
  check('звільнене місце може зайняти інший', again.data === 'confirmed');

  // ── Прямий запис у таблиці з клієнта заборонено ──
  const direct = await loser.client.from('bookings').insert({ training_id: tid, user_id: loser.id, status: 'confirmed' });
  check('прямий INSERT у bookings заборонено', !!direct.error, direct.error?.message);
  const hack = await org.client.from('trainings').update({ confirmed_count: 0 }).eq('id', tid).select();
  check('прямий UPDATE trainings заборонено', !!hack.error || (hack.data ?? []).length === 0, hack.error?.message);
} finally {
  const { error } = await org.client.rpc('cancel_training', { p_training_id: tid });
  console.log(error ? `⚠ не вдалося прибрати тестове тренування: ${error.message}` : '   (тестове тренування скасовано й приховано з пошуку)');
}

done();
