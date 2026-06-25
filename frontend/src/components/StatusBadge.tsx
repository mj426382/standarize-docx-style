import type { DocumentStatus } from '../types';

/** Mapowanie statusu na etykietę i kolor. */
const MAP: Record<DocumentStatus, { label: string; cls: string }> = {
  PENDING: { label: 'Oczekuje', cls: 'bg-gray-100 text-gray-600' },
  PROCESSING: { label: 'Przetwarzanie', cls: 'bg-amber-100 text-amber-700' },
  COMPLETED: { label: 'Gotowy', cls: 'bg-green-100 text-green-700' },
  FAILED: { label: 'Błąd', cls: 'bg-red-100 text-red-700' },
};

/** Wizualny wskaźnik statusu dokumentu. */
export default function StatusBadge({ status }: { status: DocumentStatus }) {
  const { label, cls } = MAP[status];
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${cls}`} data-testid="status">
      {label}
    </span>
  );
}
