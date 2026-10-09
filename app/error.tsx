'use client';

import { Button } from '@/components/ui/button';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="panel max-w-md space-y-3 p-6 text-center">
        <h1 className="font-display text-2xl text-crimson-soft">Terjadi kesalahan</h1>
        <p className="text-sm text-mute">Halaman gagal dimuat. Coba muat ulang; jika tetap gagal, kembali beberapa saat lagi.</p>
        <Button onClick={reset}>Coba lagi</Button>
      </div>
    </div>
  );
}
