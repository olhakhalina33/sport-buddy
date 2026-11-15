import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'outline' | 'link' | 'danger-link';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  full?: boolean;
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-xl text-btn transition-colors duration-150 disabled:cursor-not-allowed';

const variants: Record<Variant, string> = {
  primary:
    'h-12 px-6 bg-brand text-onbtn hover:bg-brand-hover disabled:bg-btn-off disabled:text-faint disabled:hover:bg-btn-off',
  outline:
    'h-12 px-6 border border-line bg-surface text-fg hover:border-accent disabled:border-line-off disabled:text-faint',
  link: 'px-1 py-1 text-accent hover:underline disabled:text-faint disabled:no-underline',
  'danger-link': 'px-1 py-1 text-danger hover:underline disabled:text-faint disabled:no-underline',
};

export function Button({ variant = 'primary', loading, full, className = '', children, disabled, ...rest }: Props) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${base} ${variants[variant]} ${full ? 'w-full' : ''} ${className}`}
    >
      {loading && (
        <span
          aria-hidden
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
}
