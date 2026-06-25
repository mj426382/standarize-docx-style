import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowUpTrayIcon, DocumentIcon } from '@heroicons/react/24/outline';
import { documentsApi } from '../services/api';

type Tab = 'paste' | 'upload';

/** Strona tworzenia nowego dokumentu: z wklejki lub z pliku. */
export default function NewDocument() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('paste');
  const [title, setTitle] = useState('');
  const [rawText, setRawText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) setFile(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    maxSize: 10 * 1024 * 1024,
    accept: {
      'text/plain': ['.txt'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
  });

  const submitText = async () => {
    if (!rawText.trim()) {
      toast.error('Wklej treść dokumentu.');
      return;
    }
    setSubmitting(true);
    try {
      const { id } = await documentsApi.createFromText({ title: title || undefined, rawText });
      toast.success('Dokument utworzony.');
      navigate(`/document/${id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Nie udało się utworzyć dokumentu.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitFile = async () => {
    if (!file) {
      toast.error('Wybierz plik .txt lub .docx.');
      return;
    }
    setSubmitting(true);
    try {
      const { id } = await documentsApi.upload(file);
      toast.success('Dokument utworzony.');
      navigate(`/document/${id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Nie udało się przesłać pliku.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold">Nowy dokument</h1>

      <div className="mb-6 inline-flex rounded-xl bg-white p-1 shadow-sm">
        <button
          onClick={() => setTab('paste')}
          className={`rounded-lg px-5 py-2 text-sm font-medium transition ${
            tab === 'paste' ? 'bg-brand-600 text-white' : 'text-gray-600'
          }`}
        >
          Wklej tekst
        </button>
        <button
          onClick={() => setTab('upload')}
          className={`rounded-lg px-5 py-2 text-sm font-medium transition ${
            tab === 'upload' ? 'bg-brand-600 text-white' : 'text-gray-600'
          }`}
        >
          Wgraj plik
        </button>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        {tab === 'paste' ? (
          <div className="space-y-4">
            <div>
              <label htmlFor="doc-title" className="mb-1 block text-sm font-medium">
                Tytuł (opcjonalnie)
              </label>
              <input
                id="doc-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="np. Raport kwartalny"
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-brand-600 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="doc-content" className="mb-1 block text-sm font-medium">
                Treść
              </label>
              <textarea
                id="doc-content"
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={14}
                placeholder="Wklej tutaj surowy tekst do sformatowania…"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 font-mono text-sm focus:border-brand-600 focus:outline-none"
              />
            </div>
            <button
              onClick={submitText}
              disabled={submitting}
              className="rounded-xl bg-brand-600 px-6 py-2.5 font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {submitting ? 'Formatowanie…' : 'Sformatuj'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div
              {...getRootProps()}
              className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition ${
                isDragActive ? 'border-brand-600 bg-brand-50' : 'border-gray-300'
              }`}
            >
              <input {...getInputProps()} data-testid="file-input" />
              {file ? (
                <div className="flex items-center justify-center gap-2 text-gray-700">
                  <DocumentIcon className="h-6 w-6" />
                  {file.name}
                </div>
              ) : (
                <>
                  <ArrowUpTrayIcon className="mx-auto mb-3 h-10 w-10 text-gray-400" />
                  <p className="text-gray-600">Przeciągnij plik lub kliknij, aby wybrać</p>
                  <p className="mt-1 text-xs text-gray-400">.txt lub .docx, maks. 10 MB</p>
                </>
              )}
            </div>
            <button
              onClick={submitFile}
              disabled={submitting || !file}
              className="rounded-xl bg-brand-600 px-6 py-2.5 font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {submitting ? 'Przesyłanie…' : 'Sformatuj'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
