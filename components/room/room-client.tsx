'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Check, Copy, Crown, Eye, Share2, UserX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api, ApiClientError } from '@/lib/client/api';
import { defaultRoleConfig } from '@/lib/game/engine/composition';
import { MODE_LABEL, ROOM_STATUS_LABEL } from '@/lib/game/labels';
import type { RoleId } from '@/lib/game/constants';
import { useRoom } from '@/hooks/use-room';
import type { RoomDetail } from '@/types/room';
import { RoleConfigEditor } from './role-config-editor';

export function RoomClient({ code, userId }: { code: string; userId: string }) {
  const router = useRouter();
  const { data: room, error, loading, refresh } = useRoom(code);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);

  // Masuk otomatis ke game saat game dibuat (pemain maupun spectator).
  useEffect(() => {
    if (room?.gameId && room.status !== 'CLOSED' && room.viewer.role !== 'none' && room.status !== 'FINISHED') {
      router.replace(`/game/${room.gameId}`);
    }
  }, [room?.gameId, room?.status, room?.viewer.role, router]);

  async function act(name: string, fn: () => Promise<unknown>, after?: () => void) {
    setMsg(null);
    setBusy(name);
    try {
      await fn();
      after?.();
      await refresh();
    } catch (e) {
      setMsg(e instanceof ApiClientError ? e.message : 'Terjadi kesalahan.');
    } finally {
      setBusy(null);
    }
  }

  if (loading && !room) return null;
  if (error && !room) {
    return (
      <div className="panel max-w-md space-y-3 p-6">
        <h1 className="font-display text-2xl text-crimson-soft">{error.code === 'NOT_FOUND' ? 'Room tidak ditemukan' : 'Room tidak bisa dibuka'}</h1>
        <p className="text-sm text-mute">{error.message}</p>
        <Link href="/lobby" className="text-sm text-gold-soft hover:underline">Kembali ke lobby</Link>
      </div>
    );
  }
  if (!room) return null;

  const isHost = room.viewer.role === 'host';
  const isPlayer = room.viewer.role === 'host' || room.viewer.role === 'player';
  const url = typeof window !== 'undefined' ? `${window.location.origin}/room/${room.code}` : '';

  async function copyId() {
    await navigator.clipboard.writeText(room!.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Werewolf Online', text: `Gabung room ${room!.code}`, url });
        return;
      } catch {
        /* dibatalkan */
      }
    }
    await navigator.clipboard.writeText(url);
    setMsg('Tautan room disalin.');
  }

  const closed = room.status === 'CLOSED' || room.status === 'FINISHED';

  return (
    <div className="space-y-6">
      <header className="panel flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="text-sm text-mute">Room ID</p>
          <h1 className="font-display text-3xl tracking-wider text-gold-soft">{room.code}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone={room.status === 'WAITING' ? 'green' : 'purple'}>{ROOM_STATUS_LABEL[room.status]}</Badge>
            <Badge>{room.visibility === 'PUBLIC' ? 'Publik' : 'Privat'}</Badge>
            <Badge>{MODE_LABEL[room.gameMode] ?? room.gameMode}</Badge>
            <Badge><Eye className="h-3 w-3" aria-hidden /> {room.spectatorCount} penonton</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={copyId}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? 'Disalin' : 'Salin ID'}</Button>
          <Button variant="secondary" size="sm" onClick={share}><Share2 className="h-4 w-4" /> Bagikan</Button>
        </div>
      </header>

      {msg && <p role="alert" className="rounded-lg border border-crimson/50 bg-crimson/10 px-3 py-2 text-sm text-crimson-soft">{msg}</p>}

      {closed && (
        <div className="panel p-5">
          <p className="text-sm text-mute">{room.status === 'FINISHED' ? 'Game di room ini sudah selesai.' : 'Room ini sudah ditutup.'}</p>
          {room.matchId && <Link href={`/match/${room.matchId}`} className="mt-2 inline-block text-sm text-gold-soft hover:underline">Lihat hasil pertandingan</Link>}
        </div>
      )}

      {!isPlayer && room.viewer.role === 'none' && !closed && (
        <div className="panel flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="text-sm text-mute">
            {room.viewer.canJoin ? 'Room ini masih terbuka untuk pemain.' : room.viewer.canSpectate ? 'Room sedang penuh atau berjalan. Kamu bisa menonton.' : 'Kamu tidak bisa masuk ke room ini.'}
          </p>
          <div className="flex gap-2">
            {room.viewer.canJoin && <Button loading={busy === 'join'} onClick={() => act('join', () => api(`/api/rooms/${room.code}/join`, { method: 'POST' }))}>Join sebagai pemain</Button>}
            {room.viewer.canSpectate && (
              <Button variant="secondary" loading={busy === 'spectate'} onClick={() => act('spectate', () => api(`/api/rooms/${room.code}/spectate`, { method: 'POST' }), () => room.gameId && router.replace(`/game/${room.gameId}`))}>
                <Eye className="h-4 w-4" /> Spectate
              </Button>
            )}
          </div>
        </div>
      )}

      {room.viewer.role === 'spectator' && !closed && (
        <div className="panel flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="text-sm text-mute">Kamu menonton room ini. Game akan terbuka otomatis saat dimulai.</p>
          <Button variant="secondary" loading={busy === 'unspectate'} onClick={() => act('unspectate', () => api(`/api/rooms/${room.code}/spectate`, { method: 'DELETE' }), () => router.push('/lobby'))}>Berhenti menonton</Button>
        </div>
      )}

      <section className="panel p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl">Pemain ({room.players.length}/{room.maxPlayers})</h2>
          <span className="text-xs text-mute">Minimum {room.minPlayers} pemain</span>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          {room.players.map((p) => (
            <li key={p.userId} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-night/50 px-3 py-2">
              <span className="flex min-w-0 items-center gap-2">
                {p.isHost && <Crown className="h-4 w-4 shrink-0 text-gold" aria-label="Host" />}
                <Link href={`/@${p.username}`} className="truncate text-sm hover:text-gold-soft">@{p.username}{p.userId === userId ? ' (kamu)' : ''}</Link>
              </span>
              <span className="flex items-center gap-2">
                <Badge tone={p.ready ? 'green' : 'neutral'}>{p.ready ? 'Ready' : 'Belum'}</Badge>
                {isHost && !p.isHost && room.status === 'WAITING' && (
                  <button className="rounded-md p-1 text-mute hover:text-crimson-soft" aria-label={`Keluarkan ${p.username}`} onClick={() => act(`kick-${p.userId}`, () => api(`/api/rooms/${room.code}/kick`, { method: 'POST', json: { userId: p.userId } }))}>
                    <UserX className="h-4 w-4" />
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>

        {isPlayer && room.status === 'WAITING' && (
          <div className="mt-4 flex flex-wrap gap-2">
            {!isHost && (
              <Button variant={room.viewer.ready ? 'secondary' : 'primary'} loading={busy === 'ready'} onClick={() => act('ready', () => api(`/api/rooms/${room.code}/ready`, { method: 'POST', json: { ready: !room.viewer.ready } }))}>
                {room.viewer.ready ? 'Batal ready' : 'Siap bermain'}
              </Button>
            )}
            {isHost && (
              <Button loading={busy === 'start'} onClick={() => act('start', async () => { const r = await api<{ gameId: string }>(`/api/rooms/${room.code}/start`, { method: 'POST' }); router.replace(`/game/${r.gameId}`); })}>
                Mulai game
              </Button>
            )}
            <Button variant="ghost" loading={busy === 'leave'} onClick={() => act('leave', () => api(`/api/rooms/${room.code}/leave`, { method: 'POST' }), () => router.push('/lobby'))}>Keluar room</Button>
          </div>
        )}
      </section>

      <section className="panel p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl">Konfigurasi</h2>
          {isHost && room.status === 'WAITING' && !room.hasStarted && !editing && <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>Ubah</Button>}
        </div>
        {editing && isHost ? (
          <ConfigEditor room={room} onDone={() => { setEditing(false); void refresh(); }} />
        ) : (
          <ConfigSummary room={room} />
        )}
      </section>
    </div>
  );
}

function ConfigSummary({ room }: { room: RoomDetail }) {
  const roles = Object.entries(room.roleConfig).filter(([, n]) => (n ?? 0) > 0);
  const durations = (room.settings.durations ?? {}) as Record<string, number>;
  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      <div><dt className="text-mute">Pemain</dt><dd>{room.minPlayers} sampai {room.maxPlayers}</dd></div>
      <div><dt className="text-mute">Penonton</dt><dd>{room.allowSpectators ? 'Diizinkan' : 'Tidak diizinkan'}</dd></div>
      <div className="sm:col-span-2"><dt className="text-mute">Komposisi role</dt><dd className="mt-1 flex flex-wrap gap-1.5">{roles.map(([id, n]) => <Badge key={id} tone="gold">{id.replace('_', ' ')} x{n}</Badge>)}</dd></div>
      <div className="sm:col-span-2"><dt className="text-mute">Durasi (detik)</dt><dd>Diskusi {durations.DISCUSSION ?? 120} | Voting {durations.VOTING ?? 30} | Malam {durations.NIGHT ?? 60}</dd></div>
    </dl>
  );
}

function ConfigEditor({ room, onDone }: { room: RoomDetail; onDone: () => void }) {
  const [min, setMin] = useState(room.minPlayers);
  const [max, setMax] = useState(room.maxPlayers);
  const [mode, setMode] = useState(room.gameMode);
  const [visibility, setVisibility] = useState(room.visibility);
  const [spectators, setSpectators] = useState(room.allowSpectators);
  const [roles, setRoles] = useState<Partial<Record<RoleId, number>>>(room.roleConfig);
  const [settings, setSettings] = useState(room.settings as Record<string, unknown>);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const durations = (settings.durations ?? {}) as Record<string, number>;

  const setDuration = (key: string, value: number) => setSettings({ ...settings, durations: { ...durations, [key]: value } });

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api(`/api/rooms/${room.code}/config`, {
        method: 'PATCH',
        json: { minPlayers: min, maxPlayers: max, gameMode: mode, visibility, allowSpectators: spectators, roleConfig: roles, settings },
      });
      onDone();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : 'Gagal menyimpan.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5 rounded-xl border border-white/10 bg-night/40 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-mute font-medium">Minimum Pemain</span>
              <span className="text-xs text-mute">Min: 4</span>
            </div>
            <div className="flex items-center justify-between gap-3 mt-1">
              <button
                type="button"
                onClick={() => {
                  if (min > 4) setMin(min - 1);
                }}
                className="h-9 w-11 rounded-lg border border-white/15 bg-white/10 text-lg font-bold text-ink hover:bg-white/20 active:scale-95 transition-all select-none"
              >
                -
              </button>
              <span className="font-display text-xl font-bold text-gold-soft tabular-nums">
                {min}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (min < 20) {
                    const next = min + 1;
                    setMin(next);
                    if (next > max) {
                      setMax(next);
                      setRoles(defaultRoleConfig(next));
                    }
                  }
                }}
                className="h-9 w-11 rounded-lg border border-white/15 bg-white/10 text-lg font-bold text-ink hover:bg-white/20 active:scale-95 transition-all select-none"
              >
                +
              </button>
            </div>
          </div>

          <div className="space-y-1.5 rounded-xl border border-white/10 bg-night/40 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-mute font-medium">Maksimum Pemain</span>
              <span className="text-xs text-mute">Maks: 20</span>
            </div>
            <div className="flex items-center justify-between gap-3 mt-1">
              <button
                type="button"
                onClick={() => {
                  if (max > min) {
                    const next = max - 1;
                    setMax(next);
                    setRoles(defaultRoleConfig(next));
                  }
                }}
                className="h-9 w-11 rounded-lg border border-white/15 bg-white/10 text-lg font-bold text-ink hover:bg-white/20 active:scale-95 transition-all select-none"
              >
                -
              </button>
              <span className="font-display text-xl font-bold text-gold-soft tabular-nums">
                {max}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (max < 20) {
                    const next = max + 1;
                    setMax(next);
                    setRoles(defaultRoleConfig(next));
                  }
                }}
                className="h-9 w-11 rounded-lg border border-white/15 bg-white/10 text-lg font-bold text-ink hover:bg-white/20 active:scale-95 transition-all select-none"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <span className="text-xs text-mute font-medium">Mode Game</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode('CLASSIC')}
                className={`py-2 px-3 rounded-lg border text-xs font-medium transition ${
                  mode === 'CLASSIC' ? 'border-gold bg-gold/20 text-gold-soft shadow-glow' : 'border-white/10 bg-night/60 text-mute hover:text-ink'
                }`}
              >
                Klasik
              </button>
              <button
                type="button"
                onClick={() => setMode('MAJORITY')}
                className={`py-2 px-3 rounded-lg border text-xs font-medium transition ${
                  mode === 'MAJORITY' ? 'border-crimson bg-crimson/20 text-crimson-soft shadow-crimson' : 'border-white/10 bg-night/60 text-mute hover:text-ink'
                }`}
              >
                Mayoritas
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs text-mute font-medium">Visibilitas Room</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setVisibility('PUBLIC')}
                className={`py-2 px-3 rounded-lg border text-xs font-medium transition ${
                  visibility === 'PUBLIC' ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300' : 'border-white/10 bg-night/60 text-mute hover:text-ink'
                }`}
              >
                Publik
              </button>
              <button
                type="button"
                onClick={() => setVisibility('PRIVATE')}
                className={`py-2 px-3 rounded-lg border text-xs font-medium transition ${
                  visibility === 'PRIVATE' ? 'border-purple/60 bg-purple/20 text-purple-soft' : 'border-white/10 bg-night/60 text-mute hover:text-ink'
                }`}
              >
                Privat
              </button>
            </div>
          </div>
        </div>
      </div>
      <p className="text-xs text-mute">Mengubah maksimum pemain mengatur ulang komposisi role ke default; sesuaikan lagi di bawah.</p>
      <div className="grid gap-2 text-sm text-mute sm:grid-cols-2">
        <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-[#C9A45C]" checked={spectators} onChange={(e) => setSpectators(e.target.checked)} />Izinkan spectator</label>
        <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-[#C9A45C]" checked={Boolean(settings.revealRolesOnDeath)} onChange={(e) => setSettings({ ...settings, revealRolesOnDeath: e.target.checked })} />Buka role saat pemain mati</label>
        <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-[#C9A45C]" checked={Boolean(settings.guardianSelfProtect)} onChange={(e) => setSettings({ ...settings, guardianSelfProtect: e.target.checked })} />Penjaga boleh melindungi diri</label>
        <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-[#C9A45C]" checked={settings.doctorSelfProtect !== false} onChange={(e) => setSettings({ ...settings, doctorSelfProtect: e.target.checked })} />Dokter boleh merawat diri</label>
        <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-[#C9A45C]" checked={Boolean(settings.loversWinAlone)} onChange={(e) => setSettings({ ...settings, loversWinAlone: e.target.checked })} />Pasangan lintas tim menang jika tersisa berdua</label>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {(['ROLE_REVEAL', 'DAY', 'DISCUSSION', 'VOTING', 'NIGHT'] as const).map((k) => (
          <label key={k} className="space-y-1 text-xs text-mute">
            {{ ROLE_REVEAL: 'Pembagian role', DAY: 'Pagi', DISCUSSION: 'Diskusi', VOTING: 'Voting', NIGHT: 'Malam' }[k]} (detik)
            <input type="number" className="input" value={durations[k] ?? { ROLE_REVEAL: 10, DAY: 60, DISCUSSION: 120, VOTING: 30, NIGHT: 60 }[k]} onChange={(e) => setDuration(k, Number(e.target.value))} />
          </label>
        ))}
      </div>
      <RoleConfigEditor value={roles} maxPlayers={max} onChange={setRoles} />
      {error && <p role="alert" className="rounded-lg border border-crimson/50 bg-crimson/10 px-3 py-2 text-sm text-crimson-soft">{error}</p>}
      <div className="flex gap-2">
        <Button loading={saving} onClick={save}>Simpan konfigurasi</Button>
        <Button variant="ghost" onClick={onDone}>Batal</Button>
      </div>
    </div>
  );
}
