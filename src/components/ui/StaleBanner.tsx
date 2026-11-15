import { T } from '../../lib/labels';

export function StaleBanner({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div
      role="status"
      className="sticky top-2 z-[1050] flex items-center gap-2 rounded-xl border border-warning/50 bg-surface px-4 py-3 text-p font-bold text-warning shadow-md animate-fade-up"
    >
      <span aria-hidden>⚠</span> {T.stale}
    </div>
  );
}
