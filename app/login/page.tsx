'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { getSupabaseBrowser } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = getSupabaseBrowser();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(
          authError.message === 'Invalid login credentials'
            ? 'E-mail ou senha inválidos.'
            : authError.message
        );
        return;
      }

      router.push('/dashboard');
    } catch {
      setError('Ocorreu um erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1E0A3C] px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white px-8 py-10 shadow-2xl">
          {/* Logo / Brand */}
          <div className="mb-8 flex flex-col items-center gap-3">
            {!logoError ? (
              <div className="relative h-16 w-16">
                <Image
                  src="/logo-cont.png"
                  alt="ALETAX CONT"
                  fill
                  className="object-contain"
                  onError={() => setLogoError(true)}
                  priority
                />
              </div>
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#8B3FD4]">
                <span className="text-xl font-bold text-white">A</span>
              </div>
            )}
            <div className="text-center">
              <h1 className="text-2xl font-bold text-[#1E0A3C]">ALETAX CONT</h1>
              <p className="mt-1 text-sm text-gray-500">Acesse sua conta</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                E-mail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-colors focus:border-[#8B3FD4] focus:outline-none focus:ring-2 focus:ring-[#8B3FD4]/20 disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Senha
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-colors focus:border-[#8B3FD4] focus:outline-none focus:ring-2 focus:ring-[#8B3FD4]/20 disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="••••••••"
              />
            </div>

            {/* Error message */}
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="relative w-full rounded-lg bg-[#8B3FD4] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#7a35bc] focus:outline-none focus:ring-2 focus:ring-[#8B3FD4] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Entrando…
                </span>
              ) : (
                'Entrar'
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-white/40">
          &copy; {new Date().getFullYear()} Aletax. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
