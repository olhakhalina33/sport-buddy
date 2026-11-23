import { Link } from 'react-router-dom';
import { AvatarStack } from '../ui/Avatar';
import { formatWhen } from '../../lib/dates';
import { LEVEL_LABEL, SPORT_LABEL } from '../../lib/labels';
import { seatsLabel } from '../../lib/seats';
import type { TrainingListItem } from '../../types';

/** Картка у списку: назва, вид спорту, дата·рівень, місце, «Вільно: N з M»/«Місць немає», аватарки. */
export function TrainingCard({ t, index = 0 }: { t: TrainingListItem; index?: number }) {
  const full = t.free_seats <= 0;
  const occupied = t.confirmed_count + 1;
  return (
    <Link
      to={`/training/${t.id}`}
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
      className="block rounded-2xl border border-line-off bg-surface p-5 transition-shadow animate-fade-up hover:shadow-md"
    >
      <h3 className="text-h5">{t.title}</h3>
      <p className="mt-2 text-p font-normal text-muted">
        {SPORT_LABEL[t.sport]} · {formatWhen(t.starts_at)} · {LEVEL_LABEL[t.level]}
      </p>
      <p className="mt-1 truncate text-ps text-muted">
        {t.place_name}
        {t.distance_km != null && ` · ${t.distance_km < 1 ? `${Math.round(t.distance_km * 1000)} м` : `${t.distance_km.toFixed(1)} км`}`}
      </p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className={`text-[16px] font-bold ${full ? 'text-faint' : 'text-accent'}`}>
          {seatsLabel(t.capacity, t.confirmed_count)}
        </span>
        <AvatarStack users={t.avatars} max={3} extra={Math.max(0, occupied - t.avatars.length)} />
      </div>
    </Link>
  );
}
