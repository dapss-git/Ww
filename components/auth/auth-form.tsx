'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { api, ApiClientError } from '@/lib/client/api';
import { User, LogIn, UserPlus, Eye, EyeOff } from 'lucide-react';

interface Props {
  mode: 'login' | 'register' | 'owner';
}

export function AuthForm({ mode }: Props) {
  const router = useRouter();
  const search = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [remember, setRemember] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const nextPath = search.get('next');
  const targetDestination = nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/lobby';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isGuestMode) {
        await api('/api/auth/guest', { method: 'POST', json: { nickname: guestName } });
        router.push(targetDestination);
      } else if (mode === 'register') {
        await api('/api/auth/register', { method: 'POST', json: { username, password, confirmPassword: confirm } });
        router.push(targetDestination);
      } else if (mode === 'login') {
        await api('/api/auth/login', { method: 'POST', json: { username, password, remember } });
        router.push(targetDestination);
      } else {
        await api('/api/owner/auth/login', { method: 'POST', json: { username, password, remember } });
        router.push('/owner/dashboard');
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Terjadi kesalahan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  const title = mode === 'owner' 
    ? 'Masuk sebagai owner' 
    : isGuestMode 
    ? 'Masuk Cepat (Tamu)' 
    : mode === 'register' 
    ? 'Buat akun' 
    : 'Masuk ke desa';

  return (
    <div className="w-full max-w-sm space-y-4">
      {mode !== 'owner' && (
        <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-night/80 p-1 text-sm">
          <button
            type="button"
            onClick={() => setIsGuestMode(false)}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 font-medium transition ${
              !isGuestMode ? 'bg-gold/20 text-gold-soft border border-gold/40' : 'text-mute hover:text-ink'
            }`}
          >
            {mode === 'register' ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
            {mode === 'register' ? 'Akun Tetap' : 'Akun Tetap'}
          </button>
          <button
            type="button"
            onClick={() => setIsGuestMode(true)}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 font-medium transition ${
              isGuestMode ? 'bg-purple/20 text-purple-soft border border-purple/40' : 'text-mute hover:text-ink'
            }`}
          >
            <User className="h-4 w-4" /> Masuk Tamu
          </button>
        </div>
      )}

      <form onSubmit={submit} className="panel w-full space-y-4 p-6 shadow-glow" noValidate>
        <div>
          <h1 className="font-display text-2xl text-gold-soft">{title}</h1>
          {isGuestMode && (
            <p className="mt-1 text-xs text-mute">Cukup masukkan nama tampilan tanpa perlu sandi/password.</p>
          )}
        </div>

        {isGuestMode ? (
          <div className="space-y-1.5">
            <label htmlFor="guestName" className="text-sm text-mute">Nama Kamu di Permainan</label>
            <input
              id="guestName"
              className="input"
              placeholder="Contoh: Dafa, Ksatria99"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              required
              maxLength={20}
            />
            <p className="text-xs text-mute">2-20 karakter, langsung masuk ke room/lobby.</p>
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <label htmlFor="username" className="text-sm text-mute">Username</label>
              <input id="username" className="input" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required maxLength={40} />
              {mode === 'register' && <p className="text-xs text-mute">3-20 karakter: huruf kecil, angka, underscore.</p>}
            </div>
            
            {/* Password input with Show/Hide toggle */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm text-mute">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-10"
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  maxLength={128}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-mute hover:text-ink transition"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {mode === 'register' && <p className="text-xs text-mute">Minimal 8 karakter dengan huruf besar, huruf kecil, dan angka.</p>}
            </div>

            {/* Confirm Password input with Show/Hide toggle */}
            {mode === 'register' && (
              <div className="space-y-1.5">
                <label htmlFor="confirm" className="text-sm text-mute">Konfirmasi password</label>
                <div className="relative">
                  <input
                    id="confirm"
                    type={showConfirm ? 'text' : 'password'}
                    className="input pr-10"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-mute hover:text-ink transition"
                    aria-label={showConfirm ? 'Sembunyikan konfirmasi password' : 'Lihat konfirmasi password'}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {mode !== 'register' && (
              <label className="flex items-center gap-2 text-sm text-mute cursor-pointer select-none">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 accent-[#C9A45C]" />
                Ingat saya
              </label>
            )}
          </>
        )}

        {error && <p role="alert" className="rounded-lg border border-crimson/50 bg-crimson/10 px-3 py-2 text-sm text-crimson-soft">{error}</p>}
        
        <Button type="submit" loading={loading} className="w-full">
          {isGuestMode ? 'Masuk Sekarang' : mode === 'register' ? 'Daftar' : 'Masuk'}
        </Button>

        {!isGuestMode && mode === 'login' && (
          <p className="text-center text-sm text-mute">Belum punya akun? <Link href="/register" className="text-gold-soft hover:underline">Daftar</Link></p>
        )}
        {!isGuestMode && mode === 'register' && (
          <p className="text-center text-sm text-mute">Sudah punya akun? <Link href="/login" className="text-gold-soft hover:underline">Masuk</Link></p>
        )}
      </form>
    </div>
  );
}
