-- Sport Buddy — схема, RLS, RPC.
-- Уся атомарна бізнес-логіка — у функціях нижче; клієнт не має прав на прямий запис у таблиці.

create extension if not exists pgcrypto;

-- ───────────── Типи ─────────────
create type public.sport as enum ('run', 'tennis', 'football', 'cycling');
create type public.skill_level as enum ('beginner', 'intermediate', 'advanced');
create type public.join_mode as enum ('auto', 'approval');
create type public.training_status as enum ('open', 'cancelled');
create type public.booking_status as enum ('pending', 'confirmed', 'rejected', 'cancelled');

-- ───────────── Таблиці ─────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  level public.skill_level not null default 'beginner',
  avatar_url text,
  rating numeric(2, 1) check (rating between 0 and 5),
  created_at timestamptz not null default now()
);

create table public.trainings (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  sport public.sport not null,
  level public.skill_level not null,
  starts_at timestamptz not null,
  place_name text not null check (char_length(place_name) between 1 and 200),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  capacity int not null check (capacity between 2 and 50),
  description text check (description is null or char_length(description) <= 500),
  join_mode public.join_mode not null default 'approval',
  status public.training_status not null default 'open',
  -- підтверджені учасники БЕЗ Організатора; змінюється лише в RPC під блокуванням рядка
  confirmed_count int not null default 0,
  created_at timestamptz not null default now(),
  constraint seats_not_exceeded check (confirmed_count >= 0 and confirmed_count + 1 <= capacity)
);

-- Дублікат: той самий Організатор + вид спорту + час + місце (≈10 м).
create unique index trainings_no_duplicate
  on public.trainings (organizer_id, sport, starts_at, round(lat::numeric, 4), round(lng::numeric, 4))
  where status = 'open';
create index trainings_starts_at on public.trainings (starts_at) where status = 'open';

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  training_id uuid not null references public.trainings (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status public.booking_status not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (training_id, user_id) -- одна заявка на користувача на тренування
);
create index bookings_user on public.bookings (user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  training_id uuid not null references public.trainings (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index messages_training on public.messages (training_id, created_at);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  training_id uuid references public.trainings (id) on delete cascade,
  text text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user on public.notifications (user_id, created_at desc);

create table public.chat_reads (
  training_id uuid not null references public.trainings (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (training_id, user_id)
);

-- ───────────── Профіль при реєстрації ─────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, level)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data ->> 'level')::public.skill_level, 'beginner')
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- ───────────── Допоміжні ─────────────
create or replace function public.is_member(p_training uuid, p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from trainings t where t.id = p_training and t.organizer_id = p_user)
      or exists (select 1 from bookings b where b.training_id = p_training and b.user_id = p_user and b.status = 'confirmed');
$$;

create or replace function public.notify(p_user uuid, p_training uuid, p_text text)
returns void language sql security definer set search_path = public as $$
  insert into notifications (user_id, training_id, text) values (p_user, p_training, p_text);
$$;
revoke execute on function public.notify(uuid, uuid, text) from public, anon, authenticated;

create or replace function public.require_uid()
returns uuid language plpgsql stable as $$
begin
  if auth.uid() is null then
    raise exception 'Потрібна авторизація' using errcode = '28000';
  end if;
  return auth.uid();
end $$;

-- ───────────── RLS ─────────────
alter table public.profiles enable row level security;
alter table public.trainings enable row level security;
alter table public.bookings enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.chat_reads enable row level security;

-- Запис у таблиці — лише через RPC (security definer). Явно забираємо права, RLS — другий рубіж.
revoke insert, update, delete on public.trainings, public.bookings, public.notifications, public.chat_reads
  from anon, authenticated;
revoke all on public.profiles, public.trainings, public.bookings, public.messages, public.notifications, public.chat_reads
  from anon;
grant update (name, level, avatar_url) on public.profiles to authenticated;
grant update (read_at) on public.notifications to authenticated;
revoke update, delete on public.messages from authenticated;

create policy profiles_read on public.profiles for select to authenticated using (true);
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy trainings_read on public.trainings for select to authenticated using (true);

