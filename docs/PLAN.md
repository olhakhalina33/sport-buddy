# Sport Buddy — план (Крок 0)

## Припущення (не блокуючі, прийняті)
1. **Назва тренування.** SPEC (US 2.4) показує «назву» на картці, але US 1.1 не має поля «назва». → Додано необов'язкове поле «Назва» (≤80 символів); якщо порожнє — генерується «<Вид спорту> · <місце збору>».
2. **Повторна заявка після скасування/відхилення** неможлива (SPEC: «одна заявка на користувача на тренування… показується поточний статус»). Унікальний ключ (training_id, user_id).
3. **Скасування пізніше ніж за 12 год** — дозволене, але з попередженням (штрафів у MVP немає, рейтинг поза MVP).
4. **Заявка «за підтвердженням» при 0 вільних** — заборонена так само («Місць немає»), щоб не плодити безнадійні заявки (список очікування — поза MVP).
5. **Видалення учасника Організатором** переводить заявку в «Скасовано» (окремого статусу в SPEC немає).
6. **Рейтинг** — поле `rating` у профілі, лише показ; у нових користувачів — «новий учасник» (як на mock-08).
7. **Дублікат** = той самий Організатор + вид спорту + час початку + координати місця (округлені до ~10 м). Скасовані не враховуються.
8. **Тренування «почалося»** = `starts_at <= now()` за часом сервера БД.
9. **Пошук за відстанню**: радіус за замовчуванням 10 км від обраної точки; без локації — центр Києва, без обмеження радіусом. Відстань — формула гаверсинуса в SQL (без PostGIS).
10. **«N нових» у чаті** — повідомлення після останнього відкриття чату цим користувачем (таблиця `chat_reads`).
11. **«Забули пароль?»** — стандартний `resetPasswordForEmail` Supabase (лист приходить, якщо в проєкті налаштовано SMTP/за замовчуванням).
12. **Підтвердження email** у Supabase слід вимкнути для демо (інакше реєстрація потребує листа) — це крок для тебе.
13. Мова комітів — англійська (одна на весь проєкт).

## Ітерації
| # | Зріз | Результат |
|---|------|-----------|
| 1 | Каркас | Vite+TS+Tailwind+Router, токени DESIGN.md, світла/темна тема, базові компоненти, повна міграція БД (таблиці, RLS, RPC) + seed, вхід/реєстрація, захищені маршрути |
| 2 | Пошук | US 2.1/2.2: чипи-мультифільтри, фільтри в URL, локація (геолокація/адреса/карта), RPC `search_trainings`, skeleton/empty/error |
| 3 | Картка + заявка | US 2.3/2.4: RPC `book_training`/`cancel_booking`, автоприйом/підтвердження, скрипт гонки за останнє місце |
| 4 | Організатор | US 1.1/1.2: форма створення (zod + RPC), «Заявки», підтвердити/відхилити/видалити, сповіщення, тест RLS |
| 5 | Real-time | Realtime на картці, банер «Дані можуть бути неактуальними», чат, карта Leaflet |
| 6 | Перевірка й polish | Усі сценарії SPEC, граничні випадки, анімації, a11y, рефакторинг, README, Vercel |

## Структура папок
```
src/
  api/          — шар доступу до даних (supabase client, trainings, bookings, chat, notifications, geocode)
  components/   — ui/ (Button, TextField, Select, Chip, Avatar, BottomNav, ThemeToggle, Skeleton), training/, chat/, map/
  features/     — auth/, search/, training/, create/, requests/, chat/
  hooks/        — useAuth, useTheme, useRealtime…
  lib/          — чиста логіка (seats, filters, validation, dates) + тести *.test.ts
  types/        — усі типи в одному місці
  styles/       — index.css (CSS-змінні тем)
supabase/
  migrations/   — 0001_init.sql (схема, RLS, RPC)
  seed.sql      — тестові акаунти + 10 тренувань у Києві
scripts/        — race-test.mjs, rls-test.mjs (інтеграційні перевірки проти Supabase)
e2e/            — Playwright
```

