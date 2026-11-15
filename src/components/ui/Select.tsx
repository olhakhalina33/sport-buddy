import { forwardRef, useId, type SelectHTMLAttributes } from 'react';
import { FieldWrap } from './TextField';
import { fieldClass } from './fieldClass';

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, Props>(function Select(
  { label, error, options, id, ...rest },
  ref,
) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <FieldWrap id={fid} label={label} error={error}>
      <div className="relative">
        <select
          ref={ref}
          id={fid}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${fid}-err` : undefined}
          className={`h-12 appearance-none pr-10 ${fieldClass(error)}`}
          {...rest}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span aria-hidden className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted">
          ▾
        </span>
      </div>
    </FieldWrap>
  );
});
