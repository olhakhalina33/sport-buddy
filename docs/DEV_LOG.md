# DEV_LOG — Sport Buddy

## Помилки (точний текст → причина → виправлення)

### 1. Попередження ESLint `react-refresh/only-export-components`
- **Текст:** `src/components/ui/TextField.tsx 3:14 warning Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components` (і 2 такі ж у `src/hooks/useAuth.tsx`).
- **Причина:** `TextField.tsx` експортував функцію `fieldClass` поряд із компонентами; `useAuth.tsx` експортує провайдер і хуки з одного файлу.
- **Виправлення:** `fieldClass` винесено в `src/components/ui/fieldClass.ts`; для `src/hooks/**/*.tsx` правило вимкнено в `eslint.config.js` (провайдер + хук в одному файлі — свідоме рішення).

### 2. Екран «Supabase не налаштовано», хоча `.env.local` існує
- **Текст:** на сторінці `Supabase не налаштовано. Створіть файл .env.local…`.
- **Причина:** панель Supabase (Connect → React/Vite) пропонує змінну `VITE_SUPABASE_PUBLISHABLE_KEY`, а код читав лише `VITE_SUPABASE_ANON_KEY` → `isConfigured = false`.
- **Виправлення:** `src/api/supabase.ts` приймає обидві назви; `.env.example` доповнено.

## Ітерації

### Крок 0 — план
Прочитано `docs/` (SPEC, DESIGN, vision board, 22 мокапи). План, припущення, схема БД і RPC — у `docs/PLAN.md`.
Docker встановлено, але демон не запущений → локальний Supabase не використовується, працюємо з хмарним проєктом.

### Ітерація 1 — каркас
**Зроблено:**
- Vite + React 18 + TS strict + React Router + Tailwind; ESLint (flat config); Vitest (jsdom).
- Токени DESIGN.md як CSS-змінні (`src/styles/index.css`), Tailwind-теми через них; темна тема класом `dark`, початково з `prefers-color-scheme` (скрипт в `index.html` до рендеру — без блимання), перемикач у шапці, вибір зберігається в `localStorage`.
- Компоненти: Button (primary/outline/link/danger-link, loading/disabled), TextField, TextArea, Select, Chip, Avatar/AvatarStack (ініціали, «+N»), Skeleton, Empty/Error-стани, BottomNav, ThemeToggle.
- Міграція `supabase/migrations/0001_init.sql`: 6 таблиць, RLS на кожній, запис лише через RPC (`create_training`, `book_training`, `cancel_booking`, `decide_booking`, `remove_participant`, `search_trainings`, `get_participants`, чат), блокування рядка `FOR UPDATE`, Realtime-публікація.
- `supabase/seed.sql`: 12 акаунтів, 10 тренувань у різних районах Києва (одне повністю заповнене, одне з лімітом 2, одне з 1 вільним місцем для тесту гонки, опис з `<script>` для XSS-перевірки).
- Екран входу/реєстрації (mock-01): email, пароль, ім'я, рівень, «Забули пароль?», валідація zod, українські тексти помилок Supabase; захищені маршрути (редірект на `/auth` зі збереженням адреси).
- Тести чистої логіки: формула місць, «Вільно N з M», ініціали, формат дат, правило 12 годин.

**Перевірено автоматично:** `npm run build` ✅, `npm run lint` ✅, `npm test` ✅ (20 тестів).
**НЕ перевірено (немає ключів Supabase):** застосування міграції, вхід/реєстрація.

**Як перевірити вручну (після налаштування Supabase):**
1. `npm run dev` → http://localhost:5173 → редірект на `/auth`.
2. Увійти `olga@sportbuddy.test` / `Test1234!` → екран «Тренування поруч», нижня навігація.
3. Перемикач ☾/☀ у шапці — обидві теми; DevTools → 360 px — без горизонтального скролу.
4. «Немає акаунта? Зареєструватися» → порожні поля → помилки під полями.
