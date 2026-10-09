'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { Eye, LogIn, Plus, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api, ApiClientError } from '@/lib/client/api';
import { MODE_LABEL, ROOM_STATUS_LABEL } from '@/lib/game/labels';
import { LOBBY_CHANNEL } from '@/lib/realtime/channels';
import { useLive } from '@/hooks/use-live';
import type { LobbyRoom } from '@/types/room';
import { CreateRoomForm } from './create-room-form';

const STATUS_TONE: Record<string, 'green' | 'gold' | 'purple' | 'neutral'> = {
  WAITING: 'green',
  STARTING: 'gold',
  IN_PROGRESS: 'purple',
  FINISHED: 'neutral',
  CLOSED: 'neutral',
};

export function LobbyClient({ username }: { username: string }) {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const fetcher = useCallback(async () => (await api<{ rooms: LobbyRoom[] }>('/api/rooms')).rooms, []);
  const { data: rooms, loading } = useLive<LobbyRoom[]>(fetcher, { channels: [LOBBY_CHANNEL], intervalMs: 5000 });

  async function enter(code: string, mode: 'join' | 'spectate') {
    setError(null);
    setBusy(code);
    try {
      await api(`/api/rooms/${code}/${mode}`, { method: 'POST' });
      router.push(`/room/${code}`);
    } catch (err) {
      if (err instanceof ApiClientError && err.code === 'ALREADY_JOINED' && typeof err.details?.roomCode === 'string') {
        router.push(`/room/${err.details.roomCode}`);
        return;
      }
      setError(err instanceof ApiClientError ? err.message : 'Gagal masuk room.');
    } finally {
      setBusy(null);
    }
  }

  function joinById(e: React.FormEvent) {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!/^WOLF-[A-Z0-9]{5}$/.test(code)) {
      setError('Format Room ID tidak valid. Contoh: WOLF-7X9K2');
      return;
    }
    router.push(`/room/${code}`);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-gold-soft">Lobby</h1>
          <p className="mt-1 text-sm text-mute">Halo, <Link href={`/@${username}`} className="text-ink hover:underline">@{username}</Link>. Pilih room atau buat desamu sendiri.</p>
        </div>
        <Button onClick={() => setShowCreate((v) => !v)} variant={showCreate ? 'secondary' : 'primary'}>
          <Plus className="h-4 w-4" aria-hidden /> Buat room
        </Button>
      </div>

      {showCreate && (
        <section className="panel max-w-xl p-5">
          <h2 className="mb-4 font-display text-xl">Room baru</h2>
          <CreateRoomForm />
        </section>
      )}

      <form onSubmit={joinById} className="panel flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1.5">
          <label htmlFor="code" className="text-sm text-mute">Punya Room ID?</label>
          <input id="code" className="input uppercase" placeholder="WOLF-7X9K2" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} maxLength={10} />
        </div>
        <Button type="submit" variant="secondary"><LogIn className="h-4 w-4" aria-hidden /> Masuk dengan ID</Button>
      </form>

      {error && <p role="alert" className="rounded-lg border border-crimson/50 bg-crimson/10 px-3 py-2 text-sm text-crimson-soft">{error}</p>}

      <section>
        <h2 className="mb-3 font-display text-xl">Room publik</h2>
        {loading && !rooms ? (
          <p className="text-sm text-mute">Memuat room...</p>
        ) : !rooms || rooms.length === 0 ? (
          <p className="panel p-5 text-sm text-mute">Belum ada room publik. Buat satu dan undang temanmu.</p>
        ) : (
          <ul className="space-y-2">
            {rooms.map((r) => (
              <li key={r.code} className="panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-lg text-ink">{r.code}</span>
                    <Badge tone={STATUS_TONE[r.status]}>{ROOM_STATUS_LABEL[r.status]}</Badge>
                  </div>
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-mute">
                    <span>Host @{r.host}</span>
                    <span>{MODE_LABEL[r.gameMode] ?? r.gameMode}</span>
                    <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" aria-hidden />{r.playerCount}/{r.maxPlayers}</span>
                    {r.spectatorCount > 0 && <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" aria-hidden />{r.spectatorCount}</span>}
                  </p>
                </div>
                <div className="shrink-0">
                  {r.action === 'JOIN' && <Button size="sm" loading={busy === r.code} onClick={() => enter(r.code, 'join')}>Join</Button>}
                  {r.action === 'SPECTATE' && <Button size="sm" variant="secondary" loading={busy === r.code} onClick={() => enter(r.code, 'spectate')}><Eye className="h-4 w-4" aria-hidden />Spectate</Button>}
                  {r.action === 'RETURN' && <Button size="sm" onClick={() => router.push(r.gameId ? `/game/${r.gameId}` : `/room/${r.code}`)}>Kembali</Button>}
                  {r.action === 'FINISHED' && (r.matchId ? <Link href={`/match/${r.matchId}`} className="text-sm text-gold-soft hover:underline">Lihat hasil</Link> : <Badge>Selesai</Badge>)}
                  {r.action === 'CLOSED' && <Badge tone="crimson">Closed</Badge>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