## Схема БД
**Типи:** `sport` (run, tennis, football, cycling), `skill_level` (beginner, intermediate, advanced), `join_mode` (auto, approval), `training_status` (open, cancelled), `booking_status` (pending, confirmed, rejected, cancelled).

| Таблиця | Поля | RLS |
|---|---|---|
| `profiles` | id (=auth.users.id), name, level, avatar_url, rating | SELECT — усі автентифіковані (публічні дані); UPDATE — лише свій рядок |
| `trainings` | id, organizer_id, title, sport, level, starts_at, place_name, lat, lng, capacity (CHECK 2..50), description (CHECK ≤500), join_mode, status, confirmed_count (≥0, без Організатора) | SELECT — автентифіковані; INSERT/UPDATE/DELETE з клієнта заборонені (лише через RPC) |
| `bookings` | id, training_id, user_id, status, created_at, updated_at; UNIQUE(training_id, user_id) | SELECT — власник заявки або Організатор тренування; запис лише через RPC |
| `messages` | id, training_id, user_id, body (1..1000), created_at | SELECT/INSERT — лише Організатор і підтверджені учасники (`is_member()`); INSERT лише від свого імені |
| `notifications` | id, user_id, training_id, text, read_at, created_at | SELECT/UPDATE(read_at) — лише свої; створюються RPC |
| `chat_reads` | training_id, user_id, last_read_at | лише свої; оновлення через RPC `mark_chat_read` |

Тригер: при створенні `auth.users` — рядок у `profiles` (ім'я й рівень із metadata).
Realtime: публікація для `trainings` (зміна `confirmed_count` → картка перезавантажує учасників), `bookings`, `messages`, `notifications`.

## RPC (усі `security definer`, `search_path = public`, перевірка `auth.uid()`)
| Функція | Інваріанти |
|---|---|
| `create_training(...)` | автентифікований; ліміт 2..50; початок ∈ [now+1h, now+90d]; координати обов'язкові («Вкажіть місце збору»); опис ≤500; без дубліката («Таке тренування вже існує»). Організатор займає 1 місце (у формулі). |
| `book_training(id)` | `SELECT … FOR UPDATE` рядка тренування → черга на конкурентні запити. Не Організатор; не почалось; відкрите; існуюча заявка → повертається її статус (подвійний клік/повтор не створює дубліката); вільно = capacity − 1 − confirmed_count > 0, інакше «Місць немає». auto → confirmed (+1), approval → pending (слот не займається) + сповіщення Організатору. **Оскільки перевірка й інкремент — під одним блокуванням рядка, останнє місце отримує рівно одна заявка.** |
| `cancel_booking(id)` | лише власник; до початку; pending/confirmed → cancelled; якщо була confirmed — −1 (слот звільняється). Повертає `late` (менше 12 год). |
| `decide_booking(id, approve)` | блокування тренування; лише Організатор; лише pending; approve при 0 вільних → «Ліміт учасників досягнуто». Сповіщення Спортсмену. |
| `remove_participant(id)` | блокування; лише Організатор; confirmed → cancelled, +1 місце, сповіщення. |
| `search_trainings(sports[], levels[], lat, lng, radius_km, sort)` | лише майбутні відкриті; «І» між категоріями, «АБО» всередині (порожній масив = без фільтра); повні — в кінці; сортування за часом/відстанню. |
| `get_participants(id)` | Організатор + підтверджені (ім'я, аватар) — без розкриття очікуючих. |
| `mark_chat_read(id)`, `chat_unread_count(id)` | лише для учасників чату. |

## Що треба зробити тобі руками (коли попрошу)
1. Supabase: створити проєкт, вимкнути «Confirm email», дати URL і anon key → `.env.local`, застосувати міграцію й seed (SQL Editor).
2. GitHub: створити репозиторій, запушити.
3. Vercel: імпорт репозиторію, змінні `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
4. Додати викладача колаборатором (GitHub; Vercel — за потреби).
