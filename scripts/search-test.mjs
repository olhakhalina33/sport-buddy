// Інтеграційна перевірка search_trainings (US 2.1/2.2) на seed-даних.
import { anonClient, check, done, login } from './lib.mjs';

const { client } = await login('olga@sportbuddy.test');
const search = async (p = {}) => {
  const { data, error } = await client.rpc('search_trainings', {
    p_sports: null, p_levels: null, p_lat: null, p_lng: null, p_radius_km: null, p_sort: 'time', ...p,
  });
  if (error) throw error;
  return data;
};

const all = await search();
check('є майбутні тренування', all.length >= 8, `${all.length}`);
check('лише майбутні', all.every((t) => new Date(t.starts_at) > new Date()));

const open = all.filter((t) => t.free_seats > 0);
const full = all.filter((t) => t.free_seats <= 0);
check('повні — в кінці', all.slice(all.length - full.length).every((t) => t.free_seats <= 0) && full.length >= 1);
check('відкриті — за часом (найближчі першими)', open.every((t, i) => i === 0 || open[i - 1].starts_at <= t.starts_at));
const football = all.find((t) => t.title.startsWith('Футбол 5×5'));
check('SPEC: футбол, ліміт 10, зайнято 10 → вільно 0, у кінці', football?.free_seats === 0 && all.at(-1)?.id === football?.id);

const r1 = await search({ p_sports: ['run'], p_levels: ['beginner'] });
check('SPEC: біг + новачок', r1.length > 0 && r1.every((t) => t.sport === 'run' && t.level === 'beginner'), `${r1.length}`);

const r2 = await search({ p_sports: ['tennis', 'cycling'], p_levels: ['intermediate'] });
check('SPEC: (теніс АБО велоспорт) І середній',
  r2.length > 0 && r2.every((t) => ['tennis', 'cycling'].includes(t.sport) && t.level === 'intermediate'), `${r2.length}`);

const r3 = await search({ p_sports: ['cycling'], p_levels: ['advanced'] });
check('SPEC: велоспорт + просунутий → порожньо', r3.length === 0);

const near = await search({ p_lat: 50.507, p_lng: 30.5163, p_radius_km: 10, p_sort: 'distance' });
const nearOpen = near.filter((t) => t.free_seats > 0);
check('локація Оболонь: усі в радіусі 10 км', near.every((t) => t.distance_km <= 10), `${near.length}`);
check('сортування за відстанню', nearOpen.every((t, i) => i === 0 || nearOpen[i - 1].distance_km <= t.distance_km));
check('найближче — парк Наталка', nearOpen[0]?.title.includes('Наталка'));

const { error: anonErr, data: anonData } = await anonClient().rpc('search_trainings', {});
check('анонім не отримує даних', !!anonErr || (anonData ?? []).length === 0, anonErr?.message ?? '');

done();
