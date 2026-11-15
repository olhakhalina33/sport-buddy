import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { fieldClass } from './fieldClass';

interface FieldWrapProps {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
}

export function FieldWrap({ id, label, error, hint, children }: FieldWrapProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-p text-muted">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-err`} role="alert" className="text-p text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="text-ps text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: ReactNode;
}

export const TextField = forwardRef<HTMLInputElement, Props>(function TextField(
  { label, error, hint, id, className = '', ...rest },
  ref,
) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <FieldWrap id={fid} label={label} error={error} hint={hint}>
      <input
        ref={ref}
        id={fid}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? `${fid}-err` : undefined}
        className={`h-12 ${fieldClass(error)} ${className}`}
        {...rest}
      />
    </FieldWrap>
  );
});

interface AreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: ReactNode;
}

export const TextArea = forwardRef<HTMLTextAreaElement, AreaProps>(function TextArea(
  { label, error, hint, id, ...rest },
  ref,
) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <FieldWrap id={fid} label={label} error={error} hint={hint}>
      <textarea
        ref={ref}
        id={fid}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? `${fid}-err` : undefined}
        className={`min-h-24 py-3 ${fieldClass(error)}`}
        {...rest}
      />
    </FieldWrap>
  );
});
