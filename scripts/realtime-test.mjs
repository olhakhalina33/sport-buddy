// US 2.4: зміни лічильника/учасників доходять до іншого клієнта через Realtime ≤ 2 с.
// Також: нове повідомлення чату доходить учаснику, але НЕ сторонньому (RLS у Realtime).
import { check, done, login } from './lib.mjs';

const org = await login('andriy@sportbuddy.test');
const [viewer, booker, stranger] = await Promise.all(['olga', 'taras', 'maria'].map((n) => login(`${n}@sportbuddy.test`)));

const { data: tid, error } = await org.client.rpc('create_training', {
  p_sport: 'run', p_level: 'beginner',
  p_starts_at: new Date(Date.now() + 6 * 3600_000 + Math.floor(Math.random() * 1000) * 60_000).toISOString(),
  p_place_name: '[тест realtime] Парк', p_lat: 50.42 + Math.random() / 100, p_lng: 30.52 + Math.random() / 100,
  p_capacity: 5, p_description: null, p_join_mode: 'auto', p_title: '[тест] Realtime',
});
if (error) throw error;

// Готовність — system-подія postgres_changes:ok (а не статус SUBSCRIBED), як і в useRealtime.
const subscribe = (client, table, filter, event, onEvent) =>
  new Promise((resolve, reject) => {
    const ch = client
      .channel(`t-${Math.random()}`)
      .on('system', {}, (p) => {
        if (p.extension === 'postgres_changes') (p.status === 'ok' ? resolve(ch) : reject(new Error(p.message)));
      })
      .on('postgres_changes', { event, schema: 'public', table, filter }, onEvent)
      .subscribe((s) => (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' ? reject(new Error(s)) : null));
  });
const waitFor = (pred, ms = 5000) =>
  new Promise((resolve) => {
    const start = Date.now();
    const i = setInterval(() => {
      if (pred() || Date.now() - start > ms) { clearInterval(i); resolve(); }
    }, 20);
  });

try {
  // ── Лічильник місць: глядач бачить запис іншого користувача ──
  let gotAt = null;
  let newCount = null;
  const ch1 = await subscribe(viewer.client, 'trainings', `id=eq.${tid}`, 'UPDATE', (p) => {
    gotAt ??= Date.now();
    newCount = p.new.confirmed_count;
  });
  const t0 = Date.now();
  await booker.client.rpc('book_training', { p_training_id: tid });
  await waitFor(() => gotAt);
  const latency = gotAt ? gotAt - t0 : null;
  check('глядач отримав подію про новий запис', gotAt !== null && newCount === 1, `confirmed_count=${newCount}`);
  check('затримка ≤ 2 с', latency !== null && latency <= 2000, `${latency} мс`);

  // Скасування теж доходить
  gotAt = null;
  const t1 = Date.now();
  await booker.client.rpc('cancel_booking', { p_training_id: tid });
  await waitFor(() => gotAt);
  check('скасування доходить ≤ 2 с, вільне місце повернулось', gotAt && gotAt - t1 <= 2000 && newCount === 0, `${gotAt ? gotAt - t1 : '—'} мс`);

  // ── Чат: учасник отримує, сторонній — ні ──
  await viewer.client.rpc('book_training', { p_training_id: tid }); // глядач стає учасником
  let viewerMsg = null;
  let strangerMsg = null;
  const ch2 = await subscribe(viewer.client, 'messages', `training_id=eq.${tid}`, 'INSERT', (p) => { viewerMsg = { at: Date.now(), body: p.new.body }; });
  const ch3 = await subscribe(stranger.client, 'messages', `training_id=eq.${tid}`, 'INSERT', (p) => { strangerMsg = p.new; });
  const t2 = Date.now();
  await org.client.from('messages').insert({ training_id: tid, body: 'Збір о 18:50' });
  await waitFor(() => viewerMsg, 4000);
  await new Promise((r) => setTimeout(r, 1500)); // даємо шанс «витоку» до стороннього
  check('учасник отримав повідомлення чату в реальному часі', viewerMsg?.body === 'Збір о 18:50', `${viewerMsg ? viewerMsg.at - t2 : '—'} мс`);
  check('сторонній НЕ отримав повідомлення через Realtime', strangerMsg === null);

  for (const c of [ch1, ch2, ch3]) await c.unsubscribe();
} finally {
  await org.client.rpc('cancel_training', { p_training_id: tid });
  for (const c of [viewer, booker, stranger, org]) c.client.removeAllChannels();
}

done();
