import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { TextArea, TextField } from '../../components/ui/TextField';
import { AddressInput } from '../../components/map/AddressInput';
import { MapView } from '../../components/map/MapView';
import { KYIV_CENTER, reverseGeocode, searchAddress } from '../../api/geocode';
import { createTraining } from '../../api/organizer';
import { ApiError } from '../../api/supabase';
import { JOIN_MODE_LABEL, LEVELS, LEVEL_LABEL, SPORTS, SPORT_LABEL } from '../../lib/labels';
import { toLocalInput } from '../../lib/dates';

function tomorrowAt19() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(19, 0, 0, 0);
  return d;
}
import { makeTrainingSchema, type TrainingFormValues } from '../../lib/trainingSchema';

const FIELD_BY_HINT: Record<string, keyof TrainingFormValues> = {
  capacity: 'capacity',
  startsAt: 'startsAt',
  place: 'placeText',
  description: 'description',
};

export function CreatePage() {
  const navigate = useNavigate();
  const schema = useMemo(() => makeTrainingSchema(), []);
  const [formError, setFormError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);

  const {
    register, control, handleSubmit, setValue, setError, watch, formState: { errors, isSubmitting },
  } = useForm<TrainingFormValues>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: {
      title: '', sport: 'run', level: 'intermediate',
      startsAt: toLocalInput(tomorrowAt19()),
      placeText: '', place: null, capacity: 10, description: '', joinMode: 'approval',
    },
  });

  const place = watch('place');
  const description = watch('description');

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    try {
      const id = await createTraining({
        title: v.title, sport: v.sport, level: v.level, startsAt: new Date(v.startsAt),
        placeName: v.place!.label, lat: v.place!.lat, lng: v.place!.lng,
        capacity: v.capacity, description: v.description.trim(), joinMode: v.joinMode,
      });
      navigate(`/training/${id}`, { replace: true });
    } catch (e) {
      const err = e as ApiError;
      const field = err.field ? FIELD_BY_HINT[err.field] : undefined;
      if (field) setError(field, { message: err.message }, { shouldFocus: true });
      else setFormError(err.message); // напр. «Таке тренування вже існує»
    }
  });

  // Якщо адресу введено, але не обрано зі списку — пробуємо розпізнати перед валідацією.
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = watch('placeText').trim();
    if (!watch('place') && text.length >= 3) {
      const found = await searchAddress(text).catch(() => []);
      if (found[0]) setValue('place', { ...found[0], label: text });
    }
    await onSubmit();
  };

  const pickOnMap = async (lat: number, lng: number) => {
    setValue('place', { lat, lng, label: 'Точка на карті' }, { shouldValidate: true });
    setValue('placeText', 'Точка на карті');
    const label = await reverseGeocode(lat, lng);
    setValue('place', { lat, lng, label });
    setValue('placeText', label, { shouldValidate: true });
  };

  return (
    <>
      <h1 className="text-h4 mb-6">Нове тренування</h1>
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <Select label="Вид спорту" options={SPORTS.map((s) => ({ value: s, label: SPORT_LABEL[s] }))} {...register('sport')} />
        <Select label="Рівень" options={LEVELS.map((l) => ({ value: l, label: LEVEL_LABEL[l] }))} {...register('level')} />
        <TextField label="Дата й час" type="datetime-local" error={errors.startsAt?.message} {...register('startsAt')} />

        <Controller
          control={control}
          name="placeText"
          render={({ field }) => (
            <AddressInput
              label="Місце збору"
              placeholder="Адреса або точка на карті"
              value={field.value}
              error={errors.placeText?.message}
              onTextChange={(t) => {
                field.onChange(t);
                setValue('place', null); // текст змінився — координати вже не відповідають
              }}
              onSelect={(p) => {
                setValue('place', p);
                setValue('placeText', p.label, { shouldValidate: true });
              }}
            />
          )}
        />
        <div className="-mt-3 flex items-center gap-3">
          <Button variant="link" className="!text-p" onClick={() => setShowMap((s) => !s)} aria-expanded={showMap}>
            {showMap ? 'Сховати карту' : 'Обрати точку на карті'}
          </Button>
          {place && <span className="text-ps text-accent">✓ координати збережено</span>}
        </div>
        {showMap && (
          <MapView
            label="Карта для вибору місця збору"
            lat={place?.lat ?? KYIV_CENTER.lat}
            lng={place?.lng ?? KYIV_CENTER.lng}
            zoom={12}
            marker={!!place}
            onPick={pickOnMap}
          />
        )}

        <TextField
          label="Ліміт учасників"
          type="number"
          inputMode="numeric"
          min={2}
          max={50}
          hint="Від 2 до 50, включно з вами як Організатором"
          error={errors.capacity?.message}
          {...register('capacity', { valueAsNumber: true })}
        />
        <Select
          label="Режим прийому"
          options={(['approval', 'auto'] as const).map((m) => ({ value: m, label: JOIN_MODE_LABEL[m] }))}
          {...register('joinMode')}
        />
        <TextField label="Назва (необов’язково)" placeholder="Напр. Вечірній біг" error={errors.title?.message} {...register('title')} />
        <TextArea
          label="Опис (необов’язково)"
          rows={3}
          error={errors.description?.message}
          hint={`${description.length}/500`}
          {...register('description')}
        />

        {formError && (
          <p role="alert" className="text-p font-bold text-danger">
            {formError}
          </p>
        )}
        <Button type="submit" full loading={isSubmitting}>
          Опублікувати
        </Button>
      </form>
    </>
  );
}
