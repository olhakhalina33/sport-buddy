// US 1.1/1.2 + RLS проти реальної БД: валідація в БД, рішення Організатора, сповіщення,
// гонка підтверджень за останнє місце, доступ стороннього до чужих заявок і чату.
import { check, done, login } from './lib.mjs';

const org = await login('andriy@sportbuddy.test');
const [a, b, stranger] = await Promise.all(['taras', 'lilia', 'olga'].map((n) => login(`${n}@sportbuddy.test`)));
const created = [];

const base = () => ({
  p_sport: 'run', p_level: 'beginner',
  p_starts_at: new Date(Date.now() + 5 * 3600_000 + Math.floor(Math.random() * 1000) * 60_000).toISOString(),
  p_place_name: '[тест RLS] Парк', p_lat: 50.41 + Math.random() / 100, p_lng: 30.51 + Math.random() / 100,
  p_capacity: 2, p_description: null, p_join_mode: 'approval', p_title: '[тест] RLS і заявки',
});
const create = async (patch = {}) => {
  const r = await org.client.rpc('create_training', { ...base(), ...patch });
  if (r.data) created.push(r.data);
  return r;
};

try {
  // ── US 1.1: валідація на рівні БД (обхід клієнта) ──
  const cases = [
    [{ p_capacity: 1 }, 'Мінімальний ліміт – 2 учасники'],
    [{ p_capacity: 51 }, 'Максимальний ліміт – 50 учасників'],
    [{ p_starts_at: new Date(Date.now() + 30 * 60_000).toISOString() }, 'Початок не раніше ніж через 1 годину'],
    [{ p_starts_at: new Date(Date.now() + 91 * 86400_000).toISOString() }, 'Початок не пізніше ніж через 90 днів'],
    [{ p_lat: null }, 'Вкажіть місце збору'],
    [{ p_description: 'а'.repeat(501) }, 'Опис – не більше 500 символів'],
  ];
  for (const [patch, msg] of cases) {
    const r = await create(patch);
    check(`БД відхиляє: ${msg}`, r.error?.message === msg, r.error?.message);
  }
  const ok50 = await create({ p_capacity: 50 });
  check('ліміт 50 приймається', !!ok50.data);

  const dupArgs = base();
  const first = await create(dupArgs);
  const dup = await create(dupArgs);
  check('дублікат → «Таке тренування вже існує»', !!first.data && dup.error?.message === 'Таке тренування вже існує');

  // ── US 1.2: заявки за підтвердженням ──
  const { data: tid } = await create(); // ліміт 2 → 1 вільне
  const sa = await a.client.rpc('book_training', { p_training_id: tid });
  const sb = await b.client.rpc('book_training', { p_training_id: tid });
  check('за підтвердженням → «Очікує рішення», слот не зайнято', sa.data === 'pending' && sb.data === 'pending');
  const { data: t0 } = await org.client.from('trainings').select('confirmed_count').eq('id', tid).single();
  check('очікуючі місце не займають (confirmed_count = 0)', t0.confirmed_count === 0);

  const { data: orgRows } = await org.client.from('bookings').select('id, user_id, status').eq('training_id', tid);
  check('Організатор бачить обидві заявки', orgRows.length === 2);

  // ── RLS: сторонній ──
  const { data: strangerRows } = await stranger.client.from('bookings').select('id').eq('training_id', tid);
  check('сторонній НЕ бачить чужих заявок (прямий запит до API)', strangerRows.length === 0);
  const { data: aRows } = await a.client.from('bookings').select('id, user_id').eq('training_id', tid);
  check('кандидат бачить лише свою заявку', aRows.length === 1 && aRows[0].user_id === a.id);
  const bookingA = orgRows.find((r) => r.user_id === a.id).id;
  const bookingB = orgRows.find((r) => r.user_id === b.id).id;
  const sDecide = await stranger.client.rpc('decide_booking', { p_booking_id: bookingA, p_approve: true });
  check('сторонній не може підтвердити чужу заявку', sDecide.error?.message === 'Недостатньо прав');
  const selfDecide = await a.client.rpc('decide_booking', { p_booking_id: bookingA, p_approve: true });
  check('кандидат не може підтвердити сам себе', !!selfDecide.error);

  // ── Гонка підтверджень за останнє місце ──
  const [d1, d2] = await Promise.all([
    org.client.rpc('decide_booking', { p_booking_id: bookingA, p_approve: true }),
    org.client.rpc('decide_booking', { p_booking_id: bookingB, p_approve: true }),
  ]);
  const okCount = [d1, d2].filter((r) => r.data === 'confirmed').length;
  const limit = [d1, d2].filter((r) => r.error?.message === 'Ліміт учасників досягнуто').length;
  check('два одночасні підтвердження на 1 місце → одне ок, друге «Ліміт учасників досягнуто»', okCount === 1 && limit === 1);
  const winner = d1.data === 'confirmed' ? a : b;
  const loserBooking = d1.data === 'confirmed' ? bookingB : bookingA;

  // ── Відхилення → місця без змін, сповіщення ──
  const rej = await org.client.rpc('decide_booking', { p_booking_id: loserBooking, p_approve: false });
  const { data: t1 } = await org.client.from('trainings').select('confirmed_count').eq('id', tid).single();
  check('відхилення → «Відхилено», місця без змін', rej.data === 'rejected' && t1.confirmed_count === 1);

  const { data: notes } = await winner.client.from('notifications').select('text').eq('training_id', tid);
  check('Спортсмен отримав сповіщення про підтвердження', notes.some((n) => n.text.includes('підтверджено')));
  const { data: strangerNotes } = await stranger.client.from('notifications').select('id').eq('training_id', tid);
  check('чужі сповіщення не видно', strangerNotes.length === 0);
  const forge = await stranger.client.from('notifications').insert({ user_id: winner.id, text: 'фейк' });
  check('підробити сповіщення неможливо', !!forge.error);

  // ── Чат: доступ лише Організатору й підтвердженим ──
  const m1 = await winner.client.from('messages').insert({ training_id: tid, body: '<img src=x onerror=alert(1)> привіт' });
  check('підтверджений може писати в чат', !m1.error, m1.error?.message);
  const m2 = await stranger.client.from('messages').insert({ training_id: tid, body: 'я тут чужий' });
  check('сторонній не може писати в чат', !!m2.error);
  const { data: sMsgs } = await stranger.client.from('messages').select('id').eq('training_id', tid);
  check('сторонній не читає чат', sMsgs.length === 0);
  const fakeAuthor = await winner.client.from('messages').insert({ training_id: tid, user_id: org.id, body: 'від імені орг.' });
  check('не можна писати від чужого імені', !!fakeAuthor.error);
  const { data: oMsgs } = await org.client.from('messages').select('body').eq('training_id', tid);
  check('Організатор читає чат; HTML збережено як текст', oMsgs.length === 1 && oMsgs[0].body.startsWith('<img'));

  // ── Видалення учасника Організатором ──
  const winnerBooking = d1.data === 'confirmed' ? bookingA : bookingB;
  const sRemove = await stranger.client.rpc('remove_participant', { p_booking_id: winnerBooking });
  check('сторонній не може видалити учасника', !!sRemove.error);
  await org.client.rpc('remove_participant', { p_booking_id: winnerBooking });
  const { data: t2 } = await org.client.from('trainings').select('confirmed_count').eq('id', tid).single();
  check('видалення учасника → +1 місце', t2.confirmed_count === 0);
  const { data: afterMsgs } = await winner.client.from('messages').select('id').eq('training_id', tid);
  check('видалений учасник втрачає доступ до чату', afterMsgs.length === 0);
} finally {
  for (const id of created) await org.client.rpc('cancel_training', { p_training_id: id });
  console.log(`   (прибрано тестових тренувань: ${created.length})`);
}

done();
