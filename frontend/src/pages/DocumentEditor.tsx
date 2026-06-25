import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowDownTrayIcon,
  SparklesIcon,
  PencilSquareIcon,
  EyeIcon,
  ClockIcon,
  CheckIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { SuperDocEditor, type SuperDocRef, type DocumentMode } from '@superdoc-dev/react';
import { superdocFonts } from '@superdoc-dev/fonts';
import '@superdoc-dev/react/style.css';
import { documentsApi } from '../services/api';
import type { DocumentDetail, DocumentVersionInfo } from '../types';
import Spinner from '../components/Spinner';
import StatusBadge from '../components/StatusBadge';

/** Etykiety pochodzenia wersji. */
const ORIGIN_LABEL: Record<string, string> = {
  AI_FORMAT: 'Ujednolicony styl (AI)',
  AI_EDIT: 'Edycja AI',
  MANUAL: 'Edycja ręczna',
};

/** Typ MIME pliku .docx. */
const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/**
 * Ekran edytora dokumentu oparty na SuperDoc: wierne 1:1 renderowanie i edycja .docx,
 * zapis wersji, pobranie oraz ujednolicenie stylu przez AI na żądanie użytkownika.
 */
export default function DocumentEditor() {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [versions, setVersions] = useState<DocumentVersionInfo[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<DocumentMode>('editing');
  const [busy, setBusy] = useState(false);
  const [standardizing, setStandardizing] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [prompting, setPrompting] = useState(false);
  const editorRef = useRef<SuperDocRef>(null);

  const refreshVersions = useCallback(async () => {
    if (!id) return;
    setVersions(await documentsApi.versions(id).catch(() => []));
  }, [id]);

  /** Pobiera najnowszy .docx z backendu i ładuje go do edytora SuperDoc. */
  const loadFile = useCallback(
    async (title: string) => {
      if (!id) return;
      const blob = await documentsApi.file(id);
      setFile(new File([blob], `${title || 'dokument'}.docx`, { type: DOCX_MIME }));
    },
    [id],
  );

  const load = useCallback(async () => {
    if (!id) return;
    const data = await documentsApi.get(id);
    setDoc(data);
    await refreshVersions();
    if (data.status === 'COMPLETED') {
      await loadFile(data.title);
    }
  }, [id, loadFile, refreshVersions]);

  useEffect(() => {
    load().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /** Eksportuje aktualną zawartość edytora jako Blob .docx (1:1 z podglądem). */
  const exportBlob = async (): Promise<Blob | null> => {
    const instance = editorRef.current?.getInstance();
    if (!instance) return null;
    return instance.export({ triggerDownload: false });
  };

  const handleSave = async () => {
    if (!id) return;
    setBusy(true);
    try {
      const blob = await exportBlob();
      if (!blob) {
        toast.error('Edytor nie jest gotowy.');
        return;
      }
      const updated = await documentsApi.saveFile(id, blob);
      setDoc(updated);
      await refreshVersions();
      toast.success('Zmiany zapisane.');
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Nie udało się zapisać zmian.');
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = async () => {
    try {
      const instance = editorRef.current?.getInstance();
      if (instance) {
        await instance.export({ triggerDownload: true });
        return;
      }
      // Fallback: pobierz zapisaną wersję z backendu.
      if (!id) return;
      const res = await documentsApi.download(id);
      const blob = new Blob([res.data], { type: DOCX_MIME });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc?.title ?? 'dokument'}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Nie udało się pobrać pliku.');
    }
  };

  const handleStandardize = async () => {
    if (!id || !doc) return;
    setStandardizing(true);
    console.info('[ujednolicanie] start', { id });
    try {
      // Najpierw zachowaj bieżące, niezapisane zmiany jako wersję wyjściową.
      const blob = await exportBlob();
      if (blob) {
        console.info('[ujednolicanie] zapis bieżących zmian przed ujednoliceniem');
        await documentsApi.saveFile(id, blob).catch(() => undefined);
      }
      console.info('[ujednolicanie] wywołanie API standardize');
      const updated = await documentsApi.standardize(id);
      setDoc(updated);
      await refreshVersions();
      await loadFile(updated.title);
      console.info('[ujednolicanie] zakończono, nowa wersja załadowana');
      toast.success('Styl ujednolicony. Oryginał zachowano w historii wersji.');
    } catch (err: any) {
      console.error('[ujednolicanie] błąd', err);
      toast.error(err.response?.data?.message ?? 'Nie udało się ujednolicić stylu.');
    } finally {
      setStandardizing(false);
    }
  };

  const handlePromptEdit = async () => {
    if (!id || instruction.trim().length < 3) {
      toast.error('Wpisz polecenie (min. 3 znaki).');
      return;
    }
    setPrompting(true);
    console.info('[prompt] start', { id, instruction });
    try {
      // Zachowaj bieżące zmiany, aby AI pracowało na aktualnej treści.
      const blob = await exportBlob();
      if (blob) {
        console.info('[prompt] zapis bieżących zmian przed edycją AI');
        await documentsApi.saveFile(id, blob).catch(() => undefined);
      }
      console.info('[prompt] wywołanie API editByPrompt');
      const updated = await documentsApi.editByPrompt(id, instruction);
      setDoc(updated);
      await refreshVersions();
      await loadFile(updated.title);
      setInstruction('');
      console.info('[prompt] zakończono, nowa wersja załadowana');
      toast.success('Dokument poprawiony przez AI.');
    } catch (err: any) {
      console.error('[prompt] błąd', err);
      toast.error(err.response?.data?.message ?? 'Nie udało się poprawić dokumentu.');
    } finally {
      setPrompting(false);
    }
  };

  const handleRestore = async (versionNo: number) => {
    if (!id) return;
    setBusy(true);
    try {
      const updated = await documentsApi.restore(id, versionNo);
      setDoc(updated);
      await refreshVersions();
      await loadFile(updated.title);
      toast.success(`Przywrócono wersję ${versionNo}.`);
    } catch {
      toast.error('Nie udało się przywrócić wersji.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (!doc) {
    return <p className="text-center text-gray-500">Nie znaleziono dokumentu.</p>;
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{doc.title}</h1>
          <StatusBadge status={doc.status} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-xl bg-white p-1 shadow-sm">
            <button
              onClick={() => setMode('viewing')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${
                mode === 'viewing' ? 'bg-brand-600 text-white' : 'text-gray-600'
              }`}
            >
              <EyeIcon className="h-4 w-4" /> Podgląd
            </button>
            <button
              onClick={() => setMode('editing')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${
                mode === 'editing' ? 'bg-brand-600 text-white' : 'text-gray-600'
              }`}
            >
              <PencilSquareIcon className="h-4 w-4" /> Edycja
            </button>
          </div>
          <button
            onClick={handleSave}
            disabled={busy || !file}
            className="flex items-center gap-2 rounded-xl border border-brand-600 px-4 py-2.5 font-medium text-brand-600 transition hover:bg-brand-50 disabled:opacity-60"
            data-testid="save-btn"
          >
            {busy ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-600/40 border-t-brand-600" />
            ) : (
              <CheckIcon className="h-5 w-5" />
            )}
            Zapisz
          </button>
          <button
            onClick={handleDownload}
            disabled={!file}
            className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
            data-testid="download-btn"
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
            Pobierz .docx
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            {file ? (
              <SuperDocEditor
                ref={editorRef}
                document={file}
                documentMode={mode}
                fonts={superdocFonts}
                style={{ minHeight: '70vh' }}
              />
            ) : (
              <div className="flex flex-col items-center gap-3 p-16">
                <Spinner />
                <p className="text-gray-500">Ładowanie dokumentu…</p>
              </div>
            )}
          </div>
        </div>

        {/* Panel boczny: prompt AI + ujednolicenie stylu + historia */}
        <div className="space-y-6">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <SparklesIcon className="h-5 w-5 text-brand-600" /> Popraw przez AI
            </h3>
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              rows={3}
              placeholder="np. Pogrub nagłówki sekcji i ujednolić tabele"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none"
              data-testid="prompt-input"
            />
            <button
              onClick={handlePromptEdit}
              disabled={prompting || !file}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
              data-testid="prompt-submit"
            >
              {prompting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Przetwarzanie…
                </>
              ) : (
                'Popraw przez AI'
              )}
            </button>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h3 className="mb-2 flex items-center gap-2 font-semibold">
              <SparklesIcon className="h-5 w-5 text-brand-600" /> Ujednolić styl
            </h3>
            <p className="mb-3 flex items-start gap-1.5 text-xs text-gray-500">
              <InformationCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
              AI ujednolici formatowanie tabel, akapitów i wcięć. Oryginał pozostaje w historii
              wersji.
            </p>
            <div className="group relative">
              <button
                onClick={handleStandardize}
                disabled={standardizing || !file}
                title="Ujednolić styl tabel, akapitów i wcięć przez AI. Oryginał zachowany w historii wersji."
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
                data-testid="standardize-btn"
              >
                {standardizing ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Ujednolicanie…
                  </>
                ) : (
                  <>
                    <SparklesIcon className="h-4 w-4" /> Ujednolić styl
                  </>
                )}
              </button>
              <span className="pointer-events-none absolute -top-2 left-1/2 z-10 w-56 -translate-x-1/2 -translate-y-full rounded-lg bg-gray-900 px-3 py-2 text-xs text-white opacity-0 shadow-lg transition group-hover:opacity-100">
                Ujednolica styl tabel, akapitów i wcięć przez AI. Oryginał zostaje zapisany w
                historii wersji do przywrócenia.
              </span>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <ClockIcon className="h-5 w-5 text-brand-600" /> Historia wersji
            </h3>
            <ul className="space-y-2" data-testid="version-list">
              {versions.map((v) => (
                <li
                  key={v.id}
                  className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 text-sm"
                >
                  <div>
                    <span className="font-medium">v{v.versionNo}</span>{' '}
                    <span className="text-gray-500">{ORIGIN_LABEL[v.origin]}</span>
                    <p className="text-xs text-gray-400">
                      {new Date(v.createdAt).toLocaleString('pl-PL')}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRestore(v.versionNo)}
                    disabled={busy}
                    className="text-xs font-medium text-brand-600 hover:underline disabled:opacity-50"
                  >
                    Przywróć
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
