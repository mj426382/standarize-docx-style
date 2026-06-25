import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import GoogleLoginButton from '../components/GoogleLoginButton';

/** Reguły siły hasła odzwierciedlające walidację backendu. */
const RULES = [
  { test: (p: string) => p.length >= 8, label: 'Co najmniej 8 znaków' },
  { test: (p: string) => /[a-z]/.test(p), label: 'Mała litera' },
  { test: (p: string) => /[A-Z]/.test(p), label: 'Wielka litera' },
  { test: (p: string) => /[0-9]/.test(p), label: 'Cyfra' },
  { test: (p: string) => /[^A-Za-z0-9]/.test(p), label: 'Znak specjalny' },
];

/** Strona rejestracji z walidacją siły hasła. */
export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const checks = useMemo(() => RULES.map((r) => ({ ...r, ok: r.test(password) })), [password]);
  const allValid = checks.every((c) => c.ok);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!allValid) {
      toast.error('Hasło nie spełnia wymagań.');
      return;
    }
    setSubmitting(true);
    try {
      await register(email, password, name || undefined);
      toast.success('Konto utworzone.');
      navigate('/');
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Rejestracja nie powiodła się.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-1 text-2xl font-bold text-brand-600">DokFormat</h1>
        <p className="mb-6 text-gray-500">Załóż darmowe konto</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Imię i nazwisko (opcjonalnie)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-brand-600 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="register-email" className="mb-1 block text-sm font-medium">
              E-mail
            </label>
            <input
              id="register-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-brand-600 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="register-password" className="mb-1 block text-sm font-medium">
              Hasło
            </label>
            <input
              id="register-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-brand-600 focus:outline-none"
            />
            <ul className="mt-2 space-y-1 text-xs">
              {checks.map((c) => (
                <li
                  key={c.label}
                  className={c.ok ? 'text-green-600' : 'text-gray-400'}
                  data-testid="password-rule"
                >
                  {c.ok ? '✓' : '○'} {c.label}
                </li>
              ))}
            </ul>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-brand-600 py-2.5 font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {submitting ? 'Tworzenie…' : 'Utwórz konto'}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-sm text-gray-400">
          <span className="h-px flex-1 bg-gray-200" /> lub <span className="h-px flex-1 bg-gray-200" />
        </div>
        <div className="flex justify-center">
          <GoogleLoginButton />
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          Masz już konto?{' '}
          <Link to="/login" className="font-medium text-brand-600 hover:underline">
            Zaloguj się
          </Link>
        </p>
      </div>
    </div>
  );
}
