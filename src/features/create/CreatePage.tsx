import { EmptyState } from '../../components/ui/States';

export function CreatePage() {
  return (
    <>
      <h1 className="text-h4 mb-6">Нове тренування</h1>
      <EmptyState title="Створення з’явиться в ітерації 4" />
    </>
  );
}
