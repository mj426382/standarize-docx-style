import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '../services/api';

/** Strona żądania resetu hasła. */
export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await authApi.forgotPassword(email);
      toast.success(res.message);
      setSent(true);
    } catch {
      toast.error('Wystąpił błąd. Spróbuj ponownie.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-1 text-2xl font-bold text-brand-600">Reset hasła</h1>
        <p className="mb-6 text-gray-500">Podaj adres e-mail powiązany z kontem.</p>

        {sent ? (
          <p className="rounded-xl bg-green-50 p-4 text-sm text-green-700">
            Jeśli konto istnieje, wysłaliśmy instrukcję resetu hasła.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="twoj@email.pl"
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-brand-600 focus:outline-none"
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-brand-600 py-2.5 font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {submitting ? 'Wysyłanie…' : 'Wyślij instrukcję'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm">
          <Link to="/login" className="text-brand-600 hover:underline">
            Wróć do logowania
          </Link>
        </p>
      </div>
    </div>
  );
}
