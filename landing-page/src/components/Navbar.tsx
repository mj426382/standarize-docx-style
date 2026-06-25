import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LOGIN_URL, REGISTER_URL } from '../config';

/** Sticky navbar z linkami i przyciskami logowania/rejestracji. */
export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="text-xl font-bold text-brand-600">
          DokFormat
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <a href="/#funkcje" className="text-sm text-gray-600 hover:text-brand-600">
            Funkcje
          </a>
          <a href="/#cennik" className="text-sm text-gray-600 hover:text-brand-600">
            Cennik
          </a>
          <Link to="/blog" className="text-sm text-gray-600 hover:text-brand-600">
            Blog
          </Link>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <a href={LOGIN_URL} className="text-sm font-medium text-gray-700 hover:text-brand-600">
            Zaloguj się
          </a>
          <a
            href={REGISTER_URL}
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
          >
            Wypróbuj za darmo
          </a>
        </div>

        <button
          className="md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Menu"
        >
          <div className="space-y-1.5">
            <span className="block h-0.5 w-6 bg-gray-700" />
            <span className="block h-0.5 w-6 bg-gray-700" />
            <span className="block h-0.5 w-6 bg-gray-700" />
          </div>
        </button>
      </div>

      {open && (
        <div className="border-t border-gray-100 bg-white px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-3">
            <a href="/#funkcje" className="text-sm text-gray-600">
              Funkcje
            </a>
            <a href="/#cennik" className="text-sm text-gray-600">
              Cennik
            </a>
            <Link to="/blog" className="text-sm text-gray-600">
              Blog
            </Link>
            <a href={LOGIN_URL} className="text-sm font-medium text-gray-700">
              Zaloguj się
            </a>
            <a
              href={REGISTER_URL}
              className="rounded-xl bg-brand-600 px-4 py-2 text-center text-sm font-medium text-white"
            >
              Wypróbuj za darmo
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
