import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { StaleBanner } from '../../components/ui/StaleBanner';
import { useRealtime } from '../../hooks/useRealtime';
import { newLabel, unreadCount } from '../../api/chat';
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

function ChatLink({ trainingId, unread }: { trainingId: string; unread: number }) {
  return (
    <Link
      to={`/training/${trainingId}/chat`}
      className="flex h-14 items-center justify-between rounded-xl border border-line bg-surface px-5 transition-colors hover:border-accent"
    >
      <span className="text-[16px] font-bold">Чат учасників</span>
      <span className="text-p font-normal text-accent">
        {unread > 0 ? `${newLabel(unread)} →` : '→'}
      </span>
    </Link>
  );
}

export function TrainingPage() {
  const { id = '' } = useParams();
  const user = useUser();
  const { state, reload } = useTrainingCard(id, user.id);
  const [unread, setUnread] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const isMemberNow =
    state.status === 'ok' && (state.data.training.organizer_id === user.id || state.data.myStatus === 'confirmed');

  const refreshUnread = useCallback(() => {
    unreadCount(id).then(setUnread).catch(() => undefined);
  }, [id]);

  useEffect(() => {
    if (isMemberNow) refreshUnread();
  }, [isMemberNow, refreshUnread]);

  // Будь-яка зміна тренування (confirmed_count) або моїх заявок → перечитати учасників (≤2 с).
  // Кілька подій поспіль зливаємо в одне перечитування.
  const onChange = useCallback(
    (p: { table: string }) => {
      if (p.table === 'messages') return refreshUnread();
      clearTimeout(timer.current);
      timer.current = setTimeout(() => reload().catch(() => undefined), 150);
    },
    [reload, refreshUnread],
  );
  const onReconnect = useCallback(() => {
    reload().catch(() => undefined);
    refreshUnread();
  }, [reload, refreshUnread]);

  const { stale } = useRealtime(
    `training-${id}`,
    [
      { table: 'trainings', event: 'UPDATE', filter: `id=eq.${id}` },
      { table: 'bookings', filter: `training_id=eq.${id}` },
      { table: 'messages', event: 'INSERT', filter: `training_id=eq.${id}` },
    ],
    onChange,
    onReconnect,
  );
  useEffect(() => () => clearTimeout(timer.current), []);

  if (state.status === 'loading') return (<><BackLink /><CardSkeleton /></>);
  if (state.status === 'notfound') return (<><BackLink /><EmptyState title="Тренування не знайдено" /></>);
  if (state.status === 'error') return (<><BackLink /><ErrorState message={state.message} onRetry={() => reload().catch(() => undefined)} /></>);

  const { training: t, participants, myStatus } = state.data;
  const free = freeSeats(t.capacity, t.confirmed_count);
  const isOrganizer = t.organizer_id === user.id;
  const occupied = t.confirmed_count + 1;

  return (
    <article className="flex flex-col gap-5 animate-fade-up">
      <StaleBanner show={stale} />
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

      {isMemberNow && <ChatLink trainingId={t.id} unread={unread} />}

      <BookingPanel training={t} isOrganizer={isOrganizer} myStatus={myStatus} onChanged={reload} />
    </article>
  );
}
