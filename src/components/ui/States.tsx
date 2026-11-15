import type { ReactNode } from 'react';
import { Button } from './Button';

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line-off px-6 py-10 text-center animate-fade-up">
      <p className="text-h5">{title}</p>
      {children}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border border-line-err/40 px-6 py-8 text-center">
      <p className="text-p font-bold text-danger">Не вдалося завантажити дані</p>
      <p className="text-ps text-muted">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Спробувати ще раз
        </Button>
      )}
    </div>
  );
}
