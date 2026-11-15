import { Link } from 'react-router-dom';
import { EmptyState } from '../../components/ui/States';

export function TrainingPage() {
  return (
    <>
      <Link to={-1 as unknown as string} className="mb-4 inline-block text-p font-bold text-accent">
        ← Назад
      </Link>
      <EmptyState title="Картка тренування з’явиться в ітерації 3" />
    </>
  );
}
