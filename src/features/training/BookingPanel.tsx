import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { bookTraining, cancelBooking } from '../../api/bookings';
import { cardAction, levelWarning } from '../../lib/bookingState';
import { useAuth } from '../../hooks/useAuth';
import { hasStarted, isFreeCancel } from '../../lib/dates';
import { T } from '../../lib/labels';
import type { BookingStatus, Training } from '../../types';

interface Props {
  training: Training;
  isOrganizer: boolean;
  myStatus: BookingStatus | null;
  onChanged: () => Promise<void>;
}

/** Кнопка «Записатися»/«Ви записані»/«Місць немає» + скасування (US 2.3). */
export function BookingPanel({ training, isOrganizer, myStatus, onChanged }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmLevel, setConfirmLevel] = useState(false);
  const { profile } = useAuth();
  const warning = levelWarning(training.level, profile?.level);
  const inFlight = useRef(false); // захист від подвійного кліку ще до перерендеру

  const action = cardAction({
    isOrganizer,
    myStatus,
    capacity: training.capacity,
    confirmedCount: training.confirmed_count,
    started: hasStarted(training.starts_at),
    cancelled: training.status === 'cancelled',
  });

  const run = async (fn: () => Promise<void>) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      await onChanged().catch(() => undefined);
      inFlight.current = false;
      setBusy(false);
    }
  };

  const join = () =>
    run(async () => {
      setConfirmLevel(false);
      const status = await bookTraining(training.id);
      if (status === 'pending') setNotice('Заявку надіслано. Очікуйте рішення Організатора.');
    });

  const cancel = () =>
    run(async () => {
      const r = await cancelBooking(training.id);
      setConfirmCancel(false);
      setNotice(r.late ? 'Заявку скасовано. Зверніть увагу: до початку менше 12 годин.' : 'Заявку скасовано.');
    });

  const late = !isFreeCancel(training.starts_at);

  return (
    <div className="flex flex-col gap-3">
      {action.kind === 'join' && (
        <Button full onClick={warning ? () => setConfirmLevel(true) : join} loading={busy} disabled={confirmLevel}>
          {action.label}
        </Button>
      )}
      {action.kind === 'join' && confirmLevel && warning && (
        <div role="alertdialog" aria-label="Попередження про рівень" className="rounded-2xl border border-line-off bg-surface p-4 animate-fade-up">
          <p className="text-p">{warning}</p>
          <div className="mt-3 flex items-center gap-4">
            <Button onClick={join} loading={busy}>
              Так, записатися
            </Button>
            <Button variant="link" onClick={() => setConfirmLevel(false)} disabled={busy}>
              Ні
            </Button>
          </div>
        </div>
      )}
      {action.kind === 'organizer' && (
        <Link
          to="/requests"
          className="flex h-12 items-center justify-center rounded-xl border border-line bg-surface text-btn text-fg hover:border-accent"
        >
          Ви організатор · Заявки
        </Link>
      )}
      {action.kind === 'disabled' && (
        <Button full disabled>
          {action.label}
        </Button>
      )}

      {action.kind === 'disabled' && action.hint && (
        <p className={`text-[14px] italic ${action.tone === 'error' ? 'text-danger' : 'text-muted'}`}>{action.hint}</p>
      )}
      {action.kind === 'join' && <p className="text-[14px] italic text-muted">{T.freeCancel}</p>}

      {notice && (
        <p role="status" className="text-p text-accent">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="text-p text-danger">
          {error}
        </p>
      )}

      {action.kind === 'disabled' && action.canCancel && !confirmCancel && (
        <div>
          <Button variant="danger-link" onClick={() => setConfirmCancel(true)} disabled={busy}>
            Скасувати заявку
          </Button>
        </div>
      )}
      {confirmCancel && (
        <div role="alertdialog" aria-label="Підтвердження скасування" className="rounded-2xl border border-line-off bg-surface p-4 animate-fade-up">
          <p className="text-p">
            {late
              ? 'До початку менше 12 годин — безкоштовне скасування вже недоступне. Скасувати все одно?'
              : 'Скасувати заявку? Скасування безкоштовне.'}
          </p>
          <div className="mt-3 flex items-center gap-4">
            <Button onClick={cancel} loading={busy}>
              Так, скасувати
            </Button>
            <Button variant="link" onClick={() => setConfirmCancel(false)} disabled={busy}>
              Ні
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
