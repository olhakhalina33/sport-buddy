import { useTheme } from '../../hooks/useTheme';

export function ThemeToggle() {
  const { dark, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Увімкнути світлу тему' : 'Увімкнути темну тему'}
      aria-pressed={dark}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line-off bg-surface text-lg transition-colors hover:border-accent"
    >
      <span aria-hidden>{dark ? '☀' : '☾'}</span>
    </button>
  );
}
