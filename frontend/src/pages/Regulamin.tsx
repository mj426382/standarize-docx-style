import { Link } from 'react-router-dom';

/** Regulamin świadczenia usług DokFormat. */
export default function Regulamin() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link to="/" className="text-sm text-brand-600 hover:underline">
        ← Wróć
      </Link>
      <h1 className="mb-6 mt-4 text-3xl font-bold">Regulamin serwisu DokFormat</h1>
      <div className="space-y-4 text-gray-700">
        <section>
          <h2 className="mb-2 text-xl font-semibold">§1. Postanowienia ogólne</h2>
          <p>
            Niniejszy regulamin określa zasady korzystania z serwisu DokFormat, umożliwiającego
            automatyczne formatowanie dokumentów tekstowych przy wykorzystaniu sztucznej
            inteligencji.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-xl font-semibold">§2. Zakres usługi</h2>
          <p>
            Serwis przekształca wprowadzony tekst lub przesłany plik (.txt, .docx) w spójnie
            sformatowany dokument Word oraz jego podgląd HTML. Użytkownik może poprawiać dokument
            poleceniami tekstowymi oraz ręcznie w edytorze.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-xl font-semibold">§3. Konto użytkownika</h2>
          <p>
            Korzystanie z serwisu wymaga założenia konta. Użytkownik zobowiązany jest do podania
            prawdziwych danych oraz zachowania poufności hasła.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-xl font-semibold">§4. Odpowiedzialność</h2>
          <p>
            Serwis dokłada starań, aby formatowanie zachowywało pełną treść merytoryczną dokumentu.
            Użytkownik zobowiązany jest do weryfikacji wyniku przed dalszym wykorzystaniem.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-xl font-semibold">§5. Postanowienia końcowe</h2>
          <p>
            W sprawach nieuregulowanych niniejszym regulaminem zastosowanie mają przepisy prawa
            polskiego.
          </p>
        </section>
      </div>
    </div>
  );
}
