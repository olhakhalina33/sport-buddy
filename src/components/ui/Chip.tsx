interface Props {
  label: string;
  selected?: boolean;
  onToggle?: () => void;
}

/** Чип-фільтр: outline, обраний — заповнений teal. Без onToggle — статичний бейдж. */
export function Chip({ label, selected = false, onToggle }: Props) {
  const cls = `inline-flex h-10 items-center rounded-full border px-4 text-[15px] transition-colors duration-150 ${
    selected ? 'border-accent bg-accent text-accent-fg' : 'border-line bg-surface text-fg'
  }`;
  if (!onToggle) return <span className={cls}>{label}</span>;
  return (
    <button type="button" aria-pressed={selected} onClick={onToggle} className={`${cls} hover:border-accent`}>
      {label}
    </button>
  );
}
