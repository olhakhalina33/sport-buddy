import { EmptyState } from '../../components/ui/States';

export function RequestsPage() {
  return (
    <>
      <h1 className="text-h4 mb-6">Заявки на тренування</h1>
      <EmptyState title="Заявки з’являться в ітерації 4" />
    </>
  );
}
