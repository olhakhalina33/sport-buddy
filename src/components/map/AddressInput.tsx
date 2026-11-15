import { useEffect, useId, useState } from 'react';
import { searchAddress } from '../../api/geocode';
import { useDebounce } from '../../hooks/useDebounce';
import type { GeoPoint } from '../../types';
import { fieldClass } from '../ui/fieldClass';

interface Props {
  label: string;
  placeholder?: string;
  value: string;
  onTextChange: (text: string) => void;
  onSelect: (p: GeoPoint) => void;
  error?: string;
}

/** Поле адреси з підказками Nominatim (debounce 600 мс, combobox для клавіатури й читачів екрана). */
export function AddressInput({ label, placeholder, value, onTextChange, onSelect, error }: Props) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [items, setItems] = useState<GeoPoint[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [dirty, setDirty] = useState(false);
  const query = useDebounce(value, 600);

  useEffect(() => {
    if (!dirty || query.trim().length < 3) {
      setItems([]);
      return;
    }
    const ctrl = new AbortController();
    setStatus('loading');
    searchAddress(query, ctrl.signal)
      .then((r) => {
        setItems(r);
        setStatus('idle');
        setOpen(true);
        setActive(-1);
      })
      .catch((e) => {
        if ((e as Error).name !== 'AbortError') setStatus('error');
      });
    return () => ctrl.abort();
  }, [query, dirty]);

  const choose = (p: GeoPoint) => {
    onSelect(p);
    setDirty(false);
    setOpen(false);
    setItems([]);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (!open || !items.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(items.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      choose(items[active]!);
    } else if (e.key === 'Escape') setOpen(false);
  };

  const showEmpty = open && dirty && status === 'idle' && query.trim().length >= 3 && items.length === 0;

  return (
    <div className="relative flex flex-col gap-2">
      <label htmlFor={id} className="text-p text-muted">
        {label}
      </label>
      <input
        id={id}
        role="combobox"
        aria-expanded={open && items.length > 0}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${id}-opt-${active}` : undefined}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          setDirty(true);
          onTextChange(e.target.value);
        }}
        onKeyDown={onKey}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onFocus={() => items.length && setOpen(true)}
        className={`h-12 ${fieldClass(error)}`}
      />
      {status === 'loading' && (
        <span className="absolute right-4 top-[46px] h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-transparent" aria-hidden />
      )}
      {open && items.length > 0 && (
        <ul
          id={`${id}-list`}
          role="listbox"
          className="absolute top-full z-[1100] mt-1 w-full overflow-hidden rounded-xl border border-line-off bg-surface shadow-lg"
        >
          {items.map((p, i) => (
            <li
              key={`${p.lat},${p.lng}`}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(p);
              }}
              className={`cursor-pointer px-4 py-3 text-p ${i === active ? 'bg-accent text-accent-fg' : 'hover:bg-page'}`}
            >
              {p.label}
            </li>
          ))}
        </ul>
      )}
      {showEmpty && <p className="text-ps text-muted">Адресу не знайдено. Уточніть запит або оберіть точку на карті.</p>}
      {status === 'error' && <p className="text-ps text-danger">Не вдалося отримати підказки адрес</p>}
      {error && (
        <p id={`${id}-err`} role="alert" className="text-p text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
