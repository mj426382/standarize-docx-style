import { Link } from 'react-router-dom';

/** Stopka z linkami prawnymi i nawigacją. */
export default function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-gray-50">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3">
        <div>
          <p className="text-lg font-bold text-brand-600">DokFormat</p>
          <p className="mt-2 text-sm text-gray-500">
            Automatyczne formatowanie dokumentów Word z pomocą AI.
          </p>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-gray-700">Produkt</p>
          <ul className="space-y-2 text-sm text-gray-500">
            <li>
              <a href="/#funkcje" className="hover:text-brand-600">
                Funkcje
              </a>
            </li>
            <li>
              <a href="/#cennik" className="hover:text-brand-600">
                Cennik
              </a>
            </li>
            <li>
              <Link to="/blog" className="hover:text-brand-600">
                Blog
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-gray-700">Informacje prawne</p>
          <ul className="space-y-2 text-sm text-gray-500">
            <li>
              <Link to="/regulamin" className="hover:text-brand-600">
                Regulamin
              </Link>
            </li>
            <li>
              <Link to="/polityka-prywatnosci" className="hover:text-brand-600">
                Polityka prywatności
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-100 py-4 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} DokFormat. Wszelkie prawa zastrzeżone.
      </div>
    </footer>
  );
}
