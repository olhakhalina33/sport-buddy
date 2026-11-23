import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { decideBooking, removeParticipant, type OrganizerTraining } from '../../api/organizer';
import { formatWhen } from '../../lib/dates';
import { BOOKING_STATUS_LABEL, LEVEL_LABEL, T } from '../../lib/labels';
import { freeSeats } from '../../lib/seats';
import type { RequestItem } from '../../types';

interface Props {
  training: OrganizerTraining;
  onChanged: () => Promise<void>;
}

function ratingText(r: number | null) {
  return r == null ? 'новий учасник' : `рейтинг ${r.toFixed(1).replace('.', ',')}`;
}

/** Блок одного тренування у вкладці «Заявки» (US 1.2, mock-08). */
export function OrganizerTrainingBlock({ training: t, onChanged }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);

  const pending = t.bookings.filter((b) => b.status === 'pending');
  const confirmed = t.bookings.filter((b) => b.status === 'confirmed');
  const full = freeSeats(t.capacity, t.confirmed_count) === 0;

  const act = async (id: string, fn: () => Promise<unknown>) => {
    if (lock.current) return;
    lock.current = true;
    setBusyId(id);
    setError(null);
    try {
      await fn();
      setConfirmRemove(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      await onChanged();
      lock.current = false;
      setBusyId(null);
    }
  };

  const Person = ({ b }: { b: RequestItem }) => (
    <div className="flex items-center gap-3">
      <Avatar user={b.user} size="lg" />
      <div className="min-w-0">
        <p className="truncate text-[16px] font-bold">{b.user.name}</p>
        <p className="text-p font-normal text-muted">
          {LEVEL_LABEL[b.user.level]} · {ratingText(b.user.rating)}
        </p>
      </div>
    </div>
  );

  return (
    <section aria-label={t.title} className="flex flex-col gap-3 animate-fade-up">
      <div>
        <Link to={`/training/${t.id}`} className="text-p font-normal text-muted hover:underline">
          {t.title} · {formatWhen(t.starts_at)}
        </Link>
        <p className={`mt-2 text-[16px] font-bold ${full ? 'text-faint' : 'text-accent'}`} aria-live="polite">
          Підтверджено {t.confirmed_count + 1} з {t.capacity}
          {full && ` · ${T.limitReached}`}
        </p>
      </div>

      {error && <p role="alert" className="text-p text-danger">{error}</p>}

      {pending.length === 0 && <p className="text-p font-normal text-muted">Нових заявок немає.</p>}
      {pending.map((b) => (
        <article key={b.id} className="flex flex-col gap-4 rounded-2xl border border-line-off bg-surface p-5">
          <div className="flex items-center justify-between gap-3">
            <Person b={b} />
            <span className="shrink-0 text-ps font-bold text-warning">{BOOKING_STATUS_LABEL.pending}</span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Button
              onClick={() => act(b.id, () => decideBooking(b.id, true))}
              disabled={full || (busyId !== null && busyId !== b.id)}
              loading={busyId === b.id}
              aria-describedby={full ? `full-${t.id}` : undefined}
            >
              Підтвердити
            </Button>
            <Button variant="danger-link" onClick={() => act(b.id, () => decideBooking(b.id, false))} disabled={busyId !== null}>
              Відхилити
            </Button>
          </div>
          {full && <p id={`full-${t.id}`} className="text-p text-danger">{T.limitReached}</p>}
        </article>
      ))}

      {confirmed.length > 0 && (
        <details className="rounded-2xl border border-line-off bg-surface p-4">
          <summary className="cursor-pointer text-p font-bold">Підтверджені учасники ({confirmed.length})</summary>
          <ul className="mt-3 flex flex-col gap-3">
            {confirmed.map((b) => (
              <li key={b.id} className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <Person b={b} />
                  {confirmRemove !== b.id && (
                    <Button variant="danger-link" onClick={() => setConfirmRemove(b.id)} disabled={busyId !== null} aria-label={`Видалити ${b.user.name}`}>
                      Видалити
                    </Button>
                  )}
                </div>
                {confirmRemove === b.id && (
                  <div role="alertdialog" aria-label="Підтвердження видалення" className="flex flex-wrap items-center gap-3 rounded-xl bg-page p-3">
                    <span className="text-p">Видалити {b.user.name} з тренування?</span>
                    <Button onClick={() => act(b.id, () => removeParticipant(b.id))} loading={busyId === b.id}>
                      Так, видалити
                    </Button>
                    <Button variant="link" onClick={() => setConfirmRemove(null)}>Ні</Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
