'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { api, ApiClientError } from '@/lib/client/api';

export function CreateRoomForm() {
  const router = useRouter();
  const [minPlayers, setMin] = useState(5);
  const [maxPlayers, setMax] = useState(10);
  const [gameMode, setMode] = useState('CLASSIC');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [allowSpectators, setSpectators] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { code } = await api<{ code: string }>('/api/rooms', {
        method: 'POST',
        json: { minPlayers, maxPlayers, gameMode, visibility, allowSpectators },
      });
      router.push(`/room/${code}`);
    } catch (err) {
      if (err instanceof ApiClientError && err.code === 'ALREADY_JOINED' && typeof err.details?.roomCode === 'string') {
        router.push(`/room/${err.details.roomCode}`);
        return;
      }
      setError(err instanceof ApiClientError ? err.message : 'Gagal membuat room.');
    } finally {
      setLoading(false);
    }
  }

  const num = (v: string) => Math.max(0, Math.floor(Number(v) || 0));

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label htmlFor="min" className="text-sm text-mute">Minimum pemain</label>
          <input id="min" type="number" min={4} max={20} className="input" value={minPlayers} onChange={(e) => setMin(num(e.target.value))} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="max" className="text-sm text-mute">Maksimum pemain</label>
          <input id="max" type="number" min={4} max={20} className="input" value={maxPlayers} onChange={(e) => setMax(num(e.target.value))} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label htmlFor="mode" className="text-sm text-mute">Mode game</label>
          <select id="mode" className="input" value={gameMode} onChange={(e) => setMode(e.target.value)}>
            <option value="CLASSIC">Klasik (serigala menang saat jumlahnya sama)</option>
            <option value="MAJORITY">Mayoritas (serigala harus lebih banyak)</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="vis" className="text-sm text-mute">Visibilitas</label>
          <select id="vis" className="input" value={visibility} onChange={(e) => setVisibility(e.target.value as 'PUBLIC' | 'PRIVATE')}>
            <option value="PUBLIC">Publik (tampil di lobby)</option>
            <option value="PRIVATE">Privat (hanya lewat Room ID)</option>
          </select>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-mute">
        <input type="checkbox" checked={allowSpectators} onChange={(e) => setSpectators(e.target.checked)} className="h-4 w-4 accent-[#C9A45C]" />
        Izinkan penonton (spectator)
      </label>
      <p className="text-xs text-mute">Komposisi role dibuat otomatis dan bisa diubah di dalam room sebelum game dimulai.</p>
      {error && <p role="alert" className="rounded-lg border border-crimson/50 bg-crimson/10 px-3 py-2 text-sm text-crimson-soft">{error}</p>}
      <Button type="submit" loading={loading} className="w-full">Buat room</Button>
    </form>
  );
}
