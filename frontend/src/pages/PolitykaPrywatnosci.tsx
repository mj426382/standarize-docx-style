import { Link } from 'react-router-dom';

/** Polityka prywatności DokFormat. */
export default function PolitykaPrywatnosci() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link to="/" className="text-sm text-brand-600 hover:underline">
        ← Wróć
      </Link>
      <h1 className="mb-6 mt-4 text-3xl font-bold">Polityka prywatności</h1>
      <div className="space-y-4 text-gray-700">
        <section>
          <h2 className="mb-2 text-xl font-semibold">1. Administrator danych</h2>
          <p>
            Administratorem danych osobowych jest DokFormat. Kontakt w sprawach ochrony danych:
            kontakt@dokformat.pl.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-xl font-semibold">2. Zakres przetwarzanych danych</h2>
          <p>
            Przetwarzamy adres e-mail, opcjonalnie imię i nazwisko oraz treść dokumentów
            przesłanych do formatowania. Dane wykorzystywane są wyłącznie w celu świadczenia usługi.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-xl font-semibold">3. Podstawa prawna</h2>
          <p>
            Dane przetwarzane są na podstawie zgody użytkownika oraz w celu realizacji umowy o
            świadczenie usług drogą elektroniczną (RODO art. 6 ust. 1 lit. a i b).
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-xl font-semibold">4. Prawa użytkownika</h2>
          <p>
            Użytkownik ma prawo dostępu do danych, ich sprostowania, usunięcia oraz przeniesienia.
            Może w każdej chwili usunąć swoje konto i powiązane dokumenty.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-xl font-semibold">5. Bezpieczeństwo</h2>
          <p>
            Hasła przechowywane są w postaci zahaszowanej. Komunikacja z serwisem odbywa się przez
            szyfrowane połączenie HTTPS.
          </p>
        </section>
      </div>
    </div>
  );
}
