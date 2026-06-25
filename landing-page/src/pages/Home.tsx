import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { REGISTER_URL } from '../config';

/** Lista funkcji prezentowanych na stronie. */
const FEATURES = [
  { title: 'Spójne formatowanie', desc: 'Jednolite nagłówki, akapity, listy i tabele w całym dokumencie.' },
  { title: 'Z .docx, .txt lub wklejki', desc: 'Wprowadź treść w dowolny sposób — resztą zajmie się AI.' },
  { title: 'Edycja przez prompt', desc: 'Opisz zmianę słowami, a dokument zostanie poprawiony.' },
  { title: 'Ręczna korekta', desc: 'Dopracuj szczegóły w edytorze WYSIWYG i zapisz.' },
  { title: 'Gotowy plik Word', desc: 'Pobierz dopracowany dokument .docx jednym kliknięciem.' },
  { title: 'Podgląd przed pobraniem', desc: 'Zobacz efekt formatowania zanim pobierzesz plik.' },
];

/** Kroki procesu. */
const STEPS = [
  { n: '1', title: 'Wprowadź treść', desc: 'Wklej tekst lub wgraj plik .txt / .docx.' },
  { n: '2', title: 'AI formatuje', desc: 'Otrzymujesz spójny układ z hierarchią i listami.' },
  { n: '3', title: 'Dopracuj i pobierz', desc: 'Popraw przez prompt lub ręcznie, pobierz .docx.' },
];

/** Opinie użytkowników. */
const TESTIMONIALS = [
  { quote: 'Skróciłam czas przygotowania raportów z godzin do minut.', author: 'Anna, analityk' },
  { quote: 'Wreszcie wszystkie nasze dokumenty wyglądają spójnie.', author: 'Marek, kierownik biura' },
  { quote: 'Edycja przez prompt to oszczędność mnóstwa klikania.', author: 'Kasia, copywriter' },
];

/** Plany cenowe. */
const PLANS = [
  { name: 'Start', price: '0 zł', features: ['5 dokumentów / mies.', 'Eksport .docx', 'Podgląd HTML'], cta: 'Zacznij za darmo' },
  { name: 'Pro', price: '29 zł', features: ['Bez limitu dokumentów', 'Edycja przez prompt', 'Historia wersji'], cta: 'Wybierz Pro', highlight: true },
  { name: 'Zespół', price: '99 zł', features: ['Wszystko z Pro', 'Wspólna biblioteka', 'Priorytetowe wsparcie'], cta: 'Skontaktuj się' },
];

/** Najczęstsze pytania. */
const FAQ = [
  { q: 'Czy moje dane są bezpieczne?', a: 'Tak. Dokumenty przechowywane są bezpiecznie, a komunikacja odbywa się przez HTTPS. Możesz w każdej chwili usunąć swoje pliki.' },
  { q: 'Jakie formaty mogę wgrać?', a: 'Obsługujemy pliki .txt oraz .docx, a także zwykłe wklejenie tekstu.' },
  { q: 'Czy formatowanie zmienia treść?', a: 'Nie. AI poprawia wyłącznie strukturę i formatowanie, zachowując pełną treść merytoryczną.' },
  { q: 'Czy mogę cofnąć zmiany?', a: 'Tak. Każda wersja dokumentu jest zapisywana i możesz przywrócić poprzednią.' },
];

/** Strona główna landing page. */
export default function Home() {
  return (
    <>
      <Helmet>
        <title>DokFormat — formatowanie dokumentów Word z AI</title>
        <meta
          name="description"
          content="Zamień surowy tekst lub plik .docx w pięknie sformatowany dokument Word. Spójne nagłówki, listy i tabele, edycja przez prompt i podgląd HTML."
        />
        <meta property="og:title" content="DokFormat — formatowanie dokumentów Word z AI" />
        <meta
          property="og:description"
          content="Automatyczne, spójne formatowanie dokumentów Word z pomocą sztucznej inteligencji."
        />
        <meta property="og:type" content="website" />
      </Helmet>

      {/* Hero */}
      <section className="bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto max-w-4xl px-4 py-24 text-center">
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
            Pięknie sformatowane dokumenty Word w kilka sekund
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
            Wklej tekst lub wgraj plik, a DokFormat nada mu spójny układ: jednolite nagłówki,
            akapity, listy i tabele. Popraw przez prompt i pobierz gotowy plik .docx.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <a
              href={REGISTER_URL}
              className="rounded-xl bg-brand-600 px-7 py-3 font-medium text-white transition hover:bg-brand-700"
            >
              Wypróbuj za darmo
            </a>
            <a
              href="#funkcje"
              className="rounded-xl border border-gray-300 px-7 py-3 font-medium text-gray-700 transition hover:border-brand-600 hover:text-brand-600"
            >
              Zobacz funkcje
            </a>
          </div>
        </div>
      </section>

      {/* Funkcje */}
      <section id="funkcje" className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-center text-3xl font-bold">Wszystko, czego potrzebujesz</h2>
        <p className="mt-3 text-center text-gray-500">Jedna funkcja zrobiona naprawdę dobrze.</p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h3 className="font-semibold text-brand-700">{f.title}</h3>
              <p className="mt-2 text-sm text-gray-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Jak to działa */}
      <section className="bg-gray-50">
        <div className="mx-auto max-w-5xl px-4 py-20">
          <h2 className="text-center text-3xl font-bold">Jak to działa</h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-lg font-bold text-white">
                  {s.n}
                </div>
                <h3 className="mt-4 font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Opinie */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-center text-3xl font-bold">Co mówią użytkownicy</h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <figure key={t.author} className="rounded-2xl border border-gray-100 p-6 shadow-sm">
              <blockquote className="text-gray-700">„{t.quote}"</blockquote>
              <figcaption className="mt-4 text-sm font-medium text-gray-500">— {t.author}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Cennik */}
      <section id="cennik" className="bg-gray-50">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="text-center text-3xl font-bold">Prosty cennik</h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={`rounded-2xl border p-8 ${
                  p.highlight ? 'border-brand-600 shadow-lg' : 'border-gray-100 shadow-sm'
                } bg-white`}
              >
                <h3 className="font-semibold">{p.name}</h3>
                <p className="mt-3 text-3xl font-bold">
                  {p.price}
                  <span className="text-base font-normal text-gray-400"> / mies.</span>
                </p>
                <ul className="mt-6 space-y-2 text-sm text-gray-600">
                  {p.features.map((f) => (
                    <li key={f}>✓ {f}</li>
                  ))}
                </ul>
                <a
                  href={REGISTER_URL}
                  className={`mt-8 block rounded-xl py-2.5 text-center text-sm font-medium ${
                    p.highlight
                      ? 'bg-brand-600 text-white hover:bg-brand-700'
                      : 'border border-gray-300 text-gray-700 hover:border-brand-600'
                  }`}
                >
                  {p.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-20">
        <h2 className="text-center text-3xl font-bold">Najczęstsze pytania</h2>
        <div className="mt-12 space-y-4">
          {FAQ.map((item) => (
            <details key={item.q} className="rounded-2xl border border-gray-100 p-5 shadow-sm">
              <summary className="cursor-pointer font-medium">{item.q}</summary>
              <p className="mt-3 text-sm text-gray-600">{item.a}</p>
            </details>
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link to="/blog" className="text-brand-600 hover:underline">
            Przeczytaj nasz blog →
          </Link>
        </div>
      </section>
    </>
  );
}
