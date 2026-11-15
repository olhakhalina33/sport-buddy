export const fieldClass = (error?: string) =>
  `w-full rounded-xl border bg-surface px-4 text-[15px] font-semibold text-fg placeholder:font-normal placeholder:text-faint
   transition-colors focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent
   disabled:border-line-off disabled:text-faint ${error ? 'border-line-err border-2' : 'border-line'}`;