create policy bookings_read on public.bookings for select to authenticated using (
  user_id = auth.uid()
  or exists (select 1 from public.trainings t where t.id = training_id and t.organizer_id = auth.uid())
);

create policy messages_read on public.messages for select to authenticated
  using (public.is_member(training_id, auth.uid()));
create policy messages_write on public.messages for insert to authenticated
  with check (user_id = auth.uid() and public.is_member(training_id, auth.uid()));

create policy notifications_read on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notifications_mark on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy chat_reads_own on public.chat_reads for select to authenticated using (user_id = auth.uid());

-- ───────────── RPC: створення тренування (US 1.1) ─────────────
create or replace function public.create_training(
  p_sport public.sport,
  p_level public.skill_level,
  p_starts_at timestamptz,
  p_place_name text,
  p_lat double precision,
  p_lng double precision,
  p_capacity int,
  p_description text default null,
  p_join_mode public.join_mode default 'approval',
  p_title text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := require_uid();
  v_id uuid;
  v_title text;
  v_sport_ua text := case p_sport when 'run' then 'Біг' when 'tennis' then 'Теніс'
                                  when 'football' then 'Футбол' else 'Велоспорт' end;
begin
  if p_capacity is null or p_capacity < 2 then
    raise exception 'Мінімальний ліміт – 2 учасники' using hint = 'capacity';
  elsif p_capacity > 50 then
    raise exception 'Максимальний ліміт – 50 учасників' using hint = 'capacity';
  end if;
  if p_starts_at is null or p_starts_at < now() + interval '1 hour' then
    raise exception 'Початок не раніше ніж через 1 годину' using hint = 'startsAt';
  elsif p_starts_at > now() + interval '90 days' then
    raise exception 'Початок не пізніше ніж через 90 днів' using hint = 'startsAt';
  end if;
  if p_lat is null or p_lng is null or coalesce(btrim(p_place_name), '') = '' then
    raise exception 'Вкажіть місце збору' using hint = 'place';
  end if;
  if p_description is not null and char_length(p_description) > 500 then
    raise exception 'Опис – не більше 500 символів' using hint = 'description';
  end if;

  v_title := coalesce(nullif(btrim(p_title), ''), v_sport_ua || ' · ' || left(btrim(p_place_name), 60));

  begin
    insert into trainings (organizer_id, title, sport, level, starts_at, place_name, lat, lng,
                           capacity, description, join_mode)
    values (v_uid, left(v_title, 80), p_sport, p_level, date_trunc('minute', p_starts_at), btrim(p_place_name),
            p_lat, p_lng, p_capacity, nullif(btrim(p_description), ''), coalesce(p_join_mode, 'approval'))
    returning id into v_id;
  exception when unique_violation then
    raise exception 'Таке тренування вже існує' using hint = 'form';
  end;
  return v_id;
end $$;

-- ───────────── RPC: заявка (US 2.3) ─────────────
-- Інваріант гонки: рядок тренування блокується FOR UPDATE, тож перевірка вільних місць
-- і інкремент confirmed_count виконуються серіалізовано — останнє місце отримує рівно одна заявка.
create or replace function public.book_training(p_training_id uuid)
returns public.booking_status language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := require_uid();
  t trainings%rowtype;
  v_existing booking_status;
  v_status booking_status;
  v_name text;
begin
  select * into t from trainings where id = p_training_id for update;
  if not found then
    raise exception 'Тренування не знайдено';
  end if;

  -- Повторна заявка / подвійний клік: повертаємо поточний статус, нового рядка не створюємо.
  select status into v_existing from bookings where training_id = p_training_id and user_id = v_uid;
  if found then
    return v_existing;
  end if;

  if t.organizer_id = v_uid then
    raise exception 'Організатор не може подати заявку на власне тренування';
  end if;
  if t.status <> 'open' then
    raise exception 'Тренування скасовано';
  end if;
  if t.starts_at <= now() then
    raise exception 'Тренування вже почалося';
  end if;
  if t.capacity - 1 - t.confirmed_count <= 0 then
    raise exception 'Місць немає';
  end if;

  v_status := case when t.join_mode = 'auto' then 'confirmed' else 'pending' end;
  insert into bookings (training_id, user_id, status) values (p_training_id, v_uid, v_status);

  select name into v_name from profiles where id = v_uid;
  if v_status = 'confirmed' then
    update trainings set confirmed_count = confirmed_count + 1 where id = p_training_id;
    perform notify(t.organizer_id, t.id, v_name || ' записався(-лась) на «' || t.title || '»');
  else
    perform notify(t.organizer_id, t.id, 'Нова заявка від ' || v_name || ' на «' || t.title || '»');
  end if;
  return v_status;
end $$;

-- ───────────── RPC: скасування власної заявки ─────────────
create or replace function public.cancel_booking(p_training_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := require_uid();
  t trainings%rowtype;
  b bookings%rowtype;
begin
  select * into t from trainings where id = p_training_id for update;
  if not found then raise exception 'Тренування не знайдено'; end if;

  select * into b from bookings where training_id = p_training_id and user_id = v_uid for update;
  if not found then raise exception 'Заявку не знайдено'; end if;
  if b.status not in ('pending', 'confirmed') then
    raise exception 'Цю заявку не можна скасувати';
  end if;
  if t.starts_at <= now() then
    raise exception 'Тренування вже почалося';
  end if;

  update bookings set status = 'cancelled', updated_at = now() where id = b.id;
  if b.status = 'confirmed' then
    update trainings set confirmed_count = confirmed_count - 1 where id = t.id;
  end if;
  perform notify(t.organizer_id, t.id,
    (select name from profiles where id = v_uid) || ' скасував(-ла) заявку на «' || t.title || '»');
  return jsonb_build_object('status', 'cancelled', 'late', t.starts_at - now() < interval '12 hours');
end $$;

-- ───────────── RPC: рішення Організатора (US 1.2) ─────────────
create or replace function public.decide_booking(p_booking_id uuid, p_approve boolean)
returns public.booking_status language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := require_uid();
  v_training uuid;
  t trainings%rowtype;
  b bookings%rowtype;
begin
  select training_id into v_training from bookings where id = p_booking_id;
  if not found then raise exception 'Заявку не знайдено'; end if;

  select * into t from trainings where id = v_training for update;
  if t.organizer_id <> v_uid then
    raise exception 'Недостатньо прав' using errcode = '42501';
  end if;
  select * into b from bookings where id = p_booking_id for update;
  if b.status <> 'pending' then
    raise exception 'Заявку вже опрацьовано';
  end if;

  if p_approve then
    if t.capacity - 1 - t.confirmed_count <= 0 then
      raise exception 'Ліміт учасників досягнуто';
    end if;
    update bookings set status = 'confirmed', updated_at = now() where id = b.id;
    update trainings set confirmed_count = confirmed_count + 1 where id = t.id;
    perform notify(b.user_id, t.id, 'Вашу заявку на «' || t.title || '» підтверджено. Чат учасників відкрито.');
    return 'confirmed';
  else
    update bookings set status = 'rejected', updated_at = now() where id = b.id;
    perform notify(b.user_id, t.id, 'Вашу заявку на «' || t.title || '» відхилено.');
    return 'rejected';
  end if;
end $$;

-- ───────────── RPC: видалення підтвердженого учасника ─────────────
create or replace function public.remove_participant(p_booking_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := require_uid();
  v_training uuid;
  t trainings%rowtype;
  b bookings%rowtype;
begin
  select training_id into v_training from bookings where id = p_booking_id;
  if not found then raise exception 'Заявку не знайдено'; end if;
  select * into t from trainings where id = v_training for update;
  if t.organizer_id <> v_uid then
    raise exception 'Недостатньо прав' using errcode = '42501';
  end if;
  select * into b from bookings where id = p_booking_id for update;
  if b.status <> 'confirmed' then
    raise exception 'Учасник не підтверджений';
  end if;
  update bookings set status = 'cancelled', updated_at = now() where id = b.id;
  update trainings set confirmed_count = confirmed_count - 1 where id = t.id;
  perform notify(b.user_id, t.id, 'Організатор видалив вас з тренування «' || t.title || '».');
end $$;

-- ───────────── RPC: пошук (US 2.1, 2.2) ─────────────
-- «І» між категоріями, «АБО» всередині; порожній/NULL масив = без фільтра.
create or replace function public.search_trainings(
  p_sports public.sport[] default null,
  p_levels public.skill_level[] default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_radius_km double precision default null,
  p_sort text default 'time'
) returns table (
  id uuid, title text, sport public.sport, level public.skill_level, starts_at timestamptz,
  place_name text, lat double precision, lng double precision, capacity int, confirmed_count int,
  free_seats int, distance_km double precision, avatars jsonb
) language sql stable security definer set search_path = public as $$
  with base as (
    select t.*,
      case when p_lat is null or p_lng is null then null else
        6371 * 2 * asin(sqrt(
          power(sin(radians(t.lat - p_lat) / 2), 2) +
          cos(radians(p_lat)) * cos(radians(t.lat)) * power(sin(radians(t.lng - p_lng) / 2), 2)
        )) end as dist
    from trainings t
    where auth.uid() is not null
      and t.status = 'open'
      and t.starts_at > now()
      and (coalesce(cardinality(p_sports), 0) = 0 or t.sport = any (p_sports))
      and (coalesce(cardinality(p_levels), 0) = 0 or t.level = any (p_levels))
  )
  select b.id, b.title, b.sport, b.level, b.starts_at, b.place_name, b.lat, b.lng, b.capacity,
         b.confirmed_count, b.capacity - 1 - b.confirmed_count, b.dist,
         (select coalesce(jsonb_agg(jsonb_build_object('name', x.name, 'avatar_url', x.avatar_url)), '[]'::jsonb)
            from (select p.name, p.avatar_url, 0 as ord, b.created_at as at from profiles p where p.id = b.organizer_id
                  union all
                  select p.name, p.avatar_url, 1, bk.updated_at from bookings bk join profiles p on p.id = bk.user_id
                   where bk.training_id = b.id and bk.status = 'confirmed'
                  order by 3, 4 limit 3) x)
  from base b
  where p_radius_km is null or b.dist is null or b.dist <= p_radius_km
  order by (b.capacity - 1 - b.confirmed_count <= 0),
           case when p_sort = 'distance' then b.dist end nulls last,
           b.starts_at
  limit 100;
$$;

-- ───────────── RPC: учасники картки (Організатор + підтверджені; очікуючих не розкриваємо) ─────────────
create or replace function public.get_participants(p_training_id uuid)
returns table (user_id uuid, name text, avatar_url text, is_organizer boolean)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.avatar_url, true from trainings t join profiles p on p.id = t.organizer_id
   where t.id = p_training_id and auth.uid() is not null
  union all
  select * from (
    select p.id, p.name, p.avatar_url, false from bookings b join profiles p on p.id = b.user_id
     where b.training_id = p_training_id and b.status = 'confirmed' and auth.uid() is not null
     order by b.updated_at
  ) s;
$$;

-- ───────────── RPC: чат ─────────────
create or replace function public.mark_chat_read(p_training_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := require_uid();
begin
  if not is_member(p_training_id, v_uid) then raise exception 'Недостатньо прав' using errcode = '42501'; end if;
  insert into chat_reads (training_id, user_id, last_read_at) values (p_training_id, v_uid, now())
  on conflict (training_id, user_id) do update set last_read_at = excluded.last_read_at;
end $$;

create or replace function public.chat_unread_count(p_training_id uuid)
returns int language sql stable security definer set search_path = public as $$
  select case when not is_member(p_training_id, auth.uid()) then 0 else (
    select count(*)::int from messages m
     where m.training_id = p_training_id and m.user_id <> auth.uid()
       and m.created_at > coalesce((select last_read_at from chat_reads
                                     where training_id = p_training_id and user_id = auth.uid()), '-infinity')
  ) end;
$$;

revoke execute on all functions in schema public from anon;
grant execute on function public.create_training, public.book_training, public.cancel_booking,
  public.decide_booking, public.remove_participant, public.search_trainings, public.get_participants,
  public.mark_chat_read, public.chat_unread_count, public.is_member to authenticated;

-- ───────────── Realtime ─────────────
alter publication supabase_realtime add table public.trainings, public.messages, public.notifications, public.bookings;
