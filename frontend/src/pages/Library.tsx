import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowDownTrayIcon, TrashIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { documentsApi } from '../services/api';
import type { DocumentListItem } from '../types';
import Spinner from '../components/Spinner';
import StatusBadge from '../components/StatusBadge';

/** Biblioteka - wszystkie dokumenty użytkownika z akcjami. */
export default function Library() {
  const [items, setItems] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    documentsApi
      .list(1, 100)
      .then((res) => setItems(res.items))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const handleDownload = async (doc: DocumentListItem) => {
    try {
      const res = await documentsApi.download(doc.id);
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.title}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Nie udało się pobrać pliku.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Czy na pewno usunąć ten dokument?')) return;
    try {
      await documentsApi.remove(id);
      setItems((prev) => prev.filter((d) => d.id !== id));
      toast.success('Dokument usunięty.');
    } catch {
      toast.error('Nie udało się usunąć dokumentu.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-2xl font-bold">Biblioteka</h1>

      {items.length === 0 ? (
        <p className="rounded-2xl bg-white p-12 text-center text-gray-500 shadow-sm">
          Brak dokumentów.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-5 py-3">Tytuł</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Zaktualizowano</th>
                <th className="px-5 py-3 text-right">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {items.map((doc) => (
                <tr key={doc.id} className="border-t border-gray-100">
                  <td className="px-5 py-3">
                    <Link
                      to={`/document/${doc.id}`}
                      className="flex items-center gap-2 font-medium text-gray-800 hover:text-brand-600"
                    >
                      <DocumentTextIcon className="h-5 w-5 text-brand-600" />
                      {doc.title}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={doc.status} />
                  </td>
                  <td className="px-5 py-3 text-gray-400">
                    {new Date(doc.updatedAt).toLocaleString('pl-PL')}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleDownload(doc)}
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                        title="Pobierz .docx"
                      >
                        <ArrowDownTrayIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                        title="Usuń"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
