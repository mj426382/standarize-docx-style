import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircleIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { documentsApi } from '../services/api';
import type { DocumentListItem } from '../types';
import Spinner from '../components/Spinner';
import StatusBadge from '../components/StatusBadge';

/** Pulpit - lista ostatnich dokumentów + CTA. */
export default function Dashboard() {
  const [items, setItems] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    documentsApi
      .list(1, 6)
      .then((res) => setItems(res.items))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pulpit</h1>
          <p className="text-gray-500">Twoje ostatnie dokumenty</p>
        </div>
        <Link
          to="/new"
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 font-medium text-white transition hover:bg-brand-700"
        >
          <PlusCircleIcon className="h-5 w-5" />
          Nowy dokument
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
          <DocumentTextIcon className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <p className="mb-4 text-gray-500">Nie masz jeszcze żadnych dokumentów.</p>
          <Link
            to="/new"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 font-medium text-white hover:bg-brand-700"
          >
            <PlusCircleIcon className="h-5 w-5" />
            Utwórz pierwszy dokument
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((doc) => (
            <Link
              key={doc.id}
              to={`/document/${doc.id}`}
              className="rounded-2xl bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <DocumentTextIcon className="h-8 w-8 text-brand-600" />
                <StatusBadge status={doc.status} />
              </div>
              <h3 className="truncate font-semibold">{doc.title}</h3>
              <p className="mt-1 text-xs text-gray-400">
                {new Date(doc.updatedAt).toLocaleString('pl-PL')}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
