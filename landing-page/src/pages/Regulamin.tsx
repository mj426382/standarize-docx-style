import { Helmet } from 'react-helmet-async';

/** Regulamin serwisu DokFormat (landing). */
export default function Regulamin() {
  return (
    <>
      <Helmet>
        <title>Regulamin — DokFormat</title>
      </Helmet>
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="mb-6 text-3xl font-bold">Regulamin serwisu DokFormat</h1>
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
              sformatowany dokument Word oraz jego podgląd HTML.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-xl font-semibold">§3. Konto użytkownika</h2>
            <p>
              Korzystanie z serwisu wymaga założenia konta i zachowania poufności danych logowania.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-xl font-semibold">§4. Odpowiedzialność</h2>
            <p>
              Użytkownik zobowiązany jest do weryfikacji wyniku formatowania przed dalszym
              wykorzystaniem dokumentu.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-xl font-semibold">§5. Postanowienia końcowe</h2>
            <p>W sprawach nieuregulowanych zastosowanie mają przepisy prawa polskiego.</p>
          </section>
        </div>
      </div>
    </>
  );
}
