'use client';

import { useCallback, useState } from 'react';
import { Activity, Database, Radio, Search, PlayCircle, Bot, Bug, ExternalLink, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LogoutButton } from '@/components/layout/logout-button';
import { api, ApiClientError } from '@/lib/client/api';
import { useLive } from '@/hooks/use-live';
import { formatDateTime } from '@/lib/utils';
import Link from 'next/link';

interface Stats {
  totals: { users: number; online: number; totalRooms: number; activeGames: number; finishedMatches: number; wins: number; losses: number };
  recentGames: { id: string; roomCode: string; winnerLabel: string; playerCount: number; endedAt: number }[];
  recentUsers: { id: string; username: string; createdAt: number; disabled: boolean }[];
  activeRooms: { id: string; code: string; host: string; status: string; visibility: string; players: number; maxPlayers: number; spectators: number; gamePhase: string | null; round: number | null }[];
  system: { database: { ok: boolean; latencyMs: number }; realtime: { provider: string; configured: boolean; status: string } };
  audit: { id: string; owner: string; action: string; targetType: string | null; createdAt: number }[];
}
interface UserRow { id: string; username: string; disabled: boolean; createdAt: number; lastSeenAt: number | null; matches: number }

export function OwnerDashboard({ ownerName }: { ownerName: string }) {
  const fetcher = useCallback(() => api<Stats>('/api/owner/stats'), []);
  const { data, error, refresh } = useLive<Stats>(fetcher, { intervalMs: 10000 });
  const [q, setQ] = useState('');
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [testModeLoading, setTestModeLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ roomCode: string; gameId: string } | null>(null);

  async function run(fn: () => Promise<unknown>) {
    setMsg(null);
    try {
      await fn();
      await refresh();
    } catch (e) {
      setMsg(e instanceof ApiClientError ? e.message : 'Gagal.');
    }
  }

  async function runTestMode() {
    setTestModeLoading(true);
    setMsg(null);
    setTestResult(null);
    try {
      const res = await api<{ roomCode: string; gameId: string }>('/api/owner/test-room', { method: 'POST' });
      setTestResult(res);
      setMsg(`Test Mode Aktif! Room ${res.roomCode} dibuat dengan 3 bot.`);
      await refresh();
    } catch (e) {
      setMsg(e instanceof ApiClientError ? e.message : 'Gagal menjalankan Test Mode.');
    } finally {
      setTestModeLoading(false);
    }
  }

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    try {
      setUsers((await api<{ users: UserRow[] }>(`/api/owner/users?q=${encodeURIComponent(q)}`)).users);
    } catch (err) {
      setMsg(err instanceof ApiClientError ? err.message : 'Gagal mencari.');
    }
  }

  const t = data?.totals;
  const cards: [string, number | undefined][] = [
    ['Total user', t?.users], ['Online', t?.online], ['Total room', t?.totalRooms], ['Game aktif', t?.activeGames],
    ['Match selesai', t?.finishedMatches], ['Total menang', t?.wins], ['Total kalah', t?.losses],
  ];

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 pb-24">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-gold-soft flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-gold" /> Dashboard Owner
          </h1>
          <p className="text-sm text-mute">Masuk sebagai @{ownerName}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/api/docs" target="_blank" className="text-xs px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-mute hover:text-ink transition flex items-center gap-1.5">
            Dokumentasi API <ExternalLink className="h-3 w-3" />
          </Link>
          <LogoutButton endpoint="/api/owner/auth/logout" redirectTo="/owner/login" />
        </div>
      </header>

      {(error || msg) && (
        <div role="alert" className={`rounded-xl border p-4 text-sm ${msg?.includes('Aktif') ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300' : 'border-crimson/50 bg-crimson/10 text-crimson-soft'}`}>
          <div className="flex items-center justify-between gap-3">
            <span>{msg ?? error?.message}</span>
            {testResult && (
              <div className="flex gap-2">
                <Link href={`/room/${testResult.roomCode}`} className="font-bold underline text-gold-soft hover:text-ink">Buka Room</Link>
                <Link href={`/game/${testResult.gameId}`} className="font-bold underline text-emerald-400 hover:text-ink">Masuk Game Langsung</Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION: TEST MODE & CEK BUG */}
      <section className="panel p-5 border-purple/40 bg-gradient-to-r from-purple/10 via-surface to-night">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="font-display text-xl text-ink flex items-center gap-2">
              <Bug className="h-5 w-5 text-purple-soft" /> Test Mode Simulasi Permainan
            </h2>
            <p className="text-xs text-mute max-w-xl">
              Membuat room instan privat otomatis berisi 3 akun bot pintar untuk menguji alur game, pembagian role, fase malam, voting gantung, dan memastikan tidak ada bug di dalam game.
            </p>
          </div>
          <Button 
            onClick={runTestMode} 
            loading={testModeLoading}
            className="bg-purple hover:bg-purple-soft text-white whitespace-nowrap shadow-[0_0_25px_rgba(122,85,179,0.4)]"
          >
            <Bot className="h-4 w-4 mr-1.5" /> Jalankan Tes Room & Bot
          </Button>
        </div>
      </section>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map(([label, v]) => <div key={label} className="panel p-3"><dt className="text-xs text-mute">{label}</dt><dd className="font-display text-2xl">{v ?? '-'}</dd></div>)}
      </dl>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="panel flex items-center gap-3 p-4"><Database className="h-5 w-5 text-gold" aria-hidden /><div><p className="text-sm">Database</p><p className="text-xs text-mute">{data ? `OK (${data.system.database.latencyMs} ms)` : '-'}</p></div></div>
        <div className="panel flex items-center gap-3 p-4"><Radio className="h-5 w-5 text-gold" aria-hidden /><div><p className="text-sm">Realtime: {data?.system.realtime.provider ?? '-'}</p><p className="text-xs text-mute">{data ? (data.system.realtime.configured ? 'Terhubung' : 'Polling dioptimasi (efisien)') : '-'}</p></div></div>
      </section>

      <section className="panel p-4">
        <h2 className="mb-3 font-display text-xl">Room aktif</h2>
        {data && data.activeRooms.length === 0 && <p className="text-sm text-mute">Tidak ada room aktif.</p>}
        <ul className="space-y-2">
          {data?.activeRooms.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-night/50 p-3 text-sm">
              <span className="flex flex-wrap items-center gap-2"><b>{r.code}</b><Badge>{r.status}</Badge><Badge>{r.visibility}</Badge><span className="text-mute">@{r.host} | {r.players}/{r.maxPlayers} pemain | {r.spectators} penonton{r.gamePhase ? ` | ${r.gamePhase} r${r.round}` : ''}</span></span>
              <span className="flex gap-2">
                <Button size="sm" variant="danger" onClick={() => confirm(`Akhiri room ${r.code}?`) && run(() => api(`/api/owner/rooms/${r.id}`, { method: 'POST', json: { action: 'end' } }))}>Akhiri</Button>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel p-4">
        <h2 className="mb-3 font-display text-xl">Cari pengguna</h2>
        <form onSubmit={search} className="flex gap-2"><input className="input" placeholder="username" value={q} onChange={(e) => setQ(e.target.value)} /><Button type="submit" variant="secondary"><Search className="h-4 w-4" aria-hidden />Cari</Button></form>
        <ul className="mt-3 space-y-2">
          {(users ?? data?.recentUsers.map((u) => ({ ...u, lastSeenAt: null, matches: 0 })) ?? []).map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-night/50 p-3 text-sm">
              <span className="flex items-center gap-2"><a href={`/@${u.username}`} className="font-medium hover:text-gold-soft">@{u.username}</a>{u.disabled && <Badge tone="crimson">Nonaktif</Badge>}<span className="text-xs text-mute">{formatDateTime(u.createdAt)}</span></span>
              <Button size="sm" variant={u.disabled ? 'secondary' : 'danger'} onClick={() => run(async () => { await api(`/api/owner/users/${u.id}`, { method: 'POST', json: { disabled: !u.disabled } }); if (users) await search(); })}>{u.disabled ? 'Aktifkan' : 'Nonaktifkan'}</Button>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="panel p-4"><h2 className="mb-3 font-display text-xl">Game terbaru</h2><ul className="space-y-1.5 text-sm">{data?.recentGames.map((g) => <li key={g.id} className="flex justify-between gap-2"><span>{g.roomCode} | {g.winnerLabel}</span><span className="text-mute">{formatDateTime(g.endedAt)}</span></li>)}</ul></div>
        <div className="panel p-4"><h2 className="mb-3 flex items-center gap-2 font-display text-xl"><Activity className="h-4 w-4" aria-hidden />Audit log</h2><ul className="space-y-1.5 text-sm">{data?.audit.map((a) => <li key={a.id} className="flex justify-between gap-2"><span>{a.action} <span className="text-mute">oleh {a.owner}</span></span><span className="text-mute">{formatDateTime(a.createdAt)}</span></li>)}</ul></div>
      </section>
    </main>
  );
}
