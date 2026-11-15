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

### 3. Попередження Vite про розмір чанка
- **Текст:** `(!) Some chunks are larger than 500 kB after minification.` (`index-*.js 533.88 kB`).
- **Причина:** після додавання Leaflet усі бібліотеки потрапили в один чанк.
- **Виправлення:** `build.rollupOptions.output.manualChunks` у `vite.config.ts` (react / supabase / map). Найбільший чанк тепер 165 kB.

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

### Ітерація 2 — пошук (US 2.1, 2.2)
**Зроблено:**
- `src/lib/filters.ts`: фільтри ↔ query-параметри (`?sport=tennis,cycling&level=intermediate&lat=…&lng=…&place=…&sort=distance`), сміття в URL відкидається.
- Фільтрація в SQL: RPC `search_trainings` («І» між категоріями, «АБО» всередині, лише майбутні, повні — у кінці, сортування за часом/відстанню, радіус 10 км від точки).
- Локація: «Біля мене» (геолокація; при відмові — підказка ввести вручну), поле «Місто, район або точка на карті» з підказками Nominatim (debounce 600 мс + throttle ≤1 запит/с, пріоритет Києва, combobox з клавіатурною навігацією), «Точка на карті» (Leaflet, клік → зворотне геокодування).
- Список: skeleton, error з «Спробувати ще раз», empty «Тренувань не знайдено» + «Скинути фільтри», «Знайдено N тренувань» (правильні форми множини), анімація появи карток.
- Картка у списку: назва, вид спорту · дата · рівень, місце (+ відстань), «Вільно N з M» (teal) / «Місць немає» (приглушено), аватарки з «+N».

**Перевірено автоматично:** build ✅, lint ✅, `npm test` ✅ (36), `npm run test:search` ✅ (12 перевірок на реальній БД, включно з 3 прикладами SPEC і «футбол 10/10 у кінці»).

**Як перевірити вручну:**
1. Пошук → 10 тренувань, «Футбол 5×5 на Шулявці» останнім з «Місць немає».
2. Чипи «Теніс» + «Велоспорт» + «Середній» → 1 результат; URL змінився; оновити сторінку → фільтри збереглися.
3. «Велоспорт» + «Просунутий» → «Тренувань не знайдено» → «Скинути фільтри».
4. Ввести «Оболонь» → вибрати підказку → «Сортувати: за відстанню» → першим парк Наталка.
5. «Біля мене» → заборонити доступ у браузері → з'являється підказка ввести адресу.
6. Tab по сторінці: чипи перемикаються пробілом/Enter, видно фокус.
