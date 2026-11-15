-- Скасування тренування Організатором (статус «Скасоване» зі SPEC).
-- Скасоване зникає з пошуку; учасники з активними заявками отримують сповіщення.
create or replace function public.cancel_training(p_training_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := require_uid();
  t trainings%rowtype;
  r record;
begin
  select * into t from trainings where id = p_training_id for update;
  if not found then raise exception 'Тренування не знайдено'; end if;
  if t.organizer_id <> v_uid then
    raise exception 'Недостатньо прав' using errcode = '42501';
  end if;
  if t.status = 'cancelled' then return; end if;

  update trainings set status = 'cancelled' where id = t.id;
  for r in select user_id from bookings where training_id = t.id and status in ('pending', 'confirmed') loop
    perform notify(r.user_id, t.id, 'Тренування «' || t.title || '» скасовано Організатором.');
  end loop;
end $$;

revoke execute on function public.cancel_training(uuid) from public, anon;
grant execute on function public.cancel_training(uuid) to authenticated;
