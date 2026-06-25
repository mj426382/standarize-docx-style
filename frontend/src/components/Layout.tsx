import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  PlusCircleIcon,
  FolderIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';

/** Pozycje nawigacji w sidebarze. */
const NAV = [
  { to: '/', label: 'Pulpit', icon: HomeIcon },
  { to: '/new', label: 'Nowy dokument', icon: PlusCircleIcon },
  { to: '/library', label: 'Biblioteka', icon: FolderIcon },
];

/** Układ aplikacji z responsywnym sidebarem i menu mobilnym. */
export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 transform bg-white shadow-lg transition-transform md:static md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between px-6">
          <Link to="/" className="text-xl font-bold text-brand-600">
            DokFormat
          </Link>
          <button className="md:hidden" onClick={() => setOpen(false)} aria-label="Zamknij menu">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <nav className="mt-4 space-y-1 px-3">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-0 w-full border-t p-4">
          <p className="truncate px-2 text-sm text-gray-500">{user?.email}</p>
          <button
            onClick={handleLogout}
            className="mt-2 flex w-full items-center gap-2 rounded-xl px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
            Wyloguj się
          </button>
        </div>
      </aside>

      {/* Overlay mobilny */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Główna treść */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center gap-3 bg-white px-4 shadow-sm md:hidden">
          <button onClick={() => setOpen(true)} aria-label="Otwórz menu">
            <Bars3Icon className="h-6 w-6" />
          </button>
          <span className="text-lg font-bold text-brand-600">DokFormat</span>
        </header>
        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
