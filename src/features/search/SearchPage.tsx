import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Chip } from '../../components/ui/Chip';
import { Button } from '../../components/ui/Button';
import { ListSkeleton } from '../../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { TrainingCard } from '../../components/training/TrainingCard';
import { LocationPicker } from './LocationPicker';
import { searchTrainings } from '../../api/trainings';
import { EMPTY_FILTERS, canonicalParams, foundLabel, hasActiveFilters, resolveFilters, serializeFilters, toggle } from '../../lib/filters';
import { LEVELS, LEVEL_LABEL, SPORTS, SPORT_LABEL, T } from '../../lib/labels';
import { useAuth } from '../../hooks/useAuth';
import type { SearchFilters, TrainingListItem } from '../../types';

type State = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ok'; items: TrainingListItem[] };

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const { profile, loading: authLoading } = useAuth();
  const profileLevel = profile?.level;
  const filters = useMemo(() => resolveFilters(params, profileLevel), [params, profileLevel]);
  const [state, setState] = useState<State>({ status: 'loading' });
  const [reload, setReload] = useState(0);

  // Застосовані фільтри (зокрема рівень із профілю) завжди видно в URL; невалідні параметри відкидаються.
  useEffect(() => {
    if (authLoading) return; // чекаємо профіль, інакше зафіксуємо level=all замість рівня з профілю
    const canonical = canonicalParams(params, profileLevel);
    if (canonical) setParams(canonical, { replace: true });
  }, [authLoading, params, profileLevel, setParams]);

  const update = useCallback(
    (patch: Partial<SearchFilters>) => setParams(serializeFilters({ ...filters, ...patch }), { replace: true }),
    [filters, setParams],
  );

  useEffect(() => {
    const ctrl = new AbortController();
    setState((s) => (s.status === 'ok' ? s : { status: 'loading' }));
    searchTrainings(filters, ctrl.signal)
      .then((items) => setState({ status: 'ok', items }))
      .catch((e) => {
        if (!ctrl.signal.aborted) setState({ status: 'error', message: (e as Error).message });
      });
    return () => ctrl.abort();
  }, [filters, reload]);

  return (
    <>
      <h1 className="text-h4 mb-6">Тренування поруч</h1>

      <section aria-label="Фільтри" className="flex flex-col gap-5">
        <LocationPicker value={filters.location} onChange={(location) => update({ location, sort: location ? filters.sort : 'time' })} />

        <fieldset>
          <legend className="mb-3 text-p text-muted">Вид спорту</legend>
          <div className="flex flex-wrap gap-2">
            {SPORTS.map((s) => (
              <Chip key={s} label={SPORT_LABEL[s]} selected={filters.sports.includes(s)} onToggle={() => update({ sports: toggle(filters.sports, s) })} />
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-p text-muted">Рівень</legend>
          <div className="flex flex-wrap gap-2">
            {LEVELS.map((l) => (
              <Chip key={l} label={LEVEL_LABEL[l]} selected={filters.levels.includes(l)} onToggle={() => update({ levels: toggle(filters.levels, l) })} />
            ))}
          </div>
        </fieldset>
      </section>

      <div className="mb-4 mt-7 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-h5" aria-live="polite">
          {state.status === 'ok' ? foundLabel(state.items.length) : 'Пошук…'}
        </h2>
        {filters.location && (
          <label className="flex items-center gap-2 text-p text-muted">
            Сортувати:
            <select
              value={filters.sort}
              onChange={(e) => update({ sort: e.target.value as SearchFilters['sort'] })}
              className="rounded-lg border border-line bg-surface px-2 py-1 font-semibold text-fg"
            >
              <option value="time">за часом</option>
              <option value="distance">за відстанню</option>
            </select>
          </label>
        )}
      </div>

      {state.status === 'loading' && <ListSkeleton />}
      {state.status === 'error' && <ErrorState message={state.message} onRetry={() => setReload((r) => r + 1)} />}
      {state.status === 'ok' && state.items.length === 0 && (
        <EmptyState title={T.notFound}>
          {hasActiveFilters(filters) && (
            <Button variant="outline" onClick={() => setParams(serializeFilters(EMPTY_FILTERS), { replace: true })}>
              {T.resetFilters}
            </Button>
          )}
        </EmptyState>
      )}
      {state.status === 'ok' && state.items.length > 0 && (
        <ul className="flex flex-col gap-4">
          {state.items.map((t, i) => (
            <li key={t.id}>
              <TrainingCard t={t} index={i} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
