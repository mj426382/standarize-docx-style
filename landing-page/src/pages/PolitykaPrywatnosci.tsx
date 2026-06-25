import { Helmet } from 'react-helmet-async';

/** Polityka prywatności DokFormat (landing). */
export default function PolitykaPrywatnosci() {
  return (
    <>
      <Helmet>
        <title>Polityka prywatności — DokFormat</title>
      </Helmet>
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="mb-6 text-3xl font-bold">Polityka prywatności</h1>
        <div className="space-y-4 text-gray-700">
          <section>
            <h2 className="mb-2 text-xl font-semibold">1. Administrator danych</h2>
            <p>
              Administratorem danych osobowych jest DokFormat. Kontakt: kontakt@dokformat.pl.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-xl font-semibold">2. Zakres przetwarzanych danych</h2>
            <p>
              Przetwarzamy adres e-mail, opcjonalnie imię i nazwisko oraz treść dokumentów
              przesłanych do formatowania, wyłącznie w celu świadczenia usługi.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-xl font-semibold">3. Prawa użytkownika</h2>
            <p>
              Użytkownik ma prawo dostępu do danych, ich sprostowania, usunięcia oraz przeniesienia.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-xl font-semibold">4. Bezpieczeństwo</h2>
            <p>
              Hasła przechowywane są w postaci zahaszowanej, a komunikacja odbywa się przez HTTPS.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
