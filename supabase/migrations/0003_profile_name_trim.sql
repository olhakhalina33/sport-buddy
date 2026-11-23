-- BUG-US2.4-AVATAR-01: сервер має відкидати ім'я, що складається лише з пробілів
-- (раніше валідація була тільки на клієнті: zod trim().min(2).max(60)).
-- УВАГА: перед застосуванням виправте наявні профілі, що не відповідають обмеженню,
-- інакше ADD CONSTRAINT завершиться помилкою (див. PR / повідомлення до міграції).

alter table public.profiles drop constraint if exists profiles_name_check;

alter table public.profiles
  add constraint profiles_name_check check (char_length(btrim(name)) between 2 and 60);
