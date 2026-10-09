'use client';

import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="panel max-w-md space-y-3 p-6 text-center border-crimson/40 bg-night/90">
        <h1 className="font-display text-2xl text-crimson-soft">Terjadi kesalahan</h1>
        <p className="text-sm text-mute">
          {error?.message || 'Halaman gagal dimuat. Coba muat ulang; jika tetap gagal, kembali beberapa saat lagi.'}
        </p>
        {error?.digest && (
          <p className="text-[10px] text-mute font-mono">Digest: {error.digest}</p>
        )}
        <div className="flex justify-center gap-2 pt-2">
          <Button onClick={reset} size="sm">Coba lagi</Button>
          <a href="/login" className="px-3 py-1.5 rounded-lg border border-white/10 text-xs font-semibold hover:bg-white/5">
            Ke Login
          </a>
        </div>
      </div>
    </div>
  );
}
