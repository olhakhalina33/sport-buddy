import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '../../hooks/useAuth';
import { ListSkeleton } from '../../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../../components/ui/States';
import {
  getMyBookings, getMyOrganizedTrainings, getNotifications, markNotificationsRead,
  type MyBooking, type OrganizerTraining,
} from '../../api/organizer';
import type { AppNotification } from '../../types';
import { OrganizerTrainingBlock } from './OrganizerTrainingBlock';
import { BOOKING_STATUS_LABEL } from '../../lib/labels';
import { formatWhen } from '../../lib/dates';

interface Data {
  organized: OrganizerTraining[];
  mine: MyBooking[];
  notifications: AppNotification[];
}

type State = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ok'; data: Data };

export function RequestsPage() {
  const user = useUser();
  const [state, setState] = useState<State>({ status: 'loading' });

  const load = useCallback(async () => {
    try {
      const [organized, mine, notifications] = await Promise.all([
        getMyOrganizedTrainings(user.id),
        getMyBookings(user.id),
        getNotifications(),
      ]);
      setState({ status: 'ok', data: { organized, mine, notifications } });
    } catch (e) {
      setState({ status: 'error', message: (e as Error).message });
    }
  }, [user.id]);

  useEffect(() => {
    load();
  }, [load]);

  // Сповіщення вважаються прочитаними, коли користувач відкрив вкладку.
  useEffect(() => {
    if (state.status === 'ok' && state.data.notifications.some((n) => !n.read_at)) {
      markNotificationsRead().catch(() => undefined);
    }
  }, [state]);

  if (state.status === 'loading') return (<><h1 className="text-h4 mb-6">Заявки на тренування</h1><ListSkeleton count={2} /></>);
  if (state.status === 'error') return (<><h1 className="text-h4 mb-6">Заявки на тренування</h1><ErrorState message={state.message} onRetry={load} /></>);

  const { organized, mine, notifications } = state.data;

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-h4">Заявки на тренування</h1>

      {notifications.length > 0 && (
        <section aria-labelledby="notif-h">
          <h2 id="notif-h" className="text-h5 mb-3">Сповіщення</h2>
          <ul className="flex flex-col gap-2">
            {notifications.slice(0, 5).map((n) => (
              <li key={n.id} className={`rounded-xl border px-4 py-3 text-p font-normal ${n.read_at ? 'border-line-off' : 'border-accent'}`}>
                {!n.read_at && <span className="sr-only">Нове: </span>}
                {n.training_id ? <Link to={`/training/${n.training_id}`} className="hover:underline">{n.text}</Link> : n.text}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="org-h" className="flex flex-col gap-6">
        <h2 id="org-h" className="sr-only">Мої тренування як Організатора</h2>
        {organized.length === 0 ? (
          <EmptyState title="Ви ще не створили жодного тренування">
            <Link to="/create" className="text-p font-bold text-accent hover:underline">Створити тренування</Link>
          </EmptyState>
        ) : (
          organized.map((t) => <OrganizerTrainingBlock key={t.id} training={t} onChanged={load} />)
        )}
      </section>

      {mine.length > 0 && (
        <section aria-labelledby="mine-h">
          <h2 id="mine-h" className="text-h5 mb-3">Мої заявки</h2>
          <ul className="flex flex-col gap-2">
            {mine.map((b) => (
              <li key={b.id}>
                <Link to={`/training/${b.training.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-line-off bg-surface px-4 py-3 hover:border-accent">
                  <span className="min-w-0">
                    <span className="block truncate text-p">{b.training.title}</span>
                    <span className="text-ps text-muted">{formatWhen(b.training.starts_at)}</span>
                  </span>
                  <span className={`shrink-0 text-ps font-bold ${b.status === 'confirmed' ? 'text-accent' : b.status === 'pending' ? 'text-warning' : 'text-muted'}`}>
                    {BOOKING_STATUS_LABEL[b.status]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
