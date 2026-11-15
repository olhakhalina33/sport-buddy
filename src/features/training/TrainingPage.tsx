import { useNavigate, useParams } from 'react-router-dom';
import { Chip } from '../../components/ui/Chip';
import { AvatarStack } from '../../components/ui/Avatar';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { MapView } from '../../components/map/MapView';
import { useUser } from '../../hooks/useAuth';
import { formatWhen } from '../../lib/dates';
import { JOIN_MODE_LABEL, LEVEL_LABEL, SPORT_LABEL } from '../../lib/labels';
import { freeSeats } from '../../lib/seats';
import { BookingPanel } from './BookingPanel';
import { useTrainingCard } from './useTrainingCard';

function BackLink() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
      className="mb-4 text-p font-bold text-accent hover:underline"
    >
      ← Назад
    </button>
  );
}

function CardSkeleton() {
  return (
    <div role="status" aria-label="Завантаження" className="flex flex-col gap-4">
      <Skeleton className="h-8 w-4/5" />
      <div className="flex gap-2">
        <Skeleton className="h-10 w-20 rounded-full" />
        <Skeleton className="h-10 w-36 rounded-full" />
      </div>
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-56 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}

export function TrainingPage() {
  const { id = '' } = useParams();
  const user = useUser();
  const { state, reload } = useTrainingCard(id, user.id);

  if (state.status === 'loading') return (<><BackLink /><CardSkeleton /></>);
  if (state.status === 'notfound') return (<><BackLink /><EmptyState title="Тренування не знайдено" /></>);
  if (state.status === 'error') return (<><BackLink /><ErrorState message={state.message} onRetry={() => reload().catch(() => undefined)} /></>);

  const { training: t, participants, myStatus } = state.data;
  const free = freeSeats(t.capacity, t.confirmed_count);
  const isOrganizer = t.organizer_id === user.id;
  const occupied = t.confirmed_count + 1;

  return (
    <article className="flex flex-col gap-5 animate-fade-up">
      <div>
        <BackLink />
        <h1 className="text-h4 break-words">{t.title}</h1>
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip label={SPORT_LABEL[t.sport]} />
        <Chip label={`${LEVEL_LABEL[t.level]} рівень`} />
      </div>

      <dl className="grid grid-cols-2 gap-4">
        <div>
          <dt className="text-p font-normal text-muted">Дата й час</dt>
          <dd className="mt-1 text-[16px] font-bold">{formatWhen(t.starts_at)}</dd>
        </div>
        <div>
          <dt className="text-p font-normal text-muted">Організатор</dt>
          <dd className="mt-1 text-[16px] font-bold">
            {t.organizer?.name ?? '—'}
            {t.organizer?.rating != null && ` · ${t.organizer.rating.toFixed(1).replace('.', ',')}`}
          </dd>
        </div>
      </dl>

      <section aria-labelledby="participants-h">
        <h2 id="participants-h" className={`text-h5 ${free === 0 ? 'text-faint' : ''}`} aria-live="polite">
          {free === 0 ? `Учасники · місць немає (${occupied} з ${t.capacity})` : (
            <>Учасники · вільно <span key={free} className="inline-block animate-bump">{free}</span> з {t.capacity}</>
          )}
        </h2>
        <div className="mt-3">
          <AvatarStack users={participants} max={5} />
        </div>
        <p className="mt-2 text-ps text-muted">Режим прийому: {JOIN_MODE_LABEL[t.join_mode].toLowerCase()}</p>
      </section>

      <MapView label={`Карта місця збору: ${t.place_name}`} lat={t.lat} lng={t.lng} />
      <p className="text-p font-normal text-muted">Місце збору: {t.place_name}</p>

      {t.description && (
        <section aria-label="Опис">
          {/* Рендеримо як текст (React екранує) — без dangerouslySetInnerHTML. */}
          <p className="whitespace-pre-line break-words text-p font-normal">{t.description}</p>
        </section>
      )}

      <BookingPanel training={t} isOrganizer={isOrganizer} myStatus={myStatus} onChanged={reload} />
    </article>
  );
}
