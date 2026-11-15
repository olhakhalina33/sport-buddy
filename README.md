# Sport Buddy

Маркетплейс для пошуку компанії на спільні тренування (біг, теніс, футбол, велоспорт) у Києві.
Ключова фіча — картка тренування з «живими» вільними місцями й аватарками учасників (Supabase Realtime), чат учасників і карта місця збору.

> Статус: MVP у розробці (лабораторна №5). План — [docs/PLAN.md](docs/PLAN.md), журнал — [docs/DEV_LOG.md](docs/DEV_LOG.md).

## Стек
Vite · React 18 · TypeScript (strict) · React Router · Tailwind CSS · Supabase (Auth, Postgres + RLS + RPC, Realtime) · Leaflet + OpenStreetMap · Nominatim · react-hook-form + zod · Vitest · Playwright · Vercel.

## Запуск локально
```bash
npm install
cp .env.example .env.local   # вписати VITE_SUPABASE_URL і VITE_SUPABASE_ANON_KEY
npm run dev                  # http://localhost:5173
```

| Команда | Що робить |
|---|---|
| `npm run dev` | dev-сервер |
| `npm run build` | перевірка типів + production-білд |
| `npm run lint` | ESLint |
| `npm test` | Vitest (чиста логіка) |
| `npm run test:race` | інтеграційний тест гонки за останнє місце (потрібен Supabase) |
| `npm run e2e` | Playwright |

## Змінні середовища
| Змінна | Де взяти |
|---|---|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | там само → `anon` `public` key |

Секрети — лише в `.env.local` (у `.gitignore`) і в Environment Variables на Vercel.

## База даних
1. Supabase → SQL Editor → вставити й виконати `supabase/migrations/0001_init.sql`.
2. Там само виконати `supabase/seed.sql` (тестові акаунти + 10 тренувань у Києві; можна перезапускати).
3. Authentication → Sign In / Providers → Email: вимкнути **Confirm email** (щоб реєстрація працювала без листа).

## Тестові акаунти (пароль для всіх: `Test1234!`)
| Email | Роль у демо-даних |
|---|---|
| `olga@sportbuddy.test` | Спортсмен (записана на велопрогулянку, чекає рішення на ВДНГ) |
| `andriy@sportbuddy.test` | Організатор «Вечірній біг у парку Наталка» та «Велотренування на ВДНГ» (є заявки) |
| `maria@sportbuddy.test` | Організатор «Ранкова пробіжка на Трухановому» (2 заявки очікують) |
| `viktor@sportbuddy.test` | Організатор повністю заповненого «Футбол 5×5 на Шулявці» |
| `lilia@`, `taras@`, `nazar@`, `oksana@`, `serhii@`, `tetiana@`, `ivan@`, `dmytro@` `sportbuddy.test` | інші учасники |

## Припущення
Див. [docs/PLAN.md → Припущення](docs/PLAN.md#припущення-не-блокуючі-прийняті).
