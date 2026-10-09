'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { api, ApiClientError } from '@/lib/client/api';

interface Props {
  mode: 'login' | 'register' | 'owner';
}

export function AuthForm({ mode }: Props) {
  const router = useRouter();
  const search = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'register') {
        await api('/api/auth/register', { method: 'POST', json: { username, password, confirmPassword: confirm } });
        router.push('/lobby');
      } else if (mode === 'login') {
        await api('/api/auth/login', { method: 'POST', json: { username, password, remember } });
        const next = search.get('next');
        router.push(next && next.startsWith('/') && !next.startsWith('//') ? next : '/lobby');
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

  const title = mode === 'register' ? 'Buat akun' : mode === 'owner' ? 'Masuk sebagai owner' : 'Masuk ke desa';
  const cta = mode === 'register' ? 'Daftar' : 'Masuk';

  return (
    <form onSubmit={submit} className="panel w-full max-w-sm space-y-4 p-6 shadow-glow" noValidate>
      <h1 className="font-display text-2xl text-gold-soft">{title}</h1>
      <div className="space-y-1.5">
        <label htmlFor="username" className="text-sm text-mute">Username</label>
        <input id="username" className="input" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required maxLength={40} />
        {mode === 'register' && <p className="text-xs text-mute">3-20 karakter: huruf kecil, angka, underscore.</p>}
      </div>
      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm text-mute">Password</label>
        <input id="password" type="password" className="input" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} required maxLength={128} />
        {mode === 'register' && <p className="text-xs text-mute">Minimal 8 karakter dengan huruf besar, huruf kecil, dan angka.</p>}
      </div>
      {mode === 'register' && (
        <div className="space-y-1.5">
          <label htmlFor="confirm" className="text-sm text-mute">Konfirmasi password</label>
          <input id="confirm" type="password" className="input" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </div>
      )}
      {mode !== 'register' && (
        <label className="flex items-center gap-2 text-sm text-mute">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 accent-[#C9A45C]" />
          Ingat saya
        </label>
      )}
      {error && <p role="alert" className="rounded-lg border border-crimson/50 bg-crimson/10 px-3 py-2 text-sm text-crimson-soft">{error}</p>}
      <Button type="submit" loading={loading} className="w-full">{cta}</Button>
      {mode === 'login' && (
        <p className="text-center text-sm text-mute">Belum punya akun? <Link href="/register" className="text-gold-soft hover:underline">Daftar</Link></p>
      )}
      {mode === 'register' && (
        <p className="text-center text-sm text-mute">Sudah punya akun? <Link href="/login" className="text-gold-soft hover:underline">Masuk</Link></p>
      )}
    </form>
  );
}
